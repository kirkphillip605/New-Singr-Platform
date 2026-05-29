"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput, SingrLogo } from "@singr/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to sign in.");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="p-10 max-w-md w-full relative overflow-hidden" hoverable={false}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 to-red-400" />
        
        <div className="flex flex-col items-center gap-2 mb-6 mt-4">
          <SingrLogo variant="white" className="h-9 w-auto object-contain" />
          <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full font-sans">
            Super-Admin
          </span>
        </div>
        
        <div className="text-center mb-8">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans">
            Restricted access portal for platform administrators and customer support agents.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">Admin Email</label>
            <GlassInput
              type="email"
              placeholder="admin@singrkaraoke.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">Password</label>
            <GlassInput
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-sm font-bold bg-gradient-to-tr from-red-600 to-orange-500 shadow-red-500/20" disabled={loading}>
            {loading ? "Authenticating session..." : "Verify Administrator Credentials"}
          </GlassButton>
        </form>
      </GlassCard>
    </main>
  );
}
