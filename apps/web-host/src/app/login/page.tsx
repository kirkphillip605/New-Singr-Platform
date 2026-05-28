"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signUp.email({
          email,
          password,
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          roles: ["host", "singer"],
          businessName: businessName || undefined,
          callbackURL: "/dashboard"
        } as any);

        if (res?.error) {
          setError(res.error.message || "Failed to sign up.");
        } else {
          router.push("/dashboard");
        }
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="p-10 max-w-md w-full relative overflow-hidden" hoverable={false}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--singr-brand-start)] to-[var(--singr-brand-end)]" style={{
          background: "var(--singr-brand-gradient)"
        }} />
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            {isSignUp ? "Create Host Account" : "Host Portal"}
          </h1>
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans">
            {isSignUp 
              ? "Register a new host console credentials to start managing venues and queues." 
              : "Sign in with your host credentials to access your venues, shows, and request queue."
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {isSignUp && (
            <>
              <div className="flex gap-4">
                <div className="flex flex-col gap-2 w-1/2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">First Name</label>
                  <GlassInput
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2 w-1/2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">Last Name</label>
                  <GlassInput
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">Business/KJ Name</label>
                <GlassInput
                  type="text"
                  placeholder="e.g. Johnny Karaoke Shows"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
            </>
          )}

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

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">Password</label>
              {!isSignUp && (
                <a href="#" className="text-xs text-[var(--singr-accent-primary)] hover:underline decoration-none font-sans">Forgot?</a>
              )}
            </div>
            <GlassInput
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-sm font-bold" disabled={loading}>
            {loading 
              ? (isSignUp ? "Creating account..." : "Authenticating session...") 
              : (isSignUp ? "Sign Up as Host" : "Sign In to Console")
            }
          </GlassButton>
        </form>

        <div className="text-center mt-6 text-xs text-[var(--singr-text-secondary)] font-sans">
          {isSignUp ? (
            <p>
              Already have an account?{" "}
              <button 
                type="button" 
                onClick={() => { setIsSignUp(false); setError(""); }}
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
                onClick={() => { setIsSignUp(true); setError(""); }}
                className="text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0 font-semibold"
              >
                Sign Up
              </button>
            </p>
          )}
        </div>

        <div className="border-t border-[var(--singr-border)] my-6"></div>

        <div className="flex flex-col gap-3">
          <GlassButton
            onClick={() => signIn.social({ provider: "google", callbackURL: "/dashboard" })}
            variant="secondary"
            className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <span>🌐</span> {isSignUp ? "Sign Up with Google" : "Sign In with Google"}
          </GlassButton>
          
          <GlassButton
            onClick={() => signIn.social({ provider: "apple", callbackURL: "/dashboard" })}
            variant="secondary"
            className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <span>🍎</span> {isSignUp ? "Sign Up with Apple" : "Sign In with Apple"}
          </GlassButton>
        </div>
      </GlassCard>
    </main>
  );
}
