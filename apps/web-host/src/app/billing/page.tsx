"use client";

import React from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { CreditCard, Check, ShieldCheck } from "lucide-react";

export default function BillingPage() {
  const handleCheckout = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.singrkaraoke.com";
    window.location.href = `${apiUrl}/api/v1/billing/checkout?priceId=price_sandbox_premium`;
  };

  return (
    <HostLayout title="Subscription & Billing">
      <div className="flex flex-col gap-8 max-w-4xl">
        
        {/* Active subscription card */}
        <GlassCard className="p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--singr-accent-primary)] mb-2 block font-sans">Account Status Ledger</span>
            <h2 className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" /> Premium Venue Subscription
            </h2>
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
              Your Stripe sandbox account has active billing coverage. Next billing renewal date: June 28, 2026.
            </p>
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full font-sans uppercase tracking-wider">
              ● Active Coverage
            </span>
          </div>
        </GlassCard>

        {/* Pricing models */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          
          <GlassCard className="p-8 flex flex-col justify-between" hoverable={true}>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Standard Host</h3>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans mb-4">Perfect for casual co-hosts or weekend parties</p>
              <p className="text-3xl font-extrabold text-white mb-6">$29<span className="text-xs text-[var(--singr-text-secondary)]">/mo</span></p>
              <div className="border-t border-[var(--singr-border)] my-4"></div>
              <ul className="list-none p-0 m-0 flex flex-col gap-3 font-sans text-xs mb-8">
                <li className="flex items-center gap-2 text-[var(--singr-text-secondary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--singr-accent-primary)]" /> Up to 2 active shows
                </li>
                <li className="flex items-center gap-2 text-[var(--singr-text-secondary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--singr-accent-primary)]" /> Drag & drop queue
                </li>
                <li className="flex items-center gap-2 text-[var(--singr-text-secondary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--singr-accent-primary)]" /> OpenKJ compatibility
                </li>
              </ul>
            </div>
            <GlassButton variant="secondary" className="w-full py-2.5 text-xs font-bold">
              Current Plan Option
            </GlassButton>
          </GlassCard>

          <GlassCard className="p-8 flex flex-col justify-between border-2 border-[var(--singr-accent-primary)]/30 relative" hoverable={true}>
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[var(--singr-brand-start)] to-[var(--singr-brand-end)] text-white text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-lg">
              Most Popular
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Premium Venue</h3>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans mb-4">Designed for multi-venue setups and high traffic</p>
              <p className="text-3xl font-extrabold text-white mb-6">$59<span className="text-xs text-[var(--singr-text-secondary)]">/mo</span></p>
              <div className="border-t border-[var(--singr-border)] my-4"></div>
              <ul className="list-none p-0 m-0 flex flex-col gap-3 font-sans text-xs mb-8">
                <li className="flex items-center gap-2 text-[var(--singr-text-secondary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--singr-accent-primary)]" /> Unlimited shows & venues
                </li>
                <li className="flex items-center gap-2 text-[var(--singr-text-secondary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--singr-accent-primary)]" /> Up to 5 team manager seats
                </li>
                <li className="flex items-center gap-2 text-[var(--singr-text-secondary)]">
                  <Check className="w-3.5 h-3.5 text-[var(--singr-accent-primary)]" /> System allocation & key rotation
                </li>
              </ul>
            </div>
            <GlassButton onClick={handleCheckout} variant="primary" className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Manage via Stripe Checkout
            </GlassButton>
          </GlassCard>

        </div>

      </div>
    </HostLayout>
  );
}
