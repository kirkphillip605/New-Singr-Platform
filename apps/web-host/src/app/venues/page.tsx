"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { MapPin, Plus, Trash2, EyeOff, Globe, Search, Loader2, Compass } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  isPrivate: boolean;
  externalId?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  
  // Selected Place details
  const [selectedPlace, setSelectedPlace] = useState<{
    externalId: string | null;
    lat: number | null;
    lon: number | null;
  } | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery || searchQuery.trim().length < 2) return;
    setSearching(true);
    setError("");
    setSearchResults([]);

    try {
      const res = await fetch(
        `${apiUrl}/api/v1/venues/search?q=${encodeURIComponent(searchQuery)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results || []);
        if ((data.results || []).length === 0) {
          setError("No matching places found. Try manual registration.");
        }
      } else {
        setError(data.message || "Search failed.");
      }
    } catch (err) {
      console.error("Search failed:", err);
      setError("Places API offline. Try manual registration.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPlace = (place: any) => {
    setName(place.name);
    setAddress(place.address1);
    setCity(place.city);
    setState(place.state);
    setZip(place.zip);
    setSelectedPlace({
      externalId: place.externalId,
      lat: place.lat,
      lon: place.lon,
    });
    setManualMode(true); // Open the registration form with filled details
  };

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !address || !city || !state || !zip) {
      setError("Please fill in all address components.");
      return;
    }

    setLoading(true);

    try {
      const body = {
        name,
        address1: address,
        city,
        state,
        zip,
        isPrivate,
        externalId: selectedPlace?.externalId || null,
        externalProvider: selectedPlace?.externalId ? "google" : null,
        lat: selectedPlace?.lat || null,
        lon: selectedPlace?.lon || null,
      };

      const res = await fetch(`${apiUrl}/api/v1/venues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await res.json();
      if (data.success) {
        setSuccess("Venue registered successfully!");
        setIsAddOpen(false);
        setManualMode(false);
        setSearchQuery("");
        setSearchResults([]);
        // Reset form
        setName("");
        setAddress("");
        setCity("");
        setState("");
        setZip("");
        setIsPrivate(false);
        setSelectedPlace(null);
        await fetchVenues();
      } else {
        setError(data.message || "Failed to register venue.");
      }
    } catch (err) {
      console.error("Failed to add venue:", err);
      setError("Network error: failed to communicate registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this venue? Associated active shows may be affected.")) return;
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
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
            Create, view, and configure venues linked to your hosting operations.
          </p>
          <GlassButton 
            onClick={() => {
              setIsAddOpen(!isAddOpen);
              setManualMode(false);
              setSearchResults([]);
              setSearchQuery("");
            }} 
            variant="primary" 
            className="text-xs py-2.5 px-4 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {isAddOpen ? "Collapse Form" : "Add Venue"}
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

        {/* Add Venue Form Drawer */}
        {isAddOpen && (
          <GlassCard className="p-8 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white m-0">Register New Venue</h3>
              <button
                type="button"
                onClick={() => setManualMode(!manualMode)}
                className="text-xs font-semibold text-[var(--singr-accent-primary)] hover:text-white transition-colors border-none bg-transparent cursor-pointer underline"
              >
                {manualMode ? "Back to Google Search" : "Skip to Manual Setup"}
              </button>
            </div>

            {!manualMode ? (
              /* Google Places Search View */
              <div className="flex flex-col gap-4 font-sans text-sm">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-[var(--singr-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <GlassInput
                      placeholder="Search venue name and city/zip (e.g. The Wobbly Penguin 57201)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <GlassButton type="submit" variant="primary" disabled={searching} className="text-xs px-4">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                  </GlassButton>
                </form>

                {searchResults.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 max-h-60 overflow-y-auto pr-1">
                    {searchResults.map((place) => (
                      <div 
                        key={place.externalId} 
                        onClick={() => handleSelectPlace(place)}
                        className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 cursor-pointer transition-all"
                      >
                        <div>
                          <p className="font-semibold text-white text-sm m-0">{place.name}</p>
                          <p className="text-[11px] text-[var(--singr-text-secondary)] m-0 mt-0.5">{place.address1}, {place.city}, {place.state} {place.zip}</p>
                        </div>
                        <Compass className="w-4 h-4 text-[var(--singr-accent-secondary)] shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Manual Address Form View */
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
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">State</label>
                    <GlassInput
                      placeholder="TX"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">ZIP Code</label>
                    <GlassInput
                      placeholder="78701"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      required
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

                <div className="flex gap-3 mt-2">
                  <GlassButton type="submit" variant="primary" className="py-2.5 px-6 text-xs font-bold">
                    Save & Register Venue
                  </GlassButton>
                  <GlassButton 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setManualMode(false);
                      setName("");
                      setAddress("");
                      setCity("");
                      setState("");
                      setZip("");
                      setSelectedPlace(null);
                    }}
                    className="py-2.5 px-6 text-xs"
                  >
                    Cancel
                  </GlassButton>
                </div>
              </form>
            )}
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
