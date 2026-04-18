import { useState, useEffect, useRef } from "react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TaskForm, Task } from "./components/TaskForm";
import { TaskList } from "./components/TaskList";
import { TaskMatrix } from "./components/TaskMatrix";
import { TodaysTasks } from "./components/TodaysTasks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Alert, AlertDescription } from "./components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { CheckCircle, List, Grid3X3, Calendar, Plus, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { downloadExport, formatRelativeTime, parseImport, mergeAppend } from "./lib/taskIO";
import { AuthButtons } from "./components/AuthButtons";

const LAST_EXPORTED_AT_KEY = "lastExportedAt";
const UNDO_WINDOW_MS = 8000;
const RESTORE_TOAST_MS = 2000;

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(() =>
    localStorage.getItem(LAST_EXPORTED_AT_KEY)
  );
  const [pendingImport, setPendingImport] = useState<Task[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ローカルストレージからタスクを読み込み
  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks).map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          // 既存タスクにdurationフィールドがない場合のデフォルト値
          duration: task.duration || 'quick'
        }));
        setTasks(parsedTasks);
      } catch (error) {
        console.error("Failed to load tasks from localStorage:", error);
      }
    }
  }, []);

  // タスクをローカルストレージに保存
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // タブ切り替え時のフォーム表示状態管理
  useEffect(() => {
    if (activeTab === "list") {
      setShowForm(true);
    } else {
      setShowForm(false);
    }
    setEditingTask(null);
  }, [activeTab]);

  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };
    
    setTasks(prev => [newTask, ...prev]);
    // 一覧タブの場合はフォームを開いたまま、その他のタブでは閉じる
    if (activeTab !== "list") {
      setShowForm(false);
    } else {
      // 一覧タブでは追加後もフォームを表示し続ける
      setShowForm(true);
    }
    toast.success("タスクを追加しました");
  };

  const handleUpdateTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!editingTask) return;
    
    setTasks(prev => 
      prev.map(task => 
        task.id === editingTask.id 
          ? { ...taskData, id: editingTask.id, createdAt: editingTask.createdAt }
          : task
      )
    );
    setEditingTask(null);
    toast.success("タスクを更新しました");
  };

  const handleToggleComplete = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
    toast.success(newCompleted ? "タスクを完了しました" : "タスクを未完了にしました");
  };

  const handleToggleToday = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newIsToday = !task.isToday;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isToday: newIsToday } : t));
    toast.success(newIsToday ? "今日のタスクに追加しました" : "今日のタスクから削除しました");
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDeleteTask = (id: string) => {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;
    const deleted = tasks[index];

    setTasks(prev => prev.filter(t => t.id !== id));

    toast.success("タスクを削除しました", {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "元に戻す",
        onClick: () => {
          setTasks(prev => [...prev.slice(0, index), deleted, ...prev.slice(index)]);
          toast.success("タスクを復元しました", { duration: RESTORE_TOAST_MS });
        },
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setShowForm(false);
  };

  const handleExport = () => {
    const iso = downloadExport(tasks);
    localStorage.setItem(LAST_EXPORTED_AT_KEY, iso);
    setLastExportedAt(iso);
    toast.success(`エクスポートしました（${tasks.length}件）`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // リセット：同じファイルを再選択できるように
    e.target.value = "";
    if (!file) return;

    const text = await file.text();
    const result = parseImport(text);
    if (!result.ok) {
      toast.error(`インポートに失敗しました: ${result.error}`);
      return;
    }
    if (result.tasks.length === 0) {
      toast.error("インポートするタスクがありません");
      return;
    }
    setPendingImport(result.tasks);
  };

  const handleConfirmImport = (mode: "overwrite" | "append") => {
    if (!pendingImport) return;
    const count = pendingImport.length;
    if (mode === "overwrite") {
      setTasks(pendingImport);
      toast.success(`${count}件のタスクで上書きしました`);
    } else {
      setTasks((prev) => mergeAppend(prev, pendingImport));
      toast.success(`${count}件のタスクを追加しました`);
    }
    setPendingImport(null);
  };

  const handleMoveTask = (taskId: string, newImportance: number, newUrgency: number) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, importance: newImportance, urgency: newUrgency }
          : task
      )
    );
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const importanceLabels = { 1: "低", 2: "中", 3: "高" };
      const urgencyLabels = { 1: "低", 2: "中", 3: "高" };
      toast.success(
        `${task.title} を移動しました\n重要度: ${importanceLabels[newImportance as keyof typeof importanceLabels]}, 緊急度: ${urgencyLabels[newUrgency as keyof typeof urgencyLabels]}`
      );
    }
  };

  const todaysTasks = tasks.filter(task => task.isToday);
  const completedCount = tasks.filter(task => task.completed).length;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-7xl">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="mb-0">タスク管理ツール</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={tasks.length === 0}
                title={tasks.length === 0 ? "エクスポートするタスクがありません" : undefined}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                エクスポート
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportClick}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                インポート
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFileSelected}
              />
              <AuthButtons />
            </div>
          </div>

          {lastExportedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              最終バックアップ: {formatRelativeTime(lastExportedAt)}
            </p>
          )}

          {tasks.length > 0 && (
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <List className="h-4 w-4" />
                全タスク: {tasks.length}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                完了: {completedCount}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                今日: {todaysTasks.length}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* タスク追加フォーム */}
          {showForm && (
            <div className="mb-6">
              <TaskForm
                onSubmit={editingTask ? handleUpdateTask : handleAddTask}
                editingTask={editingTask || undefined}
                onCancel={handleCancelEdit}
                showCloseButton={!editingTask}
              />
            </div>
          )}

          {/* タブナビゲーション */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList className="grid w-full sm:w-auto grid-cols-3">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  一覧
                </TabsTrigger>
                <TabsTrigger value="today" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  今日
                </TabsTrigger>
                <TabsTrigger value="matrix" className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  マトリクス
                </TabsTrigger>
              </TabsList>
              
              {!showForm && (
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  新しいタスク
                </Button>
              )}
            </div>

            <TabsContent value="list" className="space-y-6">
              <TaskList
                tasks={tasks}
                onToggleComplete={handleToggleComplete}
                onToggleToday={handleToggleToday}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </TabsContent>

            <TabsContent value="today" className="space-y-6">
              <TodaysTasks
                tasks={tasks}
                onToggleComplete={handleToggleComplete}
                onToggleToday={handleToggleToday}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </TabsContent>

            <TabsContent value="matrix" className="space-y-6">
              <TaskMatrix
                tasks={tasks}
                onToggleComplete={handleToggleComplete}
                onToggleToday={handleToggleToday}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onMoveTask={handleMoveTask}
              />
            </TabsContent>


          </Tabs>

          {/* 初回利用時のガイド */}
          {tasks.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                タスク管理を始めましょう！「新しいタスク」ボタンからタスクを作成できます。
                重要度と緊急度を設定して、効率的にタスクを管理しましょう。
              </AlertDescription>
            </Alert>
          )}
        </div>
        </div>
      </div>

      <Dialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>インポート方法を選択</DialogTitle>
            <DialogDescription>
              {pendingImport?.length ?? 0}件のタスクを読み込みました。
              現在のタスク（{tasks.length}件）をどう扱いますか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPendingImport(null)}>
              キャンセル
            </Button>
            <Button variant="outline" onClick={() => handleConfirmImport("append")}>
              追加
            </Button>
            <Button variant="destructive" onClick={() => handleConfirmImport("overwrite")}>
              上書き
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </DndProvider>
  );
}