import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Task } from "../components/TaskForm";
import { fromRow, TaskRow } from "../lib/tasksRepo";
import { supabase } from "../lib/supabase";

type UpdateTasksForOwner = (
  ownerId: string | null,
  updater: Task[] | ((current: Task[]) => Task[]),
) => void;

export type TaskSnapshotRequest = {
  ownerId: string;
  generation: number;
  retryKey: number;
  mode: "live" | "fallback";
};

// Subscribe before App starts its database snapshot. Events received while
// the snapshot is in flight are merged into the returned rows, closing the
// list-then-subscribe gap between devices.
export function useRealtimeTasks(
  userId: string | null,
  updateTasksForOwner: UpdateTasksForOwner,
  retryKey: number,
) {
  const activeUserId = useRef<string | null>(userId);
  activeUserId.current = userId;
  const syncGeneration = useRef(0);
  const realtimeDeletedIds = useRef<Set<string>>(new Set());
  const locallyDeletedIds = useRef<Set<string>>(new Set());
  const [snapshotRequest, setSnapshotRequest] =
    useState<TaskSnapshotRequest | null>(null);

  useEffect(() => {
    syncGeneration.current += 1;
    realtimeDeletedIds.current = new Set();
    locallyDeletedIds.current = new Set();
    setSnapshotRequest(null);
  }, [retryKey, userId]);

  useEffect(() => {
    if (!userId || !supabase) return;
    const client = supabase;
    let disposed = false;
    let connectionErrorReported = false;

    const requestSnapshot = (mode: TaskSnapshotRequest["mode"]) => {
      if (disposed || activeUserId.current !== userId) return;
      const generation = syncGeneration.current + 1;
      syncGeneration.current = generation;
      if (mode === "live") realtimeDeletedIds.current = new Set();
      updateTasksForOwner(userId, []);
      setSnapshotRequest({ ownerId: userId, generation, retryKey, mode });
    };

    const applyRow = (row: TaskRow) => {
      if (disposed || activeUserId.current !== userId) return;

      if (row.deleted_at) {
        locallyDeletedIds.current.delete(row.id);
        realtimeDeletedIds.current.add(row.id);
        updateTasksForOwner(userId, (current) =>
          current.filter((task) => task.id !== row.id),
        );
        return;
      }

      if (locallyDeletedIds.current.has(row.id)) {
        return;
      }

      realtimeDeletedIds.current.delete(row.id);
      const task = fromRow(row);
      updateTasksForOwner(userId, (current) => {
        const existingIndex = current.findIndex((item) => item.id === task.id);
        if (existingIndex === -1) return [task, ...current];
        return current.map((item) => (item.id === task.id ? task : item));
      });
    };

    const channel = client
      .channel(`tasks-${userId}-${retryKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => applyRow(payload.new as TaskRow),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => applyRow(payload.new as TaskRow),
      )
      .subscribe((status) => {
        if (disposed || activeUserId.current !== userId) return;

        if (status === "SUBSCRIBED") {
          connectionErrorReported = false;
          requestSnapshot("live");
          return;
        }

        if (
          !connectionErrorReported &&
          (status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED")
        ) {
          connectionErrorReported = true;
          requestSnapshot("fallback");
          toast.error(
            "自動同期に接続できません。別の端末での変更を見るには、画面を再読み込みしてください。",
            { id: "tasks-realtime-error" },
          );
        }
      });

    return () => {
      disposed = true;
      void client.removeChannel(channel);
    };
  }, [retryKey, updateTasksForOwner, userId]);

  const mergeSnapshot = useCallback(
    (request: TaskSnapshotRequest, loaded: Task[]) => {
      if (
        activeUserId.current !== request.ownerId ||
        syncGeneration.current !== request.generation
      ) {
        return;
      }

      updateTasksForOwner(request.ownerId, (current) => {
        const isDeleted = (id: string) =>
          realtimeDeletedIds.current.has(id) ||
          locallyDeletedIds.current.has(id);
        const currentById = new Map(
          current
            .filter((task) => !isDeleted(task.id))
            .map((task) => [task.id, task]),
        );
        const loadedIds = new Set(loaded.map((task) => task.id));
        const rowsAddedWhileLoading = current.filter(
          (task) => !isDeleted(task.id) && !loadedIds.has(task.id),
        );
        const snapshotRows = loaded
          .filter((task) => !isDeleted(task.id))
          .map((task) => currentById.get(task.id) ?? task);
        return [...rowsAddedWhileLoading, ...snapshotRows];
      });
    },
    [updateTasksForOwner],
  );

  const markDeleted = useCallback(
    (ownerId: string | null, id: string) => {
      if (activeUserId.current !== ownerId) return;
      locallyDeletedIds.current.add(id);
      updateTasksForOwner(ownerId, (current) =>
        current.filter((task) => task.id !== id),
      );
    },
    [updateTasksForOwner],
  );

  const markRestored = useCallback((ownerId: string | null, id: string) => {
    if (activeUserId.current !== ownerId) return;
    locallyDeletedIds.current.delete(id);
    realtimeDeletedIds.current.delete(id);
  }, []);

  const confirmDeleted = useCallback(
    (ownerId: string | null, id: string) => {
      if (activeUserId.current !== ownerId) return;
      locallyDeletedIds.current.delete(id);
      realtimeDeletedIds.current.add(id);
      updateTasksForOwner(ownerId, (current) =>
        current.filter((task) => task.id !== id),
      );
    },
    [updateTasksForOwner],
  );

  return {
    snapshotRequest,
    mergeSnapshot,
    markDeleted,
    markRestored,
    confirmDeleted,
  };
}

