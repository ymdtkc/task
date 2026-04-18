import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { supabase } from "../lib/supabase";
import { Task } from "../components/TaskForm";
import { fromRow, TaskRow } from "../lib/tasksRepo";

// Subscribe to postgres_changes on public.tasks for the signed-in user
// and fold each event into local state idempotently. INSERT events for
// rows we already have become no-ops (covers our own optimistic writes
// echoing back), UPDATE events replace in place, DELETE events filter
// out by id. This one pattern handles both our own writes and writes
// made on other devices or tabs without any write-id tracking.
export function useRealtimeTasks(
  userId: string | null,
  setTasks: Dispatch<SetStateAction<Task[]>>,
) {
  useEffect(() => {
    if (!userId || !supabase) return;
    const client = supabase;

    const channel = client
      .channel(`tasks-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const task = fromRow(payload.new as TaskRow);
            setTasks((prev) =>
              prev.some((t) => t.id === task.id) ? prev : [task, ...prev]
            );
          } else if (payload.eventType === "UPDATE") {
            const task = fromRow(payload.new as TaskRow);
            setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
          } else if (payload.eventType === "DELETE") {
            // With the default REPLICA IDENTITY, payload.old carries
            // just the primary key — which is all we need to remove.
            const oldId = (payload.old as Partial<TaskRow>).id;
            if (oldId) setTasks((prev) => prev.filter((t) => t.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userId, setTasks]);
}
