"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { UserSquare2, ShieldX, UserCheck } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  banned: boolean;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated load from GET /api/v1/admin/users
    const timer = setTimeout(() => {
      setUsers([
        {
          id: "u-1",
          name: "Phillip Kirk",
          email: "kirkphillip@singrkaraoke.com",
          roles: ["host", "singer"],
          banned: false,
        },
        {
          id: "u-2",
          name: "Sarah Connor",
          email: "sarah@singrkaraoke.com",
          roles: ["singer"],
          banned: false,
        },
        {
          id: "u-3",
          name: "Banned Spammer",
          email: "spammer@gmail.com",
          roles: ["singer"],
          banned: true,
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleBanToggle = (id: string) => {
    setUsers(users.map(u => 
      u.id === id ? { ...u, banned: !u.banned } : u
    ));
  };

  const handleImpersonate = (email: string) => {
    const hostPortalUrl = process.env.NEXT_PUBLIC_HOST_PORTAL_URL || "https://host.singrkaraoke.com";
    window.location.href = `${hostPortalUrl}/dashboard?impersonate=${email}`;
  };

  return (
    <AdminLayout title="User & Security Management">
      <div className="flex flex-col gap-6">
        
        {/* Header summary */}
        <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
          Super-admin controls to inspect platform users, issue account bans, and exchange administrative sessions to impersonate hosts for direct troubleshooting.
        </p>

        {/* User table */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[var(--singr-border)] bg-white/5 text-[var(--singr-text-secondary)]">
                  <th className="p-4 font-semibold uppercase tracking-wider">User Information</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Email Address</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Roles</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Security State</th>
                  <th className="p-4 text-right font-semibold uppercase tracking-wider">Impersonation Controls</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-[var(--singr-text-secondary)]">Querying global user directory...</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--singr-border)] hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold text-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-white">{u.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-[var(--singr-text-secondary)] font-mono">{u.email}</td>
                      <td className="p-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {u.roles.map(role => (
                            <span key={role} className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-[var(--singr-text-secondary)] border border-white/5">
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        {u.banned ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <ShieldX className="w-3.5 h-3.5" /> Banned / Restricted
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> Clean Standing
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {u.roles.includes("host") && (
                            <GlassButton
                              onClick={() => handleImpersonate(u.email)}
                              variant="secondary"
                              className="py-1 px-2.5 text-[10px] border border-orange-500/10 hover:border-orange-500/30 hover:bg-orange-500/5 text-orange-400 flex items-center gap-1 inline-flex"
                              disabled={u.banned}
                            >
                              <UserSquare2 className="w-3.5 h-3.5" /> Impersonate Host
                            </GlassButton>
                          )}
                          <GlassButton
                            onClick={() => handleBanToggle(u.id)}
                            variant="secondary"
                            className={`py-1 px-2.5 text-[10px] flex items-center gap-1 inline-flex ${
                              u.banned 
                                ? "border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-emerald-400"
                                : "border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400"
                            }`}
                          >
                            {u.banned ? "Reinstate User" : "Suspend Account"}
                          </GlassButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

      </div>
    </AdminLayout>
  );
}
