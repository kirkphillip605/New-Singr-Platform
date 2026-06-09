"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { VenueWizard, type Venue } from "@/components/VenueWizard";
import { MapPin, Plus, Trash2, EyeOff, Globe } from "lucide-react";

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const fetchVenues = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/venues`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setVenues(data.venues || []);
      } else {
        setError(data.message || "Failed to load venues.");
      }
    } catch (err) {
      console.error("Error fetching venues:", err);
      setError("Failed to connect to venues ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleCreated = async () => {
    setSuccess("Venue registered successfully!");
    await fetchVenues();
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this venue? Associated active shows may be affected."
      )
    )
      return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${apiUrl}/api/v1/venues/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Venue removed from your profile.");
        await fetchVenues();
      } else {
        setError(data.message || "Failed to remove venue.");
      }
    } catch (err) {
      console.error("Failed to delete venue:", err);
      setError("Network error: failed to delete venue.");
    }
  };

  return (
    <HostLayout title="Venue Management">
      <div className="flex flex-col gap-6">
        {/* Header CTA */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
            Create, view, and configure venues linked to your hosting operations.
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
            <Plus className="w-4 h-4" /> Add Venue
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

        <VenueWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreated={handleCreated} />

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans">
              Retrieving registered locations...
            </p>
          ) : venues.length === 0 ? (
            <GlassCard className="p-8 text-center md:col-span-2 xl:col-span-3">
              <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
                No venues registered yet. Tap &ldquo;Add Venue&rdquo; above to get started.
              </p>
            </GlassCard>
          ) : (
            venues.map((venue) => (
              <GlassCard
                key={venue.id}
                className="p-6 flex flex-col justify-between"
                hoverable={true}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <h3 className="text-lg font-bold text-white leading-tight min-w-0">
                      {venue.name}
                    </h3>
                    {venue.isPrivate ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full shrink-0">
                        <EyeOff className="w-2.5 h-2.5" /> Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                        <Globe className="w-2.5 h-2.5" /> Public
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 items-start text-xs text-[var(--singr-text-secondary)] font-sans mb-6">
                    <MapPin className="w-3.5 h-3.5 text-[var(--singr-accent-primary)] shrink-0 mt-0.5" />
                    <span>
                      {venue.address1}, {venue.city}, {venue.state} {venue.zip}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-[var(--singr-border)] pt-4">
                  <span className="text-[10px] font-mono text-[var(--singr-text-secondary)] uppercase">
                    ID: {venue.id.substring(0, 8)}...
                  </span>
                  <GlassButton
                    onClick={() => handleDelete(venue.id)}
                    variant="secondary"
                    className="py-1.5 px-3 text-xs border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </GlassButton>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    </HostLayout>
  );
}
