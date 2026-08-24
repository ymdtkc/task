import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createTalkMemosRepo } from "../lib/talkMemosRepo";
import type { NewTalkMemo, TalkMemo } from "../types/talkMemo";
import { useRealtimeTalkMemos } from "./useRealtimeTalkMemos";

const UNDO_WINDOW_MS = 8000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useTalkMemos(userId: string | null) {
  const repo = useMemo(
    () => (userId ? createTalkMemosRepo(userId) : null),
    [userId],
  );
  const [memos, setMemos] = useState<TalkMemo[]>([]);
  const [memosOwnerId, setMemosOwnerId] = useState<string | null>(userId);
  const memosRef = useRef<TalkMemo[]>([]);
  const remotelyDeletedIds = useRef<Set<string>>(new Set());
  const activeUserId = useRef<string | null>(userId);
  activeUserId.current = userId;
  const syncGeneration = useRef(0);
  const [syncRequest, setSyncRequest] = useState<{
    userId: string;
    generation: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const isCurrentOwner = memosOwnerId === userId;
  const visibleMemos = isCurrentOwner ? memos : [];

  useEffect(() => {
    memosRef.current = visibleMemos;
  }, [visibleMemos]);

  useEffect(() => {
    syncGeneration.current += 1;
    remotelyDeletedIds.current = new Set();
    memosRef.current = [];
    setMemos([]);
    setMemosOwnerId(userId);
    setSyncRequest(null);
    setError(null);
    setIsLoading(Boolean(userId));
  }, [userId]);

  const handleSubscribed = useCallback((subscribedUserId: string) => {
    if (activeUserId.current !== subscribedUserId) return;
    const generation = syncGeneration.current + 1;
    syncGeneration.current = generation;
    remotelyDeletedIds.current = new Set();
    memosRef.current = [];
    setMemos([]);
    setMemosOwnerId(subscribedUserId);
    setError(null);
    setIsLoading(true);
    setSyncRequest({ userId: subscribedUserId, generation });
  }, []);

  const handleConnectionError = useCallback((subscribedUserId: string) => {
    if (activeUserId.current !== subscribedUserId) return;
    const generation = syncGeneration.current + 1;
    syncGeneration.current = generation;
    memosRef.current = [];
    setMemos([]);
    setMemosOwnerId(subscribedUserId);
    setError(null);
    setIsLoading(true);
    // Even when the live connection is unavailable, load the current
    // database snapshot so the feature remains usable. The realtime hook
    // separately tells the user to refresh to see other-device changes.
    setSyncRequest({ userId: subscribedUserId, generation });
  }, []);

  useRealtimeTalkMemos(
    userId,
    setMemos,
    remotelyDeletedIds,
    activeUserId,
    handleSubscribed,
    handleConnectionError,
    retryKey,
  );

  useEffect(() => {
    if (
      !repo ||
      !userId ||
      !syncRequest ||
      syncRequest.userId !== userId
    ) {
      return;
    }

    let cancelled = false;
    const { generation } = syncRequest;

    void repo
      .list()
      .then((loaded) => {
        if (
          !cancelled &&
          activeUserId.current === userId &&
          syncGeneration.current === generation
        ) {
          setMemos((current) => {
            const merged = new Map<string, TalkMemo>();
            for (const memo of loaded) {
              if (!remotelyDeletedIds.current.has(memo.id)) {
                merged.set(memo.id, memo);
              }
            }
            for (const memo of current) {
              if (!remotelyDeletedIds.current.has(memo.id)) {
                merged.set(memo.id, memo);
              }
            }
            return [...merged.values()];
          });
        }
      })
      .catch((cause) => {
        if (
          !cancelled &&
          activeUserId.current === userId &&
          syncGeneration.current === generation
        ) {
          setError(errorMessage(cause));
        }
      })
      .finally(() => {
        if (
          !cancelled &&
          activeUserId.current === userId &&
          syncGeneration.current === generation
        ) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo, syncRequest, userId]);

  const retry = useCallback(() => {
    syncGeneration.current += 1;
    remotelyDeletedIds.current = new Set();
    memosRef.current = [];
    setMemos([]);
    setMemosOwnerId(userId);
    setSyncRequest(null);
    setError(null);
    setIsLoading(Boolean(userId));
    setRetryKey((value) => value + 1);
  }, [userId]);

  const addMemo = useCallback(
    async (input: NewTalkMemo) => {
      if (!repo || !userId) throw new Error("ログインが必要です");
      const operationUserId = userId;

      const tempId = `temp-${crypto.randomUUID()}`;
      const temporary: TalkMemo = {
        ...input,
        id: tempId,
        createdAt: new Date(),
      };
      setMemos((current) => [temporary, ...current]);

      try {
        await repo.create(input);
        if (activeUserId.current !== operationUserId) return;
        setMemos((current) =>
          current.filter((memo) => memo.id !== tempId),
        );
        toast.success("話したいことを追加しました");
        retry();
      } catch (cause) {
        if (activeUserId.current !== operationUserId) return;
        setMemos((current) =>
          current.filter((memo) => memo.id !== tempId),
        );
        toast.error(`追加に失敗しました: ${errorMessage(cause)}`);
        retry();
        throw cause;
      }
    },
    [repo, retry, userId],
  );

  const deleteMemo = useCallback(
    async (id: string) => {
      if (!repo || !userId) return;
      const operationUserId = userId;
      const currentMemos = memosRef.current;
      const index = currentMemos.findIndex((memo) => memo.id === id);
      if (index === -1) return;
      const deleted = currentMemos[index];

      remotelyDeletedIds.current.add(id);
      setMemos((current) => current.filter((memo) => memo.id !== id));

      try {
        await repo.remove(id);
      } catch (cause) {
        if (activeUserId.current !== operationUserId) return;
        toast.error(
          `削除結果を確認できませんでした。最新の状態を読み直します: ${errorMessage(cause)}`,
        );
        retry();
        return;
      }

      if (activeUserId.current !== operationUserId) return;
      // A connection fallback may have replaced the optimistic state with
      // a snapshot taken just before this delete committed. Re-assert the
      // confirmed delete so that stale snapshot cannot bring the row back.
      remotelyDeletedIds.current.add(id);
      setMemos((current) => current.filter((memo) => memo.id !== id));
      toast.success("話し終えたメモを削除しました", {
        duration: UNDO_WINDOW_MS,
        action: {
          label: "元に戻す",
          onClick: async () => {
            if (activeUserId.current !== operationUserId) {
              toast.error("アカウントが切り替わったため、元に戻せません。");
              return;
            }
            try {
              await repo.restore(deleted);
              if (activeUserId.current !== operationUserId) return;
              toast.success("メモを元に戻しました");
              retry();
            } catch (cause) {
              if (activeUserId.current !== operationUserId) return;
              toast.error(`元に戻せませんでした: ${errorMessage(cause)}`);
              retry();
            }
          },
        },
      });
      retry();
    },
    [repo, retry, userId],
  );

  return {
    memos: visibleMemos,
    isLoading: isCurrentOwner ? isLoading : Boolean(userId),
    error: isCurrentOwner ? error : null,
    retry,
    addMemo,
    deleteMemo,
  };
}

