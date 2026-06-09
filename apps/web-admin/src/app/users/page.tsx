"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { UserSquare2, ShieldX, UserCheck, Plus, X, Search, ShieldAlert } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  emailVerified: boolean;
  roles: string[];
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // General Notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        q: searchQuery,
        page: String(page),
        limit: "20",
      });

      const res = await fetch(`${apiUrl}/api/v1/admin/users?${queryParams.toString()}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
        if (data.pagination) {
          setTotalPages(data.pagination.pages || 1);
        }
      } else {
        setNotification({ type: "error", message: data.message || "Failed to load users." });
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Failed to connect to the administration API." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleBanToggle = async (id: string, currentlyBanned: boolean) => {
    setNotification(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/users/${id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ban: !currentlyBanned }),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: "success",
          message: data.message || `User successfully ${currentlyBanned ? "reinstated" : "suspended"}.`,
        });
        fetchUsers();
      } else {
        setNotification({ type: "error", message: data.message || "Failed to toggle suspension state." });
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Failed to communicate ban state toggle to server." });
    }
  };

  const handleImpersonate = async (userId: string) => {
    setNotification(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/impersonate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: "success", message: `Establishing impersonated session for ${data.user?.email}...` });
        const hostPortalUrl = process.env.NEXT_PUBLIC_HOST_PORTAL_URL || "http://localhost:3010";
        setTimeout(() => {
          window.location.href = hostPortalUrl;
        }, 1500);
      } else {
        setNotification({ type: "error", message: data.message || "Failed to establish impersonation." });
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Error contacting impersonation auth server." });
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");
    setCreateLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/create-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: createEmail }),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setModalSuccess(data.message || "Admin account successfully configured.");
        setCreateEmail("");
        fetchUsers();
      } else {
        setModalError(data.message || "Failed to configure admin account.");
      }
    } catch (err) {
      console.error(err);
      setModalError("Server communication error.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <AdminLayout title="User & Security Management">
      <div className="flex flex-col gap-6">
        
        <div className="flex justify-between items-center flex-wrap gap-4">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0 max-w-2xl">
            Super-admin controls to inspect platform users, issue account bans, and exchange administrative sessions to impersonate hosts for direct troubleshooting.
          </p>
          <GlassButton 
            onClick={() => { setIsCreateModalOpen(true); setModalError(""); setModalSuccess(""); }} 
            className="flex items-center gap-1.5 py-2 px-4 bg-gradient-to-tr from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-xs font-bold font-sans border-none rounded-xl"
          >
            <Plus className="w-4 h-4" /> Create Support Admin
          </GlassButton>
        </div>

        {notification && (
          <div className={`p-4 rounded-xl border font-sans text-xs ${
            notification.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
            {notification.type === "success" ? "✓" : "⚠️"} {notification.message}
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--singr-text-secondary)] absolute left-4 top-1/2 -translate-y-1/2" />
            <GlassInput
              placeholder="Search users by name or email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
            />
          </div>
          <GlassButton type="submit" className="py-2.5 px-5 text-xs font-bold font-sans border-white/10 hover:border-white/20">
            Search Ledger
          </GlassButton>
        </form>

        {/* User table */}
        <GlassCard className="p-0 overflow-hidden" hoverable={false}>
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
                    <td colSpan={5} className="p-8 text-center text-[var(--singr-text-secondary)]">
                      Querying global user directory...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--singr-text-secondary)]">
                      No users found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const name = u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.email.split("@")[0];
                    const isBanned = !!u.deletedAt;
                    return (
                      <tr key={u.id} className="border-b border-[var(--singr-border)] hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold text-xs">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-white">{name}</span>
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
                          {isBanned ? (
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
                                onClick={() => handleImpersonate(u.id)}
                                variant="secondary"
                                className="py-1 px-2.5 text-[10px] border border-orange-500/10 hover:border-orange-500/30 hover:bg-orange-500/5 text-orange-400 flex items-center gap-1 inline-flex"
                                disabled={isBanned}
                              >
                                <UserSquare2 className="w-3.5 h-3.5" /> Impersonate Host
                              </GlassButton>
                            )}
                            <GlassButton
                              onClick={() => handleBanToggle(u.id, isBanned)}
                              variant="secondary"
                              className={`py-1 px-2.5 text-[10px] flex items-center gap-1 inline-flex ${
                                isBanned 
                                  ? "border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-emerald-400"
                                  : "border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400"
                              }`}
                            >
                              {isBanned ? "Reinstate User" : "Suspend Account"}
                            </GlassButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-[var(--singr-border)] font-sans text-xs">
              <GlassButton
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="py-1.5 px-3"
              >
                Previous
              </GlassButton>
              <span className="text-[var(--singr-text-secondary)]">Page {page} of {totalPages}</span>
              <GlassButton
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="py-1.5 px-3"
              >
                Next
              </GlassButton>
            </div>
          )}
        </GlassCard>

        {/* Modal for Creating Support Admin */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <GlassCard className="max-w-md w-full p-8 relative overflow-hidden font-sans border-red-500/20" hoverable={false}>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="absolute right-4 top-4 text-[var(--singr-text-secondary)] hover:text-white bg-transparent border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-white m-0">Create Support Admin Account</h3>
              </div>

              <p className="text-xs text-[var(--singr-text-secondary)] mb-6 leading-relaxed">
                Provide an email address to grant Support Administrator privileges. If a user already exists with this email, the role will be appended to their profile. If new, a welcome email with temporary credentials will be dispatched.
              </p>

              {modalError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  ⚠️ {modalError}
                </div>
              )}
              {modalSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  ✓ {modalSuccess}
                </div>
              )}

              <form onSubmit={handleCreateAdmin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Admin Email</label>
                  <GlassInput
                    type="email"
                    placeholder="agent@singrkaraoke.com"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-3 justify-end mt-2">
                  <GlassButton 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)}
                    variant="secondary"
                    className="py-2 px-4 text-xs font-semibold"
                    disabled={createLoading}
                  >
                    Close
                  </GlassButton>
                  <GlassButton 
                    type="submit" 
                    className="py-2 px-4 bg-gradient-to-tr from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-xs font-bold border-none"
                    disabled={createLoading}
                  >
                    {createLoading ? "Creating Account..." : "Create Account"}
                  </GlassButton>
                </div>
              </form>
            </GlassCard>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
