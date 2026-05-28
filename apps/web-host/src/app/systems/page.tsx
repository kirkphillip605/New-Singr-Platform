"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { Layers, Plus, RotateCw, Trash2, Key, HelpCircle } from "lucide-react";

interface HardwareSystem {
  id: string;
  systemNumber: number;
  apiKey: string;
  createdAt: string;
}

export default function SystemsPage() {
  const [systems, setSystems] = useState<HardwareSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Simulated load from GET /api/v1/systems
    const timer = setTimeout(() => {
      setSystems([
        {
          id: "sys-1",
          systemNumber: 1,
          apiKey: "sk_sandbox_okj_93a7d41f021e847cbb621ef9a103d4fb",
          createdAt: new Date().toISOString(),
        },
        {
          id: "sys-3",
          systemNumber: 3,
          apiKey: "sk_sandbox_okj_a84c28bc39df5eefac02a11bde48c903",
          createdAt: new Date().toISOString(),
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleCreateSystem = () => {
    // Gap-filling logic simulation matching the API's behavior:
    // Sorted numbers: [1, 3] -> gap at 2 is filled first!
    const activeNumbers = systems.map(s => s.systemNumber).sort((a, b) => a - b);
    let nextNumber = 1;
    for (let i = 0; i < activeNumbers.length; i++) {
      const num = activeNumbers[i];
      if (num !== undefined) {
        if (num === nextNumber) {
          nextNumber++;
        } else if (num > nextNumber) {
          break;
        }
      }
    }

    const newSys: HardwareSystem = {
      id: `sys-${Date.now()}`,
      systemNumber: nextNumber,
      apiKey: `sk_sandbox_okj_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
      createdAt: new Date().toISOString(),
    };

    // Sort to keep ordered
    const updated = [...systems, newSys].sort((a, b) => a.systemNumber - b.systemNumber);
    setSystems(updated);
  };

  const handleRotateKey = (id: string) => {
    setSystems(systems.map(s => 
      s.id === id 
        ? { ...s, apiKey: `sk_sandbox_okj_rotated_${Math.random().toString(36).substring(2)}` } 
        : s
    ));
  };

  const handleDelete = (id: string) => {
    setSystems(systems.filter(s => s.id !== id));
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <HostLayout title="Hardware Systems">
      <div className="flex flex-col gap-6">
        
        {/* Header CTA */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
            Register your local karaoke player PCs or Tauri desktop agents. Singr auto-fills number gaps.
          </p>
          <GlassButton onClick={handleCreateSystem} variant="primary" className="text-xs py-2.5 px-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Provision System
          </GlassButton>
        </div>

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
                        {revealedKeys[sys.id] ? "Hide Key" : "Reveal Key"}
                      </button>
                    </div>
                    <div className="truncate text-white pr-2 mt-1.5 font-bold tracking-wider">
                      {revealedKeys[sys.id] ? sys.apiKey : "••••••••••••••••••••••••••••••••••••••••"}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-[var(--singr-border)] pt-4 gap-2">
                  <span className="text-[10px] font-mono text-[var(--singr-text-secondary)] uppercase">
                    ID: {sys.id}
                  </span>
                  <div className="flex gap-2">
                    <GlassButton
                      onClick={() => handleRotateKey(sys.id)}
                      variant="secondary"
                      className="py-1.5 px-3 text-xs flex items-center gap-1 text-[var(--singr-accent-secondary)] border border-orange-500/10"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Rotate
                    </GlassButton>
                    <GlassButton
                      onClick={() => handleDelete(sys.id)}
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
