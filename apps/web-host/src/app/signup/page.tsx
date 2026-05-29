"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, signIn, authClient, useSession } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput, SingrLogo } from "@singr/ui";
import { Check, Mail, ArrowRight, Lock, Sparkles, UserCheck } from "lucide-react";


function SignupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading, refetch } = useSession();

  // URL Query Parameters
  const stepParam = searchParams.get("step");
  const planParam = searchParams.get("plan");
  
  const initialStep = stepParam ? parseInt(stepParam, 10) : 1;
  const [step, setStep] = useState(initialStep);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");

  // UI Flow states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Sync step with URL parameter
  useEffect(() => {
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (parsed >= 1 && parsed <= 3) {
        setStep(parsed);
      }
    }
  }, [stepParam]);

  // Determine if logged-in user needs to upgrade
  useEffect(() => {
    if (!sessionLoading && session?.user) {
      const user = session.user as any;
      const hasHostRole = user.roles?.includes("host");
      const hasBusinessName = !!user.businessName;

      // If user is already a full host, redirect to dashboard
      if (hasHostRole && hasBusinessName && user.emailVerified) {
        // If plan is specified in url, handle redirect to subscription upgrade instead of dashboard
        if (planParam) {
          handleUpgradeDirectly(planParam);
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // If they are logged in but lack host profile details (like a singer upgrading)
      if (!hasBusinessName || !hasHostRole) {
        setIsUpgrading(true);
        setStep(3); // Direct to profile details step
        setFirstName(user.firstName || user.name || "");
        setLastName(user.lastName || "");
      } else if (!user.emailVerified) {
        // Logged in but email unverified
        setStep(1);
        setEmail(user.email);
        setVerificationPending(true);
      } else {
        // They completed profile, check if they need password set (if they registered passwordless/magic link)
        // We will send them to step 2 to set password if password is null, but we can't read user.password from client.
        // So we default to step 2 or let them proceed to dashboard.
        // Normally, if they completed step 3 (business name is present), they are done with the wizard.
        router.push("/dashboard");
      }
    }
  }, [session, sessionLoading, planParam]);

  // Direct checkout routing helper
  const handleUpgradeDirectly = async (plan: string) => {
    try {
      setLoading(true);
      const res = await authClient.subscription.upgrade({
        plan,
        successUrl: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/dashboard`,
      });

      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Upgrade redirect failed:", err);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    // Preserving plan query parameter if present
    const planQuery = planParam ? `&plan=${planParam}` : "";
    router.push(`/signup?step=${nextStep}${planQuery}`);
  };

  // Step 1: Initiate Sign up / Verification Link
  const handleSendVerification = async (e: React.FormEvent) => {
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
      // 1. Check if user exists on our custom API endpoint
      const checkRes = await fetch(`${apiUrl}/api/v1/users/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkRes.json();
      if (!checkRes.ok || !checkData.success) {
        throw new Error(checkData.message || "Failed to check email status.");
      }

      if (checkData.exists) {
        if (checkData.emailVerified) {
          // Account already exists and is verified -> Drop them into Login flow prefilled
          setInfoMessage("Account already exists with this email address. Directing to login...");
          setTimeout(() => {
            router.push(`/login?email=${encodeURIComponent(email)}&status=exists`);
          }, 2000);
          return;
        } else {
          // Account exists but is unverified -> Resend verification link
          const resendRes = await authClient.sendVerificationEmail({
            email,
            callbackURL: `${window.location.origin}/signup?step=2${planParam ? `&plan=${planParam}` : ""}`,
          });

          if (resendRes?.error) {
            throw new Error(resendRes.error.message || "Failed to resend verification link.");
          }

          setInfoMessage("An unverified account already exists. We have sent a new verification link.");
          setVerificationPending(true);
        }
      } else {
        // Account does not exist -> Create new account with email-only flow
        // Generate a strong, random password under the hood
        const tempPassword = Math.random().toString(36).slice(-10) + 
                            Math.random().toString(36).toUpperCase().slice(-5) + 
                            "!" + Math.floor(Math.random() * 10);

        const res = await (signUp.email as any)({
          email,
          password: tempPassword,
          name: email.split("@")[0] || "Host",
          roles: ["host", "singer"],
          callbackURL: `${window.location.origin}/signup?step=2${planParam ? `&plan=${planParam}` : ""}`,
        });

        if (res?.error) {
          throw new Error(res.error.message || "Failed to initiate sign up registration.");
        }

        setInfoMessage("Verification link sent! Check your inbox.");
        setVerificationPending(true);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend verification link
  const handleResendLink = async () => {
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const activeEmail = email || session?.user?.email;
      if (!activeEmail) {
        throw new Error("No email address found to verify.");
      }

      const res = await (authClient as any).sendVerificationEmail({
        email: activeEmail,
        callbackURL: `${window.location.origin}/signup?step=2${planParam ? `&plan=${planParam}` : ""}`,
      });

      if (res?.error) {
        throw new Error(res.error.message || "Failed to resend verification email.");
      }

      setInfoMessage("Verification link has been resent. Check your spam folder if you do not see it.");
    } catch (err: any) {
      setError(err.message || "Failed to resend link.");
    } finally {
      setLoading(false);
    }
  };

  // Check if verification link was clicked and session is active
  const handleCheckSessionVerification = async () => {
    setError("");
    setLoading(true);
    try {
      // Force-refresh getSession
      const res = await authClient.getSession({
        query: {
          disableCookieCache: true,
        }
      });
      
      if (res?.data?.user?.emailVerified) {
        goToStep(2);
      } else {
        setError("Email is not verified yet. Please check your inbox and click the link.");
      }
    } catch (err: any) {
      setError("Failed to fetch session. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set Password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // Send set-password request to our backend API route
      const res = await fetch(`${apiUrl}/api/v1/users/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to set password.");
      }

      // Refresh session
      await refetch();
      goToStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to configure password. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Profile
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!firstName || !lastName || !businessName) {
      setError("All profile fields (First, Last, and Business Name) are required.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          businessName,
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile.");
      }

      // Force refresh session to clear cache
      await authClient.getSession({
        query: {
          disableCookieCache: true,
        }
      });
      await refetch();

      // If user came from pricing page with a plan, redirect them directly to Stripe Checkout
      if (planParam) {
        setInfoMessage("Profile saved! Redirecting to billing coverage check...");
        await handleUpgradeDirectly(planParam);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
      <GlassCard className="p-10 max-w-xl w-full relative overflow-hidden" hoverable={false}>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--singr-brand-start)] to-[var(--singr-brand-end)]" style={{
          background: "var(--singr-brand-gradient)"
        }} />

        <div className="flex justify-center mt-2 mb-8">
          <SingrLogo variant="white" className="h-9 w-auto object-contain" />
        </div>

        {/* Header Steps Progress (Only show if not in upgrade-singer flow) */}
        {!isUpgrading && (
          <div className="flex justify-between items-center mb-8 px-4">
            <div className="flex flex-col items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all ${
                step >= 1 ? "bg-[var(--singr-accent-primary)] text-white" : "bg-white/5 border border-white/10 text-[var(--singr-text-secondary)]"
              }`}>1</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] mt-1.5 font-sans">Verify</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 bg-white/5 ${step >= 2 ? "bg-[var(--singr-accent-primary)]/40" : ""}`} />
            <div className="flex flex-col items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all ${
                step >= 2 ? "bg-[var(--singr-accent-primary)] text-white" : "bg-white/5 border border-white/10 text-[var(--singr-text-secondary)]"
              }`}>2</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] mt-1.5 font-sans">Password</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 bg-white/5 ${step >= 3 ? "bg-[var(--singr-accent-primary)]/40" : ""}`} />
            <div className="flex flex-col items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all ${
                step >= 3 ? "bg-[var(--singr-accent-primary)] text-white" : "bg-white/5 border border-white/10 text-[var(--singr-text-secondary)]"
              }`}>3</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] mt-1.5 font-sans">Profile</span>
            </div>
          </div>
        )}

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

        {/* STEP 1: EMAIL-ONLY REGISTER */}
        {step === 1 && !verificationPending && (
          <div>
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--singr-accent-primary)] mb-2 block font-sans">Welcome to Singr</span>
              <h1 className="text-2xl font-extrabold text-white mb-2">Create Host Console</h1>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                Enter your email address to verify your account and begin your host onboarding.
              </p>
            </div>

            <form onSubmit={handleSendVerification} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">Email Address</label>
                <GlassInput
                  type="email"
                  placeholder="name@venue.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold" disabled={loading}>
                {loading ? "Verifying Credentials..." : "Send Verification Link"}
              </GlassButton>
            </form>

            <div className="text-center mt-6 text-xs text-[var(--singr-text-secondary)] font-sans">
              <p>Already have an account? <a href="/login" className="text-[var(--singr-accent-primary)] hover:underline font-semibold">Sign In</a></p>
            </div>

            <div className="border-t border-[var(--singr-border)] my-6"></div>

            <div className="flex flex-col gap-3">
              <GlassButton
                onClick={() => signIn.social({ provider: "google", callbackURL: `${window.location.origin}/signup?step=3${planParam ? `&plan=${planParam}` : ""}` })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>🌐</span> Sign Up with Google
              </GlassButton>
              <GlassButton
                onClick={() => signIn.social({ provider: "apple", callbackURL: `${window.location.origin}/signup?step=3${planParam ? `&plan=${planParam}` : ""}` })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>🍎</span> Sign Up with Apple
              </GlassButton>
            </div>
          </div>
        )}

        {/* STEP 1 PENDING: EMAIL SENT VIEW */}
        {step === 1 && verificationPending && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[var(--singr-accent-primary)]/10 text-[var(--singr-accent-primary)] flex items-center justify-center mx-auto mb-4 border border-[var(--singr-accent-primary)]/20 animate-pulse">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Check Your Email</h1>
            <p className="text-xs text-[var(--singr-text-secondary)] font-sans max-w-sm mx-auto leading-relaxed mb-6">
              A verification link was sent to <strong className="text-white">{email || session?.user?.email}</strong>. Once you click the link, click the button below to continue.
            </p>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <GlassButton onClick={handleCheckSessionVerification} variant="primary" className="w-full py-3 text-xs font-bold flex items-center justify-center gap-2" disabled={loading}>
                <Check className="w-4 h-4" /> I've Verified My Email
              </GlassButton>
              
              <GlassButton onClick={handleResendLink} variant="secondary" className="w-full py-3 text-xs font-bold" disabled={loading}>
                Resend Verification Link
              </GlassButton>
            </div>

            <p className="mt-8 text-[10px] text-[var(--singr-text-secondary)] font-sans">
              Wrong email address? <button onClick={() => { setVerificationPending(false); authClient.signOut(); }} className="text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none p-0 cursor-pointer">Start Over</button>
            </p>
          </div>
        )}

        {/* STEP 2: SET PASSWORD */}
        {step === 2 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[var(--singr-accent-primary)]/10 text-[var(--singr-accent-primary)] flex items-center justify-center mx-auto mb-3 border border-[var(--singr-accent-primary)]/20">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-white mb-2">Set Your Password</h1>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                Set a secure password for your email credentials.
              </p>
            </div>

            <form onSubmit={handleSetPassword} className="flex flex-col gap-4 font-sans text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Desired Password</label>
                <GlassInput
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Confirm Password</label>
                <GlassInput
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-4 text-xs font-bold" disabled={loading}>
                {loading ? "Configuring Password..." : "Save and Continue"}
              </GlassButton>
            </form>
          </div>
        )}

        {/* STEP 3: SETUP HOST PROFILE / SINGER UPGRADE */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[var(--singr-accent-primary)]/10 text-[var(--singr-accent-primary)] flex items-center justify-center mx-auto mb-3 border border-[var(--singr-accent-primary)]/20">
                {isUpgrading ? <Sparkles className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
              </div>
              <h1 className="text-2xl font-extrabold text-white mb-2">
                {isUpgrading ? "Upgrade to Host" : "Setup Host Profile"}
              </h1>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                {isUpgrading 
                  ? "Enter your business details below to activate your hosting privileges."
                  : "Tell us about yourself and your entertainment business."}
              </p>
            </div>

            <form onSubmit={handleCompleteProfile} className="flex flex-col gap-4 font-sans text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">First Name</label>
                  <GlassInput
                    placeholder="Johnny"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Last Name</label>
                  <GlassInput
                    placeholder="Host"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Business / KJ Name</label>
                <GlassInput
                  placeholder="e.g. Johnny Entertainment LLC"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-4 text-xs font-bold flex items-center justify-center gap-1" disabled={loading}>
                {isUpgrading 
                  ? (planParam ? "Save and Upgrade to Subscription" : "Save and Upgrade")
                  : "Complete Registration"} <ArrowRight className="w-4 h-4" />
              </GlassButton>
            </form>
          </div>
        )}
      </GlassCard>
    </main>
  );
}

export default function SignupWizardPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--singr-bg-primary)]">
        <GlassCard className="p-10 max-w-xl w-full text-center">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Initializing onboarding wizard...</p>
        </GlassCard>
      </main>
    }>
      <SignupWizardContent />
    </Suspense>
  );
}
