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
