import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { X, Star, Zap, Clock } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  description?: string;
  importance: number; // 1-3 (低-高)
  urgency: number; // 1-3 (低-高)
  completed: boolean;
  isToday: boolean;
  createdAt: Date;
  duration: 'quick' | 'long'; // 完了時間
}

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  editingTask?: Task;
  onCancel?: () => void;
  showCloseButton?: boolean;
}

const importanceLabels = { 1: "低", 2: "中", 3: "高" };
const urgencyLabels = { 1: "低", 2: "中", 3: "高" };
const durationLabels = { quick: "すぐ終わる", long: "時間かかる" };

const importanceColors = {
  1: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  2: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200", 
  3: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
};

const urgencyColors = {
  1: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
  2: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
  3: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200"
};

const durationColors = {
  quick: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
  long: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200"
};

export function TaskForm({ onSubmit, editingTask, onCancel, showCloseButton = false }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState<number>(2);
  const [urgency, setUrgency] = useState<number>(2);
  const [isToday, setIsToday] = useState(false);
  const [duration, setDuration] = useState<'quick' | 'long'>('quick');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || "");
      setImportance(editingTask.importance);
      setUrgency(editingTask.urgency);
      setIsToday(editingTask.isToday);
      setDuration(editingTask.duration);
    } else {
      // 新規作成時はフォームをリセット
      setTitle("");
      setDescription("");
      setImportance(2);
      setUrgency(2);
      setIsToday(false);
      setDuration('quick');
    }
  }, [editingTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      importance,
      urgency,
      completed: false,
      isToday,
      duration
    });

    // 編集中でない場合のみフォームをリセット（連続追加のため）
    if (!editingTask) {
      setTitle("");
      setDescription("");
      setImportance(2);
      setUrgency(2);
      setIsToday(false);
      setDuration('quick');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {editingTask ? "タスクを編集" : "新しいタスク"}
            </CardTitle>
            <CardDescription>
              {editingTask 
                ? "タスクの内容を変更できます" 
                : "重要度と緊急度を設定してタスクを追加しましょう"
              }
            </CardDescription>
          </div>
          {(showCloseButton || editingTask) && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">タイトル *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タスクのタイトルを入力"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="タスクの詳細を入力（任意）"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4" />
                重要度
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((level) => (
                  <Badge
                    key={level}
                    variant="outline"
                    className={`cursor-pointer text-center justify-center py-2 transition-colors ${
                      importance === level 
                        ? importanceColors[level as keyof typeof importanceColors]
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setImportance(level)}
                  >
                    {importanceLabels[level as keyof typeof importanceLabels]}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4" />
                緊急度
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((level) => (
                  <Badge
                    key={level}
                    variant="outline"
                    className={`cursor-pointer text-center justify-center py-2 transition-colors ${
                      urgency === level 
                        ? urgencyColors[level as keyof typeof urgencyColors]
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setUrgency(level)}
                  >
                    {urgencyLabels[level as keyof typeof urgencyLabels]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              完了時間
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(['quick', 'long'] as const).map((dur) => (
                <Badge
                  key={dur}
                  variant="outline"
                  className={`cursor-pointer text-center justify-center py-2 transition-colors ${
                    duration === dur 
                      ? durationColors[dur]
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setDuration(dur)}
                >
                  {durationLabels[dur]}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isToday}
                onChange={(e) => setIsToday(e.target.checked)}
                className="rounded"
              />
              今日やる
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">
              {editingTask ? "更新" : "追加"}
            </Button>
            {editingTask && onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                キャンセル
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}