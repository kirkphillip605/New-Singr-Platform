"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut, authClient } from "@/lib/auth-client";
import { GlassButton, SingrLogo, GlassCard } from "@singr/ui";
import { 
  LayoutDashboard, 
  MapPin, 
  Tv, 
  Layers, 
  ListMusic, 
  Users, 
  CreditCard, 
  LogOut,
  Settings,
  Sparkles,
  HelpCircle,
  Menu,
  X
} from "lucide-react";

interface HostLayoutProps {
  children: React.ReactNode;
  title: string;
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

export const HostLayout: React.FC<HostLayoutProps> = ({ children, title }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: sessionLoading } = useSession();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const hasRedirected = useRef(false);

  // Billing states (for when subscription is inactive)
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Check onboarding status
  useEffect(() => {
    if (sessionLoading) return;

    if (!session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/login");
      return;
    }

    const checkOnboarding = async () => {
      try {
        // Extract session_id query parameter if present (from Stripe redirect)
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");
        if (sessionId) {
          console.log("Found Stripe checkout session_id in URL, verifying status...");
          try {
            const verifyRes = await fetch(`${apiUrl}/api/v1/billing/verify-session`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
              credentials: "include",
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              console.log("Subscription verified synchronously: active!");
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            }
          } catch (verifyErr) {
            console.error("Error calling verify-session endpoint:", verifyErr);
          }
        }

        const res = await fetch(`${apiUrl}/api/v1/users/profile`, {
          credentials: "include",
        });
        const data = await res.json();

        if (data.success && data.user) {
          const user = data.user;

          // Step 1: Email Verification
          if (!user.emailVerified && !hasRedirected.current) {
            hasRedirected.current = true;
            router.replace("/signup?step=1");
            return;
          }

          // Step 2: Complete Profile details (first name, last name, business name)
          if ((!user.firstName || !user.lastName || !user.businessName) && !hasRedirected.current) {
            hasRedirected.current = true;
            router.replace("/signup?step=2");
            return;
          }

          // Step 3: Subscription Status
          if (user.subscriptionStatus !== "active") {
            setIsSubscribed(false);
          } else {
            setIsSubscribed(true);
          }

          setCheckingOnboarding(false);
        } else if (!hasRedirected.current) {
          hasRedirected.current = true;
          router.replace("/login");
        }
      } catch (err) {
        console.error("Failed to fetch onboarding profile details:", err);
        // Fallback during local development if API is offline
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [session, sessionLoading, router, apiUrl]);

  // Load tiers when subscription is inactive
  useEffect(() => {
    if (!isSubscribed) {
      setLoadingTiers(true);
      fetch(`${apiUrl}/api/v1/billing/tiers`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.tiers) {
            setTiers(data.tiers);
          }
        })
        .catch((err) => {
          console.error("Error loading tiers:", err);
        })
        .finally(() => {
          setLoadingTiers(false);
        });
    }
  }, [isSubscribed, apiUrl]);

  // Close the mobile nav whenever the route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await signOut();
    hasRedirected.current = true;
    router.replace("/login");
  };

