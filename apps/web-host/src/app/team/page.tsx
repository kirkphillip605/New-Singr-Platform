"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { Plus, Trash2, Mail } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("host_manager");

  useEffect(() => {
    // Simulated load from GET /api/v1/teams
    const timer = setTimeout(() => {
      setMembers([
        {
          id: "m-1",
          name: "Phillip Kirk",
          email: "phillip@singrkaraoke.com",
          role: "host",
        },
        {
          id: "m-2",
          name: "Assistant KJ",
          email: "kj@singrkaraoke.com",
          role: "host_manager",
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: TeamMember = {
      id: `m-${Date.now()}`,
      name: "Pending Invitation",
      email: inviteEmail,
      role: inviteRole,
    };

    setMembers([...members, newMember]);
    setIsInviteOpen(false);
    setInviteEmail("");
    setInviteRole("host_manager");
  };

  const handleDelete = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  return (
    <HostLayout title="Host Team Members">
      <div className="flex flex-col gap-6">
        
        {/* Header CTA */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
            Invite co-hosts or managers to run show queues and register venues under your account.
          </p>
          <GlassButton onClick={() => setIsInviteOpen(!isInviteOpen)} variant="primary" className="text-xs py-2.5 px-4 flex items-center justify-center gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> {isInviteOpen ? "Collapse Form" : "Invite Member"}
          </GlassButton>
        </div>

        {/* Invite Form Drawer */}
        {isInviteOpen && (
          <GlassCard className="p-8 max-w-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[var(--singr-accent-primary)]" /> Send Team Invitation
            </h3>
            <form onSubmit={handleInvite} className="flex flex-col gap-4 font-sans text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Email Address</label>
                <GlassInput
                  type="email"
                  placeholder="assistant-kj@venue.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Account Permission Level</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="glass-input text-[var(--singr-text-primary)] bg-black/40 border border-[var(--glass-border)] outline-none rounded-xl p-3"
                >
                  <option value="host_manager">Host Manager (Can run active shows/queues)</option>
                  <option value="host">Host Admin (Full billing/venue CRUD access)</option>
                </select>
              </div>

              <GlassButton type="submit" variant="primary" className="self-start py-2.5 px-6 mt-2 text-xs font-bold">
                Send Invite Link
              </GlassButton>
            </form>
          </GlassCard>
        )}

        {/* Members List */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-[var(--singr-border)] bg-white/5 text-[var(--singr-text-secondary)]">
                  <th className="p-4 font-semibold uppercase tracking-wider">Name</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Email</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Role</th>
                  <th className="p-4 text-right font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-[var(--singr-text-secondary)]">Retrieving team ledger...</td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className="border-b border-[var(--singr-border)] hover:bg-white/5 transition-colors">
                      <td className="p-4 font-semibold text-white">{m.name}</td>
                      <td className="p-4 text-[var(--singr-text-secondary)] font-mono">{m.email}</td>
                      <td className="p-4">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          m.role === "host" ? "text-emerald-400 bg-emerald-500/10" : "text-purple-400 bg-purple-500/10"
                        }`}>
                          {m.role === "host" ? "Host Admin" : "Host Manager"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {m.role !== "host" ? (
                          <GlassButton
                            onClick={() => handleDelete(m.id)}
                            variant="secondary"
                            className="py-1 px-2.5 text-[10px] border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 flex items-center gap-1 inline-flex"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </GlassButton>
                        ) : (
                          <span className="text-[10px] text-[var(--singr-text-secondary)] italic">Owner Account</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

      </div>
    </HostLayout>
  );
}
