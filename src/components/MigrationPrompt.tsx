import { useEffect, useState } from "react";
import { Task } from "./TaskForm";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Upload } from "lucide-react";

const LOCAL_TASKS_KEY = "tasks";
const skippedKeyFor = (userId: string) => `migrationSkipped_${userId}`;

interface MigrationPromptProps {
  userId: string | null;
  // True only once the cloud list has finished loading; prevents the
  // dialog from auto-opening during the brief empty-state window
  // between session-change and repo.list() resolving.
  tasksLoaded: boolean;
  // True when the cloud-side task list is empty (after load). Only the
  // dialog's auto-open is gated by this — the banner stays visible
  // whenever local tasks exist so users who later create local tasks
  // post-migration can still move them up.
  cloudIsEmpty: boolean;
  // Parent-owned migration — actually calls repo.bulkRestore and
  // refreshes tasks. Throws on failure; we keep the dialog open.
  onMigrate: (tasks: Task[]) => Promise<void>;
}

function readLocalTasks(): Task[] {
  const raw = localStorage.getItem(LOCAL_TASKS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw).map((t: Task & { createdAt: string | Date }) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      duration: t.duration || "quick",
    }));
  } catch (e) {
    console.error("[MigrationPrompt] Failed to parse localStorage tasks:", e);
    return [];
  }
}

export function MigrationPrompt({
  userId,
  tasksLoaded,
  cloudIsEmpty,
  onMigrate,
}: MigrationPromptProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Detect condition and auto-open dialog on first meeting.
  useEffect(() => {
    if (!userId || !tasksLoaded) {
      setLocalTasks([]);
      return;
    }
    const local = readLocalTasks();
    setLocalTasks(local);
    if (local.length > 0 && cloudIsEmpty) {
      const skipped = localStorage.getItem(skippedKeyFor(userId));
      if (!skipped) setDialogOpen(true);
    }
  }, [userId, tasksLoaded, cloudIsEmpty]);

  const handleMigrate = async () => {
    if (localTasks.length === 0) return;
    setIsMigrating(true);
    try {
      await onMigrate(localTasks);
      // Parent clears localStorage.tasks and reloads state; reflect
      // that here so the banner disappears immediately.
      setLocalTasks([]);
      setDialogOpen(false);
    } catch {
      // Parent already surfaced the error toast; keep the dialog open
      // so the user can retry or choose to skip.
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkip = () => {
    if (userId) localStorage.setItem(skippedKeyFor(userId), "1");
    setDialogOpen(false);
  };

  if (!userId || !tasksLoaded || localTasks.length === 0) return null;

  return (
    <>
      <Alert className="mt-2">
        <Upload className="h-4 w-4" />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>ローカルに {localTasks.length} 件の未移行タスクがあります</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            復元
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          // ESC / outside click = treat as skip so we don't re-pester.
          if (!open && !isMigrating) handleSkip();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ローカルのタスクをクラウドに移行</DialogTitle>
            <DialogDescription>
              ローカルに {localTasks.length} 件のタスクが見つかりました。
              クラウドに移行すると、別のデバイスからも同じタスクを見られるようになります。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isMigrating}
            >
              スキップ
            </Button>
            <Button onClick={handleMigrate} disabled={isMigrating}>
              {isMigrating ? "移行中..." : "移行する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
