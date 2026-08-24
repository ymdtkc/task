import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, Loader2, LogIn, LogOut, Mail } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import type { AuthController } from "../hooks/useAuth";
import { isSupabaseConfigured } from "../lib/supabase";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

function getDisplayName(session: Session): string {
  const meta = session.user.user_metadata as Record<string, unknown> | undefined;
  const name =
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name);
  return name || session.user.email || "";
}

interface AuthButtonsProps {
  auth: AuthController;
}

export function AuthButtons({ auth }: AuthButtonsProps) {
  const {
    session,
    signInWithGoogle,
    signInWithEmail,
    setPassword,
    signOut,
    isLoading,
  } = auth;
  const [loginOpen, setLoginOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPasswordValue] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoginOpen(false);
    setPasswordOpen(false);
    setEmail("");
    setPasswordValue("");
    setPasswordConfirmation("");
    setFormError(null);
  }, [session?.user.id]);

  if (!isSupabaseConfigured() || isLoading) return null;

  const clearSensitiveFields = () => {
    setEmail("");
    setPasswordValue("");
    setPasswordConfirmation("");
    setFormError(null);
  };

  const handleLoginOpenChange = (open: boolean) => {
    if (isSubmitting && !open) return;
    setLoginOpen(open);
    if (!open) clearSensitiveFields();
  };

  const handlePasswordOpenChange = (open: boolean) => {
    if (isSubmitting && !open) return;
    setPasswordOpen(open);
    if (!open) clearSensitiveFields();
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await signInWithEmail(email, password);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      setLoginOpen(false);
      clearSensitiveFields();
      toast.success("ログインしました");
    } catch {
      setFormError("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (password !== passwordConfirmation) {
      setFormError("確認用パスワードが一致しません。");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await setPassword(password);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      setPasswordOpen(false);
      clearSensitiveFields();
      toast.success("メールアドレスとパスワードでもログインできるようになりました");
    } catch {
      setFormError("通信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLoginOpen(true)}
          className="flex items-center gap-2"
        >
          <LogIn className="h-4 w-4" />
          ログイン
        </Button>

        <Dialog open={loginOpen} onOpenChange={handleLoginOpenChange}>
          <DialogContent style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <DialogHeader>
              <DialogTitle>ログイン</DialogTitle>
              <DialogDescription>
                ログインすると、パソコンやスマートフォンで同じ内容を確認できます。
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-email">メールアドレス</Label>
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-password">パスワード</Label>
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPasswordValue(event.target.value)}
                  placeholder="6文字以上"
                  minLength={6}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail />}
                メールでログイン
              </Button>
            </form>

            <div className="flex items-center gap-3" aria-hidden="true">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">または</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => void signInWithGoogle()}
              disabled={isSubmitting}
            >
              Googleでログイン
            </Button>

            <p className="text-xs text-muted-foreground">
              初回だけGoogleでログインし、右上の「パスワード設定・変更」から
              パスワードを設定してください。既存のタスクをそのまま引き継げます。
            </p>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const name = getDisplayName(session);
  const accountEmail = session.user.email;

  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="text-xs text-muted-foreground truncate max-w-[14ch] sm:max-w-[24ch]"
          title={accountEmail}
        >
          {name}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearSensitiveFields();
            setPasswordOpen(true);
          }}
          className="flex items-center gap-2"
          title="パスワードを設定・変更"
        >
          <KeyRound className="h-4 w-4" />
          <span className="hidden sm:inline">パスワード設定・変更</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void signOut()}
          className="flex items-center gap-2"
          title="ログアウト"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">ログアウト</span>
        </Button>
      </div>

      <Dialog open={passwordOpen} onOpenChange={handlePasswordOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワードを設定・変更</DialogTitle>
            <DialogDescription>
              {accountEmail} と、ここで設定するパスワードでもログインできるようになります。
              Googleログインも引き続き使えます。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">新しいパスワード</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPasswordValue(event.target.value)}
                placeholder="6文字以上"
                minLength={6}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password-confirmation">新しいパスワード（確認）</Label>
              <Input
                id="new-password-confirmation"
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                placeholder="同じパスワードをもう一度"
                minLength={6}
                required
                disabled={isSubmitting}
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              パスワードを忘れた場合も、Googleでログインしてここから再設定できます。
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePasswordOpenChange(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                設定する
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
