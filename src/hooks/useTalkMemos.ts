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
  const memosRef = useRef<TalkMemo[]>([]);
  const remotelyDeletedIds = useRef<Set<string>>(new Set());
  const activeUserId = useRef<string | null>(userId);
  activeUserId.current = userId;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    memosRef.current = memos;
  }, [memos]);

  useEffect(() => {
    remotelyDeletedIds.current = new Set();
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setMemos([]);
    setError(null);

    if (!repo) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    repo
      .list()
      .then((loaded) => {
        if (!cancelled && activeUserId.current === userId) {
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
        if (!cancelled && activeUserId.current === userId) {
          setError(errorMessage(cause));
        }
      })
      .finally(() => {
        if (!cancelled && activeUserId.current === userId) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo, retryKey, userId]);

  useRealtimeTalkMemos(
    userId,
    setMemos,
    remotelyDeletedIds,
    activeUserId,
  );

  const retry = useCallback(() => setRetryKey((value) => value + 1), []);

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
        const created = await repo.create(input);
        if (activeUserId.current !== operationUserId) return;
        setMemos((current) => [
          created,
          ...current.filter(
            (memo) => memo.id !== tempId && memo.id !== created.id,
          ),
        ]);
        toast.success("話したいことを追加しました");
      } catch (cause) {
        if (activeUserId.current !== operationUserId) return;
        setMemos((current) =>
          current.filter((memo) => memo.id !== tempId),
        );
        toast.error(`追加に失敗しました: ${errorMessage(cause)}`);
        throw cause;
      }
    },
    [repo, userId],
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
        remotelyDeletedIds.current.delete(id);
        setMemos((current) => {
          if (current.some((memo) => memo.id === deleted.id)) return current;
          const restored = [...current];
          restored.splice(Math.min(index, restored.length), 0, deleted);
          return restored;
        });
        toast.error(`削除に失敗しました: ${errorMessage(cause)}`);
        return;
      }

      if (activeUserId.current !== operationUserId) return;
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
              const restoredMemo = await repo.restore(deleted);
              if (activeUserId.current !== operationUserId) return;
              remotelyDeletedIds.current.delete(restoredMemo.id);
              setMemos((current) => {
                if (current.some((memo) => memo.id === restoredMemo.id)) {
                  return current;
                }
                const restored = [...current];
                restored.splice(
                  Math.min(index, restored.length),
                  0,
                  restoredMemo,
                );
                return restored;
              });
              toast.success("メモを元に戻しました");
            } catch (cause) {
              toast.error(`元に戻せませんでした: ${errorMessage(cause)}`);
            }
          },
        },
      });
    },
    [repo, userId],
  );

  return {
    memos,
    isLoading,
    error,
    retry,
    addMemo,
    deleteMemo,
  };
}
