"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn, authClient, useSession } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput, SingrLogo } from "@singr/ui";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const hasRedirected = useRef(false);

  const [authMethod, setAuthMethod] = useState<"password" | "magic-link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // If user is already logged in, redirect them (with role gate)
  useEffect(() => {
    if (session?.user && !hasRedirected.current) {
      const user = session.user as any;
      const isAdmin = user.roles?.includes("global_admin") || user.roles?.includes("support_admin");
      
      if (isAdmin) {
        hasRedirected.current = true;
        router.replace("/dashboard");
      } else {
        authClient.signOut().then(() => {
          setError("Access Denied. You do not have administrator permissions.");
        });
      }
    }
  }, [session, router]);

  // Sign In with Email/Password
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to sign in. Verify your credentials.");
      }
      // useEffect handles redirect on session detection
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Send Magic Link
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    if (!email) {
      setError("Email address is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await authClient.signIn.magicLink({
        email,
        callbackURL: `${window.location.origin}/dashboard`,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to request Magic Sign-In Link.");
      } else {
        setInfoMessage("Magic link sent! Check your inbox for admin access.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to magic link service.");
    } finally {
      setLoading(false);
    }
  };

  // Request Password Reset
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const res = await (authClient as any).forgetPassword({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to trigger reset email.");
      } else {
        setInfoMessage("Reset link dispatched! Verify your admin email inbox.");
      }
    } catch (err: any) {
      setError(err.message || "Password reset system error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
      <GlassCard className="p-10 max-w-md w-full relative overflow-hidden" hoverable={false}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 to-red-400" />
        
        <div className="flex flex-col items-center gap-2 mb-6 mt-4">
          <SingrLogo variant="white" className="h-9 w-auto object-contain" />
          <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full font-sans">
            Super-Admin
          </span>
        </div>
        
        <div className="text-center mb-8 font-sans">
          <h1 className="text-2xl font-extrabold text-white mb-2">
            {isForgotPassword ? "Reset Admin Password" : "Admin Portal"}
          </h1>
          <p className="text-xs text-[var(--singr-text-secondary)]">
            {isForgotPassword
              ? "Provide your administrator email to receive a password reset link."
              : "Restricted access portal for platform administrators and support agents."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
            ⚠️ {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-sans">
            ✨ {infoMessage}
          </div>
        )}

        {isForgotPassword ? (
          <div>
            <form onSubmit={handleRequestPasswordReset} className="flex flex-col gap-4 font-sans text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Email Address</label>
                <GlassInput
                  type="email"
                  placeholder="admin@singrkaraoke.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold bg-gradient-to-tr from-red-600 to-orange-500 shadow-red-500/20 border-none" disabled={loading}>
                {loading ? "Sending Reset Link..." : "Send Reset Link"}
              </GlassButton>
            </form>

            <div className="text-center mt-6 text-xs text-[var(--singr-text-secondary)] font-sans">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(""); setInfoMessage(""); }}
                className="text-red-400 hover:underline bg-transparent border-none cursor-pointer p-0 font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Tab Selector */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-6 font-sans text-xs">
              <button
                type="button"
                onClick={() => { setAuthMethod("password"); setError(""); setInfoMessage(""); }}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all bg-transparent border-none cursor-pointer ${
                  authMethod === "password" ? "bg-[var(--glass-bg)] text-white shadow-sm" : "text-[var(--singr-text-secondary)] hover:text-white"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod("magic-link"); setError(""); setInfoMessage(""); }}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all bg-transparent border-none cursor-pointer ${
                  authMethod === "magic-link" ? "bg-[var(--glass-bg)] text-white shadow-sm" : "text-[var(--singr-text-secondary)] hover:text-white"
                }`}
              >
                Magic Link
              </button>
            </div>

            {authMethod === "password" ? (
              <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4 font-sans text-sm">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Admin Email</label>
                  <GlassInput
                    type="email"
                    placeholder="admin@singrkaraoke.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Password</label>
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(""); setInfoMessage(""); }}
                      className="text-[10px] text-red-400 hover:underline bg-transparent border-none cursor-pointer p-0"
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

                <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold bg-gradient-to-tr from-red-600 to-orange-500 shadow-red-500/20 border-none" disabled={loading}>
                  {loading ? "Authenticating Session..." : "Verify Administrator Credentials"}
                </GlassButton>
              </form>
            ) : (
              <form onSubmit={handleSendMagicLink} className="flex flex-col gap-4 font-sans text-sm">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Admin Email</label>
                  <GlassInput
                    type="email"
                    placeholder="admin@singrkaraoke.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold bg-gradient-to-tr from-red-600 to-orange-500 shadow-red-500/20 border-none" disabled={loading}>
                  {loading ? "Sending Magic Link..." : "Send Magic Link"}
                </GlassButton>
              </form>
            )}
          </div>
        )}
      </GlassCard>
    </main>
  );
}
