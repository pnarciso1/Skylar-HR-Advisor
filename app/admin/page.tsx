"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import type { AdminStats } from "@/lib/types";
import {
  MessageSquare,
  ClipboardList,
  CheckCircle2,
  BarChart2,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json() as Promise<AdminStats>)
      .then((data) => setStats(data))
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-secondary mt-1">
            Overview of Skylar usage and outcomes
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
            {error}
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              />
              <StatCard
                icon={CheckCircle2}
                label="Acted Independently"
                value={`${stats.actedIndependentlyPercentage.toFixed(0)}%`}
                color="green"
                sub={`${stats.actedIndependently} of ${stats.actionPlansDelivered}`}
              />
              <StatCard
                icon={TrendingUp}
                label="Avg. Confidence"
                value={
                  stats.averageConfidence > 0
                    ? `${stats.averageConfidence.toFixed(1)}/10`
                    : "—"
                }
                color="blue"
              />
            </div>

            <div className="bg-surface rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-slate-800">Pilot Clients</h2>
              </div>
              {stats.pilotClients.length === 0 ? (
                <p className="text-secondary text-sm">No pilot clients yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-secondary border-b border-slate-100">
                        <th className="pb-2 font-medium">Client</th>
                        <th className="pb-2 font-medium">Conversations</th>
                        <th className="pb-2 font-medium">Acted</th>
                        <th className="pb-2 font-medium">Avg Confidence</th>
                        <th className="pb-2 font-medium">Last Active</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.pilotClients.map((client) => (
                        <tr key={client.clientId}>
                          <td className="py-2.5 font-medium text-slate-800">
                            {client.name}
                          </td>
                          <td className="py-2.5 text-secondary">
                            {client.conversationCount}
                          </td>
                          <td className="py-2.5 text-secondary">
                            {client.actedCount}
                          </td>
                          <td className="py-2.5 text-secondary">
                            {client.averageConfidence > 0
                              ? `${client.averageConfidence.toFixed(1)}/10`
                              : "—"}
                          </td>
                          <td className="py-2.5 text-secondary">
                            {formatRelativeTime(new Date(client.lastActive))}
                          </td>
                          <td className="py-2.5">
                            <StatusBadge status={client.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

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
  color: "blue" | "green" | "red";
  sub?: string;
}) {
  const colorMap = {
    blue: "bg-primary/10 text-primary",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-500",
  };

  return (
    <div className="bg-surface rounded-2xl border border-slate-200 p-5">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-secondary mt-0.5">{label}</p>
      {sub && <p className="text-xs text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: "active" | "low-usage" | "no-usage" }) {
  const styles = {
    active: "bg-green-50 text-green-700 border-green-200",
    "low-usage": "bg-amber-50 text-amber-700 border-amber-200",
    "no-usage": "bg-slate-50 text-slate-500 border-slate-200",
  };
  const labels = {
    active: "Active",
    "low-usage": "Low usage",
    "no-usage": "No usage",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