  const handleSubscribe = async (priceId: string) => {
    setErrorMsg("");
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
        setErrorMsg(res.error.message || "Failed to initiate Stripe Checkout.");
      } else if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        setErrorMsg("Failed to generate subscription checkout URL.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start subscription checkout.");
    } finally {
      setActionLoading(false);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Venues", href: "/venues", icon: MapPin },
    { name: "Shows", href: "/shows", icon: Tv },
    { name: "Systems", href: "/systems", icon: Layers },
    { name: "Live Queue", href: "/queue", icon: ListMusic },
    { name: "Host Team", href: "/team", icon: Users },
    { name: "Billing", href: "/billing", icon: CreditCard },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  if (sessionLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--singr-bg-primary)] text-[var(--singr-text-secondary)] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--singr-accent-primary)]/20 border-t-[var(--singr-accent-primary)] animate-spin"></div>
          <p className="text-xs tracking-wider uppercase font-bold text-[var(--singr-text-secondary)]">Validating Console Ledger...</p>
        </div>
      </div>
    );
  }

  // Account settings and Billing routes are always allowed to render children
  const isAccountRoute = pathname === "/settings" || pathname === "/billing";

  const sidebarContent = (
    <>
      <div>
        <div className="flex items-center justify-between mb-8">
          <SingrLogo variant="white" className="h-7 w-auto object-contain" />
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden text-[var(--singr-text-secondary)] hover:text-white p-1 rounded-lg"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all decoration-none ${
                  isActive
                    ? "bg-gradient-to-r from-[var(--singr-brand-start)]/10 to-[var(--singr-brand-end)]/10 border border-[var(--singr-accent-primary)]/20 text-[var(--singr-accent-primary)]"
                    : "text-[var(--singr-text-secondary)] hover:text-white hover:bg-[var(--glass-bg)] border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </a>
            );
          })}
        </nav>
      </div>

      {/* User Card & Logout */}
      <div className="flex flex-col gap-4">
        <div className="border-t border-[var(--singr-border)] pt-4"></div>
        {session?.user && (
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--singr-brand-start)] to-[var(--singr-brand-end)] flex items-center justify-center text-white font-bold text-sm">
              {session.user.name?.charAt(0).toUpperCase() || "H"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{session.user.name}</p>
              <p className="text-[10px] text-[var(--singr-text-secondary)] truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <GlassButton
          onClick={handleLogout}
          variant="secondary"
          className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400"
        >
          <LogOut className="w-3.5 h-3.5" /> Log Out Console
        </GlassButton>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--singr-bg-primary)]">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-[var(--singr-border)] bg-[var(--singr-bg-secondary)]/10 backdrop-blur-xl flex-col justify-between p-6">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[80vw] h-full border-r border-[var(--singr-border)] bg-[var(--singr-bg-secondary)] flex flex-col justify-between p-6 overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-[var(--singr-border)] px-4 sm:px-6 lg:px-8 py-4 lg:py-6 bg-[var(--singr-bg-secondary)]/5 backdrop-blur-md flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden text-[var(--singr-text-secondary)] hover:text-white p-1 -ml-1 rounded-lg shrink-0"
              aria-label="Open navigation"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] font-sans">
              WS Gateway Live
            </span>
          </div>
        </header>
        
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {!isSubscribed && !isAccountRoute ? (
            /* DYNAMIC SUBSCRIPTION BLOCKING INTERFACE */
            <div className="max-w-4xl mx-auto flex flex-col gap-8 py-4">
              <GlassCard className="p-8 relative overflow-hidden border-red-500/10" hoverable={false}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2 block font-sans">
                    Billing Coverage Required
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mb-2">
                    Activate Your Host Subscription
                  </h2>
                  <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0 leading-relaxed max-w-2xl">
                    To access the full host console features (deploying shows, editing venues, operating singer request queues), please choose a subscription plan below. All options include a free trial period.
                  </p>
                </div>
              </GlassCard>

              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1.5 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[var(--singr-accent-primary)]" />
                    Select a Coverage Plan
                  </h3>
                  <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0">
                    Choose the payment frequency that works best for your entertainment business.
                  </p>
                </div>

                {loadingTiers ? (
                  <div className="text-center py-12 text-sm text-[var(--singr-text-secondary)] font-sans">
                    Loading pricing options...
                  </div>
                ) : tiers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[var(--singr-text-secondary)] border border-white/5 rounded-2xl font-sans">
                    No pricing tiers found. Please contact support or retry later.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tiers.map((tier) => (
                      <GlassCard 
                        key={tier.stripePriceId} 
                        className="p-6 flex flex-col justify-between border border-white/5 hover:border-[var(--singr-accent-primary)]/20 transition-all duration-300"
                        hoverable={true}
                      >
                        <div>
                          <h4 className="text-base font-bold text-white mb-1">{tier.name}</h4>
                          <p className="text-[10px] text-[var(--singr-text-secondary)] font-sans mb-4">
                            {tier.features?.trialDays ? `${tier.features.trialDays}-day free trial included` : "Immediate access"}
                          </p>
                          
                          <div className="flex items-baseline gap-1 mb-6 font-sans">
                            <span className="text-3xl font-extrabold text-white">${(tier.priceCents / 100).toFixed(2)}</span>
                            <span className="text-[10px] text-[var(--singr-text-secondary)] font-sans">
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
                              <span>{tier.features?.support === "priority" ? "24/7 Priority Support" : "Standard Support"}</span>
                            </li>
                          </ul>
                        </div>

                        <GlassButton
                          onClick={() => handleSubscribe(tier.stripePriceId)}
                          disabled={actionLoading}
                          variant="primary"
                          className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Subscribe
                        </GlassButton>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
};
