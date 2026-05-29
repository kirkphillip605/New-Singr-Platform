"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { Plus, Trash2, Power, KeyRound, Link, AlertTriangle } from "lucide-react";

interface Show {
  id: string;
  showName: string;
  slug: string;
  venueName: string;
  pinCode: string | null;
  isAccepting: boolean;
  activeSystemsId: string | null;
}

interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
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
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states for creating show
  const [showName, setShowName] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  // Quick Venue creation states (on the fly)
  const [isQuickVenueOpen, setIsQuickVenueOpen] = useState(false);
  const [quickVenueName, setQuickVenueName] = useState("");
  const [quickAddress, setQuickAddress] = useState("");
  const [quickCity, setQuickCity] = useState("");
  const [quickState, setQuickState] = useState("");
  const [quickZip, setQuickZip] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadData = async () => {
    try {
      // 1. Fetch shows
      const showsRes = await fetch(`${apiUrl}/api/v1/shows`, { credentials: "include" });
      const showsData = await showsRes.json();
      if (showsData.success) {
        setShows(showsData.shows || []);
      }

      // 2. Fetch venues
      const venuesRes = await fetch(`${apiUrl}/api/v1/venues`, { credentials: "include" });
      const venuesData = await venuesRes.json();
      if (venuesData.success) {
        setVenues(venuesData.venues || []);
        if (venuesData.venues?.length > 0) {
          setSelectedVenueId(venuesData.venues[0].id);
        }
      }

      // 3. Fetch systems
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

  const handleQuickCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVenueName || !quickAddress || !quickCity || !quickState || !quickZip) {
      setError("Please fill all venue details.");
      return;
    }
    setActionLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiUrl}/api/v1/venues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickVenueName,
          address1: quickAddress,
          city: quickCity,
          state: quickState,
          zip: quickZip,
          isPrivate: false,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && data.venue) {
        setSuccess(`Venue "${data.venue.name}" created on the fly!`);
        // Add to venues list and select it
        setVenues([...venues, data.venue]);
        setSelectedVenueId(data.venue.id);
        // Reset quick fields
        setQuickVenueName("");
        setQuickAddress("");
        setQuickCity("");
        setQuickState("");
        setQuickZip("");
        setIsQuickVenueOpen(false);
      } else {
        setError(data.message || "Failed to create venue.");
      }
    } catch (err) {
      console.error("Quick venue create failed:", err);
      setError("Failed to submit quick venue registration.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showName || !selectedVenueId) return;
    setActionLoading(true);
    setError("");
    setSuccess("");

    const generatedSlug = showName.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

    try {
      const res = await fetch(`${apiUrl}/api/v1/shows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: selectedVenueId,
          showName,
          slug: generatedSlug,
          pinCode: pinCode || undefined,
        }),
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(`Show "${showName}" created successfully!`);
        // If they set "Immediately start accepting requests"
        if (isAccepting && data.show?.id) {
          await fetch(`${apiUrl}/api/v1/shows/${data.show.id}/accepting`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isAccepting: true }),
            credentials: "include",
          });
        }

        setIsAddOpen(false);
        setShowName("");
        setPinCode("");
        setIsAccepting(false);
        await loadData();
      } else {
        setError(data.message || "Failed to create show.");
      }
    } catch (err) {
      console.error("Create show failed:", err);
      setError("Failed to submit show creation.");
    } finally {
      setActionLoading(false);
    }
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
        setShows(shows.map(show => 
          show.id === id ? { ...show, isAccepting: !currentStatus } : show
        ));
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
        setShows(shows.map(show => 
          show.id === showId ? { ...show, activeSystemsId: systemId || null } : show
        ));
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
    if (!confirm("Are you sure you want to delete this show? Requests history will be preserved but active queue will close.")) return;
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
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
            Configure individual shows, manage entry pins, link player machines, and toggle requests accepting status.
          </p>
          <GlassButton 
            onClick={() => setIsAddOpen(!isAddOpen)} 
            variant="primary" 
            className="text-xs py-2.5 px-4 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {isAddOpen ? "Collapse Form" : "Create Show"}
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

        {/* Create Show drawer */}
        {isAddOpen && (
          <GlassCard className="p-8 max-w-2xl flex flex-col gap-6">
            <h3 className="text-xl font-bold text-white mb-0">Create New Karaoke Show</h3>
            
            {venues.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-sans flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-bold">No Venues Registered</span>
                </div>
                <p className="m-0 text-[var(--singr-text-secondary)] leading-relaxed">
                  You need to register at least one venue before creating a show. Use the quick venue creation below to start instantly.
                </p>
              </div>
            ) : null}

            <form onSubmit={handleAddShow} className="flex flex-col gap-4 font-sans text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Show Name</label>
                  <GlassInput
                    placeholder="Friday Nights Live"
                    value={showName}
                    onChange={(e) => setShowName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Select Venue</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickVenueOpen(!isQuickVenueOpen)}
                      className="text-[10px] font-bold text-[var(--singr-accent-primary)] hover:text-white transition-colors border-none bg-transparent cursor-pointer underline"
                    >
                      {isQuickVenueOpen ? "Close Quick Venue" : "+ Create Venue"}
                    </button>
                  </div>
                  
                  {!isQuickVenueOpen ? (
                    <select
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                      className="rounded-xl border border-white/10 bg-black/40 text-white p-2.5 outline-none focus:border-[var(--singr-accent-primary)] transition-all font-sans text-xs"
                      required
                    >
                      {venues.map((v) => (
                        <option key={v.id} value={v.id} className="bg-[var(--singr-bg-secondary)]">
                          {v.name} ({v.city}, {v.state})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-orange-400 italic py-2">Creating new venue below...</span>
                  )}
                </div>
              </div>

              {!isQuickVenueOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Entry PIN Code (Optional)</label>
                    <GlassInput
                      placeholder="Leave empty for public, or set 4-6 digits"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="isAccepting"
                      checked={isAccepting}
                      onChange={(e) => setIsAccepting(e.target.checked)}
                      className="rounded border-[var(--singr-border)] bg-black/40 text-[var(--singr-accent-primary)] focus:ring-[var(--singr-accent-primary)] h-4 w-4"
                    />
                    <label htmlFor="isAccepting" className="text-xs font-medium text-[var(--singr-text-secondary)] cursor-pointer">
                      Immediately start accepting requests
                    </label>
                  </div>
                </div>
              )}

              {!isQuickVenueOpen && (
                <GlassButton type="submit" variant="primary" className="self-start py-2.5 px-6 mt-2 text-xs font-bold" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Save & Start Show"}
                </GlassButton>
              )}
            </form>

            {/* Quick Venue Form (on the fly) */}
            {isQuickVenueOpen && (
              <div className="border-t border-white/5 pt-4 mt-2">
                <h4 className="text-sm font-bold text-white mb-3">Quick Venue Details</h4>
                <form onSubmit={handleQuickCreateVenue} className="flex flex-col gap-3 font-sans text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <GlassInput
                      placeholder="Venue Name (e.g. Blue Parrot)"
                      value={quickVenueName}
                      onChange={(e) => setQuickVenueName(e.target.value)}
                      required
                    />
                    <GlassInput
                      placeholder="Street Address (e.g. 120 Main St)"
                      value={quickAddress}
                      onChange={(e) => setQuickAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <GlassInput
                      placeholder="City"
                      value={quickCity}
                      onChange={(e) => setQuickCity(e.target.value)}
                      required
                    />
                    <GlassInput
                      placeholder="State"
                      value={quickState}
                      onChange={(e) => setQuickState(e.target.value)}
                      required
                    />
                    <GlassInput
                      placeholder="Zip"
                      value={quickZip}
                      onChange={(e) => setQuickZip(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end mt-1">
                    <GlassButton type="button" variant="secondary" onClick={() => setIsQuickVenueOpen(false)} className="py-2 px-4">
                      Cancel
                    </GlassButton>
                    <GlassButton type="submit" variant="primary" className="py-2 px-4" disabled={actionLoading}>
                      {actionLoading ? "Creating..." : "Create & Select"}
                    </GlassButton>
                  </div>
                </form>
              </div>
            )}
          </GlassCard>
        )}

        {/* Shows list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Accessing registered shows...</p>
          ) : shows.length === 0 ? (
            <GlassCard className="p-8 text-center lg:col-span-2">
              <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
                No shows registered yet. Tap "Create Show" above to launch your first night.
              </p>
            </GlassCard>
          ) : (
            shows.map((show) => (
              <GlassCard key={show.id} className="p-6 flex flex-col justify-between" hoverable={true}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight mb-1">{show.showName}</h3>
                      <p className="text-xs text-[var(--singr-text-secondary)] font-sans">{show.venueName} • /{show.slug}</p>
                    </div>
                    {show.isAccepting ? (
                      <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full animate-pulse font-sans">
                        ● Open
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-3 py-1 rounded-full font-sans">
                        ■ Closed
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 font-sans text-xs mb-6">
                    <div className="flex items-center gap-2 text-[var(--singr-text-secondary)]">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Access Code: {show.pinCode ? <strong className="text-purple-400 font-mono text-sm">{show.pinCode}</strong> : <span className="italic text-emerald-400">Public Show</span>}</span>
                    </div>

                    {/* Hardware System Binding Console */}
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
                      <label className="text-[10px] uppercase tracking-wider text-[var(--singr-text-secondary)] font-bold flex items-center gap-1">
                        <Link className="w-3 h-3 text-[var(--singr-accent-secondary)]" /> Bind Local Player Agent
                      </label>
                      <select
                        value={show.activeSystemsId || ""}
                        onChange={(e) => handleAssignSystem(show.id, e.target.value)}
                        className="w-full bg-transparent border-none text-white outline-none cursor-pointer text-xs font-semibold py-1 focus:text-[var(--singr-accent-primary)]"
                      >
                        <option value="" className="bg-[var(--singr-bg-secondary)] text-white">None (Select Player System)</option>
                        {systems.map((sys) => (
                          <option key={sys.id} value={sys.id} className="bg-[var(--singr-bg-secondary)] text-white">
                            System #{sys.systemNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-[var(--singr-border)] pt-4 gap-3">
                  <span className="text-[10px] font-mono text-[var(--singr-text-secondary)] uppercase">
                    ID: {show.id.substring(0, 8)}...
                  </span>
                  <div className="flex gap-2">
                    <GlassButton
                      onClick={() => handleToggleAccepting(show.id, show.isAccepting)}
                      variant={show.isAccepting ? "secondary" : "primary"}
                      className={`py-1.5 px-3 text-xs flex items-center gap-1 ${show.isAccepting ? "text-orange-400 border border-orange-500/10" : ""}`}
                    >
                      <Power className="w-3.5 h-3.5" /> {show.isAccepting ? "Close Queue" : "Open Queue"}
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
