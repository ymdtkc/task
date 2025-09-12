import { Task } from "./TaskForm";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Calendar, Edit2, Star, Trash2, Zap, Clock } from "lucide-react";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onToggleToday: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  showTodayToggle?: boolean;
  showDescription?: boolean;
  showImportanceUrgency?: boolean;
}

const importanceColors = {
  1: "bg-green-100 text-green-800 border-green-200",
  2: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  3: "bg-red-100 text-red-800 border-red-200"
};

const urgencyColors = {
  1: "bg-blue-100 text-blue-800 border-blue-200",
  2: "bg-orange-100 text-orange-800 border-orange-200",
  3: "bg-purple-100 text-purple-800 border-purple-200"
};

const importanceLabels = { 1: "低", 2: "中", 3: "高" };
const urgencyLabels = { 1: "低", 2: "中", 3: "高" };
const durationLabels = { quick: "すぐ終わる", long: "時間かかる" };
const durationColors = {
  quick: "bg-green-100 text-green-800 border-green-200",
  long: "bg-orange-100 text-orange-800 border-orange-200"
};

export function TaskItem({ 
  task, 
  onToggleComplete, 
  onToggleToday, 
  onEdit, 
  onDelete,
  showTodayToggle = true,
  showDescription = true,
  showImportanceUrgency = true
}: TaskItemProps) {
  return (
    <Card className={`transition-all duration-200 ${task.completed ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => onToggleComplete(task.id)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <CardTitle className={`${task.completed ? 'line-through' : ''}`}>
              {task.title}
            </CardTitle>
            {showDescription && task.description && (
              <CardDescription className="mt-1">
                {task.description}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {showImportanceUrgency && (
              <Badge className={`${importanceColors[task.importance as keyof typeof importanceColors]} flex items-center gap-1`}>
                <Star className="h-3 w-3" />
                重要度: {importanceLabels[task.importance as keyof typeof importanceLabels]}
              </Badge>
            )}
            {showImportanceUrgency && (
              <Badge className={`${urgencyColors[task.urgency as keyof typeof urgencyColors]} flex items-center gap-1`}>
                <Zap className="h-3 w-3" />
                緊急度: {urgencyLabels[task.urgency as keyof typeof urgencyLabels]}
              </Badge>
            )}
            {task.duration && (
              <Badge className={`${durationColors[task.duration]} flex items-center gap-1`}>
                <Clock className="h-3 w-3" />
                {durationLabels[task.duration]}
              </Badge>
            )}
            {task.isToday && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                今日
              </Badge>
            )}
          </div>
          {showTodayToggle && (
            <Button
              variant={task.isToday ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleToday(task.id)}
              className="flex items-center gap-1"
            >
              <Calendar className="h-3 w-3" />
              {task.isToday ? "今日から削除" : "今日に追加"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}