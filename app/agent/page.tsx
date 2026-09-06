"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  XCircle,
  RefreshCw,
  Zap,
  Play,
  ExternalLink,
  UserRound,
  Clock,
} from "lucide-react";

import { useEffect, useState } from "react";

type AgentCase = {
  id: string;
  status: string;
  diagnosis: string | null;
  predictedProbability: number | null;
  recommendedAction: string | null;
  expectedRecovery: number | null;
  actualRecovery: number;
  attempts: number;

  transaction: {
    id: string;
    externalId: string;
    amount: number;
    status: string;
    riskLevel: string | null;

    customer: {
      name: string;
      email: string;
      customerSegment: string | null;
      lifetimeValue: number;
    };
  };

  actions: {
    id: string;
    type: string;
    reason: string;
    status: string;
    amount: number | null;
    expectedValue: number | null;
    createdAt: string;
  }[];

  decisions: {
    id: string;
    decision: string;
    reasoning: string;
    confidence: number | null;
    expectedGain: number | null;
    createdAt: string;
  }[];
};

type RecoveryStats = {
  revenueAtRisk: number;
  expectedRecovery: number;
  actualRecovered: number;
  recoveryRate: number;
  expectedRecoveryRate: number;
  recoveryAttempts: number;
  successfulRecoveries: number;
  stoppedCases: number;
  humanEscalations: number;
};

