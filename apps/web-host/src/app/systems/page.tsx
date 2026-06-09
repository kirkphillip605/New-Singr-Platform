"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { Layers, Plus, RotateCw, Trash2, Key, HelpCircle, Copy, Check, ShieldAlert } from "lucide-react";

interface HardwareSystem {
  id: string;
  systemNumber: number;
  apiKey: string;
  createdAt: string;
}

export default function SystemsPage() {
  const [systems, setSystems] = useState<HardwareSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal / Highlight state for newly created key
  const [newKeyDetails, setNewKeyDetails] = useState<{
    systemNumber: number;
    apiKey: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const fetchSystems = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/systems`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setSystems(data.systems || []);
      } else {
        setError(data.message || "Failed to load systems ledger.");
      }
    } catch (err) {
      console.error("Error loading systems:", err);
      setError("Failed to connect to hardware systems gateway.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystems();
  }, []);

  const handleCreateSystem = async () => {
    setError("");
    setSuccess("");
    setNewKeyDetails(null);
    setActionLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/v1/systems`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && data.system) {
        setNewKeyDetails({
          systemNumber: data.system.systemNumber,
          apiKey: data.system.apiKey,
        });
        setSuccess(`System #${data.system.systemNumber} provisioned successfully!`);
        await fetchSystems();
      } else {
        setError(data.message || "Failed to provision system.");
      }
    } catch (err) {
      console.error("Failed to create system:", err);
      setError("Failed to communicate provisioning request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotateKey = async (id: string, number: number) => {
    if (!confirm(`Are you sure you want to rotate the API key for System #${number}? The current key will immediately stop working.`)) return;
    setError("");
    setSuccess("");
    setNewKeyDetails(null);
    setActionLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/v1/systems/${id}/regenerate-key`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && data.system) {
        setNewKeyDetails({
          systemNumber: data.system.systemNumber,
          apiKey: data.system.apiKey,
        });
        setSuccess(`API key rotated successfully for System #${data.system.systemNumber}!`);
        await fetchSystems();
      } else {
        setError(data.message || "Failed to rotate key.");
      }
    } catch (err) {
      console.error("Failed to rotate key:", err);
      setError("Failed to communicate rotation request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, number: number) => {
    if (!confirm(`Are you sure you want to delete System #${number}? All local player bindings will be revoked.`)) return;
    setError("");
    setSuccess("");
    setNewKeyDetails(null);
    setActionLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/v1/systems/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(`System #${number} successfully deleted.`);
        await fetchSystems();
      } else {
        setError(data.message || "Failed to delete system.");
      }
    } catch (err) {
      console.error("Failed to delete system:", err);
      setError("Failed to communicate delete request.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <HostLayout title="Hardware Systems">
      <div className="flex flex-col gap-6">
        
        {/* Header CTA */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
            Register your local karaoke player PCs or Tauri desktop agents. Singr auto-fills number gaps.
          </p>
          <GlassButton 
            onClick={handleCreateSystem} 
            disabled={actionLoading}
            variant="primary" 
            className="text-xs py-2.5 px-4 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> {actionLoading ? "Provisioning..." : "Provision System"}
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

        {/* Info Box */}
        <GlassCard className="p-5 border-l-4 border-l-[var(--singr-accent-primary)] bg-white/5 flex gap-4 items-start font-sans text-xs">
          <HelpCircle className="w-5 h-5 text-[var(--singr-accent-primary)] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-semibold text-white mb-1">Gap-Filling Allocation Rules</p>
            <p className="text-[var(--singr-text-secondary)] m-0">
              When a hardware system is deleted, its assigned number becomes instantly available. The next provisioned system will automatically take the lowest empty slot.
            </p>
          </div>
        </GlassCard>

        {/* Secure Newly Created/Rotated Key Banner */}
        {newKeyDetails && (
          <GlassCard className="p-6 border border-orange-500/30 bg-orange-500/5 flex flex-col gap-4 font-sans">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6.5 h-6.5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-base font-bold text-white mb-1">Secure API Key Generated for System #{newKeyDetails.systemNumber}</h4>
                <p className="text-xs text-[var(--singr-text-secondary)] leading-relaxed m-0">
                  Please copy this API key now. For security purposes, it will never be displayed in full again. Paste it directly into your local Singr Desktop Agent config.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-black/60 border border-white/10 rounded-xl font-mono text-xs text-white justify-between">
              <span className="select-all break-all pr-4">{newKeyDetails.apiKey}</span>
              <button
                onClick={() => copyToClipboard(newKeyDetails.apiKey)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[var(--singr-text-secondary)] hover:text-white cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </GlassCard>
        )}

        {/* Systems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans">Connecting to system ledger...</p>
          ) : systems.length === 0 ? (
            <GlassCard className="p-8 text-center md:col-span-2">
              <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
                No active hardware systems provisioned. Tap "Provision System" to register your player agent.
              </p>
            </GlassCard>
          ) : (
            systems.map((sys) => (
              <GlassCard key={sys.id} className="p-6 flex flex-col justify-between" hoverable={true}>
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-tr from-[var(--singr-brand-start)]/20 to-[var(--singr-brand-end)]/20 border border-[var(--singr-accent-primary)]/10 text-[var(--singr-accent-primary)] rounded-lg">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight">System #{sys.systemNumber}</h3>
                        <p className="text-[10px] text-[var(--singr-text-secondary)] font-sans">Provisioned: {new Date(sys.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs mb-6 relative">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-[var(--singr-text-secondary)] tracking-wider flex items-center gap-1 font-sans">
                        <Key className="w-3 h-3 text-[var(--singr-accent-secondary)]" /> Agent API Key
                      </span>
                      <button
                        onClick={() => toggleReveal(sys.id)}
                        className="text-[var(--singr-text-secondary)] hover:text-white transition-colors text-[10px] font-sans border-none bg-transparent cursor-pointer p-0 underline"
                      >
                        {revealedKeys[sys.id] ? "Hide Mask" : "Show Mask"}
                      </button>
                    </div>
                    <div className="truncate text-white pr-2 mt-1.5 font-bold tracking-wider">
                      {revealedKeys[sys.id] ? sys.apiKey : "••••••••••••••••••••••••••••••••••••••••"}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-[var(--singr-border)] pt-4 gap-2">
                  <span className="text-[10px] font-mono text-[var(--singr-text-secondary)] uppercase">
                    ID: {sys.id.substring(0, 8)}...
                  </span>
                  <div className="flex gap-2">
                    <GlassButton
                      onClick={() => handleRotateKey(sys.id, sys.systemNumber)}
                      variant="secondary"
                      className="py-1.5 px-3 text-xs flex items-center gap-1 text-[var(--singr-accent-secondary)] border border-orange-500/10"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Rotate
                    </GlassButton>
                    <GlassButton
                      onClick={() => handleDelete(sys.id, sys.systemNumber)}
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
