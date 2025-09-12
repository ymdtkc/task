import { useState, useEffect } from "react";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TaskForm, Task } from "./components/TaskForm";
import { TaskList } from "./components/TaskList";
import { TaskMatrix } from "./components/TaskMatrix";
import { TodaysTasks } from "./components/TodaysTasks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Alert, AlertDescription } from "./components/ui/alert";
import { CheckCircle, List, Grid3X3, Calendar, Plus } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Toaster } from "./components/ui/sonner";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

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
      id: generateId(),
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
    setTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, completed: !task.completed }
          : task
      )
    );
    
    const task = tasks.find(t => t.id === id);
    if (task) {
      toast.success(task.completed ? "タスクを未完了にしました" : "タスクを完了しました");
    }
  };

  const handleToggleToday = (id: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, isToday: !task.isToday }
          : task
      )
    );
    
    const task = tasks.find(t => t.id === id);
    if (task) {
      toast.success(task.isToday ? "今日のタスクから削除しました" : "今日のタスクに追加しました");
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
    toast.success("タスクを削除しました");
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setShowForm(false);
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
          <h1 className="mb-2">タスク管理ツール</h1>
          
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
              
              {!showForm && activeTab !== "list" && (
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  新しいタスク
                </Button>
              )}
              
              {!showForm && activeTab === "list" && (
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
      <Toaster />
    </DndProvider>
  );
}