type AgentRunResult = {
  success: boolean;
  finalStatus?: string;
  message?: string;
  transactionId?: string;

  stages?: {
    detect?: {
      risk?: {
        score?: number;
        level?: string;
        revenueAtRisk?: number;
        reasons?: string[];
      };
    };

    diagnose?: {
      diagnosis?: {
        diagnosis?: string;
        category?: string;
        recoverability?: string;
        recommendedApproach?: string;
      };
    };

    predict?: {
      prediction?: {
        probability?: number;
        expectedRecovery?: number;
        confidence?: number;
      };
    };

    strategy?: {
      strategy?: {
        action?: string;
        reason?: string;
        expectedValue?: number;
        priority?: string;
        requiresHuman?: boolean;
      };
    };

    guardrails?: {
      guardrails?: {
        decision?: string;
        allowed?: boolean;
        reason?: string;
        triggeredRules?: string[];
      };
    };

    execute?: {
      execution?: {
        success?: boolean;
        action?: string;
        status?: string;
        message?: string;
        externalReference?: string;
        paymentLink?: string;
      };
    };
  };
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "RECOVERED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "ACTION_REQUIRED":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "STOPPED":
      return "bg-slate-100 text-slate-700 border-slate-200";

    case "FAILED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function getRiskClass(risk: string | null) {
  switch (risk) {
    case "CRITICAL":
      return "bg-red-50 text-red-700 border-red-200";

    case "HIGH":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "MEDIUM":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "LOW":
      return "bg-slate-50 text-slate-600 border-slate-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function formatAction(action: string | null) {
  if (!action) return "—";

  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getActionClass(action: string | null) {
  switch (action) {
    case "PAYMENT_LINK":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "RETRY_PAYMENT":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "SEND_EMAIL":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";

    case "SEND_SMS":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";

    case "SEND_WHATSAPP":
      return "bg-green-50 text-green-700 border-green-200";

    case "HUMAN_ESCALATION":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "STOP":
      return "bg-slate-100 text-slate-700 border-slate-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export default function AgentPage() {
  const [cases, setCases] = useState<AgentCase[]>([]);
  const [stats, setStats] = useState<RecoveryStats | null>(null);

  const [loading, setLoading] = useState(true);

  const [runningTransactionId, setRunningTransactionId] =
    useState<string | null>(null);

  const [selectedCase, setSelectedCase] =
    useState<AgentCase | null>(null);

  const [runResult, setRunResult] =
    useState<AgentRunResult | null>(null);

  async function loadData() {
    try {
      setLoading(true);

      const [casesResponse, statsResponse] =
        await Promise.all([
          fetch("/api/agent/cases", {
            cache: "no-store",
          }),

          fetch("/api/dashboard/recovery", {
            cache: "no-store",
          }),
        ]);

      const casesData = await casesResponse.json();
      const statsData = await statsResponse.json();

      if (casesData.success) {
        setCases(casesData.cases);
      }

      if (statsData.success) {
        setStats(statsData.recovery);
      }
    } catch (error) {
      console.error("Failed to load agent data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /*
   * Run the complete ReviveAI pipeline:
   *
   * Detect
   * Diagnose
   * Predict
   * Strategy
   * Guardrails
   * Execute
   */
  async function runAgent(transactionId: string) {
    try {
      setRunningTransactionId(transactionId);
      setRunResult(null);

      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
        }),
      });

      const data: AgentRunResult = await response.json();

      setRunResult(data);

      if (!response.ok || !data.success) {
        console.error("Agent execution failed:", data);
        return;
      }

      /*
       * Refresh cases and recovery statistics
       * after the agent completes.
       */
      await loadData();
    } catch (error) {
      console.error("Agent execution error:", error);

      setRunResult({
        success: false,
        message: "Failed to run ReviveAI.",
      });
    } finally {
      setRunningTransactionId(null);
    }
  }

  const recoveredCases = cases.filter(
    (item) => item.status === "RECOVERED"
  ).length;

  const activeCases = cases.filter(
    (item) =>
      item.status === "IN_PROGRESS" ||
      item.status === "ACTION_REQUIRED"
  ).length;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-2.5 text-white">
                <Brain size={22} />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  ReviveAI Agent
                </h1>

                <p className="text-sm text-slate-500">
                  Autonomous Revenue Recovery Intelligence
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading || runningTransactionId !== null}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />

            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* =========================================================
            AGENT STATUS
        ========================================================= */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                  <Activity size={22} />
                </div>

                <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Agent operational
                </h2>

                <p className="text-sm text-slate-500">
                  Detection, diagnosis, prediction, strategy,
                  guardrails and execution are active.
                </p>
              </div>
            </div>

            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-slate-500">
                  Active cases
                </p>

                <p className="text-lg font-bold text-slate-900">
                  {activeCases}
                </p>
              </div>

              <div>
                <p className="text-slate-500">
                  Recovered cases
                </p>

                <p className="text-lg font-bold text-emerald-600">
                  {recoveredCases}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            RUN RESULT BANNER
        ========================================================= */}
        {runResult && (
          <section
            className={`mb-6 rounded-2xl border p-5 shadow-sm ${
              runResult.success
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3">
                {runResult.success ? (
                  <CheckCircle2
                    size={22}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                ) : (
                  <AlertTriangle
                    size={22}
                    className="mt-0.5 shrink-0 text-red-600"
                  />
                )}

                <div>
                  <h3
                    className={`font-semibold ${
                      runResult.success
                        ? "text-emerald-900"
                        : "text-red-900"
                    }`}
                  >
                    {runResult.success
                      ? "ReviveAI workflow completed"
                      : "ReviveAI workflow failed"}
                  </h3>

                  <p
                    className={`mt-1 text-sm ${
                      runResult.success
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    {runResult.message ??
                      "Agent execution finished."}
                  </p>

                  {runResult.finalStatus && (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide">
                      Final status:{" "}
                      {runResult.finalStatus}
                    </p>
                  )}
                </div>
              </div>

              {runResult.stages?.execute?.execution
                ?.paymentLink && (
                <a
                  href={
                    runResult.stages.execute.execution
                      .paymentLink
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Open Payment Link
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
          </section>
        )}

        {/* =========================================================
            KPI CARDS
        ========================================================= */}
        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Revenue At Risk */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Revenue At Risk
              </p>

              <div className="rounded-lg bg-red-50 p-2 text-red-600">
                <AlertTriangle size={18} />
              </div>
            </div>

            <p className="text-2xl font-bold text-slate-900">
              {formatINR(stats?.revenueAtRisk ?? 0)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Failed + abandoned transaction value
            </p>
          </div>

          {/* Expected Recovery */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Expected Recovery
              </p>

              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Brain size={18} />
              </div>
            </div>

            <p className="text-2xl font-bold text-slate-900">
              {formatINR(stats?.expectedRecovery ?? 0)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Based on recovery predictions
            </p>
          </div>

          {/* Actually Recovered */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Actually Recovered
              </p>

              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <DollarSign size={18} />
              </div>
            </div>

            <p className="text-2xl font-bold text-emerald-600">
              {formatINR(stats?.actualRecovered ?? 0)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Confirmed through payment capture
            </p>
          </div>

          {/* Recovery Rate */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Recovery Rate
              </p>

              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <p className="text-2xl font-bold text-slate-900">
              {formatPercent(stats?.recoveryRate ?? 0)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Actual recovered / revenue at risk
            </p>
          </div>
        </section>

        {/* =========================================================
            SECONDARY STATS
        ========================================================= */}
        <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Zap size={16} />
              <span className="text-xs">
                Recovery Attempts
              </span>
            </div>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {stats?.recoveryAttempts ?? 0}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 size={16} />
              <span className="text-xs">
                Successful Recoveries
              </span>
            </div>

            <p className="mt-2 text-xl font-bold text-emerald-600">
              {stats?.successfulRecoveries ?? 0}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck size={16} />
              <span className="text-xs">
                Stopped Cases
              </span>
            </div>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {stats?.stoppedCases ?? 0}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <UserRound size={16} />
              <span className="text-xs">
                Human Escalations
              </span>
            </div>

            <p className="mt-2 text-xl font-bold text-amber-600">
              {stats?.humanEscalations ?? 0}
            </p>
          </div>
        </section>

        {/* =========================================================
            AGENT PIPELINE
        ========================================================= */}
        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Agent Decision Pipeline
            </h2>

            <p className="text-sm text-slate-500">
              Every recovery decision passes through bounded
              stages before execution.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {[
              ["01", "Detect", AlertTriangle],
              ["02", "Diagnose", Brain],
              ["03", "Predict", Activity],
              ["04", "Strategy", Zap],
              ["05", "Guardrails", ShieldCheck],
              ["06", "Execute", ArrowRight],
            ].map(([number, label, Icon]) => {
              const PipelineIcon = Icon as typeof Brain;

              return (
                <div
                  key={String(number)}
                  className="relative rounded-xl border bg-slate-50 p-4 text-center"
                >
                  <div className="mx-auto mb-2 w-fit rounded-lg bg-white p-2 shadow-sm">
                    <PipelineIcon
                      size={18}
                      className="text-slate-700"
                    />
                  </div>

                  <p className="text-xs font-medium text-slate-400">
                    {String(number)}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {String(label)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            RECOVERY CASES
        ========================================================= */}
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Recovery Cases
              </h2>

              <p className="text-sm text-slate-500">
                Live decisions generated by ReviveAI.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {cases.length} cases
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <RefreshCw
                size={20}
                className="mr-2 animate-spin"
              />
              Loading agent cases...
            </div>
          ) : cases.length === 0 ? (
            <div className="py-20 text-center">
              <Brain
                size={32}
                className="mx-auto mb-3 text-slate-300"
              />

              <p className="font-medium text-slate-700">
                No recovery cases yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Run ReviveAI on an at-risk transaction.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {cases.map((item) => {
                const isRunning =
                  runningTransactionId ===
                  item.transaction.id;

                const canRunAgent =
                  item.transaction.status === "FAILED" ||
                  item.transaction.status === "ABANDONED";

                return (
                  <div
                    key={item.id}
                    className="px-6 py-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      {/* Case information */}
                      <button
                        onClick={() =>
                          setSelectedCase(item)
                        }
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {item.transaction.externalId}
                          </span>

                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getRiskClass(
                              item.transaction.riskLevel
                            )}`}
                          >
                            {item.transaction.riskLevel ??
                              "UNKNOWN"}
                          </span>

                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-slate-700">
                          {item.diagnosis ??
                            "Diagnosis pending"}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>
                            Customer:{" "}
                            {item.transaction.customer.name}
                          </span>

                          <span>
                            Amount:{" "}
                            {formatINR(
                              item.transaction.amount
                            )}
                          </span>

                          <span>
                            Attempts: {item.attempts}
                          </span>
                        </div>
                      </button>

                      {/* Metrics */}
                      <div className="flex flex-wrap items-center gap-6">
                        <div>
                          <p className="text-xs text-slate-500">
                            Recovery probability
                          </p>

                          <p className="font-bold text-slate-900">
                            {item.predictedProbability !==
                            null
                              ? formatPercent(
                                  item.predictedProbability *
                                    100
                                )
                              : "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Expected
                          </p>

                          <p className="font-bold text-slate-900">
                            {formatINR(
                              item.expectedRecovery ?? 0
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Action
                          </p>

                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getActionClass(
                              item.recommendedAction
                            )}`}
                          >
                            {formatAction(
                              item.recommendedAction
                            )}
                          </span>
                        </div>

                        {/* Run Agent */}
                        <button
                          onClick={() => runAgent(item.transaction.id)}
                          disabled={
                            runningTransactionId !== null ||
                            !canRunAgent
                          }
                          className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isRunning ? (
                            <>
                              <RefreshCw
                                size={14}
                                className="animate-spin"
                              />
                              Running...
                            </>
                          ) : !canRunAgent ? (
                            <>
                              <CheckCircle2 size={14} />
                              Recovered
                            </>
                          ) : (
                            <>
                              <Play size={14} />
                              Run Agent
                            </>
                          )}
                        </button>

                        <button
                          onClick={() =>
                            setSelectedCase(item)
                          }
                          className="rounded-lg border p-2 text-slate-500 hover:bg-white hover:text-slate-900"
                          title="View agent trace"
                        >
                          <ArrowRight size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* =========================================================
          DETAIL MODAL
      ========================================================= */}
      {selectedCase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setSelectedCase(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal header */}
            <div className="flex items-start justify-between border-b p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm text-slate-500">
                    {selectedCase.transaction.externalId}
                  </p>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getRiskClass(
                      selectedCase.transaction.riskLevel
                    )}`}
                  >
                    {selectedCase.transaction.riskLevel ??
                      "UNKNOWN"}
                  </span>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusClass(
                      selectedCase.status
                    )}`}
                  >
                    {selectedCase.status}
                  </span>
                </div>

                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  Agent Decision Trace
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Complete reasoning and recovery history.
                </p>
              </div>

              <button
                onClick={() => setSelectedCase(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
                title="Close"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Transaction + decision */}
            <div className="grid gap-6 p-6 md:grid-cols-2">
              {/* Transaction */}
              <div className="rounded-xl border p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UserRound
                    size={18}
                    className="text-slate-500"
                  />

                  <h3 className="font-semibold text-slate-900">
                    Transaction
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Amount
                    </span>

                    <span className="font-semibold text-slate-900">
                      {formatINR(
                        selectedCase.transaction.amount
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Status
                    </span>

                    <span className="font-semibold">
                      {selectedCase.transaction.status}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Risk
                    </span>

                    <span className="font-semibold">
                      {selectedCase.transaction.riskLevel ??
                        "—"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Customer
                    </span>

                    <span className="font-semibold">
                      {selectedCase.transaction.customer.name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Email
                    </span>

                    <span className="max-w-[220px] truncate font-semibold">
                      {selectedCase.transaction.customer.email}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Segment
                    </span>

                    <span className="font-semibold">
                      {selectedCase.transaction.customer
                        .customerSegment ?? "—"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Customer LTV
                    </span>

                    <span className="font-semibold">
                      {formatINR(
                        selectedCase.transaction.customer
                          .lifetimeValue
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current decision */}
              <div className="rounded-xl border p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Brain
                    size={18}
                    className="text-slate-500"
                  />

                  <h3 className="font-semibold text-slate-900">
                    Current Decision
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Diagnosis
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {selectedCase.diagnosis ??
                        "Pending"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Recommended Action
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getActionClass(
                        selectedCase.recommendedAction
                      )}`}
                    >
                      {formatAction(
                        selectedCase.recommendedAction
                      )}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Recovery Probability
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {selectedCase.predictedProbability !==
                      null
                        ? formatPercent(
                            selectedCase.predictedProbability *
                              100
                          )
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Expected Recovery
                    </p>

                    <p className="mt-1 text-xl font-bold text-blue-600">
                      {formatINR(
                        selectedCase.expectedRecovery ?? 0
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Actual Recovery
                    </p>

                    <p className="mt-1 text-xl font-bold text-emerald-700">
                      {formatINR(
                        selectedCase.actualRecovery
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* =====================================================
                AGENT REASONING
            ===================================================== */}
            <div className="border-t p-6">
              <div className="mb-4 flex items-center gap-2">
                <Brain
                  size={18}
                  className="text-slate-500"
                />

                <h3 className="font-semibold text-slate-900">
                  Agent Reasoning
                </h3>
              </div>

              <div className="space-y-3">
                {selectedCase.decisions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No decisions recorded yet.
                  </p>
                ) : (
                  selectedCase.decisions.map(
                    (decision) => (
                      <div
                        key={decision.id}
                        className="rounded-xl border bg-slate-50 p-4"
                      >
                        <div className="flex flex-col justify-between gap-3 md:flex-row">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">
                                {formatAction(
                                  decision.decision
                                )}
                              </p>

                              {decision.confidence !==
                                null && (
                                <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500">
                                  Confidence{" "}
                                  {formatPercent(
                                    decision.confidence *
                                      100
                                  )}
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {decision.reasoning}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                            <Clock size={13} />

                            {formatDate(
                              decision.createdAt
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>

            {/* =====================================================
                RECOVERY ACTIONS
            ===================================================== */}
            <div className="border-t p-6">
              <div className="mb-4 flex items-center gap-2">
                <Zap
                  size={18}
                  className="text-slate-500"
                />

                <h3 className="font-semibold text-slate-900">
                  Recovery Actions
                </h3>
              </div>

              <div className="space-y-3">
                {selectedCase.actions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No actions recorded yet.
                  </p>
                ) : (
                  selectedCase.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border p-4 md:flex-row md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {formatAction(action.type)}
                          </p>

                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusClass(
                              action.status
                            )}`}
                          >
                            {action.status}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {action.reason}
                        </p>

                        {action.expectedValue !==
                          null && (
                          <p className="mt-2 text-xs text-slate-400">
                            Expected value:{" "}
                            {formatINR(
                              action.expectedValue
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-4 text-left md:text-right">
                        {action.amount !== null && (
                          <div>
                            <p className="text-xs text-slate-500">
                              Amount
                            </p>

                            <p className="font-semibold text-slate-800">
                              {formatINR(action.amount)}
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="text-xs text-slate-500">
                            Created
                          </p>

                          <p className="font-medium text-slate-700">
                            {formatDate(
                              action.createdAt
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* =====================================================
                RUN AGAIN
            ===================================================== */}
            <div className="border-t p-6">
              <div className="flex flex-col justify-between gap-4 rounded-xl border bg-slate-50 p-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold text-slate-900">
                    Run ReviveAI again
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    The agent will re-evaluate the transaction
                    through every bounded stage.
                  </p>
                </div>
                


                <button
                  onClick={() => {
                    setSelectedCase(null);
                    runAgent(
                      selectedCase.transaction.id
                    );
                  }}
                  disabled={
                    runningTransactionId !== null ||
                    !(
                      selectedCase.transaction.status === "FAILED" ||
                      selectedCase.transaction.status === "ABANDONED"
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {runningTransactionId ===
                  selectedCase.transaction.id ? (
                    <>
                      <RefreshCw
                        size={15}
                        className="animate-spin"
                      />
                      Running...
                    </>
                  ) : selectedCase.transaction.status === "SUCCESS" ? (
                    <>
                      <CheckCircle2 size={15} />
                      Recovered
                    </>
                  ) : (
                    <>
                      <Play size={15} />
                      Run Agent
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* =====================================================
                FOOTER
            ===================================================== */}
            <div className="flex items-center gap-2 border-t bg-slate-50 px-6 py-4 text-xs text-slate-500">
              <ShieldCheck size={15} />

              All agent decisions and recovery actions are
              recorded for auditability.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}