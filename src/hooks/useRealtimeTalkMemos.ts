import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import {
  talkMemoFromRow,
  type TalkMemoRow,
} from "../lib/talkMemosRepo";
import type { TalkMemo } from "../types/talkMemo";

export function useRealtimeTalkMemos(
  userId: string | null,
  setMemos: Dispatch<SetStateAction<TalkMemo[]>>,
  remotelyDeletedIds: MutableRefObject<Set<string>>,
  activeUserId: MutableRefObject<string | null>,
  onSubscribed: (subscribedUserId: string) => void,
  onConnectionError: (subscribedUserId: string) => void,
  retryKey: number,
) {
  useEffect(() => {
    if (!userId || !supabase) return;
    const client = supabase;
    let disposed = false;
    let connectionErrorReported = false;

    const applyRow = (row: TalkMemoRow) => {
      if (disposed || activeUserId.current !== userId) return;

      if (row.deleted_at) {
        remotelyDeletedIds.current.add(row.id);
        setMemos((current) => current.filter((item) => item.id !== row.id));
        return;
      }

      remotelyDeletedIds.current.delete(row.id);
      const memo = talkMemoFromRow(row);
      setMemos((current) => [
        memo,
        ...current.filter((item) => item.id !== memo.id),
      ]);
    };

    const channel = client
      .channel(`talk-memos-${userId}-${retryKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "talk_memos",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => applyRow(payload.new as TalkMemoRow),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "talk_memos",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => applyRow(payload.new as TalkMemoRow),
      )
      .subscribe((status) => {
        if (disposed || activeUserId.current !== userId) return;

        if (status === "SUBSCRIBED") {
          connectionErrorReported = false;
          onSubscribed(userId);
          return;
        }

        if (
          !connectionErrorReported &&
          (status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED")
        ) {
          connectionErrorReported = true;
          onConnectionError(userId);
          toast.error(
            "自動同期に接続できません。別の端末での変更を見るには、画面を再読み込みしてください。",
            { id: "talk-memos-realtime-error" },
          );
        }
      });

    return () => {
      disposed = true;
      client.removeChannel(channel);
    };
  }, [
    activeUserId,
    onConnectionError,
    onSubscribed,
    remotelyDeletedIds,
    retryKey,
    setMemos,
    userId,
  ]);
}

