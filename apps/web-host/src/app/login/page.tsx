"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, authClient, useSession } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput, SingrLogo } from "@singr/ui";
import { Phone, Sparkles, ShieldAlert, ArrowRight } from "lucide-react";
import { formatE164 } from "@singr/shared";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const hasRedirected = React.useRef(false);

  // Tab Selection
  const [authMethod, setAuthMethod] = useState<"password" | "magic-link" | "sms">("password");

  // Form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Control states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  // Email auto-detection states
  const [emailStatus, setEmailStatus] = useState<"unchecked" | "new" | "unverified" | "verified">("unchecked");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const disableSmsAuth = process.env.NEXT_PUBLIC_DISABLE_SMS_AUTH === "true";

  // Pre-fill email from query parameters (e.g. from signup redirect)
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const statusParam = searchParams.get("status");
    if (emailParam) {
      setEmail(emailParam);
      if (statusParam === "exists") {
        setEmailStatus("verified");
      }
    }
  }, [searchParams]);

  // If user is already logged in, redirect them
  useEffect(() => {
    if (session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/dashboard");
    }
  }, [session, router]);

  // Handle Email Status Auto-detection Check
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    if (!email) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/v1/users/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to query email ledger.");
      }

      if (!data.exists) {
        setEmailStatus("new");
      } else if (!data.emailVerified) {
        setEmailStatus("unverified");
      } else {
        setEmailStatus("verified");
      }
    } catch (err: any) {
      setError(err.message || "Could not check email status.");
    } finally {
      setLoading(false);
    }
  };

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
        setError(res.error.message || "Failed to sign in. Verify your password.");
      } else {
        hasRedirected.current = true;
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Send Magic Sign-In Link
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
        setInfoMessage("Magic link sent! Check your inbox for access.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to magic link service.");
    } finally {
      setLoading(false);
    }
  };

  // Send Twilio SMS OTP
  const handleSendSmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    if (!phone) {
      setError("Mobile phone number is required.");
      setLoading(false);
      return;
    }

    const formattedPhone = formatE164(phone);

    try {
      const res = await authClient.phoneNumber.sendOtp({
        phoneNumber: formattedPhone,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to transmit SMS OTP.");
      } else {
        setSmsSent(true);
        setInfoMessage(`Security passcode sent to ${formattedPhone}.`);
      }
    } catch (err: any) {
      setError(err.message || "Twilio gateway timeout.");
    } finally {
      setLoading(false);
    }
  };

  // Verify SMS OTP and Sign In
  const handleVerifySmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    const formattedPhone = formatE164(phone);

    try {
      const res = await authClient.phoneNumber.verify({
        phoneNumber: formattedPhone,
        code: otpCode,
      });

      if (res?.error) {
        setError(res.error.message || "Invalid or expired verification passcode.");
      } else {
        hasRedirected.current = true;
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Verification gateway error.");
    } finally {
      setLoading(false);
    }
  };

  // Request Password Reset Link
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
        setInfoMessage("Reset link dispatched! Verify your email inbox.");
      }
    } catch (err: any) {
      setError(err.message || "Password reset system error.");
    } finally {
      setLoading(false);
    }
  };

  // Resend verification link for unverified account auto-detected during login
  const handleResendVerification = async () => {
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const res = await (authClient as any).sendVerificationEmail({
        email,
        callbackURL: `${window.location.origin}/verify-email`,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to send link.");
      } else {
        setInfoMessage("A new verification link has been sent to your email.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to request link.");
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
          <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
            {isForgotPassword
              ? "Provide your email address to receive a secure password reset link."
              : "Sign in with your console credentials to access venues, systems, and request queues."}
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

        {/* FORGOT PASSWORD WORKFLOW */}
        {isForgotPassword ? (
          <div>
            <form onSubmit={handleRequestPasswordReset} className="flex flex-col gap-4 font-sans text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Email Address</label>
                <GlassInput
                  type="email"
                  placeholder="name@venue.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold" disabled={loading}>
                {loading ? "Sending Link..." : "Send Reset Link"}
              </GlassButton>
            </form>

            <div className="text-center mt-6 text-xs text-[var(--singr-text-secondary)] font-sans">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(""); setInfoMessage(""); }}
                className="text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0 font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD SIGN-IN WORKFLOWS */
          <div>
            {/* METHOD TABS SELECTOR */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-6 font-sans text-xs">
              <button
                type="button"
                onClick={() => { setAuthMethod("password"); setEmailStatus("unchecked"); setError(""); setInfoMessage(""); }}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                  authMethod === "password" ? "bg-[var(--glass-bg)] text-white shadow-sm" : "text-[var(--singr-text-secondary)] hover:text-white"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod("magic-link"); setError(""); setInfoMessage(""); }}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                  authMethod === "magic-link" ? "bg-[var(--glass-bg)] text-white shadow-sm" : "text-[var(--singr-text-secondary)] hover:text-white"
                }`}
              >
                Magic Link
              </button>
              {!disableSmsAuth && (
                <button
                  type="button"
                  onClick={() => { setAuthMethod("sms"); setError(""); setInfoMessage(""); }}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    authMethod === "sms" ? "bg-[var(--glass-bg)] text-white shadow-sm" : "text-[var(--singr-text-secondary)] hover:text-white"
                  }`}
                >
                  SMS OTP
                </button>
              )}
            </div>

            {/* TAB 1: EMAIL & PASSWORD (WITH AUTO-DETECTION) */}
            {authMethod === "password" && (
              <div>
                {/* AUTO-DETECTION: EMAIL CHECK */}
                {emailStatus === "unchecked" && (
                  <form onSubmit={handleCheckEmail} className="flex flex-col gap-4 font-sans text-sm">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Email Address</label>
                      <GlassInput
                        type="email"
                        placeholder="name@venue.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold flex items-center justify-center gap-1.5" disabled={loading}>
                      Continue <ArrowRight className="w-4 h-4" />
                    </GlassButton>
                  </form>
                )}

                {/* AUTO-DETECTION RESULT: NEW USER SIGNUP */}
                {emailStatus === "new" && (
                  <div className="text-center py-4 font-sans">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="text-white font-bold text-base mb-1.5">Create a New Account?</h3>
                    <p className="text-xs text-[var(--singr-text-secondary)] mb-6 max-w-xs mx-auto leading-relaxed">
                      No registered host account was found for <strong className="text-white">{email}</strong>. Would you like to sign up?
                    </p>
                    <div className="flex flex-col gap-2 max-w-xs mx-auto">
                      <GlassButton
                        onClick={() => router.push(`/signup?step=1&email=${encodeURIComponent(email)}`)}
                        variant="primary"
                        className="w-full py-2.5 text-xs font-bold"
                      >
                        Sign Up as Host
                      </GlassButton>
                      <GlassButton
                        onClick={() => setEmailStatus("unchecked")}
                        variant="secondary"
                        className="w-full py-2.5 text-xs font-bold"
                      >
                        Change Email Address
                      </GlassButton>
                    </div>
                  </div>
                )}

                {/* AUTO-DETECTION RESULT: UNVERIFIED ACCOUNT */}
                {emailStatus === "unverified" && (
                  <div className="text-center py-4 font-sans">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <h3 className="text-white font-bold text-base mb-1.5">Unverified Account</h3>
                    <p className="text-xs text-[var(--singr-text-secondary)] mb-6 max-w-xs mx-auto leading-relaxed">
                      An account exists for <strong className="text-white">{email}</strong>, but the email address is unverified.
                    </p>
                    <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
                      <GlassButton
                        onClick={handleResendVerification}
                        variant="primary"
                        className="w-full py-2.5 text-xs font-bold"
                        disabled={loading}
                      >
                        Resend Verification Email
                      </GlassButton>
                      <GlassButton
                        onClick={() => router.push(`/signup?step=1&email=${encodeURIComponent(email)}`)}
                        variant="secondary"
                        className="w-full py-2.5 text-xs font-bold"
                      >
                        Onboarding Pending Screen
                      </GlassButton>
                      <GlassButton
                        onClick={() => setEmailStatus("unchecked")}
                        variant="secondary"
                        className="w-full py-2.5 text-xs font-bold"
                      >
                        Change Email
                      </GlassButton>
                    </div>
                  </div>
                )}

                {/* AUTO-DETECTION RESULT: VERIFIED PASSWORD INPUT */}
                {emailStatus === "verified" && (
                  <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4 font-sans text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--singr-text-secondary)]">Signing in as <strong className="text-white">{email}</strong></span>
                      <button
                        type="button"
                        onClick={() => setEmailStatus("unchecked")}
                        className="text-xs text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0"
                      >
                        Change
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Password</label>
                        <button
                          type="button"
                          onClick={() => { setIsForgotPassword(true); setError(""); setInfoMessage(""); }}
                          className="text-[10px] text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0"
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
                        autoFocus
                      />
                    </div>

                    <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold" disabled={loading}>
                      {loading ? "Authenticating Session..." : "Sign In to Console"}
                    </GlassButton>

                    <div className="text-center mt-2">
                      <button
                        type="button"
                        onClick={() => { setAuthMethod("magic-link"); setError(""); setInfoMessage(""); }}
                        className="text-xs text-[var(--singr-text-secondary)] hover:text-white bg-transparent border-none cursor-pointer p-0"
                      >
                        Sign in with Magic Link instead
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: MAGIC LINK */}
            {authMethod === "magic-link" && (
              <form onSubmit={handleSendMagicLink} className="flex flex-col gap-4 font-sans text-sm">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Email Address</label>
                  <GlassInput
                    type="email"
                    placeholder="name@venue.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold" disabled={loading}>
                  {loading ? "Sending Magic Link..." : "Send Magic Link"}
                </GlassButton>
              </form>
            )}

            {/* TAB 3: SMS OTP */}
            {authMethod === "sms" && !disableSmsAuth && (
              <div>
                {!smsSent ? (
                  /* SEND SMS OTP FORM */
                  <form onSubmit={handleSendSmsOtp} className="flex flex-col gap-4 font-sans text-sm">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Mobile Phone Number</label>
                      <GlassInput
                        type="tel"
                        placeholder="(512) 555-0199"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>

                    <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold flex items-center justify-center gap-1.5" disabled={loading}>
                      <Phone className="w-3.5 h-3.5" /> Send Security Code
                    </GlassButton>
                  </form>
                ) : (
                  /* VERIFY SMS OTP FORM */
                  <form onSubmit={handleVerifySmsOtp} className="flex flex-col gap-4 font-sans text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-[var(--singr-text-secondary)]">Passcode sent to <strong className="text-white">{phone}</strong></span>
                      <button
                        type="button"
                        onClick={() => { setSmsSent(false); setOtpCode(""); }}
                        className="text-xs text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0"
                      >
                        Change
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Enter 6-Digit Passcode</label>
                      <GlassInput
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold" disabled={loading}>
                      {loading ? "Verifying Passcode..." : "Verify & Sign In"}
                    </GlassButton>

                    <button
                      type="button"
                      onClick={handleSendSmsOtp}
                      className="text-xs text-[var(--singr-text-secondary)] hover:text-white bg-transparent border-none cursor-pointer p-0 mt-2 text-center"
                      disabled={loading}
                    >
                      Resend SMS OTP
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="text-center mt-6 text-xs text-[var(--singr-text-secondary)] font-sans">
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
            </div>

            {/* SOCIAL LOGINS */}
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
          </div>
        )}
      </GlassCard>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
        <GlassCard className="p-10 max-w-md w-full text-center">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Initializing Host Console Auth...</p>
        </GlassCard>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
