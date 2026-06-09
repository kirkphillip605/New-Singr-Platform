"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GlassButton } from "@singr/ui";
import { Loader2, ArrowLeft, Plus, EyeOff, Lock } from "lucide-react";
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
import { VenueWizard, type Venue } from "@/components/VenueWizard";

interface ShowWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venues: Venue[];
  onVenueCreated: (venue: Venue) => void;
  onCreated: () => void;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function ShowWizard({
  open,
  onOpenChange,
  venues,
  onVenueCreated,
  onCreated,
}: ShowWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [showName, setShowName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [venueWizardOpen, setVenueWizardOpen] = useState(false);

  const selectedVenue = useMemo(
    () => venues.find((v) => v.id === selectedVenueId),
    [venues, selectedVenueId]
  );
  const pinRequired = Boolean(selectedVenue?.isPrivate);

  const resetAll = () => {
    setStep(0);
    setSelectedVenueId("");
    setShowName("");
    setPinCode("");
    setIsAccepting(false);
    setError("");
    setSubmitting(false);
  };

  useEffect(() => {
    if (!open) {
      const t = setTimeout(resetAll, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Default the selected venue once venues are available
  useEffect(() => {
    if (open && !selectedVenueId && venues[0]) {
      setSelectedVenueId(venues[0].id);
    }
  }, [open, venues, selectedVenueId]);

  const handleVenueCreated = (venue: Venue) => {
    onVenueCreated(venue);
    setSelectedVenueId(venue.id);
    setVenueWizardOpen(false);
  };

  const goToDetails = () => {
    if (!selectedVenueId) {
      setError("Please choose a venue or create a new one.");
      return;
    }
    setError("");
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!showName.trim()) {
      setError("Please enter a show name.");
      return;
    }

    const trimmedPin = pinCode.trim();
    if (pinRequired && !trimmedPin) {
      setError("This venue is private, so a PIN code is required.");
      return;
    }
    if (trimmedPin && !/^\d{4,6}$/.test(trimmedPin)) {
      setError("PIN code must be 4-6 digits.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/shows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: selectedVenueId,
          showName: showName.trim(),
          pinCode: trimmedPin || undefined,
        }),
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        if (isAccepting && data.show?.id) {
          await fetch(`${apiUrl}/api/v1/shows/${data.show.id}/accepting`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isAccepting: true }),
            credentials: "include",
          });
        }
        onCreated();
        onOpenChange(false);
      } else {
        setError(data.message || "Failed to create show.");
      }
    } catch (err) {
      console.error("Create show failed:", err);
      setError("Network error: failed to create show.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create a Show</DialogTitle>
            <DialogDescription>
              Pick the venue, then set up your karaoke show.
            </DialogDescription>
            <div className="pt-3">
              <Stepper steps={["Choose venue", "Show details"]} current={step} />
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
                {venues.length === 0 ? (
                  <p className="text-xs text-[var(--singr-text-secondary)]">
                    You don&rsquo;t have any venues yet. Create one to continue.
                  </p>
                ) : (
                  <Field label="Venue" required>
                    <Select
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                    >
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.city}, {v.state})
                          {v.isPrivate ? " — Private" : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                {selectedVenue?.isPrivate && (
                  <div className="flex items-center gap-2 text-[11px] text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
                    <EyeOff className="w-3.5 h-3.5" />
                    This is a private venue — a PIN code will be required for the show.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setVenueWizardOpen(true)}
                  className="flex items-center justify-center gap-2 text-xs font-semibold text-[var(--singr-accent-primary)] hover:text-white transition-colors bg-transparent border border-dashed border-[var(--singr-border)] rounded-xl py-2.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Create a new venue
                </button>
              </div>
            )}

            {step === 1 && (
              <form id="show-wizard-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="text-[11px] text-[var(--singr-text-secondary)]">
                  Venue: <span className="text-white font-semibold">{selectedVenue?.name}</span>
                </div>

                <Field label="Show Name" required>
                  <Input
                    autoFocus
                    placeholder="Friday Nights Live"
                    value={showName}
                    onChange={(e) => setShowName(e.target.value)}
                    required
                  />
                </Field>

                <Field
                  label={pinRequired ? "Entry PIN Code" : "Entry PIN Code (Optional)"}
                  required={pinRequired}
                  hint={
                    pinRequired
                      ? "Required because the venue is private. 4-6 digits."
                      : "Leave empty for a public show, or set 4-6 digits."
                  }
                >
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--singr-text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                      inputMode="numeric"
                      placeholder="e.g. 4821"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ""))}
                      maxLength={6}
                      className="pl-10"
                    />
                  </div>
                </Field>

                <div className="rounded-xl border border-[var(--singr-border)] bg-white/5 p-3.5">
                  <Checkbox
                    id="show-accepting"
                    checked={isAccepting}
                    onCheckedChange={setIsAccepting}
                    label="Immediately start accepting requests"
                    description="Opens the queue as soon as the show is created."
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
                  form="show-wizard-form"
                  variant="primary"
                  disabled={submitting}
                  className="text-xs py-2.5 px-5 font-bold justify-center"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Show"}
                </GlassButton>
              </>
            ) : (
              <>
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  className="text-xs py-2.5 px-5 justify-center"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="primary"
                  onClick={goToDetails}
                  disabled={venues.length === 0 || !selectedVenueId}
                  className="text-xs py-2.5 px-5 font-bold justify-center"
                >
                  Next
                </GlassButton>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VenueWizard
        open={venueWizardOpen}
        onOpenChange={setVenueWizardOpen}
        onCreated={handleVenueCreated}
      />
    </>
  );
}
