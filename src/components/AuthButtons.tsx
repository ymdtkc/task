import { useState } from "react";
import { Loader2, LogIn, LogOut } from "lucide-react";
import type { AuthController } from "../hooks/useAuth";
import { isSupabaseConfigured } from "../lib/supabase";
import { Button } from "./ui/button";

interface AuthButtonsProps {
  auth: AuthController;
}

export function AuthButtons({ auth }: AuthButtonsProps) {
  const { session, signInWithGoogle, signOut, isLoading } = auth;
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isSupabaseConfigured() || isLoading) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      await signOut();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleGoogleSignIn()}
        disabled={isSubmitting}
        className="flex items-center gap-2"
        title="初めての方もこちらから始められます"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {isSubmitting ? "Googleに移動中..." : "Googleで続ける"}
      </Button>
    );
  }

  const accountEmail = session.user.email || "ログイン中";

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs text-muted-foreground truncate max-w-[14ch] sm:max-w-[24ch]"
        title={accountEmail}
      >
        {accountEmail}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleSignOut()}
        disabled={isSubmitting}
        className="flex items-center gap-2"
        title="ログアウト"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        <span>ログアウト</span>
      </Button>
    </div>
  );
}

