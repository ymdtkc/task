import { Task } from "./TaskForm";
import { TaskItem } from "./TaskItem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar, CheckCircle2 } from "lucide-react";

interface TodaysTasksProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onToggleToday: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TodaysTasks({ tasks, onToggleComplete, onToggleToday, onEdit, onDelete }: TodaysTasksProps) {
  const todaysTasks = tasks.filter(task => task.isToday);
  const completedToday = todaysTasks.filter(task => task.completed);
  const pendingToday = todaysTasks.filter(task => !task.completed);
  
  // 重要度・緊急度・完了時間順でソート
  const sortedPendingTasks = pendingToday.sort((a, b) => {
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

  const completionRate = todaysTasks.length > 0 
    ? Math.round((completedToday.length / todaysTasks.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Calendar className="h-5 w-5" />
            今日のタスク
          </CardTitle>
          <CardDescription>
            今日取り組むタスクを管理します
          </CardDescription>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="text-blue-800 border-blue-300">
              全て: {todaysTasks.length}
            </Badge>
            <Badge variant="outline" className="text-green-800 border-green-300">
              完了: {completedToday.length}
            </Badge>
            <Badge variant="outline" className="text-orange-800 border-orange-300">
              残り: {pendingToday.length}
            </Badge>
            <Badge variant="outline" className="text-purple-800 border-purple-300">
              進捗: {completionRate}%
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {todaysTasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              今日のタスクがありません。
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              タスク一覧やマトリクスから「今日に追加」をクリックしてタスクを追加してください。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 未完了のタスク */}
          {pendingToday.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3>今日やるタスク</h3>
                <Badge variant="outline">
                  {pendingToday.length}件
                </Badge>
              </div>
              <div className="space-y-3">
                {sortedPendingTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={onToggleComplete}
                    onToggleToday={onToggleToday}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    showTodayToggle={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 完了済みのタスク */}
          {completedToday.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3>今日完了したタスク</h3>
                <Badge variant="outline" className="text-green-800 border-green-300">
                  {completedToday.length}件
                </Badge>
              </div>
              <div className="space-y-3">
                {completedToday
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
                  })
                  .map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={onToggleComplete}
                      onToggleToday={onToggleToday}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      showTodayToggle={false}
                    />
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}