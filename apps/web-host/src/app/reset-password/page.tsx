"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { ShieldCheck, Lock } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Reset token is missing from the link. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing. Cannot reset password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await (authClient as any).resetPassword({
        newPassword: password,
        token: token,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to reset password.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
      <GlassCard className="p-10 max-w-md w-full relative overflow-hidden" hoverable={false}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--singr-brand-start)] to-[var(--singr-brand-end)]" style={{
          background: "var(--singr-brand-gradient)"
        }} />

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Password Updated</h1>
            <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
              Your password has been reset successfully. Redirecting you to login...
            </p>
          </div>
        ) : (
          <div>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-full bg-[var(--singr-accent-primary)]/10 text-[var(--singr-accent-primary)] flex items-center justify-center mx-auto mb-3 border border-[var(--singr-accent-primary)]/20">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-white mb-2">Set New Password</h1>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                Type in your new secure password to restore account access.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 font-sans text-sm">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)]">New Password</label>
                <GlassInput
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!token}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)]">Confirm Password</label>
                <GlassInput
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={!token}
                />
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-sm font-bold" disabled={loading || !token}>
                {loading ? "Updating Password..." : "Reset Password"}
              </GlassButton>
            </form>
          </div>
        )}
      </GlassCard>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
        <GlassCard className="p-10 max-w-md w-full text-center">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Loading password reset form...</p>
        </GlassCard>
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
