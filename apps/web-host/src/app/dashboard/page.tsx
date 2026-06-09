"use client";

import React, { useEffect, useState } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton } from "@singr/ui";
import {
  MapPin,
  Tv,
  Layers,
  ListMusic,
  PlusCircle,
  ArrowUpRight,
  EyeOff,
  Globe,
  RefreshCw,
} from "lucide-react";

interface Metrics {
  venuesCount: number;
  showsCount: number;
  activeShowsCount: number;
  systemsCount: number;
  totalRequests: number;
  pendingRequests: number;
}

interface RecentShow {
  id: string;
  showName: string;
  slug: string;
  venueName: string;
  isPrivate: boolean;
  isAccepting: boolean;
  pinCode: string | null;
  systemNumber: number | null;
}

interface HealthState {
  api: boolean;
  database: boolean;
  redis: boolean;
  latencyMs: number | null;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function HostDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentShows, setRecentShows] = useState<RecentShow[]>([]);
  const [loading, setLoading] = useState(true);

  const [health, setHealth] = useState<HealthState | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/host/metrics`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setRecentShows(data.recentShows || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(`${apiUrl}/health`);
      const latencyMs = Math.round(performance.now() - start);
      const data = await res.json();
      setHealth({
        api: res.ok && data.success,
        database: data.database === "connected",
        redis: data.redis === "connected",
        latencyMs,
      });
    } catch (err) {
      console.error("Health check failed:", err);
      setHealth({ api: false, database: false, redis: false, latencyMs: null });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    loadHealth();
  }, []);

  const stats = [
    {
      name: "Active Venues",
      value: metrics?.venuesCount ?? 0,
      icon: MapPin,
      color: "text-blue-400",
    },
    {
      name: "Shows Created",
      value: metrics?.showsCount ?? 0,
      icon: Tv,
      color: "text-emerald-400",
    },
    {
      name: "Hardware Systems",
      value: metrics?.systemsCount ?? 0,
      icon: Layers,
      color: "text-purple-400",
    },
    {
      name: "Total Requests",
      value: metrics?.totalRequests ?? 0,
      icon: ListMusic,
      color: "text-orange-400",
    },
  ];

  const healthItems = [
    { label: "Node API Server", ok: health?.api },
    { label: "Postgres Database", ok: health?.database },
    { label: "Redis Cache Store", ok: health?.redis },
  ];

  return (
    <HostLayout title="Host Console">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Banner Section */}
        <GlassCard className="p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--singr-brand-start)]/5 to-[var(--singr-brand-end)]/5 rounded-full filter blur-3xl pointer-events-none"></div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              Welcome Back to Singr
            </h1>
            <p className="text-sm text-[var(--singr-text-secondary)] font-sans max-w-xl leading-relaxed">
              Organize your venues, control active shows, allocate hardware numbers, and oversee
              singer queues in real-time.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href="/shows" className="decoration-none">
              <GlassButton
                variant="primary"
                className="text-xs py-3 px-5 flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Start New Show
              </GlassButton>
            </a>
          </div>
        </GlassCard>

        {/* Analytics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <GlassCard
                key={stat.name}
                className="p-5 sm:p-6 flex items-center justify-between gap-2"
                hoverable={true}
              >
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--singr-text-secondary)] font-sans mb-1">
                    {stat.name}
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white font-sans">
                    {loading ? "..." : stat.value}
                  </p>
                </div>
                <div
                  className={`p-3 sm:p-3.5 rounded-xl bg-white/5 border border-white/10 ${stat.color} shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Dynamic Detail grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Quick Overview */}
          <GlassCard className="p-6 sm:p-8 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white m-0">Quick Overview</h3>
              {metrics && (
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--singr-text-secondary)]">
                  {metrics.activeShowsCount} live • {metrics.pendingRequests} pending
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 font-sans text-sm">
              {loading ? (
                <p className="text-sm text-[var(--singr-text-secondary)]">Loading shows...</p>
              ) : recentShows.length === 0 ? (
                <div className="flex flex-col items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-sm text-[var(--singr-text-secondary)] m-0">
                    You haven&rsquo;t created any shows yet.
                  </p>
                  <a href="/shows" className="decoration-none">
                    <GlassButton variant="primary" className="py-1.5 px-3 text-xs">
                      Create your first show
                    </GlassButton>
                  </a>
                </div>
              ) : (
                recentShows.map((show) => (
                  <div
                    key={show.id}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white truncate m-0">{show.showName}</p>
                        {show.isPrivate ? (
                          <EyeOff className="w-3 h-3 text-purple-400 shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--singr-text-secondary)] m-0 mt-0.5 truncate">
                        {show.venueName}
                        {show.systemNumber ? ` • System #${show.systemNumber}` : ""}
                        {show.pinCode ? ` • PIN: ${show.pinCode}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                          show.isAccepting
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-red-400 bg-red-500/10"
                        }`}
                      >
                        {show.isAccepting ? "Open" : "Closed"}
                      </span>
                      <a href="/queue" className="decoration-none">
                        <GlassButton
                          variant="secondary"
                          className="py-1.5 px-3 text-xs flex items-center gap-1"
                        >
                          Queue <ArrowUpRight className="w-3.5 h-3.5" />
                        </GlassButton>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* System Health */}
          <GlassCard className="p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-6">System Health</h3>
              <ul className="list-none p-0 m-0 flex flex-col gap-4 font-sans text-sm">
                {healthItems.map((item) => {
                  const ok = item.ok;
                  return (
                    <li key={item.label} className="flex justify-between items-center">
                      <span className="text-[var(--singr-text-secondary)]">{item.label}</span>
                      {healthLoading ? (
                        <span className="text-xs font-semibold text-[var(--singr-text-secondary)] bg-white/5 px-2.5 py-0.5 rounded-full">
                          Checking...
                        </span>
                      ) : ok ? (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                          Online
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full">
                          Offline
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="border-t border-[var(--singr-border)] pt-4 mt-6 flex justify-between items-center">
              <span className="text-xs text-[var(--singr-text-secondary)] font-sans">
                {healthLoading
                  ? "Pinging services..."
                  : health?.latencyMs != null
                  ? `Latest ping: ${health.latencyMs}ms`
                  : "Unreachable"}
              </span>
              <GlassButton
                onClick={loadHealth}
                variant="secondary"
                disabled={healthLoading}
                className="py-1 px-3 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${healthLoading ? "animate-spin" : ""}`} /> Run
                Diagnostics
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </HostLayout>
  );
}
