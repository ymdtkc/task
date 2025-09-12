import { useDrop } from "react-dnd";
import { Task } from "./TaskForm";
import { DraggableTaskItem } from "./DraggableTaskItem";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";

interface TaskMatrixProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onToggleToday: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMoveTask?: (
    taskId: string,
    newImportance: number,
    newUrgency: number,
  ) => void;
}

export function TaskMatrix({
  tasks,
  onToggleComplete,
  onToggleToday,
  onEdit,
  onDelete,
  onMoveTask,
}: TaskMatrixProps) {
  const getTasksByQuadrant = (
    importance: number,
    urgency: number,
  ) => {
    return tasks
      .filter(
        (task) =>
          task.importance === importance &&
          task.urgency === urgency &&
          !task.completed,
      )
      .sort((a, b) => {
        // 完了時間でソート（すぐ終わる > 時間かかる）
        if (a.duration !== b.duration) {
          return a.duration === "quick" ? -1 : 1;
        }
        // 同じ完了時間の場合は作成日時でソート（新しい順）
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      });
  };

  // ドロップゾーンコンポーネント
  function DropZone({
    importance,
    urgency,
    children,
    className,
  }: {
    importance: number;
    urgency: number;
    children: React.ReactNode;
    className?: string;
  }) {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: "task",
      drop: (item: { id: string; task: Task }) => {
        if (
          onMoveTask &&
          (item.task.importance !== importance ||
            item.task.urgency !== urgency)
        ) {
          onMoveTask(item.id, importance, urgency);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }));

    return (
      <div
        ref={drop}
        className={`${className} ${
          isOver && canDrop
            ? "ring-2 ring-blue-400 ring-offset-2"
            : ""
        } ${canDrop ? "transition-all duration-200" : ""}`}
      >
        {children}
      </div>
    );
  }

  const quadrants = [
    {
      importance: 3,
      urgency: 3,
      title: "重要 × 緊急",
      description: "最優先で対応",
      color: "border-red-200 bg-red-50",
      headerColor: "text-red-800",
    },
    {
      importance: 3,
      urgency: 2,
      title: "重要 × 中緊急",
      description: "なるはやで実行",
      color: "border-orange-200 bg-orange-50",
      headerColor: "text-orange-800",
    },
    {
      importance: 3,
      urgency: 1,
      title: "重要 × 低緊急",
      description: "じっくり取り組む",
      color: "border-yellow-200 bg-yellow-50",
      headerColor: "text-yellow-800",
    },
    {
      importance: 2,
      urgency: 3,
      title: "中重要 × 緊急",
      description: "早めに処理",
      color: "border-blue-200 bg-blue-50",
      headerColor: "text-blue-800",
    },
    {
      importance: 2,
      urgency: 2,
      title: "中重要 × 中緊急",
      description: "通常対応",
      color: "border-gray-200 bg-gray-50",
      headerColor: "text-gray-800",
    },
    {
      importance: 2,
      urgency: 1,
      title: "中重要 × 低緊急",
      description: "空き時間に対応",
      color: "border-green-200 bg-green-50",
      headerColor: "text-green-800",
    },
    {
      importance: 1,
      urgency: 3,
      title: "低重要 × 緊急",
      description: "手早く片付ける",
      color: "border-purple-200 bg-purple-50",
      headerColor: "text-purple-800",
    },
    {
      importance: 1,
      urgency: 2,
      title: "低重要 × 中緊急",
      description: "余裕があれば",
      color: "border-indigo-200 bg-indigo-50",
      headerColor: "text-indigo-800",
    },
    {
      importance: 1,
      urgency: 1,
      title: "低重要 × 低緊急",
      description: "やらない選択肢も",
      color: "border-slate-200 bg-slate-50",
      headerColor: "text-slate-800",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2>アイゼンハワーマトリクス</h2>
        <p className="text-muted-foreground">
          重要度と緊急度でタスクを分類して管理します（ドラッグ&ドロップで移動可能）
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quadrants.map((quadrant) => {
          const quadrantTasks = getTasksByQuadrant(
            quadrant.importance,
            quadrant.urgency,
          );

          return (
            <DropZone
              key={`${quadrant.importance}-${quadrant.urgency}`}
              importance={quadrant.importance}
              urgency={quadrant.urgency}
            >
              <Card
                className={`${quadrant.color} h-full min-h-[300px]`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle
                      className={`${quadrant.headerColor}`}
                    >
                      {quadrant.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={quadrant.headerColor}
                    >
                      {quadrantTasks.length}
                    </Badge>
                  </div>
                  <CardDescription>
                    {quadrant.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3 min-h-[200px]">
                    {quadrantTasks.length === 0 ? (
                      <div className="text-muted-foreground text-center py-12 flex flex-col items-center justify-center h-full">
                        <p>タスクがありません</p>
                        <p className="text-xs mt-1 opacity-70">
                          ここにタスクをドロップできます
                        </p>
                      </div>
                    ) : (
                      quadrantTasks.map((task) => (
                        <DraggableTaskItem
                          key={task.id}
                          task={task}
                          onToggleComplete={onToggleComplete}
                          onToggleToday={onToggleToday}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          showTodayToggle={false}
                          showDescription={false}
                          showImportanceUrgency={false}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </DropZone>
          );
        })}
      </div>
    </div>
  );
}