import { Task } from "../components/TaskForm";

export const EXPORT_VERSION = 1;

export interface ExportFile {
  version: number;
  exportedAt: string;
  tasks: Task[];
}

function formatDateForFilename(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildExportPayload(tasks: Task[], now: Date = new Date()): ExportFile {
  return {
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    tasks,
  };
}

export function downloadExport(tasks: Task[]): string {
  const now = new Date();
  const payload = buildExportPayload(tasks, now);
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `endlesstask-${formatDateForFilename(now)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return now.toISOString();
}

export type ParseResult =
  | { ok: true; tasks: Task[] }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateTask(raw: unknown, index: number): Task | { error: string } {
  const path = `tasks[${index}]`;
  if (!isRecord(raw)) return { error: `${path} がオブジェクトではありません` };

  if (typeof raw.title !== "string" || raw.title.trim() === "") {
    return { error: `${path}.title が空または文字列ではありません` };
  }
  if (raw.description !== undefined && typeof raw.description !== "string") {
    return { error: `${path}.description が文字列ではありません` };
  }
  if (typeof raw.importance !== "number" || ![1, 2, 3].includes(raw.importance)) {
    return { error: `${path}.importance は 1 / 2 / 3 のいずれかが必要です` };
  }
  if (typeof raw.urgency !== "number" || ![1, 2, 3].includes(raw.urgency)) {
    return { error: `${path}.urgency は 1 / 2 / 3 のいずれかが必要です` };
  }
  if (raw.duration !== "quick" && raw.duration !== "long") {
    return { error: `${path}.duration は "quick" または "long" が必要です` };
  }
  if (typeof raw.isToday !== "boolean") {
    return { error: `${path}.isToday が真偽値ではありません` };
  }
  if (typeof raw.completed !== "boolean") {
    return { error: `${path}.completed が真偽値ではありません` };
  }
  const createdAtRaw = raw.createdAt;
  let createdAt: Date;
  if (typeof createdAtRaw === "string" || typeof createdAtRaw === "number") {
    createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) {
      return { error: `${path}.createdAt が日時として解釈できません` };
    }
  } else {
    return { error: `${path}.createdAt が文字列/数値ではありません` };
  }

  const id = typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID();

  return {
    id,
    title: raw.title.trim(),
    description: typeof raw.description === "string" ? raw.description : "",
    importance: raw.importance,
    urgency: raw.urgency,
    duration: raw.duration,
    isToday: raw.isToday,
    completed: raw.completed,
    createdAt,
  };
}

export function parseImport(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `JSON として解釈できません: ${(e as Error).message}` };
  }

  let rawTasks: unknown;
  if (Array.isArray(data)) {
    rawTasks = data;
  } else if (isRecord(data) && "tasks" in data) {
    rawTasks = data.tasks;
  } else {
    return {
      ok: false,
      error: "ルートが配列でも { tasks: [...] } オブジェクトでもありません",
    };
  }

  if (!Array.isArray(rawTasks)) {
    return { ok: false, error: "tasks フィールドが配列ではありません" };
  }

  const validated: Task[] = [];
  for (let i = 0; i < rawTasks.length; i++) {
    const result = validateTask(rawTasks[i], i);
    if ("error" in result) return { ok: false, error: result.error };
    validated.push(result);
  }

  return { ok: true, tasks: validated };
}

export function mergeAppend(existing: Task[], incoming: Task[]): Task[] {
  const usedIds = new Set(existing.map((t) => t.id));
  const reassigned = incoming.map((t) =>
    usedIds.has(t.id) ? { ...t, id: crypto.randomUUID() } : t
  );
  return [...reassigned, ...existing];
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "不明";
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  return then.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}
