"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  IndianRupee,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";

type RecoveryData = {
  revenueAtRisk: number;
  currentRevenueAtRisk: number;
  expectedRecovery: number;
  actualRecovered: number;
  recoveryRate: number;
  expectedRecoveryRate: number;
  recoveryAttempts: number;
  successfulRecoveries: number;
  stoppedCases: number;
  humanEscalations: number;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${(value || 0).toFixed(2)}%`;
}

export default function RecoveryPage() {
  const [data, setData] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRecovery() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/recovery", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to load recovery analytics"
        );
      }

      setData(result.recovery);
    } catch (err) {
      console.error("Recovery page error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load recovery analytics"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecovery();
  }, []);

  const recoveryLift = useMemo(() => {
    if (!data || data.expectedRecovery <= 0) {
      return 0;
    }

    return (
      ((data.actualRecovered - data.expectedRecovery) /
        data.expectedRecovery) *
      100
    );
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070b] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="text-center">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-sm text-zinc-400">
              Loading recovery intelligence...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#05070b] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <Link
            href="/dashboard"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-400" />

              <div>
                <h1 className="font-semibold text-white">
                  Recovery analytics unavailable
                </h1>

                <p className="mt-1 text-sm text-zinc-400">
                  {error || "Unable to load recovery data."}
                </p>
              </div>
            </div>

            <button
              onClick={loadRecovery}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Revenue Recovery
                </h1>

                <p className="mt-1 text-sm text-zinc-500">
                  Recovery intelligence, execution and measured outcomes
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadRecovery}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Main metrics */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Original Revenue Opportunity"
            value={formatINR(data.revenueAtRisk)}
            subtitle="Initial revenue exposed"
            icon={<IndianRupee className="h-5 w-5" />}
          />

          <MetricCard
            title="Current Revenue At Risk"
            value={formatINR(data.currentRevenueAtRisk)}
            subtitle="Unresolved exposure"
            icon={<AlertTriangle className="h-5 w-5" />}
          />

          <MetricCard
            title="Expected Recovery"
            value={formatINR(data.expectedRecovery)}
            subtitle={formatPercent(data.expectedRecoveryRate)}
            icon={<TargetIcon />}
          />

          <MetricCard
            title="Actual Recovered"
            value={formatINR(data.actualRecovered)}
            subtitle={formatPercent(data.recoveryRate)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            positive
          />
        </div>

        {/* Recovery performance */}
        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 lg:col-span-2">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Recovery Performance
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  Revenue recovered vs opportunity
                </h2>
              </div>

              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
                Live database data
              </div>
            </div>

            <div className="space-y-6">
              <ProgressRow
                label="Actual recovery"
                value={data.actualRecovered}
                max={data.revenueAtRisk}
                percentage={data.recoveryRate}
              />

              <ProgressRow
                label="Expected recovery"
                value={data.expectedRecovery}
                max={data.revenueAtRisk}
                percentage={data.expectedRecoveryRate}
              />

              <div className="grid gap-4 pt-2 sm:grid-cols-3">
                <SmallStat
                  label="Recovery attempts"
                  value={String(data.recoveryAttempts)}
                  icon={<Clock3 className="h-4 w-4" />}
                />

                <SmallStat
                  label="Successful recoveries"
                  value={String(data.successfulRecoveries)}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />

                <SmallStat
                  label="Human escalations"
                  value={String(data.humanEscalations)}
                  icon={<ShieldCheck className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>

          {/* Recovery status */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Recovery Status
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              Agent outcomes
            </h2>

            <div className="mt-6 space-y-4">
              <StatusRow
                label="Recovered"
                value={data.successfulRecoveries}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />

              <StatusRow
                label="Stopped"
                value={data.stoppedCases}
                icon={<XCircle className="h-4 w-4" />}
              />

              <StatusRow
                label="Human escalation"
                value={data.humanEscalations}
                icon={<ShieldCheck className="h-4 w-4" />}
              />

              <StatusRow
                label="Recovery attempts"
                value={data.recoveryAttempts}
                icon={<RefreshCw className="h-4 w-4" />}
              />
            </div>
          </div>
        </section>

        {/* Financial impact */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <ImpactCard
            title="Unresolved Exposure"
            value={formatINR(data.currentRevenueAtRisk)}
            description="Revenue still requiring recovery action"
          />

          <ImpactCard
            title="Recovered Revenue"
            value={formatINR(data.actualRecovered)}
            description="Confirmed successful recoveries"
            positive
          />

          <ImpactCard
            title="Recovery Gap"
            value={formatINR(
              Math.max(
                data.revenueAtRisk - data.actualRecovered,
                0
              )
            )}
            description="Original opportunity not yet recovered"
          />
        </section>

        {/* Agent intelligence */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h2 className="font-semibold">
                Autonomous Recovery Intelligence
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                ReviveAI evaluates failed and abandoned transactions,
                predicts recovery probability, selects an intervention,
                applies merchant guardrails, executes the recovery
                workflow and records the outcome in the audit trail.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Feature
                  title="Predict"
                  description="Recovery probability"
                />

                <Feature
                  title="Diagnose"
                  description="Failure root cause"
                />

                <Feature
                  title="Decide"
                  description="Best recovery action"
                />

                <Feature
                  title="Verify"
                  description="Confirmed payment outcome"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/15"
          >
            Open AI Agent
          </Link>

          <Link
            href="/transactions"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            View Transactions
          </Link>

          <Link
            href="/audit"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            View Audit Trail
          </Link>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  positive = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-500">
          {title}
        </p>

        <div
          className={`rounded-lg p-2 ${
            positive
              ? "bg-emerald-400/10 text-emerald-400"
              : "bg-cyan-400/10 text-cyan-400"
          }`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-5 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-500">{subtitle}</p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  max,
  percentage,
}: {
  label: string;
  value: number;
  max: number;
  percentage: number;
}) {
  const width =
    max > 0
      ? Math.min(Math.max((value / max) * 100, 0), 100)
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>

        <span className="font-medium text-white">
          {formatINR(value)}{" "}
          <span className="text-zinc-500">
            ({formatPercent(percentage)})
          </span>
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>

      <p className="mt-3 text-xl font-semibold">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-zinc-500">{icon}</span>
        <span className="text-sm text-zinc-400">{label}</span>
      </div>

      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function ImpactCard({
  title,
  value,
  description,
  positive = false,
}: {
  title: string;
  value: string;
  description: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
        {title}
      </p>

      <p
        className={`mt-4 text-2xl font-semibold ${
          positive ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function TargetIcon() {
  return (
    <div className="h-5 w-5 text-cyan-400">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </svg>
    </div>
  );
}