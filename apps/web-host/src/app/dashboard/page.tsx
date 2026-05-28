"use client";

import React, { useEffect, useState } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import { MapPin, Tv, Layers, ListMusic, PlusCircle, ArrowUpRight } from "lucide-react";

interface Metrics {
  venuesCount: number;
  showsCount: number;
  systemsCount: number;
  requestsCount: number;
}

export default function HostDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    venuesCount: 0,
    showsCount: 0,
    systemsCount: 0,
    requestsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, we'd fetch this from GET /api/v1/venues, /shows, etc.
    // For local development sandbox, let's load simulated stats
    const timer = setTimeout(() => {
      setMetrics({
        venuesCount: 3,
        showsCount: 2,
        systemsCount: 1,
        requestsCount: 12,
      });
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { name: "Active Venues", value: metrics.venuesCount, icon: MapPin, color: "text-blue-400" },
    { name: "Shows Created", value: metrics.showsCount, icon: Tv, color: "text-emerald-400" },
    { name: "Hardware Systems", value: metrics.systemsCount, icon: Layers, color: "text-purple-400" },
    { name: "Total Requests", value: metrics.requestsCount, icon: ListMusic, color: "text-orange-400" },
  ];

  return (
    <HostLayout title="Host Console">
      <div className="flex flex-col gap-8">
        
        {/* Banner Section */}
        <GlassCard className="p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--singr-brand-start)]/5 to-[var(--singr-brand-end)]/5 rounded-full filter blur-3xl pointer-events-none"></div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Welcome Back to Singr</h1>
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans max-w-xl leading-relaxed">
              Organize your venues, control active shows, allocate hardware numbers, and oversee singer queues in real-time.
            </p>
          </div>
          <div className="flex gap-3">
            <a href="/shows" className="decoration-none">
              <GlassButton variant="primary" className="text-xs py-3 px-5 flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> Start New Show
              </GlassButton>
            </a>
          </div>
        </GlassCard>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <GlassCard key={stat.name} className="p-6 flex items-center justify-between" hoverable={true}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans mb-1">{stat.name}</p>
                  <p className="text-3xl font-extrabold text-white font-sans">
                    {loading ? "..." : stat.value}
                  </p>
                </div>
                <div className={`p-3.5 rounded-xl bg-white/5 border border-white/10 ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Dynamic Detail grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Actions */}
          <GlassCard className="p-8 lg:col-span-2">
            <h3 className="text-xl font-bold text-white mb-6">Quick Overview</h3>
            <div className="flex flex-col gap-4 font-sans text-sm">
              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-semibold text-white">Main Street Grill (Public Show)</p>
                  <p className="text-xs text-[var(--singr-text-secondary)]">Fri 8:00 PM • System #1</p>
                </div>
                <a href="/queue" className="decoration-none">
                  <GlassButton variant="secondary" className="py-1.5 px-3 text-xs flex items-center gap-1">
                    Manage Queue <ArrowUpRight className="w-3.5 h-3.5" />
                  </GlassButton>
                </a>
              </div>

              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-semibold text-white">Private Party (PIN Protected)</p>
                  <p className="text-xs text-[var(--singr-text-secondary)]">Sat 7:00 PM • PIN: 8842</p>
                </div>
                <a href="/shows" className="decoration-none">
                  <GlassButton variant="secondary" className="py-1.5 px-3 text-xs flex items-center gap-1">
                    Show Details <ArrowUpRight className="w-3.5 h-3.5" />
                  </GlassButton>
                </a>
              </div>
            </div>
          </GlassCard>

          {/* Connection Status */}
          <GlassCard className="p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-6">System Health</h3>
              <ul className="list-none p-0 m-0 flex flex-col gap-4 font-sans text-sm">
                <li className="flex justify-between items-center">
                  <span className="text-[var(--singr-text-secondary)]">Node API Server</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Online</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-[var(--singr-text-secondary)]">Postgres Database</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Connected</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-[var(--singr-text-secondary)]">Redis Cache Store</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Active</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-[var(--singr-text-secondary)]">BullMQ Queue Workers</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Waiting</span>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--singr-border)] pt-4 mt-6 flex justify-between items-center">
              <span className="text-xs text-[var(--singr-text-secondary)] font-sans">Latest ping: 12ms</span>
              <GlassButton variant="secondary" className="py-1 px-3 text-[10px] uppercase font-bold tracking-wider">
                Run Diagnostics
              </GlassButton>
            </div>
          </GlassCard>
        </div>

      </div>
    </HostLayout>
  );
}
