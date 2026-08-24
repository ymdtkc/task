export type TalkMemoImportance = 1 | 2 | 3;

export interface TalkMemo {
  id: string;
  recipient: string;
  content: string;
  importance: TalkMemoImportance;
  createdAt: Date;
}

export type NewTalkMemo = Pick<
  TalkMemo,
  "recipient" | "content" | "importance"
>;

