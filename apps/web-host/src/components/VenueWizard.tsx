"use client";

import React, { useEffect, useState } from "react";
import { GlassButton } from "@singr/ui";
import { Search, Loader2, Compass, MapPin, PencilLine, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Stepper } from "@/components/ui/stepper";
import { Field, Input, Select, Checkbox } from "@/components/ui/form";

export interface Venue {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  isPrivate: boolean;
  placeType?: string | null;
  externalId?: string | null;
  lat?: number | null;
  lon?: number | null;
}

interface PlaceResult {
  externalId: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lon: number | null;
  placeType: string;
}

interface VenueWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (venue: Venue) => void;
}

const VENUE_TYPES = [
  "bar",
  "restaurant",
  "night_club",
  "lounge",
  "brewery",
  "pub",
  "cafe",
  "event_venue",
  "private_residence",
  "other",
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function VenueWizard({ open, onOpenChange, onCreated }: VenueWizardProps) {
  const [step, setStep] = useState(0);
  const [manualEntry, setManualEntry] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [placeType, setPlaceType] = useState("bar");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetAll = () => {
    setStep(0);
    setManualEntry(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearching(false);
    setSearched(false);
    setName("");
    setAddress("");
    setCity("");
    setState("");
    setZip("");
    setPlaceType("bar");
    setIsPrivate(false);
    setSelectedPlace(null);
    setError("");
    setSubmitting(false);
  };

  useEffect(() => {
    if (!open) {
      // Defer reset so the close animation isn't visually disrupted
      const t = setTimeout(resetAll, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
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
      } else {
        setError(data.message || "Search failed.");
      }
    } catch (err) {
      console.error("Venue search failed:", err);
      setError("Places API is unavailable. Try creating the venue manually.");
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const selectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setName(place.name);
    setAddress(place.address1);
    setCity(place.city);
    setState(place.state);
    setZip(place.zip);
    setPlaceType(place.placeType || "bar");
    setManualEntry(false);
    setError("");
    setStep(1);
  };

  const startManual = () => {
    setSelectedPlace(null);
    setName("");
    setAddress("");
    setCity("");
    setState("");
    setZip("");
    setPlaceType("bar");
    setManualEntry(true);
    setError("");
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !address || !city || !state || !zip) {
      setError("Please fill in the venue name and full address.");
      return;
    }
    if (!placeType) {
      setError("Please choose a venue type.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name,
        address1: address,
        city,
        state,
        zip,
        isPrivate,
        placeType,
        externalId: selectedPlace?.externalId || null,
        externalProvider: selectedPlace?.externalId ? "google" : null,
        lat: selectedPlace?.lat ?? null,
        lon: selectedPlace?.lon ?? null,
      };
      const res = await fetch(`${apiUrl}/api/v1/venues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && data.venue) {
        onCreated(data.venue);
        onOpenChange(false);
      } else {
        setError(data.message || "Failed to register venue.");
      }
    } catch (err) {
      console.error("Failed to create venue:", err);
      setError("Network error: failed to register venue.");
    } finally {
      setSubmitting(false);
    }
  };

  // Ensure the Google-provided place type is selectable even if uncommon
  const typeOptions = VENUE_TYPES.includes(placeType)
    ? VENUE_TYPES
    : [placeType, ...VENUE_TYPES];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a Venue</DialogTitle>
          <DialogDescription>
            Search for the location, then confirm the details.
          </DialogDescription>
          <div className="pt-3">
            <Stepper steps={["Find venue", "Confirm details"]} current={step} />
          </div>
        </DialogHeader>

        <div className="px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
              {error}
            </div>
          )}

          {step === 0 && (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-[var(--singr-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    autoFocus
                    placeholder="e.g. Thirsty's Bar Mitchell SD"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={searching || searchQuery.trim().length < 2}
                  className="text-xs px-5 py-2.5 justify-center"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </GlassButton>
              </form>

              <p className="text-[11px] text-[var(--singr-text-secondary)] -mt-1">
                Tip: enter the venue name and city/state for best results (e.g.
                &ldquo;Thirsty&rsquo;s Bar Mitchell SD&rdquo;).
              </p>

              {searchResults.length > 0 && (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {searchResults.map((place) => (
                    <button
                      type="button"
                      key={place.externalId || `${place.name}-${place.address1}`}
                      onClick={() => selectPlace(place)}
                      className="flex justify-between items-center text-left p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 cursor-pointer transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm m-0 truncate">
                          {place.name}
                        </p>
                        <p className="text-[11px] text-[var(--singr-text-secondary)] m-0 mt-0.5 truncate">
                          {place.address1}, {place.city}, {place.state} {place.zip}
                        </p>
                      </div>
                      <Compass className="w-4 h-4 text-[var(--singr-accent-secondary)] shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}

              {searched && !searching && searchResults.length === 0 && (
                <p className="text-xs text-[var(--singr-text-secondary)] text-center py-2">
                  No matching places found.
                </p>
              )}

              <button
                type="button"
                onClick={startManual}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-[var(--singr-accent-primary)] hover:text-white transition-colors bg-transparent border border-dashed border-[var(--singr-border)] rounded-xl py-2.5 cursor-pointer"
              >
                <PencilLine className="w-3.5 h-3.5" /> Manually Create Venue
              </button>
            </div>
          )}

          {step === 1 && (
            <form id="venue-wizard-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!manualEntry && selectedPlace && (
                <div className="text-[11px] text-[var(--singr-text-secondary)] flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[var(--singr-accent-primary)]" />
                  Pulled from Google Places. You can adjust anything below.
                </div>
              )}

              <Field label="Venue Name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>

              <Field label="Street Address" required>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
              </Field>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="City" required className="col-span-2 sm:col-span-1">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} required />
                </Field>
                <Field label="State" required>
                  <Input value={state} onChange={(e) => setState(e.target.value)} required />
                </Field>
                <Field label="ZIP" required>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} required />
                </Field>
              </div>

              <Field label="Venue Type" required>
                <Select value={placeType} onChange={(e) => setPlaceType(e.target.value)}>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="rounded-xl border border-[var(--singr-border)] bg-white/5 p-3.5">
                <Checkbox
                  id="venue-private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  label="Private venue"
                  description="Hidden from public discovery; shows here require a PIN to join."
                />
              </div>
            </form>
          )}
        </div>

        <DialogFooter>
          {step === 1 ? (
            <>
              <GlassButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setStep(0);
                  setError("");
                }}
                className="text-xs py-2.5 px-5 justify-center"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </GlassButton>
              <GlassButton
                type="submit"
                form="venue-wizard-form"
                variant="primary"
                disabled={submitting}
                className="text-xs py-2.5 px-5 font-bold justify-center"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Venue"}
              </GlassButton>
            </>
          ) : (
            <GlassButton
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="text-xs py-2.5 px-5 justify-center"
            >
              Cancel
            </GlassButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
