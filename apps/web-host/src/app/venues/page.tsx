"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { MapPin, Plus, Trash2, EyeOff, Globe } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  isPrivate: boolean;
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    // Fetch host's venues from GET /api/v1/venues
    // Falling back to standard seeded data for sandbox
    const timer = setTimeout(() => {
      setVenues([
        {
          id: "v-1",
          name: "Main Street Grill",
          address1: "100 Main St",
          city: "Austin",
          state: "TX",
          zip: "78701",
          isPrivate: false,
        },
        {
          id: "v-2",
          name: "The Glass Lounge",
          address1: "500 Congress Ave",
          city: "Austin",
          state: "TX",
          zip: "78701",
          isPrivate: true,
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleAddVenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) return;

    const newVenue: Venue = {
      id: `v-${Date.now()}`,
      name,
      address1: address,
      city,
      state,
      zip,
      isPrivate,
    };

    setVenues([...venues, newVenue]);
    setIsAddOpen(false);
    // Reset form
    setName("");
    setAddress("");
    setCity("");
    setState("");
    setZip("");
    setIsPrivate(false);
  };

  const handleDelete = (id: string) => {
    setVenues(venues.filter(v => v.id !== id));
  };

  return (
    <HostLayout title="Venue Management">
      <div className="flex flex-col gap-6">
        
        {/* Header CTA */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
            Create, view, and configure venues linked to your hosting operations.
          </p>
          <GlassButton onClick={() => setIsAddOpen(!isAddOpen)} variant="primary" className="text-xs py-2.5 px-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> {isAddOpen ? "Collapse Form" : "Add Venue"}
          </GlassButton>
        </div>

        {/* Add Venue Form Drawer */}
        {isAddOpen && (
          <GlassCard className="p-8 max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Register New Venue</h3>
            <form onSubmit={handleAddVenue} className="flex flex-col gap-4 font-sans text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Venue Name</label>
                  <GlassInput
                    placeholder="Main Street Grill"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Street Address</label>
                  <GlassInput
                    placeholder="100 Main St"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">City</label>
                  <GlassInput
                    placeholder="Austin"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">State</label>
                  <GlassInput
                    placeholder="TX"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">ZIP Code</label>
                  <GlassInput
                    placeholder="78701"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-[var(--singr-border)] bg-black/40 text-[var(--singr-accent-primary)] focus:ring-[var(--singr-accent-primary)] h-4 w-4"
                />
                <label htmlFor="isPrivate" className="text-xs font-medium text-[var(--singr-text-secondary)] cursor-pointer">
                  Private Venue (PIN protection required to join associated shows)
                </label>
              </div>

              <GlassButton type="submit" variant="primary" className="self-start py-2.5 px-6 mt-2 text-xs font-bold">
                Save & Register Venue
              </GlassButton>
            </form>
          </GlassCard>
        )}

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Retrieving registered locations...</p>
          ) : venues.length === 0 ? (
            <GlassCard className="p-8 text-center md:col-span-2">
              <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
                No venues registered yet. Tap "Add Venue" above to get started.
              </p>
            </GlassCard>
          ) : (
            venues.map((venue) => (
              <GlassCard key={venue.id} className="p-6 flex flex-col justify-between" hoverable={true}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-white leading-tight">{venue.name}</h3>
                    {venue.isPrivate ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                        <EyeOff className="w-2.5 h-2.5" /> Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <Globe className="w-2.5 h-2.5" /> Public
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center text-xs text-[var(--singr-text-secondary)] font-sans mb-6">
                    <MapPin className="w-3.5 h-3.5 text-[var(--singr-accent-primary)] shrink-0" />
                    <span>{venue.address1}, {venue.city}, {venue.state} {venue.zip}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-[var(--singr-border)] pt-4">
                  <span className="text-[10px] font-mono text-[var(--singr-text-secondary)] uppercase">
                    ID: {venue.id}
                  </span>
                  <GlassButton
                    onClick={() => handleDelete(venue.id)}
                    variant="secondary"
                    className="py-1.5 px-3 text-xs border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
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
