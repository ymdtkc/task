import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  MessageSquareText,
  Trash2,
  UserRound,
} from "lucide-react";
import type { TalkMemo, TalkMemoImportance } from "../types/talkMemo";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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
  onDelete: (id: string) => Promise<void>;
}

export function TalkMemosSection({
  isSignedIn,
  memos,
  isLoading,
  error,
  onRetry,
  onDelete,
}: TalkMemosSectionProps) {
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
          <span>画面上部の「話したいこと」から登録できます。</span>
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
