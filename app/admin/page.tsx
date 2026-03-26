"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  MessageSquare,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Target,
  RefreshCw,
  LogOut,
  Lock,
  Users,
  BarChart2,
  Activity,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { AdminStats, PilotClientSummary, PilotClientStatus } from "@/lib/types";
import { formatRelativeTime, cn } from "@/lib/utils";
import ClientDetailModal from "@/components/ClientDetailModal";

const STORAGE_KEY = "skylar_admin_password";

// ─── Root page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [days, setDays] = useState(14);
  const [selectedClient, setSelectedClient] = useState<PilotClientSummary | null>(null);

  const fetchStats = useCallback(async (pw: string, daysBack: number) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/stats?days=${daysBack}`, {
        headers: { Authorization: `Bearer ${pw}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(STORAGE_KEY);
        setIsAuthenticated(false);
        setFetchError("Session expired — please log in again.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json() as AdminStats);
    } catch {
      setFetchError("Failed to load stats. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) setIsAuthenticated(true);
  }, []);

  // Re-fetch whenever auth or days window changes
  useEffect(() => {
    if (!isAuthenticated) return;
    const pw = sessionStorage.getItem(STORAGE_KEY) ?? "";
    fetchStats(pw, days);
  }, [isAuthenticated, days, fetchStats]);

  const handleAuthSuccess = (pw: string, initialStats: AdminStats) => {
    sessionStorage.setItem(STORAGE_KEY, pw);
    setIsAuthenticated(true);
    setStats(initialStats);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setStats(null);
    setSelectedClient(null);
  };

  const handleRefresh = () => {
    const pw = sessionStorage.getItem(STORAGE_KEY) ?? "";
    fetchStats(pw, days);
  };

  if (!isAuthenticated) {
    return <PasswordModal onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page header ── */}
      <header className="bg-surface border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div className="hidden xs:block sm:block">
              <span className="font-semibold text-slate-900">Skylar HR</span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            {/* Days window selector — compact on mobile */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 rounded-lg p-1 shrink-0">
              {([14, 30, 0] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={cn(
                    "px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap min-h-[32px]",
                    days === d
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-secondary hover:text-slate-700"
                  )}
                >
                  {d === 0 ? <span className="hidden sm:inline">All time</span> : `${d}d`}
                  {d === 0 && <span className="sm:hidden">All</span>}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-sm text-secondary hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 min-h-[44px] shrink-0"
              aria-label="Refresh stats"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 text-sm text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] shrink-0"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-secondary text-sm mt-1">
            {days === 0 ? "All-time metrics" : `Last ${days} days`}
          </p>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{fetchError}</span>
            <button
              onClick={handleRefresh}
              className="ml-auto font-medium underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !stats && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {stats && (
          <>
            {/* ── Stat cards ── */}
            <section aria-label="Key metrics">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={MessageSquare}
                  label="Total Conversations"
                  value={stats.totalConversations.toLocaleString()}
                  color="blue"
                />
                <StatCard
                  icon={ClipboardList}
                  label="Action Plans Delivered"
                  value={stats.actionPlansDelivered.toLocaleString()}
                  color="blue"
                  sub={
                    stats.totalConversations > 0
                      ? `${stats.actionPlansDeliveredPercentage}% of conversations`
                      : undefined
                  }
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Acted Independently"
                  value={
                    stats.actionPlansDelivered > 0
                      ? `${stats.actedIndependentlyPercentage}%`
                      : "—"
                  }
                  color={
                    stats.actedIndependentlyPercentage >= 70 ? "green" : "orange"
                  }
                  sub={
                    stats.actionPlansDelivered > 0
                      ? `${stats.actedIndependently} of ${stats.actionPlansDelivered}`
                      : "No feedback yet"
                  }
                />
                <StatCard
                  icon={TrendingUp}
                  label="Avg. Confidence"
                  value={
                    stats.averageConfidence > 0
                      ? `${stats.averageConfidence.toFixed(1)}/10`
                      : "—"
                  }
                  color={
                    stats.averageConfidence >= 7
                      ? "green"
                      : stats.averageConfidence >= 5
                      ? "orange"
                      : "blue"
                  }
                />
              </div>
            </section>

            {/* ── Test status ── */}
            <section aria-label="Test status">
              <div className="bg-surface rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-slate-800">Test Status</h2>
                  <span
                    className={cn(
                      "ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                      stats.testStatus.passed
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {stats.testStatus.passed ? "✓ Target reached" : "In progress"}
                  </span>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <span className="text-sm text-secondary">
                    Target: {stats.testStatus.targetPercentage}% act independently
                  </span>
                  <span className="text-2xl font-bold text-slate-900">
                    {stats.testStatus.currentPercentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={cn(
                      "h-3 rounded-full transition-all duration-500",
                      stats.testStatus.passed ? "bg-green-500" : "bg-primary"
                    )}
                    style={{
                      width: `${Math.min(stats.testStatus.currentPercentage, 100)}%`,
                    }}
                  />
                </div>

                {/* Target marker */}
                <div className="relative h-4 mt-1">
                  <div
                    className="absolute top-0 w-px h-3 bg-slate-400"
                    style={{ left: `${stats.testStatus.targetPercentage}%` }}
                  />
                  <span
                    className="absolute top-0 text-xs text-secondary"
                    style={{ left: `${stats.testStatus.targetPercentage}%`, transform: "translateX(-50%)" }}
                  >
                    70%
                  </span>
                </div>

                {!stats.testStatus.passed && stats.testStatus.conversationsNeeded > 0 && (
                  <p className="text-sm text-secondary mt-3">
                    Need{" "}
                    <span className="font-semibold text-slate-800">
                      {stats.testStatus.conversationsNeeded} more
                    </span>{" "}
                    &ldquo;Yes, I acted&rdquo; responses to pass the threshold.
                  </p>
                )}
              </div>
            </section>

            {/* ── Pilot clients ── */}
            <section aria-label="Pilot clients">
              <div className="bg-surface rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 p-6 border-b border-slate-100">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-slate-800">Pilot Clients</h2>
                  <span className="ml-1 text-sm text-secondary">
                    ({stats.pilotClients.length})
                  </span>
                </div>

                {stats.pilotClients.length === 0 ? (
                  <div className="p-8 text-center text-secondary text-sm">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p>No pilot clients yet.</p>
                    <p className="text-xs mt-1">
                      Set <code className="bg-slate-100 px-1 rounded">isPilotClient: true</code> on a client document to appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="text-left text-xs text-secondary bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3 font-medium">Client</th>
                          <th className="px-4 py-3 font-medium">Convos</th>
                          <th className="px-4 py-3 font-medium">Acted</th>
                          <th className="px-4 py-3 font-medium">Confidence</th>
                          <th className="px-4 py-3 font-medium">Last Active</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium sr-only">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {stats.pilotClients.map((client) => (
                          <tr
                            key={client.clientId}
                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                            onClick={() => setSelectedClient(client)}
                          >
                            <td className="px-6 py-3.5 font-medium text-slate-800">
                              {client.name}
                            </td>
                            <td className="px-4 py-3.5 text-secondary">
                              {client.conversationCount}
                            </td>
                            <td className="px-4 py-3.5">
                              {client.actedCount > 0 ? (
                                <span
                                  className={cn(
                                    "font-medium",
                                    client.actedPercentage >= 70
                                      ? "text-green-600"
                                      : "text-amber-600"
                                  )}
                                >
                                  {client.actedCount}/{client.conversationCount} ({client.actedPercentage}%)
                                </span>
                              ) : (
                                <span className="text-secondary">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-secondary">
                              {client.averageConfidence > 0
                                ? `${client.averageConfidence.toFixed(1)}/10`
                                : "—"}
                            </td>
                            <td className="px-4 py-3.5 text-secondary text-xs">
                              {formatRelativeTime(new Date(client.lastActive))}
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusBadge status={client.status} />
                            </td>
                            <td className="px-4 py-3.5 text-secondary">
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Situation type breakdown */}
              <section aria-label="Situation type breakdown">
                <div className="bg-surface rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Activity className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-slate-800">Situation Types</h2>
                  </div>
                  <SituationChart breakdown={stats.situationTypeBreakdown} total={stats.totalConversations} />
                </div>
              </section>

              {/* Confidence distribution */}
              <section aria-label="Confidence distribution">
                <div className="bg-surface rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <BarChart2 className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-slate-800">Confidence Distribution</h2>
                  </div>
                  <ConfidenceChart distribution={stats.confidenceDistribution} />
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {/* Client detail modal */}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}

// ─── Password modal ───────────────────────────────────────────────────────────

function PasswordModal({
  onSuccess,
}: {
  onSuccess: (pw: string, stats: AdminStats) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/stats?days=14", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.status === 401) {
        setError("Incorrect password. Please try again.");
        return;
      }
      if (!res.ok) throw new Error();
      onSuccess(password, await res.json() as AdminStats);
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Skylar Admin</h1>
          <p className="text-secondary text-sm mt-1">Enter your admin password to continue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: "blue" | "green" | "orange";
  sub?: string;
}) {
  const colorMap = {
    blue: "bg-primary/10 text-primary",
    green: "bg-green-50 text-green-600",
    orange: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-surface rounded-2xl border border-slate-200 p-5">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", colorMap[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-secondary mt-1">{sub}</p>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PilotClientStatus }) {
  const styles: Record<PilotClientStatus, string> = {
    active: "bg-green-50 text-green-700 border-green-200",
    "low-usage": "bg-amber-50 text-amber-700 border-amber-200",
    "no-usage": "bg-slate-50 text-slate-500 border-slate-200",
  };
  const labels: Record<PilotClientStatus, string> = {
    active: "Active",
    "low-usage": "Low usage",
    "no-usage": "No usage",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", styles[status])}>
      {labels[status]}
    </span>
  );
}

// ─── Situation type chart ─────────────────────────────────────────────────────

const SITUATION_LABELS: Record<string, string> = {
  attendance: "Attendance",
  performance: "Performance",
  policy: "Policy",
  leave: "Leave",
  other: "Other",
};

const SITUATION_COLORS: Record<string, string> = {
  attendance: "bg-blue-500",
  performance: "bg-violet-500",
  policy: "bg-emerald-500",
  leave: "bg-amber-500",
  other: "bg-slate-400",
};

function SituationChart({
  breakdown,
  total,
}: {
  breakdown: AdminStats["situationTypeBreakdown"];
  total: number;
}) {
  const entries = Object.entries(breakdown) as [keyof typeof breakdown, number][];
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="space-y-3">
      {entries.map(([key, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const barWidth = Math.round((count / max) * 100);
        return (
          <div key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-700 font-medium">{SITUATION_LABELS[key]}</span>
              <span className="text-secondary">
                {count} {count === 1 ? "convo" : "convos"} ({pct}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={cn("h-2.5 rounded-full transition-all duration-500", SITUATION_COLORS[key])}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
      {total === 0 && (
        <p className="text-sm text-secondary text-center py-4">No conversations yet.</p>
      )}
    </div>
  );
}

// ─── Confidence distribution chart ───────────────────────────────────────────

function ConfidenceChart({
  distribution,
}: {
  distribution: AdminStats["confidenceDistribution"];
}) {
  const entries = Object.entries(distribution)
    .map(([k, v]) => ({ score: parseInt(k), count: v }))
    .sort((a, b) => b.score - a.score);

  const maxCount = Math.max(...entries.map((e) => e.count), 1);
  const total = entries.reduce((s, e) => s + e.count, 0);

  const scoreColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-blue-500";
    if (score >= 4) return "bg-amber-500";
    return "bg-red-400";
  };

  return (
    <div className="space-y-2">
      {entries.map(({ score, count }) => (
        <div key={score} className="flex items-center gap-3">
          <span className="w-5 text-xs font-mono text-secondary text-right shrink-0">
            {score}
          </span>
          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={cn("h-2.5 rounded-full transition-all duration-500", scoreColor(score))}
              style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
            />
          </div>
          <span className="w-6 text-xs text-secondary text-right shrink-0">{count}</span>
        </div>
      ))}
      {total === 0 && (
        <p className="text-sm text-secondary text-center py-4">No feedback submitted yet.</p>
      )}
      {total > 0 && (
        <p className="text-xs text-secondary text-right mt-2">
          {total} {total === 1 ? "response" : "responses"} total
        </p>
      )}
    </div>
  );
}
