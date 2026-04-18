import { Task } from "../components/TaskForm";
import { supabase } from "./supabase";

const LOCAL_KEY = "tasks";

// Unified CRUD surface that the app talks to; lets us swap the storage
// backend (localStorage ↔ Supabase) without touching call sites in
// App.tsx.
export interface TasksRepo {
  list(): Promise<Task[]>;
  create(input: Omit<Task, "id" | "createdAt">): Promise<Task>;
  update(id: string, patch: Partial<Omit<Task, "id" | "createdAt">>): Promise<void>;
  remove(id: string): Promise<void>;
  // Re-insert a previously existing task, preserving its id and
  // createdAt so that sort order stays stable after a delete → undo
  // round-trip. The row id column has gen_random_uuid() as its DEFAULT,
  // which yields to an explicit value when provided.
  restore(task: Task): Promise<Task>;
  // Atomic bulk insert — either every row lands or none do. Used by the
  // Step 6 migration flow to avoid partial uploads.
  bulkCreate(inputs: Omit<Task, "id" | "createdAt">[]): Promise<Task[]>;
}

// ─────────────────────────────────────────────────────────────
// localStorage backend
// ─────────────────────────────────────────────────────────────

function loadLocal(): Task[] {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw).map((t: Task & { createdAt: string | Date }) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      duration: t.duration || "quick",
    }));
  } catch (e) {
    console.error("[tasksRepo] Failed to parse localStorage tasks:", e);
    return [];
  }
}

function saveLocal(tasks: Task[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks));
}

export function createLocalRepo(): TasksRepo {
  return {
    async list() {
      return loadLocal();
    },
    async create(input) {
      const newTask: Task = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };
      saveLocal([newTask, ...loadLocal()]);
      return newTask;
    },
    async update(id, patch) {
      saveLocal(loadLocal().map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    async remove(id) {
      saveLocal(loadLocal().filter((t) => t.id !== id));
    },
    async restore(task) {
      saveLocal([task, ...loadLocal()]);
      return task;
    },
    async bulkCreate(inputs) {
      const now = new Date();
      const created: Task[] = inputs.map((input) => ({
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
      }));
      saveLocal([...created, ...loadLocal()]);
      return created;
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Supabase backend
// ─────────────────────────────────────────────────────────────

// Mirrors the DB row shape (snake_case). Kept private — the rest of the
// app only ever sees the camelCase Task type exposed by TaskForm.
type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  importance: number;
  urgency: number;
  duration: "quick" | "long";
  is_today: boolean;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

function fromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    importance: row.importance,
    urgency: row.urgency,
    duration: row.duration,
    isToday: row.is_today,
    completed: row.completed,
    createdAt: new Date(row.created_at),
  };
}

function toInsertPayload(input: Omit<Task, "id" | "createdAt">, userId: string) {
  return {
    user_id: userId,
    title: input.title,
    description: input.description,
    importance: input.importance,
    urgency: input.urgency,
    duration: input.duration,
    is_today: input.isToday,
    completed: input.completed,
  };
}

function toUpdatePayload(patch: Partial<Omit<Task, "id" | "createdAt">>) {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.importance !== undefined) payload.importance = patch.importance;
  if (patch.urgency !== undefined) payload.urgency = patch.urgency;
  if (patch.duration !== undefined) payload.duration = patch.duration;
  if (patch.isToday !== undefined) payload.is_today = patch.isToday;
  if (patch.completed !== undefined) payload.completed = patch.completed;
  return payload;
}

export function createSupabaseRepo(userId: string): TasksRepo {
  if (!supabase) {
    // Defensive: caller is expected to gate on session presence (which
    // implies supabase is configured), but we throw rather than crash
    // lazily if that contract is violated.
    throw new Error("[tasksRepo] Supabase client is not configured");
  }
  const client = supabase;

  return {
    async list() {
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(fromRow);
    },

    async create(input) {
      const { data, error } = await client
        .from("tasks")
        .insert(toInsertPayload(input, userId))
        .select()
        .single();
      if (error) throw error;
      return fromRow(data);
    },

    async update(id, patch) {
      const { error } = await client
        .from("tasks")
        .update(toUpdatePayload(patch))
        .eq("id", id);
      if (error) throw error;
    },

    async remove(id) {
      const { error } = await client.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },

    async restore(task) {
      const { data, error } = await client
        .from("tasks")
        .insert({
          id: task.id,
          user_id: userId,
          title: task.title,
          description: task.description,
          importance: task.importance,
          urgency: task.urgency,
          duration: task.duration,
          is_today: task.isToday,
          completed: task.completed,
          created_at: task.createdAt.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return fromRow(data);
    },

    async bulkCreate(inputs) {
      // Single PostgREST request with an array body → one SQL INSERT
      // statement → one implicit transaction. If any row fails a check
      // constraint or RLS policy, the entire statement aborts and no
      // rows are inserted. That's the "all-or-nothing" guarantee Step 6
      // relies on for migration integrity.
      const payloads = inputs.map((i) => toInsertPayload(i, userId));
      const { data, error } = await client.from("tasks").insert(payloads).select();
      if (error) throw error;
      return (data ?? []).map(fromRow);
    },
  };
}
