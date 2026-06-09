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
  Sparkles,
  FileText
} from "lucide-react";

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
  const [activeSub, setActiveSub] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [upcomingInvoice, setUpcomingInvoice] = useState<any | null>(null);
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

      // 2. Load portal details
      const portalRes = await fetch(`${apiUrl}/api/v1/billing/portal-data`, {
        credentials: "include",
      });
      const portalData = await portalRes.json();
      if (portalData.success) {
        setActiveSub(portalData.subscription || null);
        setPaymentMethod(portalData.paymentMethod || null);
        setInvoices(portalData.invoices || []);
        setUpcomingInvoice(portalData.upcomingInvoice || null);
      } else {
        setError(portalData.message || "Failed to load billing details.");
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

  const handlePortalSession = async (flowType: string) => {
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/billing/portal-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flowType }),
        credentials: "include",
      });

      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message || `Failed to initiate portal session for ${flowType}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to billing portal.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubscribeNew = async (priceId: string) => {
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
        credentials: "include",
      });

      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message || "Failed to initiate Checkout session.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect checkout gateway.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "N/A";
    const date = new Date(typeof dateValue === "number" ? dateValue * 1000 : dateValue);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const isCurrentPlan = (priceId: string) => {
    if (!activeSub) return false;
    const monthlyPrice = "price_1TOBKUEHv8jD9HNKuH9i3sEy";
    const sixMonthPrice = "price_1TOBKVEHv8jD9HNKcXvrP2Po";
    const annualPrice = "price_1TOBKVEHv8jD9HNKK0nTrlRV";

    if (activeSub.plan === "monthly" && priceId === monthlyPrice) return true;
    if (activeSub.plan === "six_month" && priceId === sixMonthPrice) return true;
    if (activeSub.plan === "annual" && priceId === annualPrice) return true;

    // Fallbacks
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
          <>
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
                      {formatDate(activeSub.periodEnd)}.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto z-10">
                {!activeSub.cancelAtPeriodEnd && (
                  <GlassButton
                    onClick={() => handlePortalSession("subscription_cancel")}
                    disabled={actionLoading}
                    variant="secondary"
                    className="text-xs py-2.5 px-5 font-bold whitespace-nowrap border-red-500/20 text-red-400 hover:bg-red-500/5 hover:border-red-500/30"
                  >
                    {actionLoading ? "Processing..." : "Cancel Subscription"}
                  </GlassButton>
                )}

                <GlassButton
                  onClick={() => handlePortalSession("subscription_update")}
                  disabled={actionLoading}
                  variant="primary"
                  className="text-xs py-2.5 px-5 font-bold whitespace-nowrap"
                >
                  {actionLoading ? "Processing..." : "Change Subscription"}
                </GlassButton>
              </div>
            </GlassCard>

            {/* BILLING DETAILS AND PAYMENT METHOD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Method Card */}
              <GlassCard className="p-6 border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                <div>
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[var(--singr-accent-primary)]" />
                    Payment Method
                  </h3>

                  {paymentMethod ? (
                    <div className="flex items-center gap-4 mt-2">
                      <div className="w-12 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">
                        {paymentMethod.brand}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">•••• •••• •••• {paymentMethod.last4}</p>
                        <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                          Expires: {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--singr-text-secondary)] font-sans">No payment method on file.</p>
                  )}
                </div>

                <div className="mt-6">
                  <GlassButton
                    onClick={() => handlePortalSession("payment_method_update")}
                    disabled={actionLoading}
                    variant="secondary"
                    className="text-xs py-2 px-4 font-bold border-white/10 hover:border-white/20 w-full sm:w-auto"
                  >
                    Update Card Details
                  </GlassButton>
                </div>
              </GlassCard>

              {/* Next Charge Info Card */}
              <GlassCard className="p-6 border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                <div>
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--singr-accent-primary)]" />
                    Upcoming Charge
                  </h3>

                  {upcomingInvoice ? (
                    <div className="mt-2">
                      <p className="text-2xl font-extrabold text-white">{formatAmount(upcomingInvoice.amount)}</p>
                      <p className="text-xs text-[var(--singr-text-secondary)] font-sans mt-1">
                        Due Date: <strong className="text-white">{formatDate(upcomingInvoice.date)}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--singr-text-secondary)] font-sans">
                      {activeSub.cancelAtPeriodEnd 
                        ? "Subscription is set to cancel. No further renewals." 
                        : "No upcoming charges scheduled."}
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <GlassButton
                    onClick={() => handlePortalSession("general")}
                    disabled={actionLoading}
                    variant="secondary"
                    className="text-xs py-2 px-4 font-bold border-white/10 hover:border-white/20 w-full sm:w-auto flex items-center justify-center gap-1.5"
                  >
                    Go to Stripe Billing Portal <ExternalLink className="w-3 h-3" />
                  </GlassButton>
                </div>
              </GlassCard>
            </div>

            {/* BILLING HISTORY / INVOICES TABLE */}
            <GlassCard className="p-6 border-white/5">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--singr-accent-primary)]" />
                Billing History
              </h3>

              {invoices.length === 0 ? (
                <p className="text-xs text-[var(--singr-text-secondary)] font-sans py-4">No past invoices found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[var(--singr-text-secondary)] uppercase tracking-wider text-[10px] font-bold">
                        <th className="pb-3 pr-4">Invoice</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Amount</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-white/2">
                          <td className="py-3.5 pr-4 font-semibold">{inv.number || "Invoice"}</td>
                          <td className="py-3.5 pr-4 text-[var(--singr-text-secondary)]">{formatDate(inv.created)}</td>
                          <td className="py-3.5 pr-4 font-medium">{formatAmount(inv.amount)}</td>
                          <td className="py-3.5 pr-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                              inv.status === "paid" 
                                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                                : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex justify-end gap-2">
                              {inv.hostedUrl && (
                                <a
                                  href={inv.hostedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 text-[10px] font-semibold text-white bg-white/5 hover:bg-white/8 transition-colors decoration-none"
                                >
                                  View
                                </a>
                              )}
                              {inv.pdf && (
                                <a
                                  href={inv.pdf}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 text-[10px] font-semibold text-[var(--singr-accent-primary)] bg-white/5 hover:bg-white/8 transition-colors decoration-none"
                                >
                                  PDF
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </>
        ) : (
          /* SUSPENDED/UNSUBSCRIBED SCREEN WITH PLANS GRID */
          <>
            <GlassCard className="p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-red-500/10" hoverable={false}>
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

            <div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1.5 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--singr-accent-primary)]" />
                  Singr Connect Plans
                </h3>
                <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0">
                  Select a subscription plan to reactivate your coverage. All plans include 24/7 support.
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
                            onClick={() => handlePortalSession("subscription_update")}
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
          </>
        )}
      </div>
    </HostLayout>
  );
}
