import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Plus, X } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  description: string;
  importance: number; // 1-3 (1: 低, 2: 中, 3: 高)
  urgency: number; // 1-3 (1: 低, 2: 中, 3: 高)
  duration: 'quick' | 'long'; // 'quick': すぐ終わる, 'long': 時間かかる
  isToday: boolean;
  completed: boolean;
  createdAt: Date;
}

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  editingTask?: Task;
  onCancel?: () => void;
  showCloseButton?: boolean;
}

const importanceLabels = {
  1: "低",
  2: "中", 
  3: "高"
};

const urgencyLabels = {
  1: "低",
  2: "中",
  3: "高"
};

export function TaskForm({ onSubmit, editingTask, onCancel, showCloseButton }: TaskFormProps) {
  const [title, setTitle] = useState(editingTask?.title || "");
  const [description, setDescription] = useState(editingTask?.description || "");
  const [importance, setImportance] = useState<number>(editingTask?.importance || 2);
  const [urgency, setUrgency] = useState<number>(editingTask?.urgency || 2);
  const [duration, setDuration] = useState<'quick' | 'long'>(editingTask?.duration || 'quick');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      importance,
      urgency,
      duration,
      isToday: editingTask?.isToday || false,
      completed: editingTask?.completed || false,
    });

    // フォームをリセット（編集中でない場合）
    if (!editingTask) {
      setTitle("");
      setDescription("");
      setImportance(2);
      setUrgency(2);
      setDuration('quick');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingTask ? "タスクを編集" : "新しいタスクを追加"}
          </CardTitle>
          {showCloseButton && onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-auto p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          タスクの詳細と重要度・緊急度を設定してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">タスク名</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスク名を入力してください"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="タスクの詳細を入力してください"
              rows={3}
            />
          </div>

          <div className="flex gap-6">
            <div className="space-y-2">
              <Label htmlFor="importance">重要度</Label>
              <Select 
                value={importance.toString()} 
                onValueChange={(value) => setImportance(Number(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(importanceLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">緊急度</Label>
              <Select 
                value={urgency.toString()} 
                onValueChange={(value) => setUrgency(Number(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(urgencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>完了時間</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={duration === 'quick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDuration('quick')}
              >
                すぐ終わる
              </Button>
              <Button
                type="button"
                variant={duration === 'long' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDuration('long')}
              >
                時間かかる
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
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