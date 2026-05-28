"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { CheckCircle, Trash2, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

interface Request {
  id: string;
  singerName: string;
  songTitle: string;
  songArtist: string;
  keyChange: number;
  status: "pending" | "processed" | "cancelled";
  submittedAt: string;
}

export default function QueuePage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // simulated initial load from GET /api/v1/requests
    const timer = setTimeout(() => {
      setRequests([
        {
          id: "r-1",
          singerName: "Phillip Kirk",
          songTitle: "Bohemian Rhapsody",
          songArtist: "Queen",
          keyChange: 0,
          status: "pending",
          submittedAt: new Date().toISOString(),
        },
        {
          id: "r-2",
          singerName: "Sarah Connor",
          songTitle: "Sweet Child O' Mine",
          songArtist: "Guns N' Roses",
          keyChange: -2,
          status: "pending",
          submittedAt: new Date().toISOString(),
        },
        {
          id: "r-3",
          singerName: "Tony Stark",
          songTitle: "Back In Black",
          songArtist: "AC/DC",
          keyChange: 1,
          status: "pending",
          submittedAt: new Date().toISOString(),
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleStatusChange = (id: string, newStatus: "pending" | "processed" | "cancelled") => {
    setRequests(requests.map(req => 
      req.id === id ? { ...req, status: newStatus } : req
    ));
  };

  const handleKeyChange = (id: string, change: number) => {
    setRequests(requests.map(req => 
      req.id === id ? { ...req, keyChange: Math.max(-6, Math.min(6, req.keyChange + change)) } : req
    ));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...requests];
    const current = updated[index];
    const prev = updated[index - 1];
    if (current && prev) {
      updated[index] = prev;
      updated[index - 1] = current;
      setRequests(updated);
    }
  };

  const moveDown = (index: number) => {
    if (index === requests.length - 1) return;
    const updated = [...requests];
    const current = updated[index];
    const next = updated[index + 1];
    if (current && next) {
      updated[index] = next;
      updated[index + 1] = current;
      setRequests(updated);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status === "processed" || r.status === "cancelled");

  return (
    <HostLayout title="Live Request Queue">
      <div className="flex flex-col gap-6">
        
        {/* Banner with status info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--singr-bg-secondary)]/10 p-5 rounded-2xl border border-[var(--singr-border)] backdrop-blur-md">
          <div>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--singr-accent-primary)] animate-pulse" /> WebSocket Sync Active
            </h3>
            <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0">
              Singers' requests instantly appear in your list here without page refreshing.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1.5 font-sans">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> Live Broadcast
            </span>
          </div>
        </div>

        {/* Live requests */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans mb-4">Pending Requests ({pendingRequests.length})</h4>
          
          <div className="flex flex-col gap-4">
            {loading ? (
              <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Syncing live request ledger...</p>
            ) : pendingRequests.length === 0 ? (
              <GlassCard className="p-8 text-center bg-white/5 border border-white/5">
                <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
                  No active requests. Share your show URL or slug to collect singer requests!
                </p>
              </GlassCard>
            ) : (
              pendingRequests.map((req, index) => (
                <GlassCard key={req.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6" hoverable={true}>
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--singr-brand-start)] to-[var(--singr-brand-end)] flex items-center justify-center text-white shrink-0 font-bold text-base">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-extrabold text-white truncate leading-tight mb-1">{req.songTitle}</h4>
                      <p className="text-xs text-[var(--singr-text-secondary)] font-sans truncate mb-1">{req.songArtist}</p>
                      <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0 flex items-center gap-1.5">
                        👤 Singer: <strong className="text-white">{req.singerName}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-stretch md:self-auto justify-between border-t md:border-t-0 border-[var(--singr-border)] pt-3 md:pt-0">
                    
                    {/* Key Change Shift Console */}
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[9px] uppercase font-bold text-[var(--singr-text-secondary)] tracking-wider font-sans">Vocal Key</span>
                      <div className="flex items-center gap-2.5">
                        <button 
                          onClick={() => handleKeyChange(req.id, -1)}
                          className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors cursor-pointer text-xs"
                        >
                          -
                        </button>
                        <span className={`text-xs font-mono font-bold ${req.keyChange > 0 ? "text-emerald-400" : req.keyChange < 0 ? "text-orange-400" : "text-white"}`}>
                          {req.keyChange > 0 ? `+${req.keyChange}` : req.keyChange}
                        </span>
                        <button 
                          onClick={() => handleKeyChange(req.id, 1)}
                          className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors cursor-pointer text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Order buttons */}
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-[var(--singr-text-secondary)] hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => moveDown(index)}
                        disabled={index === pendingRequests.length - 1}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-[var(--singr-text-secondary)] hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <GlassButton
                        onClick={() => handleStatusChange(req.id, "processed")}
                        variant="primary"
                        className="py-2 px-3 text-xs flex items-center gap-1 bg-gradient-to-tr from-emerald-500 to-teal-500 font-bold"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Played
                      </GlassButton>
                      <GlassButton
                        onClick={() => handleStatusChange(req.id, "cancelled")}
                        variant="secondary"
                        className="py-2 px-3 text-xs border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Skip
                      </GlassButton>
                    </div>

                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </div>

        {/* History / Skip log */}
        {processedRequests.length > 0 && (
          <div className="border-t border-[var(--singr-border)] pt-8 mt-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans mb-4">Show Logs / Played</h4>
            <div className="flex flex-col gap-2 font-sans text-xs">
              {processedRequests.map((req) => (
                <div key={req.id} className="flex justify-between items-center p-3.5 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <span className="font-semibold text-white">{req.songTitle}</span> • <span className="text-[var(--singr-text-secondary)]">{req.singerName}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    req.status === "processed" ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
                  }`}>
                    {req.status === "processed" ? "Played" : "Skipped"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </HostLayout>
  );
}
