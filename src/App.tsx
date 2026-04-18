import { useState, useEffect, useRef, useMemo } from "react";
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
import { CheckCircle, List, Grid3X3, Calendar, Plus, Download, Upload, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "./components/ui/card";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { downloadExport, formatRelativeTime, parseImport } from "./lib/taskIO";
import { createLocalRepo, createSupabaseRepo, TasksRepo } from "./lib/tasksRepo";
import { AuthButtons } from "./components/AuthButtons";
import { MigrationPrompt } from "./components/MigrationPrompt";
import { useAuth } from "./hooks/useAuth";
import { useRealtimeTasks } from "./hooks/useRealtimeTasks";

const LAST_EXPORTED_AT_KEY = "lastExportedAt";
const UNDO_WINDOW_MS = 8000;
const RESTORE_TOAST_MS = 2000;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function App() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const repo: TasksRepo = useMemo(() => {
    if (userId) return createSupabaseRepo(userId);
    return createLocalRepo();
  }, [userId]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(() =>
    localStorage.getItem(LAST_EXPORTED_AT_KEY)
  );
  const [pendingImport, setPendingImport] = useState<Task[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load tasks whenever the repo changes (session change = user switch or
  // logout), or when the user explicitly retries via handleRetry.
  // Clearing first prevents a brief flash of the previous user's tasks
  // while the new list is in flight.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingTasks(true);
    setLoadError(null);
    setTasks([]);
    repo
      .list()
      .then((loaded) => {
        if (!cancelled) setTasks(loaded);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("[tasks] list failed:", e);
          setLoadError(errMsg(e));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTasks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, retryKey]);

  const handleRetry = () => setRetryKey((k) => k + 1);

  useRealtimeTasks(userId ?? null, setTasks);

  const handleMigrate = async (localTasks: Task[]) => {
    try {
      const restored = await repo.bulkRestore(localTasks);
      localStorage.removeItem("tasks");
      if (userId) localStorage.removeItem(`migrationSkipped_${userId}`);
      setTasks(restored);
      toast.success(`${restored.length}件のタスクを移行しました`);
    } catch (e) {
      toast.error(`移行に失敗しました: ${errMsg(e)}`);
      throw e;
    }
  };

  // タブ切り替え時のフォーム表示状態管理
  useEffect(() => {
    if (activeTab === "list") {
      setShowForm(true);
    } else {
      setShowForm(false);
    }
    setEditingTask(null);
  }, [activeTab]);

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    // Optimistic: render a temporary task while the backend round-trips,
    // then swap it for the real one (real id, real createdAt) when the
    // write completes. On failure, remove the temp.
    const tempId = `temp-${crypto.randomUUID()}`;
    const tempTask: Task = {
      ...taskData,
      id: tempId,
      createdAt: new Date(),
    };
    setTasks(prev => [tempTask, ...prev]);
    if (activeTab !== "list") {
      setShowForm(false);
    } else {
      setShowForm(true);
    }

    try {
      const created = await repo.create(taskData);
      setTasks(prev => prev.map(t => t.id === tempId ? created : t));
      toast.success("タスクを追加しました");
    } catch (e) {
      setTasks(prev => prev.filter(t => t.id !== tempId));
      toast.error(`追加に失敗しました: ${errMsg(e)}`);
    }
  };

  const handleUpdateTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!editingTask) return;
    const prevTask = editingTask;
    setTasks(prev => prev.map(t =>
      t.id === prevTask.id
        ? { ...taskData, id: prevTask.id, createdAt: prevTask.createdAt }
        : t
    ));
    setEditingTask(null);

    try {
      await repo.update(prevTask.id, taskData);
      toast.success("タスクを更新しました");
    } catch (e) {
      setTasks(prev => prev.map(t => t.id === prevTask.id ? prevTask : t));
      toast.error(`更新に失敗しました: ${errMsg(e)}`);
    }
  };

  const handleToggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.completed;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t));

    try {
      await repo.update(id, { completed: newCompleted });
      toast.success(newCompleted ? "タスクを完了しました" : "タスクを未完了にしました");
    } catch (e) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !newCompleted } : t));
      toast.error(`更新に失敗しました: ${errMsg(e)}`);
    }
  };

  const handleToggleToday = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newIsToday = !task.isToday;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isToday: newIsToday } : t));

    try {
      await repo.update(id, { isToday: newIsToday });
      toast.success(newIsToday ? "今日のタスクに追加しました" : "今日のタスクから削除しました");
    } catch (e) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, isToday: !newIsToday } : t));
      toast.error(`更新に失敗しました: ${errMsg(e)}`);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDeleteTask = async (id: string) => {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;
    const deleted = tasks[index];

    // Optimistic remove first so the UI reacts immediately.
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      await repo.remove(id);
    } catch (e) {
      // Restore in place and let the user try again.
      setTasks(prev => [...prev.slice(0, index), deleted, ...prev.slice(index)]);
      toast.error(`削除に失敗しました: ${errMsg(e)}`);
      return;
    }

    toast.success("タスクを削除しました", {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "元に戻す",
        onClick: async () => {
          // Re-insert preserving id + createdAt via repo.restore, so
          // sort order is stable and realtime peers see a clean
          // DELETE-then-INSERT sequence.
          try {
            const restored = await repo.restore(deleted);
            setTasks(prev => [...prev.slice(0, index), restored, ...prev.slice(index)]);
            toast.success("タスクを復元しました", { duration: RESTORE_TOAST_MS });
          } catch (e) {
            toast.error(`復元に失敗しました: ${errMsg(e)}`);
          }
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

  const handleConfirmImport = async (mode: "overwrite" | "append") => {
    if (!pendingImport) return;
    const count = pendingImport.length;
    // Strip id/createdAt from incoming so repo.bulkCreate mints fresh
    // ones per row. Simpler than carrying JSON-supplied ids across
    // backends and avoids collisions when importing into a different
    // account's Supabase namespace.
    const incoming = pendingImport.map(t => ({
      title: t.title,
      description: t.description,
      importance: t.importance,
      urgency: t.urgency,
      duration: t.duration,
      isToday: t.isToday,
      completed: t.completed,
    }));
    const snapshot = tasks;
    setPendingImport(null);

    try {
      if (mode === "overwrite") {
        await Promise.all(snapshot.map(t => repo.remove(t.id)));
        const created = await repo.bulkCreate(incoming);
        setTasks(created);
        toast.success(`${count}件のタスクで上書きしました`);
      } else {
        const created = await repo.bulkCreate(incoming);
        setTasks(prev => [...created, ...prev]);
        toast.success(`${count}件のタスクを追加しました`);
      }
    } catch (e) {
      toast.error(`インポートに失敗しました: ${errMsg(e)}`);
      // Reconcile against source of truth so the screen reflects what
      // actually persisted.
      repo.list().then(setTasks).catch(() => {});
    }
  };

  const handleMoveTask = async (taskId: string, newImportance: number, newUrgency: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const oldImportance = task.importance;
    const oldUrgency = task.urgency;
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, importance: newImportance, urgency: newUrgency } : t
    ));

    try {
      await repo.update(taskId, { importance: newImportance, urgency: newUrgency });
      const importanceLabels = { 1: "低", 2: "中", 3: "高" };
      const urgencyLabels = { 1: "低", 2: "中", 3: "高" };
      toast.success(
        `${task.title} を移動しました\n重要度: ${importanceLabels[newImportance as keyof typeof importanceLabels]}, 緊急度: ${urgencyLabels[newUrgency as keyof typeof urgencyLabels]}`
      );
    } catch (e) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, importance: oldImportance, urgency: oldUrgency } : t
      ));
      toast.error(`移動に失敗しました: ${errMsg(e)}`);
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

          <MigrationPrompt
            userId={userId ?? null}
            tasksLoaded={!isLoadingTasks && !loadError}
            cloudIsEmpty={tasks.length === 0}
            onMigrate={handleMigrate}
          />
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

          {/* Loading / Error 表示（Tabs の代わりに render） */}
          {isLoadingTasks && (
            <Card>
              <CardContent className="py-12 flex items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                読み込み中...
              </CardContent>
            </Card>
          )}

          {!isLoadingTasks && loadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>タスクの読み込みに失敗しました: {loadError}</span>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  再試行
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* タブナビゲーション（loading/error でない場合のみ） */}
          {!isLoadingTasks && !loadError && (
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
          )}

          {/* 初回利用時のガイド（load 完了後のみ） */}
          {!isLoadingTasks && !loadError && tasks.length === 0 && (
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
