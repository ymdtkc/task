import { useState } from "react";
import type { FormEvent } from "react";
import { MessageSquareText } from "lucide-react";
import type { NewTalkMemo, TalkMemoImportance } from "../types/talkMemo";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const IMPORTANCE_OPTIONS: Array<{
  value: TalkMemoImportance;
  label: string;
}> = [
  { value: 3, label: "高" },
  { value: 2, label: "中" },
  { value: 1, label: "低" },
];

interface TalkMemoFormProps {
  onSubmit: (input: NewTalkMemo) => Promise<void>;
}

export function TalkMemoForm({
  onSubmit,
}: TalkMemoFormProps) {
  const [recipient, setRecipient] = useState("");
  const [content, setContent] = useState("");
  const [importance, setImportance] = useState<TalkMemoImportance>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedRecipient = recipient.trim();
    const trimmedContent = content.trim();
    if (!trimmedRecipient || !trimmedContent || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        recipient: trimmedRecipient,
        content: trimmedContent,
        importance,
      });
      setRecipient("");
      setContent("");
      setImportance(2);
    } catch {
      // The data hook shows the error. Keep the values so the user can retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" />
            話したいことを追加
          </CardTitle>
        </div>
        <CardDescription>
          相手・内容・重要度だけを、すぐにメモできます
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="talk-memos__form" onSubmit={handleSubmit}>
          <div className="talk-memo-form__top-row">
            <div className="talk-memos__field">
              <Label htmlFor="quick-talk-memo-recipient">誰に</Label>
              <Input
                id="quick-talk-memo-recipient"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="例：田中さん"
                maxLength={100}
                required
              />
            </div>

            <fieldset className="talk-memos__field">
              <legend className="talk-memos__legend">重要度</legend>
              <div className="talk-memos__importance-picker">
                {IMPORTANCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`talk-memos__importance-option talk-memos__importance-option--${option.value}`}
                    data-selected={importance === option.value}
                    aria-pressed={importance === option.value}
                    onClick={() => setImportance(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="talk-memos__field">
            <Label htmlFor="quick-talk-memo-content">話したいこと</Label>
            <Textarea
              id="quick-talk-memo-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="話したい内容を入力してください"
              maxLength={4000}
              rows={3}
              required
            />
          </div>

          <div className="talk-memo-form__actions">
            <Button
              type="submit"
              className="talk-memo-form__submit"
              disabled={!recipient.trim() || !content.trim() || isSubmitting}
            >
              {isSubmitting ? "追加中..." : "追加する"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
