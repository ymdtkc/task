import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  GripVertical,
  Loader2,
  MessageSquareText,
  Trash2,
  UserRound,
} from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
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

const TALK_MEMO_DRAG_TYPE = "talk-memo";

interface TalkMemoDragItem {
  id: string;
  importance: TalkMemoImportance;
}

interface TalkMemoCardProps {
  memo: TalkMemo;
  isMoving: boolean;
  onOpen: (id: string) => void;
}

function TalkMemoCard({ memo, isMoving, onOpen }: TalkMemoCardProps) {
  const cannotMove = isMoving || memo.id.startsWith("temp-");
  const [{ isDragging }, drag, preview] = useDrag<
    TalkMemoDragItem,
    unknown,
    { isDragging: boolean }
  >(
    () => ({
      type: TALK_MEMO_DRAG_TYPE,
      item: { id: memo.id, importance: memo.importance },
      canDrag: !cannotMove,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [memo.id, memo.importance, cannotMove],
  );

  return (
    <div
      ref={(node) => {
        preview(node);
      }}
      className="talk-memos__card"
      data-dragging={isDragging}
      aria-busy={isMoving}
    >
      <button
        type="button"
        className="talk-memos__item"
        onClick={() => onOpen(memo.id)}
        aria-label={`${memo.recipient}宛てのメモを開く`}
      >
        <span className="talk-memos__recipient">
          <UserRound aria-hidden="true" />
          <span>{memo.recipient}</span>
        </span>
        <span className="talk-memos__preview">{memo.content}</span>
      </button>
      <span
        ref={(node) => {
          drag(node);
        }}
        className="talk-memos__drag-handle"
        data-disabled={cannotMove}
        aria-hidden="true"
        title={isMoving ? "保存中..." : "ここをドラッグして重要度を変更"}
      >
        {isMoving ? <Loader2 className="talk-memos__spinner" /> : <GripVertical />}
      </span>
    </div>
  );
}

interface TalkMemoGroupProps {
  group: (typeof IMPORTANCE_GROUPS)[number];
  memos: TalkMemo[];
  movingMemoIds: ReadonlySet<string>;
  onOpen: (id: string) => void;
  onMove: (id: string, importance: TalkMemoImportance) => Promise<void>;
}

function TalkMemoGroup({
  group,
  memos,
  movingMemoIds,
  onOpen,
  onMove,
}: TalkMemoGroupProps) {
  const [{ isOver, canDrop }, drop] = useDrop<
    TalkMemoDragItem,
    unknown,
    { isOver: boolean; canDrop: boolean }
  >(
    () => ({
      accept: TALK_MEMO_DRAG_TYPE,
      canDrop: (item) =>
        item.importance !== group.value &&
        !item.id.startsWith("temp-") &&
        !movingMemoIds.has(item.id),
      drop: (item) => {
        if (
          item.importance !== group.value &&
          !item.id.startsWith("temp-") &&
          !movingMemoIds.has(item.id)
        ) {
          void onMove(item.id, group.value);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [group.value, movingMemoIds, onMove],
  );

  return (
    <div
      ref={(node) => {
        drop(node);
      }}
      className={`talk-memos__group talk-memos__group--${group.value}`}
      data-drop-active={isOver && canDrop}
      aria-label={`重要度：${group.label}`}
    >
      <div className="talk-memos__group-header">
        <div>
          <h3 className="talk-memos__group-title">重要度：{group.label}</h3>
          <p>{group.description}</p>
        </div>
        <span className="talk-memos__count">{memos.length}</span>
      </div>
      <div className="talk-memos__list">
        {memos.length === 0 ? (
          <p className="talk-memos__group-empty">
            {isOver && canDrop ? "ここにドロップ" : "ありません"}
          </p>
        ) : (
          memos.map((memo) => (
            <TalkMemoCard
              key={memo.id}
              memo={memo}
              isMoving={movingMemoIds.has(memo.id)}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}

export interface TalkMemosSectionProps {
  isSignedIn: boolean;
  memos: TalkMemo[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, importance: TalkMemoImportance) => Promise<void>;
  movingMemoIds: ReadonlySet<string>;
}

export function TalkMemosSection({
  isSignedIn,
  memos,
  isLoading,
  error,
  onRetry,
  onDelete,
  onMove,
  movingMemoIds,
}: TalkMemosSectionProps) {
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const selectedMemo = memos.find((memo) => memo.id === selectedMemoId) ?? null;
  const selectedMemoIsMoving = Boolean(
    selectedMemo && movingMemoIds.has(selectedMemo.id),
  );
  const selectedMemoCannotChange = Boolean(
    selectedMemo &&
      (selectedMemoIsMoving || selectedMemo.id.startsWith("temp-")),
  );

  const sortedMemos = useMemo(
    () =>
      [...memos].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    [memos],
  );

  useEffect(() => {
    if (
      selectedMemoId &&
      !isLoading &&
      !memos.some((memo) => memo.id === selectedMemoId)
    ) {
      setSelectedMemoId(null);
    }
  }, [memos, selectedMemoId, isLoading]);

  const handleDelete = () => {
    if (!selectedMemo || selectedMemoCannotChange) return;
    const id = selectedMemo.id;
    setSelectedMemoId(null);
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
            {isSignedIn && memos.length > 0 && (
              <p className="talk-memos__hint">
                パソコンでは右上の点をドラッグして重要度を変更。スマホではメモを開いて変更できます。
              </p>
            )}
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
              <TalkMemoGroup
                key={group.value}
                group={group}
                memos={groupMemos}
                movingMemoIds={movingMemoIds}
                onOpen={setSelectedMemoId}
                onMove={onMove}
              />
            );
          })}
        </div>
      )}

      <Dialog
        open={selectedMemoId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMemoId(null);
        }}
      >
        <DialogContent className="talk-memos__dialog">
          {selectedMemo ? (
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

              <fieldset
                className="talk-memos__field"
                disabled={selectedMemoCannotChange}
              >
                <legend className="talk-memos__legend">重要度を変更</legend>
                <div className="talk-memos__importance-picker">
                  {IMPORTANCE_GROUPS.map((group) => (
                    <button
                      key={group.value}
                      type="button"
                      className={`talk-memos__importance-option talk-memos__importance-option--${group.value}`}
                      data-selected={selectedMemo.importance === group.value}
                      aria-pressed={selectedMemo.importance === group.value}
                      disabled={selectedMemo.importance === group.value}
                      onClick={() => {
                        void onMove(selectedMemo.id, group.value);
                      }}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {selectedMemoIsMoving && (
                <div className="talk-memos__saving" role="status">
                  <Loader2 className="talk-memos__spinner" aria-hidden="true" />
                  保存中...
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedMemoId(null)}
                >
                  閉じる
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={selectedMemoCannotChange}
                >
                  <Trash2 aria-hidden="true" />
                  話し終えたので削除
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>メモを読み込み中</DialogTitle>
                <DialogDescription>最新の状態を確認しています。</DialogDescription>
              </DialogHeader>
              <div className="talk-memos__status" role="status">
                <Loader2 className="talk-memos__spinner" aria-hidden="true" />
                読み込み中...
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
