import { supabase } from "./supabase";
import type {
  NewTalkMemo,
  TalkMemo,
  TalkMemoImportance,
} from "../types/talkMemo";

export interface TalkMemosRepo {
  list(): Promise<TalkMemo[]>;
  create(input: NewTalkMemo): Promise<TalkMemo>;
  remove(id: string): Promise<void>;
  restore(memo: TalkMemo): Promise<TalkMemo>;
}

export type TalkMemoRow = {
  id: string;
  user_id: string;
  recipient: string;
  content: string;
  importance: number;
  created_at: string;
  deleted_at: string | null;
};

function toImportance(value: number): TalkMemoImportance {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error(`Invalid talk memo importance: ${value}`);
}

export function talkMemoFromRow(row: TalkMemoRow): TalkMemo {
  return {
    id: row.id,
    recipient: row.recipient,
    content: row.content,
    importance: toImportance(row.importance),
    createdAt: new Date(row.created_at),
  };
}

function toInsertPayload(input: NewTalkMemo, userId: string) {
  return {
    user_id: userId,
    recipient: input.recipient,
    content: input.content,
    importance: input.importance,
  };
}

export function createTalkMemosRepo(userId: string): TalkMemosRepo {
  if (!supabase) {
    throw new Error("[talkMemosRepo] Supabase client is not configured");
  }
  const client = supabase;

  return {
    async list() {
      const { data, error } = await client
        .from("talk_memos")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("importance", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => talkMemoFromRow(row as TalkMemoRow));
    },

    async create(input) {
      const { data, error } = await client
        .from("talk_memos")
        .insert(toInsertPayload(input, userId))
        .select()
        .single();
      if (error) throw error;
      return talkMemoFromRow(data as TalkMemoRow);
    },

    async remove(id) {
      const { error } = await client
        .from("talk_memos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId)
        .is("deleted_at", null);
      if (error) throw error;
    },

    async restore(memo) {
      const { data, error } = await client
        .from("talk_memos")
        .update({ deleted_at: null })
        .eq("id", memo.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      return talkMemoFromRow(data as TalkMemoRow);
    },
  };
}
