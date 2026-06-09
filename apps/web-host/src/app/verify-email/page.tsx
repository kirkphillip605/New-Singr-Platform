"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { GlassCard, GlassButton, SingrLogo } from "@singr/ui";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = useSession();
  const [redirectTimer, setRedirectTimer] = useState(3);
  const [isSameDevice, setIsSameDevice] = useState(false);

  const errorParam = searchParams.get("error");

  // Determine if it is same-device (active session)
  useEffect(() => {
    if (!sessionLoading && session?.user) {
      setIsSameDevice(true);
    }
  }, [session, sessionLoading]);

  // Countdown timer for same-device auto-redirect
  useEffect(() => {
    if (!isSameDevice || errorParam) return;

    if (redirectTimer === 0) {
      router.replace("/signup?step=2");
      return;
    }

    const interval = setInterval(() => {
      setRedirectTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSameDevice, redirectTimer, errorParam, router]);

  if (sessionLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
        <GlassCard className="p-10 max-w-md w-full text-center relative overflow-hidden" hoverable={false}>
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--singr-brand-start)] to-[var(--singr-brand-end)]" style={{
            background: "var(--singr-brand-gradient)"
          }} />
          <Loader2 className="w-10 h-10 animate-spin text-[var(--singr-accent-primary)] mx-auto mb-4" />
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Verifying email status...</p>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
      <GlassCard className="p-10 max-w-md w-full text-center relative overflow-hidden font-sans" hoverable={false}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--singr-brand-start)] to-[var(--singr-brand-end)]" style={{
          background: "var(--singr-brand-gradient)"
        }} />

        <div className="flex justify-center mt-2 mb-8">
          <SingrLogo variant="white" className="h-9 w-auto object-contain" />
        </div>

        {errorParam ? (
          <div>
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Verification Failed</h1>
            <p className="text-xs text-[var(--singr-text-secondary)] leading-relaxed mb-6">
              {errorParam === "expired"
                ? "The verification link has expired. Please sign up again or request a new link."
                : "The verification link is invalid or has already been used."}
            </p>
            <GlassButton onClick={() => router.replace("/signup")} variant="primary" className="w-full py-3 text-xs font-bold">
              Back to Sign Up
            </GlassButton>
          </div>
        ) : isSameDevice ? (
          <div>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Email Verified!</h1>
            <p className="text-xs text-[var(--singr-text-secondary)] leading-relaxed mb-6">
              Thank you for verifying your email. Directing you to complete your profile in {redirectTimer} seconds...
            </p>
            <GlassButton onClick={() => router.replace("/signup?step=2")} variant="primary" className="w-full py-3 text-xs font-bold">
              Complete Profile Now
            </GlassButton>
          </div>
        ) : (
          <div>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Email Verified!</h1>
            <p className="text-xs text-[var(--singr-text-secondary)] leading-relaxed mb-6">
              Your email has been successfully verified. Since you verified on a different device, please log in on your original device to continue, or log in here to access your account.
            </p>
            <GlassButton onClick={() => router.replace("/login")} variant="primary" className="w-full py-3 text-xs font-bold">
              Sign In to Continue
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
        <GlassCard className="p-10 max-w-md w-full text-center">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Loading verification helper...</p>
        </GlassCard>
      </main>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
