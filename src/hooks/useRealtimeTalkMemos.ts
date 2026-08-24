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
) {
  useEffect(() => {
    if (!userId || !supabase) return;
    const client = supabase;

    const applyRow = (row: TalkMemoRow) => {
      if (activeUserId.current !== userId) return;

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
      .channel(`talk-memos-${userId}`)
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
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          toast.error(
            "話したいことの自動同期に接続できませんでした。画面を再読み込みしてください。",
            { id: "talk-memos-realtime-error" },
          );
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [activeUserId, remotelyDeletedIds, setMemos, userId]);
}
