import { LogIn, LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "./ui/button";
import { useAuth } from "../hooks/useAuth";
import { isSupabaseConfigured } from "../lib/supabase";

function getDisplayName(session: Session): string {
  const meta = session.user.user_metadata as Record<string, unknown> | undefined;
  const name =
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name);
  return name || session.user.email || "";
}

export function AuthButtons() {
  const { session, signIn, signOut, isLoading } = useAuth();

  if (!isSupabaseConfigured()) return null;
  if (isLoading) return null;

  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={signIn}
        className="flex items-center gap-2"
      >
        <LogIn className="h-4 w-4" />
        Googleでログイン
      </Button>
    );
  }

  const name = getDisplayName(session);
  const email = session.user.email;

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs text-muted-foreground truncate max-w-[14ch] sm:max-w-[24ch]"
        title={email}
      >
        {name}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={signOut}
        className="flex items-center gap-2"
        title="ログアウト"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">ログアウト</span>
      </Button>
    </div>
  );
}
