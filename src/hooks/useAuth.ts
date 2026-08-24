import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

export interface AuthController {
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

function friendlyAuthMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return String(error);
  }

  const value = error as { code?: unknown; message?: unknown };
  const code = typeof value.code === "string" ? value.code : "";
  const message =
    typeof value.message === "string"
      ? value.message
      : "通信に失敗しました。時間をおいてもう一度お試しください。";

  if (code === "over_request_rate_limit" || message.toLowerCase().includes("rate limit")) {
    return "操作が続いたため一時的に制限されています。少し待ってからお試しください。";
  }
  if (message.toLowerCase().includes("provider is not enabled")) {
    return "Googleログインが現在利用できません。管理者にお問い合わせください。";
  }

  return message;
}

export function useAuth(): AuthController {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const client = supabase;

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error("ログイン状態を確認できませんでした: " + friendlyAuthMessage(error));
        }
        setSession(data.session);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error("ログイン状態を確認できませんでした: " + friendlyAuthMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, newSession) => {
      if (!cancelled) {
        setSession(newSession);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error("ログインに失敗しました: " + friendlyAuthMessage(error));
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("ログアウトしました");
    } catch (error) {
      toast.error("ログアウトに失敗しました: " + friendlyAuthMessage(error));
    }
  };

  return {
    session,
    isLoading,
    signInWithGoogle,
    signOut,
  };
}

