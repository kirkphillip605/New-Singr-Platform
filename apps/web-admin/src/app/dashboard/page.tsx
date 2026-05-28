"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { GlassCard } from "@singr/ui";
import { Users, Tv, ShieldCheck, Heart, TrendingUp } from "lucide-react";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalVenues: 0,
    activeShows: 0,
    totalRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated load from GET /api/v1/admin/metrics
    const timer = setTimeout(() => {
      setMetrics({
        totalUsers: 147,
        totalVenues: 24,
        activeShows: 5,
        totalRequests: 582,
      });
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { name: "Platform Users", value: metrics.totalUsers, icon: Users, color: "text-blue-400" },
    { name: "Registered Venues", value: metrics.totalVenues, icon: ShieldCheck, color: "text-emerald-400" },
    { name: "Active Shows", value: metrics.activeShows, icon: Tv, color: "text-purple-400" },
    { name: "Global Requests", value: metrics.totalRequests, icon: Heart, color: "text-orange-400" },
  ];

  return (
    <AdminLayout title="Platform Operations Control">
      <div className="flex flex-col gap-8">
        
        {/* Banner */}
        <GlassCard className="p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Platform Administration Console</h1>
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans max-w-xl leading-relaxed">
              Global operations console for the Singr multi-tenant platform. Oversee users, monitor server endpoints, triage subscription accounts, and troubleshoot operations.
            </p>
          </div>
        </GlassCard>

        {/* Global Stats */}
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

        {/* System Monitoring logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <GlassCard className="p-8 lg:col-span-2">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Platform Event Ledger
            </h3>
            <div className="flex flex-col gap-4 font-sans text-xs">
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-semibold text-white">Stripe Checkout Completion</p>
                  <p className="text-[10px] text-[var(--singr-text-secondary)]">Standard Tier Plan • customer_id: cus_sandbox_9a1</p>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-bold">Processed</span>
              </div>

              <div className="flex justify-between items-center p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-semibold text-white">Song Sync Debounce Completed</p>
                  <p className="text-[10px] text-[var(--singr-text-secondary)]">System #1 (Main Street Grill) • 1,248 tracks synced</p>
                </div>
                <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full font-bold">Shadow-Swapped</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <h3 className="text-xl font-bold text-white mb-6">Server Statistics</h3>
            <ul className="list-none p-0 m-0 flex flex-col gap-4 font-sans text-xs">
              <li className="flex justify-between items-center">
                <span className="text-[var(--singr-text-secondary)]">Database Pool Size</span>
                <span className="text-white font-mono">15 / 50 Connections</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--singr-text-secondary)]">Redis Cache Hit Rate</span>
                <span className="text-emerald-400 font-mono font-bold">98.4% Hit</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--singr-text-secondary)]">WebSocket Connections</span>
                <span className="text-white font-mono">24 Active Clients</span>
              </li>
            </ul>
          </GlassCard>
        </div>

      </div>
    </AdminLayout>
  );
}
