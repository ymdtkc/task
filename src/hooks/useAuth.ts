import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; message: string };

export interface AuthController {
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  setPassword: (password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
}

function getErrorDetails(error: unknown): { code: string; message: string } {
  if (typeof error !== "object" || error === null) {
    return { code: "", message: String(error) };
  }

  const value = error as { code?: unknown; message?: unknown };
  return {
    code: typeof value.code === "string" ? value.code : "",
    message:
      typeof value.message === "string"
        ? value.message
        : "通信に失敗しました。時間をおいてもう一度お試しください。",
  };
}

function friendlyAuthMessage(error: unknown): string {
  const { code, message } = getErrorDetails(error);
  const normalized = message.toLowerCase();

  if (
    code === "invalid_credentials" ||
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (code === "email_not_confirmed" || normalized.includes("email not confirmed")) {
    return "このメールアドレスはまだ確認されていません。Googleログインをお試しください。";
  }
  if (code === "weak_password" || normalized.includes("password should be")) {
    return "パスワードが短すぎます。6文字以上で入力してください。";
  }
  if (code === "same_password") {
    return "現在とは異なるパスワードを入力してください。";
  }
  if (code === "reauthentication_needed") {
    return "安全確認のため、いったんログアウトしてGoogleで再ログインしてから設定してください。";
  }
  if (code === "over_request_rate_limit" || normalized.includes("rate limit")) {
    return "操作が続いたため一時的に制限されています。少し待ってからお試しください。";
  }

  return message;
}

function validatePassword(password: string): AuthActionResult | null {
  if (password.length < 6) {
    return { ok: false, message: "パスワードは6文字以上で入力してください。" };
  }
  return null;
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
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      toast.error("ログインに失敗しました: " + friendlyAuthMessage(error));
    }
  };

  const signInWithEmail = async (
    email: string,
    password: string,
  ): Promise<AuthActionResult> => {
    if (!supabase) {
      return { ok: false, message: "ログイン機能が設定されていません。" };
    }

    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { ok: false, message: friendlyAuthMessage(error) };
      return { ok: true };
    } catch (error) {
      return { ok: false, message: friendlyAuthMessage(error) };
    }
  };

  const setPassword = async (password: string): Promise<AuthActionResult> => {
    if (!supabase) {
      return { ok: false, message: "ログイン機能が設定されていません。" };
    }

    const passwordError = validatePassword(password);
    if (passwordError) return passwordError;

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { ok: false, message: friendlyAuthMessage(error) };
      return { ok: true };
    } catch (error) {
      return { ok: false, message: friendlyAuthMessage(error) };
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
    signInWithEmail,
    setPassword,
    signOut,
  };
}
