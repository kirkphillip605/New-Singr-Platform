"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (code.length < 4) {
      setError("Please enter a valid security code.");
      setLoading(false);
      return;
    }

    try {
      // Better Auth 2FA verification: verifyOtp (for SMS/email OTPs)
      const res = await authClient.twoFactor.verifyOtp({
        code,
      });

      if (res.error) {
        setError(res.error.message || "Invalid or expired verification code.");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during verification.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await authClient.signOut();
      router.push("/login");
    } catch (err) {
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
      <GlassCard className="p-10 max-w-md w-full relative overflow-hidden" hoverable={false}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--singr-brand-start)] to-[var(--singr-brand-end)]" style={{
          background: "var(--singr-brand-gradient)"
        }} />

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[var(--singr-accent-primary)]/10 text-[var(--singr-accent-primary)] flex items-center justify-center mx-auto mb-4 border border-[var(--singr-accent-primary)]/20 animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">Two-Factor Authentication</h1>
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans max-w-sm mx-auto leading-relaxed">
            Your host console account is secured. Please enter the verification code sent to your registered mobile phone number.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans text-center">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans text-center">
              Security Verification Code
            </label>
            <GlassInput
              type="text"
              maxLength={6}
              placeholder="******"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center tracking-widest font-mono text-xl py-3"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-3">
            <GlassButton type="submit" variant="primary" className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Security Ledger...
                </>
              ) : (
                "Verify & Open Console"
              )}
            </GlassButton>
            
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs text-[var(--singr-text-secondary)] hover:text-white transition-all bg-transparent border-none cursor-pointer p-2 font-semibold text-center font-sans"
            >
              Cancel Sign In
            </button>
          </div>
        </form>
      </GlassCard>
    </main>
  );
}
