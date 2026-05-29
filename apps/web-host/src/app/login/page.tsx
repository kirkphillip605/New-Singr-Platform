"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, authClient } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput, SingrLogo } from "@singr/ui";

export default function LoginPage() {
  const router = useRouter();
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      if (isForgotPassword) {
        await (authClient as any).forgetPassword({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        setInfoMessage("Reset link sent! Please check your email inbox.");
      } else {
        const res = await signIn.email({
          email,
          password,
        });

        if (res?.error) {
          setError(res.error.message || "Failed to sign in.");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
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
        
        <div className="flex justify-center mt-4 mb-6">
          <SingrLogo variant="white" className="h-9 w-auto object-contain" />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            {isForgotPassword ? "Reset Password" : "Host Portal"}
          </h1>
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans">
            {isForgotPassword 
              ? "Enter your email address to receive a secure password reset link." 
              : "Sign in with your host credentials to access your venues, shows, and request queue."
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
            ⚠️ {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-sans">
            ✉️ {infoMessage}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">Email Address</label>
            <GlassInput
              type="email"
              placeholder="name@venue.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {!isForgotPassword && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">Password</label>
                <button 
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(""); setInfoMessage(""); }}
                  className="text-xs text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0 font-sans"
                >
                  Forgot?
                </button>
              </div>
              <GlassInput
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-sm font-bold" disabled={loading}>
            {loading 
              ? (isForgotPassword ? "Sending link..." : "Authenticating session...") 
              : (isForgotPassword ? "Send Reset Link" : "Sign In to Console")
            }
          </GlassButton>
        </form>

        <div className="text-center mt-6 text-xs text-[var(--singr-text-secondary)] font-sans">
          {isForgotPassword ? (
            <p>
              Remember your password?{" "}
              <button 
                type="button" 
                onClick={() => { setIsForgotPassword(false); setError(""); setInfoMessage(""); }}
                className="text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0 font-semibold"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{" "}
              <button 
                type="button" 
                onClick={() => { router.push("/signup"); }}
                className="text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0 font-semibold"
              >
                Sign Up
              </button>
            </p>
          )}
        </div>

        {!isForgotPassword && (
          <>
            <div className="border-t border-[var(--singr-border)] my-6"></div>

            <div className="flex flex-col gap-3">
              <GlassButton
                onClick={() => signIn.social({ provider: "google", callbackURL: "/dashboard" })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>🌐</span> Sign In with Google
              </GlassButton>
              
              <GlassButton
                onClick={() => signIn.social({ provider: "apple", callbackURL: "/dashboard" })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>🍎</span> Sign In with Apple
              </GlassButton>
            </div>
          </>
        )}
      </GlassCard>
    </main>
  );
}
