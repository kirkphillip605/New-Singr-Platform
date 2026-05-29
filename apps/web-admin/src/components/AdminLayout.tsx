"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { GlassButton, SingrLogo } from "@singr/ui";
import { LayoutDashboard, Users, LogOut, ShieldAlert } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const navItems = [
    { name: "Global Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "User Management", href: "/users", icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--singr-bg-primary)]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[var(--singr-border)] bg-[var(--singr-bg-secondary)]/10 backdrop-blur-xl flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <SingrLogo variant="white" className="h-6 w-auto object-contain" />
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full font-sans">
              Admin
            </span>
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
                      ? "bg-gradient-to-r from-red-600/10 to-red-400/10 border border-red-500/20 text-red-400"
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
              <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm">
                A
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
            <LogOut className="w-3.5 h-3.5" /> Close Session
          </GlassButton>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-[var(--singr-border)] px-8 py-6 bg-[var(--singr-bg-secondary)]/5 backdrop-blur-md flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            {title}
          </h2>
          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider font-sans">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> Secure Context
          </div>
        </header>
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
