"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { Plus, Trash2, Power, KeyRound } from "lucide-react";

interface Show {
  id: string;
  showName: string;
  slug: string;
  venueName: string;
  pinCode: string | null;
  isAccepting: boolean;
}

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showName, setShowName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    // Simulated load from GET /api/v1/shows
    const timer = setTimeout(() => {
      setShows([
        {
          id: "s-1",
          showName: "Main Street Friday Vibes",
          slug: "friday-vibes",
          venueName: "Main Street Grill",
          pinCode: null,
          isAccepting: true,
        },
        {
          id: "s-2",
          showName: "Glass Lounge VIP Night",
          slug: "glass-vip",
          venueName: "The Glass Lounge",
          pinCode: "8842",
          isAccepting: false,
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleAddShow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showName || !venueName) return;

    const newShow: Show = {
      id: `s-${Date.now()}`,
      showName,
      slug: showName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      venueName,
      pinCode: pinCode || null,
      isAccepting,
    };

    setShows([...shows, newShow]);
    setIsAddOpen(false);
    setShowName("");
    setVenueName("");
    setPinCode("");
    setIsAccepting(false);
  };

  const handleToggleAccepting = (id: string) => {
    setShows(shows.map(show => 
      show.id === id ? { ...show, isAccepting: !show.isAccepting } : show
    ));
  };

  const handleDelete = (id: string) => {
    setShows(shows.filter(show => show.id !== id));
  };

  return (
    <HostLayout title="Show Controls">
      <div className="flex flex-col gap-6">
        
        {/* Header CTA */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
            Configure individual shows, manage entry pins, and toggle requests accepting status.
          </p>
          <GlassButton onClick={() => setIsAddOpen(!isAddOpen)} variant="primary" className="text-xs py-2.5 px-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> {isAddOpen ? "Collapse Form" : "Create Show"}
          </GlassButton>
        </div>

        {/* Create Show drawer */}
        {isAddOpen && (
          <GlassCard className="p-8 max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Create New Karaoke Show</h3>
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
                  <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Select Venue</label>
                  <GlassInput
                    placeholder="Main Street Grill"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Entry PIN Code (Optional)</label>
                  <GlassInput
                    placeholder="Leave empty for public, or set 4 digits"
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

              <GlassButton type="submit" variant="primary" className="self-start py-2.5 px-6 mt-2 text-xs font-bold">
                Save & Start Show
              </GlassButton>
            </form>
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
                      <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full animate-pulse">
                        ● Open for Requests
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-3 py-1 rounded-full">
                        ■ Closed
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 font-sans text-xs mb-6">
                    <div className="flex items-center gap-2 text-[var(--singr-text-secondary)]">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Access Code: {show.pinCode ? <strong className="text-purple-400 font-mono text-sm">{show.pinCode}</strong> : <span className="italic text-emerald-400">Public Show</span>}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-[var(--singr-border)] pt-4 gap-3">
                  <span className="text-[10px] font-mono text-[var(--singr-text-secondary)] uppercase">
                    ID: {show.id}
                  </span>
                  <div className="flex gap-2">
                    <GlassButton
                      onClick={() => handleToggleAccepting(show.id)}
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
