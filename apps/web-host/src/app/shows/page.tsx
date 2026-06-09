"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { ShowWizard } from "@/components/ShowWizard";
import { type Venue } from "@/components/VenueWizard";
import { Plus, Trash2, Power, KeyRound, Link } from "lucide-react";

interface Show {
  id: string;
  showName: string;
  slug: string;
  venueName: string;
  pinCode: string | null;
  isAccepting: boolean;
  activeSystemsId: string | null;
}

interface HardwareSystem {
  id: string;
  systemNumber: number;
}

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [systems, setSystems] = useState<HardwareSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadData = async () => {
    try {
      const showsRes = await fetch(`${apiUrl}/api/v1/shows`, { credentials: "include" });
      const showsData = await showsRes.json();
      if (showsData.success) {
        setShows(showsData.shows || []);
      }

      const venuesRes = await fetch(`${apiUrl}/api/v1/venues`, { credentials: "include" });
      const venuesData = await venuesRes.json();
      if (venuesData.success) {
        setVenues(venuesData.venues || []);
      }

      const sysRes = await fetch(`${apiUrl}/api/v1/systems`, { credentials: "include" });
      const sysData = await sysRes.json();
      if (sysData.success) {
        setSystems(sysData.systems || []);
      }
    } catch (err) {
      console.error("Failed to load show setup data:", err);
      setError("Failed to sync setup databases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleShowCreated = async () => {
    setSuccess("Show created successfully!");
    await loadData();
  };

  const handleVenueCreated = (venue: Venue) => {
    setVenues((prev) => [...prev, venue]);
  };

  const handleToggleAccepting = async (id: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/shows/${id}/accepting`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAccepting: !currentStatus }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setShows(
          shows.map((show) =>
            show.id === id ? { ...show, isAccepting: !currentStatus } : show
          )
        );
      } else {
        setError(data.message || "Failed to toggle status.");
      }
    } catch (err) {
      console.error("Failed to toggle accepting:", err);
      setError("Failed to update queue status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSystem = async (showId: string, systemId: string) => {
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${apiUrl}/api/v1/shows/${showId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeSystemsId: systemId || null }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Hardware player successfully bound to show!");
        setShows(
          shows.map((show) =>
            show.id === showId ? { ...show, activeSystemsId: systemId || null } : show
          )
        );
      } else {
        setError(data.message || "Failed to bind system.");
      }
    } catch (err) {
      console.error("System bind failed:", err);
      setError("Failed to update system binding.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this show? Requests history will be preserved but active queue will close."
      )
    )
      return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/shows/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Show deleted successfully.");
        await loadData();
      } else {
        setError(data.message || "Failed to delete show.");
      }
    } catch (err) {
      console.error("Failed to delete show:", err);
      setError("Failed to submit delete request.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <HostLayout title="Show Controls">
      <div className="flex flex-col gap-6">
        {/* Header CTA */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
            Configure individual shows, manage entry pins, link player machines, and toggle
            requests accepting status.
          </p>
          <GlassButton
            onClick={() => {
              setError("");
              setSuccess("");
              setWizardOpen(true);
            }}
            variant="primary"
            className="text-xs py-2.5 px-4 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Show
          </GlassButton>
        </div>

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

        <ShowWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          venues={venues}
          onVenueCreated={handleVenueCreated}
          onCreated={handleShowCreated}
        />

        {/* Shows list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {loading ? (
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans">
              Accessing registered shows...
            </p>
          ) : shows.length === 0 ? (
            <GlassCard className="p-8 text-center lg:col-span-2">
              <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
                No shows registered yet. Tap &ldquo;Create Show&rdquo; above to launch your first
                night.
              </p>
            </GlassCard>
          ) : (
            shows.map((show) => (
              <GlassCard
                key={show.id}
                className="p-6 flex flex-col justify-between"
                hoverable={true}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white leading-tight mb-1">
                        {show.showName}
                      </h3>
                      <p className="text-xs text-[var(--singr-text-secondary)] font-sans truncate">
                        {show.venueName} • /{show.slug}
                      </p>
                    </div>
                    {show.isAccepting ? (
                      <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full animate-pulse font-sans shrink-0">
                        ● Open
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-3 py-1 rounded-full font-sans shrink-0">
                        ■ Closed
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 font-sans text-xs mb-6">
                    <div className="flex items-center gap-2 text-[var(--singr-text-secondary)]">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>
                        Access Code:{" "}
                        {show.pinCode ? (
                          <strong className="text-purple-400 font-mono text-sm">
                            {show.pinCode}
                          </strong>
                        ) : (
                          <span className="italic text-emerald-400">Public Show</span>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
                      <label className="text-[10px] uppercase tracking-wider text-[var(--singr-text-secondary)] font-bold flex items-center gap-1">
                        <Link className="w-3 h-3 text-[var(--singr-accent-secondary)]" /> Bind Local
                        Player Agent
                      </label>
                      <select
                        value={show.activeSystemsId || ""}
                        onChange={(e) => handleAssignSystem(show.id, e.target.value)}
                        disabled={actionLoading}
                        className="w-full bg-transparent border-none text-white outline-none cursor-pointer text-xs font-semibold py-1 focus:text-[var(--singr-accent-primary)]"
                      >
                        <option value="" className="bg-[var(--singr-bg-secondary)] text-white">
                          None (Select Player System)
                        </option>
                        {systems.map((sys) => (
                          <option
                            key={sys.id}
                            value={sys.id}
                            className="bg-[var(--singr-bg-secondary)] text-white"
                          >
                            System #{sys.systemNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-t border-[var(--singr-border)] pt-4 gap-3">
                  <span className="text-[10px] font-mono text-[var(--singr-text-secondary)] uppercase">
                    ID: {show.id.substring(0, 8)}...
                  </span>
                  <div className="flex gap-2">
                    <GlassButton
                      onClick={() => handleToggleAccepting(show.id, show.isAccepting)}
                      variant={show.isAccepting ? "secondary" : "primary"}
                      className={`py-1.5 px-3 text-xs flex items-center gap-1 ${
                        show.isAccepting ? "text-orange-400 border border-orange-500/10" : ""
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />{" "}
                      {show.isAccepting ? "Close Queue" : "Open Queue"}
                    </GlassButton>
                    <GlassButton
                      onClick={() => handleDelete(show.id)}
                      variant="secondary"
                      className="py-1.5 px-3 text-xs border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </GlassButton>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    </HostLayout>
  );
}
