"use client";

import React, { useState, useEffect, useRef } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { CheckCircle, Trash2, ArrowUp, ArrowDown, Sparkles, Tv, AlertCircle } from "lucide-react";
import { io, Socket } from "socket.io-client";

interface Request {
  id: string;
  singerName: string;
  song: {
    id: string;
    title: string;
    artist: string;
  } | null;
  keyChange: number;
  status: string;
  submittedAt: string;
}

interface Show {
  id: string;
  showName: string;
  slug: string;
  isAccepting: boolean;
  venueName: string;
}

export default function QueuePage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShowId, setSelectedShowId] = useState<string>("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // 1. Fetch available shows
  const fetchShows = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/shows`, { credentials: "include" });
      const data = await res.json();
      if (data.success && data.shows) {
        setShows(data.shows);
        if (data.shows.length > 0 && !selectedShowId) {
          setSelectedShowId(data.shows[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load shows:", err);
      setError("Failed to connect to shows directory.");
    }
  };

  // 2. Fetch requests for selected show
  const fetchRequests = async (showId: string) => {
    if (!showId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/requests?showId=${showId}`, { credentials: "include" });
      const data = await res.json();
      if (data.success && data.requests) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
      setError("Failed to load show queue ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShows();
  }, []);

  useEffect(() => {
    if (!selectedShowId) return;
    fetchRequests(selectedShowId);

    // Setup Socket.io connection
    console.log("🔌 Connecting WebSocket gateway to:", apiUrl);
    const socket = io(apiUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ WebSocket connected! Joining show room:", selectedShowId);
      setSocketConnected(true);
      socket.emit("join_show", selectedShowId);
    });

    socket.on("disconnect", () => {
      console.log("❌ WebSocket disconnected.");
      setSocketConnected(false);
    });

    // Real-time synchronization events
    socket.on("new_request", (newReq) => {
      console.log("⚡ [WS] New request received:", newReq);
      // Re-fetch to guarantee exact database ordering
      fetchRequests(selectedShowId);
    });

    socket.on("request_cancelled", (data) => {
      console.log("⚡ [WS] Request cancelled:", data);
      fetchRequests(selectedShowId);
    });

    socket.on("queue_reordered", (updatedReq) => {
      console.log("⚡ [WS] Queue reordered:", updatedReq);
      fetchRequests(selectedShowId);
    });

    return () => {
      if (socketRef.current) {
        console.log("🔌 Leaving show room & disconnecting WebSocket:", selectedShowId);
        socketRef.current.emit("leave_show", selectedShowId);
        socketRef.current.disconnect();
      }
    };
  }, [selectedShowId]);

  // Mark request as played
  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        await fetchRequests(selectedShowId);
      } else {
        setError(data.message || "Failed to update request.");
      }
    } catch (err) {
      console.error("Status update failed:", err);
      setError("Failed to send status update.");
    } finally {
      setActionLoading(false);
    }
  };

  // Change key shift
  const handleKeyChange = async (id: string, delta: number, currentKey: number) => {
    const newKey = Math.max(-6, Math.min(6, currentKey + delta));
    if (newKey === currentKey) return;
    try {
      const res = await fetch(`${apiUrl}/api/v1/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyChange: newKey }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setRequests(requests.map(r => r.id === id ? { ...r, keyChange: newKey } : r));
      }
    } catch (err) {
      console.error("Key change failed:", err);
    }
  };

  // Skip / Delete request
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to skip this request?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/requests/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        await fetchRequests(selectedShowId);
      } else {
        setError(data.message || "Failed to cancel request.");
      }
    } catch (err) {
      console.error("Cancel request failed:", err);
      setError("Failed to cancel request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Reorder queue by swapping submittedAt timestamps
  const handleSwap = async (indexA: number, indexB: number) => {
    const reqA = requests[indexA];
    const reqB = requests[indexB];
    if (!reqA || !reqB) return;

    setActionLoading(true);

    try {
      await Promise.all([
        fetch(`${apiUrl}/api/v1/requests/${reqA.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submittedAt: reqB.submittedAt }),
          credentials: "include",
        }),
        fetch(`${apiUrl}/api/v1/requests/${reqB.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submittedAt: reqA.submittedAt }),
          credentials: "include",
        }),
      ]);
      
      // Let the socket event or manual re-fetch trigger the display update
      await fetchRequests(selectedShowId);
    } catch (err) {
      console.error("Reorder swap failed:", err);
      setError("Failed to save queue reordering.");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status === "processed" || r.status === "cancelled");

  return (
    <HostLayout title="Live Request Queue">
      <div className="flex flex-col gap-6">
        
        {/* Active Show Selector Dropdown */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--singr-border)] pb-4">
          <div className="flex items-center gap-3">
            <Tv className="w-5 h-5 text-[var(--singr-accent-primary)] shrink-0" />
            <span className="text-sm font-bold text-white uppercase tracking-wider font-sans">Active Show Console:</span>
          </div>

          {shows.length > 0 ? (
            <select
              value={selectedShowId}
              onChange={(e) => setSelectedShowId(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 text-white p-2.5 outline-none focus:border-[var(--singr-accent-primary)] transition-all font-sans text-xs w-full sm:w-64"
            >
              {shows.map((show) => (
                <option key={show.id} value={show.id} className="bg-[var(--singr-bg-secondary)]">
                  {show.showName} ({show.venueName})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-orange-400 italic">No active shows found. Deploy a show first!</span>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
            ⚠️ {error}
          </div>
        )}

        {/* Banner with status info */}
        {selectedShowId && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--singr-bg-secondary)]/10 p-5 rounded-2xl border border-[var(--singr-border)] backdrop-blur-md">
            <div>
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className={`w-4 h-4 text-[var(--singr-accent-primary)] ${socketConnected ? "animate-pulse" : ""}`} /> 
                {socketConnected ? "WebSocket Sync Active" : "WebSocket Sync Offline"}
              </h3>
              <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0">
                Singers' requests instantly appear in your list here without page refreshing.
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 font-sans ${
                socketConnected ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
              }`}>
                <span className={`h-2 w-2 rounded-full ${socketConnected ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`}></span> 
                {socketConnected ? "Live Broadcast" : "Polling Mode"}
              </span>
            </div>
          </div>
        )}

        {/* Live requests */}
        {selectedShowId ? (
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
                        <h4 className="text-base font-extrabold text-white truncate leading-tight mb-1">{req.song?.title || "Unknown Song"}</h4>
                        <p className="text-xs text-[var(--singr-text-secondary)] font-sans truncate mb-1">{req.song?.artist || "Unknown Artist"}</p>
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
                            onClick={() => handleKeyChange(req.id, -1, req.keyChange)}
                            className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors cursor-pointer text-xs"
                          >
                            -
                          </button>
                          <span className={`text-xs font-mono font-bold ${req.keyChange > 0 ? "text-emerald-400" : req.keyChange < 0 ? "text-orange-400" : "text-white"}`}>
                            {req.keyChange > 0 ? `+${req.keyChange}` : req.keyChange}
                          </span>
                          <button 
                            onClick={() => handleKeyChange(req.id, 1, req.keyChange)}
                            className="w-6 h-6 rounded-md bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors cursor-pointer text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Order buttons */}
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleSwap(index, index - 1)}
                          disabled={index === 0 || actionLoading}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-[var(--singr-text-secondary)] hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleSwap(index, index + 1)}
                          disabled={index === pendingRequests.length - 1 || actionLoading}
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
                          disabled={actionLoading}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Played
                        </GlassButton>
                        <GlassButton
                          onClick={() => handleDelete(req.id)}
                          variant="secondary"
                          className="py-2 px-3 text-xs border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 flex items-center gap-1"
                          disabled={actionLoading}
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
        ) : (
          <GlassCard className="p-8 text-center bg-white/5 border border-white/5">
            <AlertCircle className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
              Please select or create a show first to view its requests queue.
            </p>
          </GlassCard>
        )}

        {/* History / Skip log */}
        {selectedShowId && processedRequests.length > 0 && (
          <div className="border-t border-[var(--singr-border)] pt-8 mt-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans mb-4">Show Logs / Played</h4>
            <div className="flex flex-col gap-2 font-sans text-xs">
              {processedRequests.map((req) => (
                <div key={req.id} className="flex justify-between items-center p-3.5 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <span className="font-semibold text-white">{req.song?.title || "Unknown Song"}</span> • <span className="text-[var(--singr-text-secondary)]">{req.singerName}</span>
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
