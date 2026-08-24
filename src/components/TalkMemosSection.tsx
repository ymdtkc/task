import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  Loader2,
  MessageSquareText,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import type {
  NewTalkMemo,
  TalkMemo,
  TalkMemoImportance,
} from "../types/talkMemo";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const IMPORTANCE_GROUPS: Array<{
  value: TalkMemoImportance;
  label: string;
  description: string;
}> = [
  { value: 3, label: "高", description: "忘れずに話したい" },
  { value: 2, label: "中", description: "次の機会に話したい" },
  { value: 1, label: "低", description: "余裕があれば話したい" },
];

export interface TalkMemosSectionProps {
  isSignedIn: boolean;
  memos: TalkMemo[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onAdd: (input: NewTalkMemo) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TalkMemosSection({
  isSignedIn,
  memos,
  isLoading,
  error,
  onRetry,
  onAdd,
  onDelete,
}: TalkMemosSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [content, setContent] = useState("");
  const [importance, setImportance] = useState<TalkMemoImportance>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<TalkMemo | null>(null);

  const sortedMemos = useMemo(
    () =>
      [...memos].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    [memos],
  );

  useEffect(() => {
    if (
      selectedMemo &&
      !memos.some((memo) => memo.id === selectedMemo.id)
    ) {
      setSelectedMemo(null);
    }
  }, [memos, selectedMemo]);

  const resetForm = () => {
    setRecipient("");
    setContent("");
    setImportance(2);
  };

  const handleAddOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) resetForm();
    setIsAddOpen(open);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedRecipient = recipient.trim();
    const trimmedContent = content.trim();
    if (!trimmedRecipient || !trimmedContent || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        recipient: trimmedRecipient,
        content: trimmedContent,
        importance,
      });
      resetForm();
      setIsAddOpen(false);
    } catch {
      // The data hook has already shown a useful error toast. Keeping the
      // dialog open lets the user retry without retyping the memo.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!selectedMemo) return;
    const id = selectedMemo.id;
    setSelectedMemo(null);
    void onDelete(id);
  };

  return (
    <section className="talk-memos" aria-labelledby="talk-memos-title">
      <div className="talk-memos__header">
        <div className="talk-memos__heading">
          <span className="talk-memos__heading-icon" aria-hidden="true">
            <MessageSquareText />
          </span>
          <div>
            <h2 id="talk-memos-title" className="talk-memos__title">
              話したいこと
            </h2>
            <p className="talk-memos__subtitle">
              人ごとに、次に話したいことを控えておけます
            </p>
          </div>
        </div>

        {isSignedIn && (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus aria-hidden="true" />
            追加
          </Button>
        )}
      </div>

      {!isSignedIn ? (
        <div className="talk-memos__notice">
          <MessageSquareText aria-hidden="true" />
          <div>
            <p className="talk-memos__notice-title">ログインすると利用できます</p>
            <p className="talk-memos__notice-text">
              同じGoogleアカウントでログインすれば、どの端末でも同じ内容を確認できます。
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="talk-memos__status" role="status">
          <Loader2 className="talk-memos__spinner" aria-hidden="true" />
          読み込み中...
        </div>
      ) : error ? (
        <div className="talk-memos__error" role="alert">
          <AlertCircle aria-hidden="true" />
          <div className="talk-memos__error-content">
            <p>話したいことを読み込めませんでした。</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              再試行
            </Button>
          </div>
        </div>
      ) : memos.length === 0 ? (
        <div className="talk-memos__empty">
          <MessageSquareText aria-hidden="true" />
          <p>まだメモはありません</p>
          <span>「追加」から、次に話したいことを残せます。</span>
        </div>
      ) : (
        <div className="talk-memos__groups">
          {IMPORTANCE_GROUPS.map((group) => {
            const groupMemos = sortedMemos.filter(
              (memo) => memo.importance === group.value,
            );
            return (
              <div
                key={group.value}
                className={`talk-memos__group talk-memos__group--${group.value}`}
              >
                <div className="talk-memos__group-header">
                  <div>
                    <h3 className="talk-memos__group-title">
                      重要度：{group.label}
                    </h3>
                    <p>{group.description}</p>
                  </div>
                  <span className="talk-memos__count">{groupMemos.length}</span>
                </div>

                <div className="talk-memos__list">
                  {groupMemos.length === 0 ? (
                    <p className="talk-memos__group-empty">ありません</p>
                  ) : (
                    groupMemos.map((memo) => (
                      <button
                        key={memo.id}
                        type="button"
                        className="talk-memos__item"
                        onClick={() => setSelectedMemo(memo)}
                        aria-label={`${memo.recipient}宛てのメモを開く`}
                      >
                        <span className="talk-memos__recipient">
                          <UserRound aria-hidden="true" />
                          <span>{memo.recipient}</span>
                        </span>
                        <span className="talk-memos__preview">
                          {memo.content}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={handleAddOpenChange}>
        <DialogContent className="talk-memos__dialog">
          <DialogHeader>
            <DialogTitle>話したいことを追加</DialogTitle>
            <DialogDescription>
              相手と内容、重要度だけを入力します。
            </DialogDescription>
          </DialogHeader>

          <form className="talk-memos__form" onSubmit={handleSubmit}>
            <div className="talk-memos__field">
              <Label htmlFor="talk-memo-recipient">誰に</Label>
              <Input
                id="talk-memo-recipient"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="例：田中さん"
                maxLength={100}
                autoFocus
                required
              />
            </div>

            <div className="talk-memos__field">
              <Label htmlFor="talk-memo-content">話したいこと</Label>
              <Textarea
                id="talk-memo-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="話したい内容を入力してください"
                maxLength={4000}
                rows={5}
                required
              />
            </div>

            <fieldset className="talk-memos__field">
              <legend className="talk-memos__legend">重要度</legend>
              <div className="talk-memos__importance-picker">
                {IMPORTANCE_GROUPS.map((option) => (
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddOpenChange(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={
                  !recipient.trim() || !content.trim() || isSubmitting
                }
              >
                {isSubmitting ? "追加中..." : "追加する"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedMemo !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMemo(null);
        }}
      >
        <DialogContent className="talk-memos__dialog">
          {selectedMemo && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMemo.recipient}</DialogTitle>
                <DialogDescription>
                  重要度：
                  {
                    IMPORTANCE_GROUPS.find(
                      (group) => group.value === selectedMemo.importance,
                    )?.label
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="talk-memos__detail-content">
                {selectedMemo.content}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedMemo(null)}
                >
                  閉じる
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 aria-hidden="true" />
                  話し終えたので削除
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

