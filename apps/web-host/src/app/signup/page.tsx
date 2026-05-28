"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, signIn, authClient, useSession } from "@/lib/auth-client";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { Check, Mail, ArrowRight, CreditCard } from "lucide-react";
import { formatE164 } from "@singr/shared";

interface Tier {
  stripePriceId: string;
  name: string;
  priceCents: number;
  interval: string;
  features: {
    maxVenues?: number;
    maxSystems?: number;
    support?: string;
    trialDays?: number;
  } | null;
}

function SignupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = useSession();

  // Determine current step from URL or state
  const stepParam = searchParams.get("step");
  const initialStep = stepParam ? parseInt(stepParam, 10) : 1;
  const [step, setStep] = useState(initialStep);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Sync step with URL param
  useEffect(() => {
    if (stepParam) {
      const parsed = parseInt(stepParam, 10);
      if (parsed >= 1 && parsed <= 3) {
        setStep(parsed);
      }
    }
  }, [stepParam]);

  // Handle auto-advancing based on session state
  useEffect(() => {
    if (!sessionLoading && session?.user) {
      if ((session.user as any).emailVerified) {
        // If email is verified and we are on Step 1, go to Step 2
        if (step === 1) {
          goToStep(2);
        }
      }
    }
  }, [session, sessionLoading, step]);

  // Load tiers when on Step 3
  useEffect(() => {
    if (step === 3) {
      setLoadingTiers(true);
      fetch(`${apiUrl}/api/v1/billing/tiers`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.tiers) {
            setTiers(data.tiers);
          } else {
            setError("Failed to load subscription tiers.");
          }
        })
        .catch((err) => {
          console.error("Error loading tiers:", err);
          setError("Failed to fetch billing tiers from server.");
        })
        .finally(() => {
          setLoadingTiers(false);
        });
    }
  }, [step, apiUrl]);

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    router.push(`/signup?step=${nextStep}`);
  };

  // Step 1: Sign up with Email/Password
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await (signUp.email as any)({
        email,
        password,
        name: email.split("@")[0] || "Host", // Placeholder name, completed in Step 2
        roles: ["host", "singer"],
        callbackURL: `${window.location.origin}/signup?step=2`,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to create account.");
      } else {
        // Better Auth triggers verification email automatically
        setInfoMessage("Verification link sent! Check your inbox.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    if (!session?.user?.email) return;
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      await (authClient as any).sendVerificationEmail({
        email: session.user.email,
        callbackURL: `${window.location.origin}/signup?step=2`,
      });
      setInfoMessage("Verification email resent successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  // Check verification status (re-fetches session)
  const handleCheckVerification = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await authClient.getSession();
      if (res?.data?.user?.emailVerified) {
        goToStep(2);
      } else {
        setError("Email is not verified yet. Please check your spam folder or resend the link.");
      }
    } catch (err: any) {
      setError("Failed to update session state.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete Profile
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!firstName || !lastName || !businessName || !phoneNumber) {
      setError("Please fill in all profile fields.");
      setLoading(false);
      return;
    }

    const formattedPhone = formatE164(phoneNumber);
    try {
      await (authClient.updateUser as any)({
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phoneNumber: formattedPhone,
        businessName,
      });

      goToStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Choose Plan & Subscribe
  const handleSubscribe = async (priceId: string) => {
    setError("");
    setLoading(true);

    try {
      // Call backend to create checkout session
      const res = await fetch(`${apiUrl}/api/v1/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
        // Include credentials (cookies) for authenticated endpoints
        credentials: "include",
      });

      const data = await res.json();
      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setError(data.message || "Failed to initiate Stripe Checkout.");
      }
    } catch (err: any) {
      setError("Failed to start subscription checkout. Is the API online?");
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

        {/* Header Steps Progress */}
        <div className="flex justify-between items-center mb-8 px-4">
          <div className="flex flex-col items-center">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all ${
              step >= 1 ? "bg-[var(--singr-accent-primary)] text-white" : "bg-white/5 border border-white/10 text-[var(--singr-text-secondary)]"
            }`}>1</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] mt-1.5 font-sans">Register</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 bg-white/5 ${step >= 2 ? "bg-[var(--singr-accent-primary)]/40" : ""}`} />
          <div className="flex flex-col items-center">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all ${
              step >= 2 ? "bg-[var(--singr-accent-primary)] text-white" : "bg-white/5 border border-white/10 text-[var(--singr-text-secondary)]"
            }`}>2</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] mt-1.5 font-sans">Profile</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 bg-white/5 ${step >= 3 ? "bg-[var(--singr-accent-primary)]/40" : ""}`} />
          <div className="flex flex-col items-center">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all ${
              step >= 3 ? "bg-[var(--singr-accent-primary)] text-white" : "bg-white/5 border border-white/10 text-[var(--singr-text-secondary)]"
            }`}>3</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] mt-1.5 font-sans">Billing</span>
          </div>
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

        {/* STEP 1: ACCOUNT CREATION */}
        {step === 1 && !session?.user && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold text-white mb-2">Create Host Console</h1>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                Sign up as a Singr Host to deploy systems, setup venues, and operate queues.
              </p>
            </div>

            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
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

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans">Password</label>
                <GlassInput
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-xs font-bold" disabled={loading}>
                {loading ? "Creating Credentials..." : "Register Account"}
              </GlassButton>
            </form>

            <div className="text-center mt-6 text-xs text-[var(--singr-text-secondary)] font-sans">
              <p>Already have an account? <a href="/login" className="text-[var(--singr-accent-primary)] hover:underline font-semibold">Sign In</a></p>
            </div>

            <div className="border-t border-[var(--singr-border)] my-6"></div>

            <div className="flex flex-col gap-3">
              <GlassButton
                onClick={() => signIn.social({ provider: "google", callbackURL: `${window.location.origin}/signup?step=2` })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>🌐</span> Sign Up with Google
              </GlassButton>
              <GlassButton
                onClick={() => signIn.social({ provider: "apple", callbackURL: `${window.location.origin}/signup?step=2` })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span>🍎</span> Sign Up with Apple
              </GlassButton>
            </div>
          </div>
        )}

        {/* STEP 1.5: EMAIL UNVERIFIED */}
        {step === 1 && session?.user && !(session.user as any).emailVerified && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[var(--singr-accent-primary)]/10 text-[var(--singr-accent-primary)] flex items-center justify-center mx-auto mb-4 border border-[var(--singr-accent-primary)]/20 animate-pulse">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Verify Your Email</h1>
            <p className="text-xs text-[var(--singr-text-secondary)] font-sans max-w-sm mx-auto leading-relaxed mb-6">
              A verification link was sent to <strong className="text-white">{(session.user as any).email}</strong>. Please confirm your email address to continue onboarding.
            </p>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <GlassButton onClick={handleCheckVerification} variant="primary" className="w-full py-3 text-xs font-bold flex items-center justify-center gap-2" disabled={loading}>
                <Check className="w-4 h-4" /> I've Verified My Email
              </GlassButton>
              
              <GlassButton onClick={handleResendVerification} variant="secondary" className="w-full py-3 text-xs font-bold" disabled={loading}>
                Resend Verification Link
              </GlassButton>
            </div>

            <p className="mt-8 text-[10px] text-[var(--singr-text-secondary)] font-sans">
              Signed in as {(session.user as any).email}. Need to switch? <button onClick={() => authClient.signOut().then(() => router.push("/login"))} className="text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none p-0 cursor-pointer">Sign Out</button>
            </p>
          </div>
        )}

        {/* STEP 2: PROFILE DETAILS */}
        {step === 2 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold text-white mb-2">Setup Host Profile</h1>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                Tell us about yourself and your entertainment business.
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

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Mobile Phone Number</label>
                <GlassInput
                  type="tel"
                  placeholder="(512) 555-0199"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onBlur={() => {
                    if (phoneNumber) {
                      setPhoneNumber(formatE164(phoneNumber));
                    }
                  }}
                  required
                />
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-4 text-xs font-bold flex items-center justify-center gap-1" disabled={loading}>
                Continue to Billing <ArrowRight className="w-4 h-4" />
              </GlassButton>
            </form>
          </div>
        )}

        {/* STEP 3: SUBSCRIPTION PLANS */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold text-white mb-2">Choose Subscription Plan</h1>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                Choose a plan to deploy hardware systems and manage venue queues. Free trials included.
              </p>
            </div>

            {loadingTiers ? (
              <p className="text-center text-sm text-[var(--singr-text-secondary)] py-8 font-sans">Loading plans and features...</p>
            ) : tiers.length === 0 ? (
              <div className="text-center py-6 text-red-400 font-sans text-xs">
                ⚠️ No price plans loaded. Please ensure seed script has run.
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {tiers.map((tier) => (
                  <GlassCard key={tier.stripePriceId} className="p-6 relative overflow-hidden flex flex-col justify-between border border-white/5 hover:border-[var(--singr-accent-primary)]/30 transition-all" hoverable={true}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
                          {tier.name}
                          {tier.features?.trialDays && (
                            <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              {tier.features.trialDays}-Day Free Trial
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-[var(--singr-text-secondary)] font-sans m-0">
                          {tier.features?.maxVenues ? `Up to ${tier.features.maxVenues} active venues` : "Unlimited venues"} • {tier.features?.maxSystems ? `Up to ${tier.features.maxSystems} hardware keys` : "Unlimited systems"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-white font-sans">${(tier.priceCents / 100).toFixed(2)}</p>
                        <p className="text-[9px] text-[var(--singr-text-secondary)] font-sans m-0">
                          {tier.interval === "month" ? "per month" : tier.interval === "6_months" ? "per 6 months" : "per year"}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-[var(--singr-border)] my-3"></div>

                    <GlassButton
                      onClick={() => handleSubscribe(tier.stripePriceId)}
                      variant={tier.interval === "year" ? "primary" : "secondary"}
                      className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                      disabled={loading}
                    >
                      <CreditCard className="w-3.5 h-3.5" /> 
                      {tier.features?.trialDays ? `Start Free Trial` : `Subscribe to ${tier.name}`}
                    </GlassButton>
                  </GlassCard>
                ))}
              </div>
            )}
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
