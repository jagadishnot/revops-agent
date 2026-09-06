"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Brain,
  Zap,
  Clock,
  FileText,
} from "lucide-react";

type AuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  details: unknown;
  createdAt: string;
};

type EventType = {
  label: string;
  bg: string;
  badge: string;
  icon: React.ReactNode;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAuditLogs() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/audit?limit=100", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load audit logs");
      }

      const data: unknown = await response.json();

      /*
       * The API response is intentionally treated as unknown.
       * We normalize it before putting it into React state so that
       * TypeScript never allows unknown values into rendered JSX.
       */
      if (
        typeof data === "object" &&
        data !== null &&
        "logs" in data
      ) {
        const rawLogs = (data as { logs?: unknown }).logs;

        if (Array.isArray(rawLogs)) {
          const auditLogs: AuditLog[] = rawLogs.map(
            (log: unknown) => normalizeAuditLog(log)
          );

          setLogs(auditLogs);
        } else {
          setLogs([]);
        }
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error("Audit loading error:", err);

      setError(
        "Unable to load audit trail. Please refresh the page."
      );

      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const recoveredCount = logs.filter(
    (log) =>
      log.action === "REVENUE_RECOVERED" ||
      log.action.includes("RECOVERED")
  ).length;

  const guardrailCount = logs.filter(
    (log) => log.action.startsWith("GUARDRAIL_")
  ).length;

  const agentCount = logs.filter(
    (log) => log.actor.includes("REVIVEAI")
  ).length;

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
          </Link>

          <div>
            <h1 className="text-lg font-semibold">
              Audit Trail
            </h1>

            <p className="text-xs text-slate-500">
              AI decisions, actions and recovery events
            </p>
          </div>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={loading}
          aria-label="Refresh audit trail"
          className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}
      <main className="mx-auto max-w-7xl p-6">
        {/* PAGE TITLE */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <span>Operations</span>
            <span>/</span>

            <span className="text-slate-900">
              Audit Trail
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">
            Agent Audit Trail
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Complete record of autonomous recovery
            decisions, guardrail checks and execution events.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle size={18} />

            <span>{error}</span>
          </div>
        )}

        {/* ===================================================
            KPI CARDS
        =================================================== */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            icon={<FileText size={19} />}
            title="Audit Events"
            value={String(logs.length)}
            description="Recorded events"
          />

          <StatCard
            icon={<ShieldCheck size={19} />}
            title="Guardrail Checks"
            value={String(guardrailCount)}
            description="Safety decisions"
          />

          <StatCard
            icon={<CheckCircle2 size={19} />}
            title="Recovery Events"
            value={String(recoveredCount)}
            description="Successful recovery events"
          />
        </div>

        {/* ===================================================
            AGENT STATUS
        =================================================== */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Brain size={21} />
              </div>

              <div>
                <h3 className="font-semibold">
                  ReviveAI Decision Engine
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {agentCount} agent-generated events recorded
                </p>
              </div>
            </div>

            <span className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              AUDITING ACTIVE
            </span>
          </div>
        </div>

        {/* ===================================================
            AUDIT TABLE
        =================================================== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock size={17} />

              <h3 className="font-semibold">
                Recent Activity
              </h3>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <RefreshCw
                  size={17}
                  className="animate-spin"
                />

                <span>Loading audit trail...</span>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <FileText
                size={32}
                className="text-slate-300"
              />

              <p className="mt-3 text-sm font-medium">
                No audit events found
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Agent activity will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <AuditRow
                  key={log.id}
                  log={log}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ==========================================================
   NORMALIZE AUDIT LOG
========================================================== */

function normalizeAuditLog(
  value: unknown
): AuditLog {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return {
      id: "",
      entityType: "",
      entityId: "",
      action: "",
      actor: "",
      details: null,
      createdAt: "",
    };
  }

  const log = value as Record<string, unknown>;

  return {
    id: toSafeString(log.id),
    entityType: toSafeString(log.entityType),
    entityId: toSafeString(log.entityId),
    action: toSafeString(log.action),
    actor: toSafeString(log.actor),
    details: log.details ?? null,
    createdAt: toSafeString(log.createdAt),
  };
}

/* ==========================================================
   SAFE STRING
========================================================== */

function toSafeString(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/* ==========================================================
   STAT CARD
========================================================== */

function StatCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-2">
          {icon}
        </div>

        <p className="text-xs font-medium text-slate-500">
          {title}
        </p>
      </div>

      <p className="mt-3 text-2xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* ==========================================================
   AUDIT ROW
========================================================== */

function AuditRow({
  log,
}: {
  log: AuditLog;
}) {
  const type = getEventType(log.action);

  return (
    <div className="px-5 py-4 hover:bg-slate-50">
      <div className="flex items-start gap-4">
        {/* ICON */}
        <div
          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${type.bg}`}
        >
          {type.icon}
        </div>

        {/* CONTENT */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-2 md:flex-row">
            <div>
              <p className="text-sm font-semibold">
                {formatAction(log.action)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {log.actor}
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xs text-slate-500">
                {formatDate(log.createdAt)}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                {log.entityType}
              </p>
            </div>
          </div>

          {/* ENTITY */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500">
              {log.entityId}
            </span>

            <span
              className={`rounded-md px-2 py-1 text-[10px] font-semibold ${type.badge}`}
            >
              {type.label}
            </span>
          </div>

          {/* DETAILS */}
          {log.details !== null &&
            log.details !== undefined && (
              <Details details={log.details} />
            )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
   FORMAT DATE
========================================================== */

function formatDate(
  value: string
): string {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN");
}

/* ==========================================================
   DETAILS
========================================================== */

function Details({
  details,
}: {
  details: unknown;
}) {
  if (
    typeof details !== "object" ||
    details === null ||
    Array.isArray(details)
  ) {
    return null;
  }

  const data =
    details as Record<string, unknown>;

  const importantKeys = [
    "decision",
    "reason",
    "selectedAction",
    "recoveryProbability",
    "expectedRecovery",
    "amount",
    "triggeredRules",
  ];

  const entries = importantKeys
    .filter(
      (key) =>
        Object.prototype.hasOwnProperty.call(
          data,
          key
        ) &&
        data[key] !== undefined &&
        data[key] !== null
    )
    .slice(0, 6);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((key) => (
          <div key={key}>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {formatKey(key)}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-700">
              {formatDetailValue(
                key,
                data[key]
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================
   EVENT TYPE
========================================================== */

function getEventType(
  action: string
): EventType {
  if (
    action === "REVENUE_RECOVERED" ||
    action.includes("RECOVERED")
  ) {
    return {
      label: "RECOVERED",
      bg: "bg-green-50",
      badge: "bg-green-50 text-green-700",
      icon: (
        <CheckCircle2
          size={17}
          className="text-green-600"
        />
      ),
    };
  }

  if (action.startsWith("GUARDRAIL_")) {
    if (action.includes("BLOCK")) {
      return {
        label: "BLOCKED",
        bg: "bg-red-50",
        badge: "bg-red-50 text-red-700",
        icon: (
          <XCircle
            size={17}
            className="text-red-600"
          />
        ),
      };
    }

    if (action.includes("ESCALATE")) {
      return {
        label: "ESCALATED",
        bg: "bg-amber-50",
        badge: "bg-amber-50 text-amber-700",
        icon: (
          <AlertTriangle
            size={17}
            className="text-amber-600"
          />
        ),
      };
    }

    return {
      label: "GUARDRAIL",
      bg: "bg-blue-50",
      badge: "bg-blue-50 text-blue-700",
      icon: (
        <ShieldCheck
          size={17}
          className="text-blue-600"
        />
      ),
    };
  }

  if (
    action.includes("EXECUTE") ||
    action.includes("ACTION")
  ) {
    return {
      label: "ACTION",
      bg: "bg-purple-50",
      badge: "bg-purple-50 text-purple-700",
      icon: (
        <Zap
          size={17}
          className="text-purple-600"
        />
      ),
    };
  }

  return {
    label: "AGENT",
    bg: "bg-slate-100",
    badge: "bg-slate-100 text-slate-700",
    icon: (
      <Brain
        size={17}
        className="text-slate-600"
      />
    ),
  };
}

/* ==========================================================
   FORMAT ACTION
========================================================== */

function formatAction(
  action: string
): string {
  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase()
    );
}

/* ==========================================================
   FORMAT KEY
========================================================== */

function formatKey(
  key: string
): string {
  return key
    .replace(
      /([A-Z])/g,
      " $1"
    )
    .replaceAll("_", " ")
    .trim()
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase()
    );
}

/* ==========================================================
   FORMAT DETAIL VALUE
   IMPORTANT:
   Explicitly returns string so JSX never receives unknown.
========================================================== */

function formatDetailValue(
  key: string,
  value: unknown
): string {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        formatDetailValue(key, item)
      )
      .join(", ");
  }

  if (typeof value === "number") {
    if (
      key
        .toLowerCase()
        .includes("probability")
    ) {
      return `${(
        value * 100
      ).toFixed(1)}%`;
    }

    if (
      key
        .toLowerCase()
        .includes("amount") ||
      key
        .toLowerCase()
        .includes("recovery")
    ) {
      return new Intl.NumberFormat(
        "en-IN",
        {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }
      ).format(value);
    }

    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}