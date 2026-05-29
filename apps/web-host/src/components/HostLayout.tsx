"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { GlassButton, SingrLogo } from "@singr/ui";
import { 
  LayoutDashboard, 
  MapPin, 
  Tv, 
  Layers, 
  ListMusic, 
  Users, 
  CreditCard, 
  LogOut,
  Settings
} from "lucide-react";

interface HostLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const HostLayout: React.FC<HostLayoutProps> = ({ children, title }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: sessionLoading } = useSession();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session) {
      router.push("/login");
      return;
    }

    // Validate onboarding state (email, profile details, and stripe subscription)
    const checkOnboarding = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/api/v1/users/profile`, {
          credentials: "include",
        });
        const data = await res.json();

        if (data.success && data.user) {
          const user = data.user;

          // Step 1: Email Verification
          if (!user.emailVerified) {
            router.push("/signup?step=1");
            return;
          }

          // Step 2: Complete Profile
          if (!user.firstName || !user.lastName || !user.phoneNumber || !user.businessName) {
            router.push("/signup?step=2");
            return;
          }

          // Step 3: Subscription Status
          if (user.subscriptionStatus !== "active") {
            router.push("/signup?step=3");
            return;
          }

          setCheckingOnboarding(false);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Failed to fetch onboarding profile details:", err);
        // Fallback during local development if API is offline
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [session, sessionLoading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
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

  return (
    <div className="flex min-h-screen bg-[var(--singr-bg-primary)]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[var(--singr-border)] bg-[var(--singr-bg-secondary)]/10 backdrop-blur-xl flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center mb-8">
            <SingrLogo variant="white" className="h-7 w-auto object-contain" />
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
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-[var(--singr-border)] px-8 py-6 bg-[var(--singr-bg-secondary)]/5 backdrop-blur-md flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)] font-sans">
              WS Gateway Live
            </span>
          </div>
        </header>
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
