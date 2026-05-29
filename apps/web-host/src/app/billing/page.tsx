"use client";

import React, { useState, useEffect, useCallback } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { 
  CreditCard, 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle,
  ExternalLink,
  Calendar,
  Layers,
  MapPin,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface Subscription {
  id: string;
  plan: string;
  referenceId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  cancelAt: string | null;
  canceledAt: string | null;
  endedAt: string | null;
  seats: number | null;
  billingInterval: string | null;
}

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

export default function BillingPage() {
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadData = useCallback(async () => {
    try {
      // 1. Load active plans from backend
      const tiersRes = await fetch(`${apiUrl}/api/v1/billing/tiers`);
      const tiersData = await tiersRes.json();
      if (tiersData.success && tiersData.tiers) {
        setTiers(tiersData.tiers);
      }

      // 2. Load active subscription from Better Auth
      const subRes = await authClient.subscription.list();
      if (subRes?.data) {
        const subs = subRes.data as unknown as Subscription[];
        const active = subs.find(
          (s) => s.status === "active" || s.status === "trialing"
        );
        setActiveSub(active || null);
      } else if (subRes?.error) {
        setError(subRes.error.message || "Failed to load active subscriptions.");
      }
    } catch (err: any) {
      console.error("Error loading billing data:", err);
      setError("Failed to communicate with billing gateway.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePortal = async () => {
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await authClient.subscription.billingPortal({
        returnUrl: window.location.href,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to launch billing portal.");
      } else if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError("Billing portal URL not generated.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to start billing portal session.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubscribeNew = async (priceId: string) => {
    setError("");
    setSuccess("");
    setActionLoading(true);

    let plan = "monthly";
    if (priceId === "price_1TOBKVEHv8jD9HNKcXvrP2Po") plan = "six_month";
    if (priceId === "price_1TOBKVEHv8jD9HNKK0nTrlRV") plan = "annual";

    try {
      const res = await authClient.subscription.upgrade({
        plan,
        successUrl: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to initiate Stripe Checkout.");
      } else if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError("Failed to generate checkout session.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect checkout gateway.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwitchPlan = async (priceId: string) => {
    if (!activeSub || !activeSub.stripeSubscriptionId) return;
    setError("");
    setSuccess("");
    setActionLoading(true);

    let plan = "monthly";
    if (priceId === "price_1TOBKVEHv8jD9HNKcXvrP2Po") plan = "six_month";
    if (priceId === "price_1TOBKVEHv8jD9HNKK0nTrlRV") plan = "annual";

    try {
      // Schedule plan changes at period end to prevent double-charging or complicated proration
      const res = await authClient.subscription.upgrade({
        plan,
        subscriptionId: activeSub.stripeSubscriptionId,
        scheduleAtPeriodEnd: true,
        successUrl: `${window.location.origin}/billing?updated=true`,
        cancelUrl: window.location.href,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to update subscription plan.");
      } else if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        setSuccess(`Subscription plan change to '${plan}' scheduled successfully at period end.`);
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || "Failed to process plan switch.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeSub || !activeSub.stripeSubscriptionId) return;
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await authClient.subscription.cancel({
        subscriptionId: activeSub.stripeSubscriptionId,
        returnUrl: window.location.href,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to cancel subscription.");
      } else {
        setSuccess("Subscription scheduled for cancellation at the end of the current billing cycle.");
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || "Failed to cancel subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!activeSub || !activeSub.stripeSubscriptionId) return;
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await authClient.subscription.restore({
        subscriptionId: activeSub.stripeSubscriptionId,
      });

      if (res?.error) {
        setError(res.error.message || "Failed to restore subscription.");
      } else {
        setSuccess("Subscription successfully restored! Your account will renew normally.");
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || "Failed to restore subscription.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isCurrentPlan = (priceId: string) => {
    if (!activeSub) return false;
    // Map current priceId to current active plan
    const monthlyPrice = "price_1TOBKUEHv8jD9HNKuH9i3sEy";
    const sixMonthPrice = "price_1TOBKVEHv8jD9HNKcXvrP2Po";
    const annualPrice = "price_1TOBKVEHv8jD9HNKK0nTrlRV";

    if (activeSub.plan === "monthly" && priceId === monthlyPrice) return true;
    if (activeSub.plan === "six_month" && priceId === sixMonthPrice) return true;
    if (activeSub.plan === "annual" && priceId === annualPrice) return true;

    // Direct mapping match fallback
    if (activeSub.plan.toLowerCase().includes("monthly") && priceId === monthlyPrice) return true;
    if (activeSub.plan.toLowerCase().includes("6-month") && priceId === sixMonthPrice) return true;
    if (activeSub.plan.toLowerCase().includes("annual") && priceId === annualPrice) return true;

    return false;
  };

  if (loading) {
    return (
      <HostLayout title="Subscription & Billing">
        <div className="flex flex-col items-center justify-center py-16 text-[var(--singr-text-secondary)] font-sans">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--singr-accent-primary)]/20 border-t-[var(--singr-accent-primary)] animate-spin mb-3"></div>
          <p className="text-xs uppercase font-bold tracking-wider">Syncing Ledger Credentials...</p>
        </div>
      </HostLayout>
    );
  }

  return (
    <HostLayout title="Subscription & Billing">
      <div className="flex flex-col gap-8 max-w-5xl">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-sans">
            ✨ {success}
          </div>
        )}

        {/* ACTIVE SUBSCRIPTION OVERVIEW */}
        {activeSub ? (
          <GlassCard className="p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-emerald-500/15">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
            
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--singr-accent-primary)] mb-2 block font-sans">
                Active Console Ledger
              </span>
              <h2 className="text-2xl font-extrabold text-white mb-2.5 flex items-center gap-2">
                <ShieldCheck className="w-6.5 h-6.5 text-emerald-400" /> 
                {activeSub.plan.toUpperCase().replace("_", " ")} Plan
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4 font-sans text-xs text-[var(--singr-text-secondary)]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[var(--singr-accent-primary)]" />
                  <span>
                    {activeSub.status === "trialing" ? "Trial Period Ends:" : "Next Renewal Date:"}{" "}
                    <strong className="text-white">{formatDate(activeSub.periodEnd)}</strong>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[var(--singr-accent-primary)]" />
                  <span>
                    Billing Interval: <strong className="text-white capitalize">{activeSub.billingInterval || "Month"}</strong>
                  </span>
                </div>
              </div>

              {activeSub.cancelAtPeriodEnd && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 max-w-xl font-sans text-xs text-amber-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Subscription set to cancel.</strong> Access remains active until{" "}
                    {formatDate(activeSub.periodEnd)}. Restoring will resume normal billing renewals.
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {activeSub.cancelAtPeriodEnd ? (
                <GlassButton
                  onClick={handleRestore}
                  disabled={actionLoading}
                  variant="primary"
                  className="text-xs py-2.5 px-5 font-bold whitespace-nowrap bg-emerald-600 hover:bg-emerald-500"
                >
                  {actionLoading ? "Processing..." : "Restore Subscription"}
                </GlassButton>
              ) : (
                <GlassButton
                  onClick={handleCancel}
                  disabled={actionLoading}
                  variant="secondary"
                  className="text-xs py-2.5 px-5 font-bold whitespace-nowrap border-red-500/20 text-red-400 hover:bg-red-500/5 hover:border-red-500/30"
                >
                  {actionLoading ? "Processing..." : "Cancel Subscription"}
                </GlassButton>
              )}

              <GlassButton
                onClick={handlePortal}
                disabled={actionLoading}
                variant="secondary"
                className="text-xs py-2.5 px-5 font-bold flex items-center justify-center gap-1.5 whitespace-nowrap border-white/10 hover:border-white/20"
              >
                Billing Portal <ExternalLink className="w-3.5 h-3.5" />
              </GlassButton>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-red-500/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2 block font-sans">
                Billing Suspended
              </span>
              <h2 className="text-2xl font-extrabold text-white mb-2">
                No Active Coverage Found
              </h2>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0 leading-relaxed">
                Choose one of the premium plan options below to reactivate your host portal access, deploy systems, and host queues.
              </p>
            </div>
          </GlassCard>
        )}

        {/* PRICING PLANS GRID */}
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-1.5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--singr-accent-primary)]" />
              Singr Connect Plans
            </h3>
            <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0">
              Select or switch between pricing models. Downward changes are automatically scheduled at period end to protect current billing cycles.
            </p>
          </div>

          {tiers.length === 0 ? (
            <div className="text-center py-8 text-xs text-[var(--singr-text-secondary)] border border-white/5 rounded-2xl font-sans">
              No pricing structures configured. Check seed settings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier) => {
                const current = isCurrentPlan(tier.stripePriceId);
                return (
                  <GlassCard 
                    key={tier.stripePriceId} 
                    className={`p-6 flex flex-col justify-between relative transition-all duration-300 ${
                      current 
                        ? "border-2 border-[var(--singr-accent-primary)] bg-[var(--singr-bg-secondary)]/30" 
                        : "border border-white/5 hover:border-[var(--singr-accent-primary)]/20"
                    }`}
                    hoverable={!current}
                  >
                    {current && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-[var(--singr-brand-start)] to-[var(--singr-brand-end)] text-white text-[8px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-bl-lg font-sans">
                        Active Plan
                      </div>
                    )}
                    
                    <div>
                      <h4 className="text-base font-bold text-white mb-1">{tier.name}</h4>
                      <p className="text-[10px] text-[var(--singr-text-secondary)] font-sans mb-4">
                        {tier.features?.trialDays ? `${tier.features.trialDays}-day free trial included` : "Immediate access"}
                      </p>
                      
                      <div className="flex items-baseline gap-1 mb-6 font-sans">
                        <span className="text-3xl font-extrabold text-white">${(tier.priceCents / 100).toFixed(2)}</span>
                        <span className="text-[10px] text-[var(--singr-text-secondary)]">
                          /{tier.interval === "month" ? "mo" : tier.interval === "6_months" ? "6mo" : "yr"}
                        </span>
                      </div>
                      
                      <div className="border-t border-[var(--singr-border)] my-4"></div>
                      
                      <ul className="list-none p-0 m-0 flex flex-col gap-3 font-sans text-xs text-[var(--singr-text-secondary)] mb-6">
                        <li className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[var(--singr-accent-primary)] flex-shrink-0" />
                          <span>{tier.features?.maxVenues ? `Up to ${tier.features.maxVenues} active venues` : "Unlimited venues"}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-[var(--singr-accent-primary)] flex-shrink-0" />
                          <span>{tier.features?.maxSystems ? `Up to ${tier.features.maxSystems} hardware keys` : "Unlimited hardware"}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-[var(--singr-accent-primary)] flex-shrink-0" />
                          <span>{tier.features?.support === "priority" ? "24/7 Priority Support" : "Standard Email Support"}</span>
                        </li>
                      </ul>
                    </div>

                    {current ? (
                      <GlassButton
                        disabled={true}
                        variant="secondary"
                        className="w-full py-2.5 text-xs font-bold border-white/5 text-[var(--singr-text-secondary)] cursor-default"
                      >
                        Active Coverage
                      </GlassButton>
                    ) : activeSub ? (
                      <GlassButton
                        onClick={() => handleSwitchPlan(tier.stripePriceId)}
                        disabled={actionLoading}
                        variant="secondary"
                        className="w-full py-2.5 text-xs font-bold border-[var(--singr-accent-primary)]/20 text-[var(--singr-accent-primary)] hover:bg-[var(--singr-accent-primary)]/5 hover:border-[var(--singr-accent-primary)]/40"
                      >
                        {actionLoading ? "Switching..." : `Switch to ${tier.interval === "month" ? "Monthly" : tier.interval === "6_months" ? "6-Month" : "Annual"}`}
                      </GlassButton>
                    ) : (
                      <GlassButton
                        onClick={() => handleSubscribeNew(tier.stripePriceId)}
                        disabled={actionLoading}
                        variant="primary"
                        className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Subscribe
                      </GlassButton>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </HostLayout>
  );
}
