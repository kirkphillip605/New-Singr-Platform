"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, signIn, authClient, useSession, signOut } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput, SingrLogo } from "@singr/ui";
import { Check, Mail, ArrowRight, Sparkles, UserCheck } from "lucide-react";

function SignupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading, refetch } = useSession();
  const hasRedirected = useRef(false);

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

  // OAuth specific password setting
  const [isOAuthWithoutPassword, setIsOAuthWithoutPassword] = useState(false);

  // UI Flow states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Cooldown timer for resending verification link
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Sync step with URL parameter
  useEffect(() => {
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (parsed >= 1 && parsed <= 2) {
        setStep(parsed);
      }
    }
  }, [stepParam]);

  // Determine session redirection and step transition
  useEffect(() => {
    if (!sessionLoading && session?.user) {
      const user = session.user as any;
      const hasHostRole = user.roles?.includes("host");
      const hasBusinessName = !!user.businessName;

      // If user is already a full host and verified, redirect to dashboard
      if (hasHostRole && hasBusinessName && user.emailVerified) {
        if (!hasRedirected.current) {
          hasRedirected.current = true;
          if (planParam) {
            handleUpgradeDirectly(planParam);
          } else {
            router.replace("/dashboard");
          }
        }
        return;
      }

      // If logged in and email verified, but missing profile details (like singer upgrading or completed verify)
      if (user.emailVerified) {
        setStep(2);
        setFirstName(user.firstName || user.name || "");
        setLastName(user.lastName || "");
        
        // Also check if they are a singer upgrading or host onboarding
        if (!hasBusinessName || !hasHostRole) {
          setIsUpgrading(true);
        }

        // Fetch user accounts to check if OAuth user needs password
        authClient.listAccounts().then((res) => {
          const hasCredential = res.data?.some((acc) => acc.providerId === "credential");
          setIsOAuthWithoutPassword(!hasCredential);
        }).catch((err) => {
          console.error("Failed to list user accounts:", err);
        });
      } else {
        // Logged in but email is not verified yet
        setStep(1);
        setEmail(user.email);
        setVerificationPending(true);
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
        router.replace("/dashboard");
      }
    } catch (err) {
      console.error("Upgrade redirect failed:", err);
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    const planQuery = planParam ? `&plan=${planParam}` : "";
    router.replace(`/signup?step=${nextStep}${planQuery}`);
  };

  // Step 1 Submit: Create account with Email + Password
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

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
      // 1. Check if user exists
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
          setInfoMessage("Account already exists with this email address. Directing to login...");
          setTimeout(() => {
            router.replace(`/login?email=${encodeURIComponent(email)}&status=exists`);
          }, 2000);
          return;
        } else {
          // Account exists but is unverified
          const resendRes = await authClient.sendVerificationEmail({
            email,
            callbackURL: `${window.location.origin}/verify-email`,
          });

          if (resendRes?.error) {
            throw new Error(resendRes.error.message || "Failed to resend verification link.");
          }

          setInfoMessage("An unverified account already exists. We have sent a verification link.");
          setVerificationPending(true);
        }
        // Create new account
        const res = await signUp.email({
          email,
          password,
          name: email.split("@")[0] || "Host",
          roles: ["host", "singer"],
          callbackURL: `${window.location.origin}/verify-email`,
        } as any);

        if (res?.error) {
          throw new Error(res.error.message || "Failed to create account.");
        }

        setInfoMessage("Verification link sent! Check your inbox.");
        setVerificationPending(true);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Resend verification link
  const handleResendLink = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const activeEmail = email || session?.user?.email;
      if (!activeEmail) {
        throw new Error("No email address found to verify.");
      }

      const res = await authClient.sendVerificationEmail({
        email: activeEmail,
        callbackURL: `${window.location.origin}/verify-email`,
      });

      if (res?.error) {
        throw new Error(res.error.message || "Failed to resend verification email.");
      }

      setInfoMessage("Verification link has been resent.");
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend link.");
    } finally {
      setLoading(false);
    }
  };

  // Manually check if verification completed
  const handleCheckSessionVerification = async () => {
    setError("");
    setLoading(true);
    try {
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

  // Step 2 Submit: Complete Profile (and set password if OAuth)
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!firstName || !lastName || !businessName) {
      setError("First Name, Last Name, and Business Name are required.");
      setLoading(false);
      return;
    }

    if (isOAuthWithoutPassword) {
      if (!password) {
        setError("Please set a password for your account.");
        setLoading(false);
        return;
      }
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
    }

    try {
      // 1. If OAuth user, set password first
      if (isOAuthWithoutPassword) {
        const passRes = await fetch(`${apiUrl}/api/v1/users/set-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
          credentials: "include",
        });

        const passData = await passRes.json();
        if (!passRes.ok || !passData.success) {
          throw new Error(passData.message || "Failed to configure account password.");
        }
      }

      // 2. Save profile details
      const response = await fetch(`${apiUrl}/api/v1/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

      // Refresh session
      await authClient.getSession({
        query: { disableCookieCache: true }
      });
      await refetch();

      if (planParam) {
        setInfoMessage("Profile saved! Redirecting to checkout...");
        await handleUpgradeDirectly(planParam);
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = async () => {
    setLoading(true);
    try {
      await signOut();
      setVerificationPending(false);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      setBusinessName("");
      goToStep(1);
    } catch (err) {
      console.error("Failed to sign out:", err);
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

        {/* 2-Step Progress Stepper */}
        {!isUpgrading && (
          <div className="flex justify-between items-center mb-8 px-12">
            <div className="flex flex-col items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all ${
                step >= 1 ? "bg-[var(--singr-accent-primary)] text-white" : "bg-white/5 border border-white/10 text-[var(--singr-text-secondary)]"
              }`}>1</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] mt-1.5 font-sans">Create Account</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 bg-white/5 ${step >= 2 ? "bg-[var(--singr-accent-primary)]/40" : ""}`} />
            <div className="flex flex-col items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all ${
                step >= 2 ? "bg-[var(--singr-accent-primary)] text-white" : "bg-white/5 border border-white/10 text-[var(--singr-text-secondary)]"
              }`}>2</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] mt-1.5 font-sans">Complete Profile</span>
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

        {/* STEP 1: CREATE ACCOUNT (EMAIL + PASSWORD) */}
        {step === 1 && !verificationPending && (
          <div>
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--singr-accent-primary)] mb-2 block font-sans">Host Console Sign Up</span>
              <h1 className="text-2xl font-extrabold text-white mb-2">Create Host Account</h1>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                Onboard as a Karaoke Host to manage shows, venues, and singer queues.
              </p>
            </div>

            <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 font-sans">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Email Address</label>
                <GlassInput
                  type="email"
                  placeholder="name@venue.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 font-sans">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Password (min 8 chars)</label>
                <GlassInput
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 font-sans">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Confirm Password</label>
                <GlassInput
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold font-sans" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account & Verify"}
              </GlassButton>
            </form>

            <div className="text-center mt-6 text-xs text-[var(--singr-text-secondary)] font-sans">
              <p>Already have an account? <a href="/login" className="text-[var(--singr-accent-primary)] hover:underline font-semibold">Sign In</a></p>
            </div>

            <div className="border-t border-[var(--singr-border)] my-6"></div>

            <div className="flex flex-col gap-3">
              <GlassButton
                onClick={() => signIn.social({ provider: "google", callbackURL: `${window.location.origin}/signup?step=2${planParam ? `&plan=${planParam}` : ""}` })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>🌐</span> Sign Up with Google
              </GlassButton>
              <GlassButton
                onClick={() => signIn.social({ provider: "apple", callbackURL: `${window.location.origin}/signup?step=2${planParam ? `&plan=${planParam}` : ""}` })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>🍎</span> Sign Up with Apple
              </GlassButton>
            </div>
          </div>
        )}

        {/* STEP 1 PENDING: VERIFICATION LINK SENT */}
        {step === 1 && verificationPending && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[var(--singr-accent-primary)]/10 text-[var(--singr-accent-primary)] flex items-center justify-center mx-auto mb-4 border border-[var(--singr-accent-primary)]/20 animate-pulse">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Verify Your Email</h1>
            <p className="text-xs text-[var(--singr-text-secondary)] font-sans max-w-sm mx-auto leading-relaxed mb-6">
              A verification link was sent to <strong className="text-white">{email || session?.user?.email}</strong>. Once you click the link in your email, click below to proceed.
            </p>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <GlassButton onClick={handleCheckSessionVerification} variant="primary" className="w-full py-3 text-xs font-bold flex items-center justify-center gap-2" disabled={loading}>
                <Check className="w-4 h-4" /> I've Verified My Email
              </GlassButton>
              
              <GlassButton 
                onClick={handleResendLink} 
                variant="secondary" 
                className="w-full py-3 text-xs font-bold" 
                disabled={loading || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend Link (${resendCooldown}s)` : "Resend Verification Link"}
              </GlassButton>
            </div>

            <p className="mt-8 text-[10px] text-[var(--singr-text-secondary)] font-sans">
              Need to use a different email?{" "}
              <button 
                onClick={handleStartOver} 
                className="text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none p-0 cursor-pointer"
                disabled={loading}
              >
                Start Over
              </button>
            </p>
          </div>
        )}

        {/* STEP 2: COMPLETE PROFILE (ADD PASSWORD OPTIONALLY FOR OAUTH USERS) */}
        {step === 2 && (
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
                  ? "Enter your business details below to activate host account features."
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

              {/* Conditional Password Settings for OAuth Sign-ups */}
              {isOAuthWithoutPassword && (
                <div className="border-t border-white/10 mt-4 pt-4 flex flex-col gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--singr-accent-primary)] mb-1 block">
                    Secure Your Account
                  </span>
                  <p className="text-[11px] text-[var(--singr-text-secondary)] -mt-2 mb-2 leading-relaxed">
                    Since you registered with a social provider, please create a password so you can also log in using your email address directly.
                  </p>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Password (min 8 chars)</label>
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
                </div>
              )}

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-4 text-xs font-bold flex items-center justify-center gap-1" disabled={loading}>
                {isUpgrading 
                  ? (planParam ? "Save and Upgrade to Subscription" : "Save and Upgrade")
                  : "Complete Onboarding"} <ArrowRight className="w-4 h-4" />
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
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Loading onboarding wizard...</p>
        </GlassCard>
      </main>
    }>
      <SignupWizardContent />
    </Suspense>
  );
}
