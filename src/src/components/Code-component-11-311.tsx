import { useState } from "react";
import { Task } from "./TaskForm";
import { TaskItem } from "./TaskItem";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Filter } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onToggleToday: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  title?: string;
  showCompleted?: boolean;
  showTodayToggle?: boolean;
}

export function TaskList({ 
  tasks, 
  onToggleComplete, 
  onToggleToday, 
  onEdit, 
  onDelete,
  title = "タスク一覧",
  showCompleted = true,
  showTodayToggle = true
}: TaskListProps) {
  const [importanceFilter, setImportanceFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTasks = tasks.filter(task => {
    // 重要度フィルター
    const matchesImportance = importanceFilter === "all" || 
                             task.importance.toString() === importanceFilter;
    
    // 緊急度フィルター
    const matchesUrgency = urgencyFilter === "all" || 
                          task.urgency.toString() === urgencyFilter;
    
    // ステータスフィルター
    let matchesStatus = true;
    if (statusFilter === "completed") {
      matchesStatus = task.completed;
    } else if (statusFilter === "pending") {
      matchesStatus = !task.completed;
    } else if (statusFilter === "today") {
      matchesStatus = task.isToday;
    }
    
    return matchesImportance && matchesUrgency && matchesStatus;
  });

  // 完了済みタスクの表示制御とソート
  const displayTasks = (showCompleted ? filteredTasks : filteredTasks.filter(task => !task.completed))
    .sort((a, b) => {
      // 第一優先：重要度（高い順：3 > 2 > 1）
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      
      // 第二優先：緊急度（高い順：3 > 2 > 1）
      if (a.urgency !== b.urgency) {
        return b.urgency - a.urgency;
      }
      
      // 第三優先：完了時間（すぐ終わる > 時間がかかる）
      if (a.duration !== b.duration) {
        return a.duration === 'quick' ? -1 : 1;
      }
      
      // 最後は作成日時でソート（新しい順）
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const completedCount = tasks.filter(task => task.completed).length;
  const todayCount = tasks.filter(task => task.isToday && !task.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>{title}</h2>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">
              全て: {tasks.length}
            </Badge>
            <Badge variant="outline">
              完了: {completedCount}
            </Badge>
            <Badge variant="outline">
              今日: {todayCount}
            </Badge>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="pending">未完了</SelectItem>
                <SelectItem value="completed">完了済み</SelectItem>
                <SelectItem value="today">今日</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={importanceFilter} onValueChange={setImportanceFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="重要度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">重要度: 全て</SelectItem>
              <SelectItem value="3">高</SelectItem>
              <SelectItem value="2">中</SelectItem>
              <SelectItem value="1">低</SelectItem>
            </SelectContent>
          </Select>

          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="緊急度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">緊急度: 全て</SelectItem>
              <SelectItem value="3">高</SelectItem>
              <SelectItem value="2">中</SelectItem>
              <SelectItem value="1">低</SelectItem>
            </SelectContent>
          </Select>

          {(importanceFilter !== "all" || urgencyFilter !== "all" || statusFilter !== "all") && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setImportanceFilter("all");
                setUrgencyFilter("all");
                setStatusFilter("all");
              }}
            >
              フィルタークリア
            </Button>
          )}
        </div>
      </div>

      {/* タスクリスト */}
      <div className="space-y-3">
        {displayTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {tasks.length === 0 ? (
              <p>タスクがありません。新しいタスクを追加してください。</p>
            ) : (
              <p>フィルター条件に一致するタスクがありません。</p>
            )}
          </div>
        ) : (
          displayTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onToggleToday={onToggleToday}
              onEdit={onEdit}
              onDelete={onDelete}
              showTodayToggle={showTodayToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}