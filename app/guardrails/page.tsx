"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type GuardrailPolicy = {
  id: string;
  name: string;
  maxRetries: number;
  maxIncentivePercent: number;
  maxAutoRecovery: number;
  maxCustomerContacts: number;
  recoveryWindowHours: number;
  requireHumanAbove: number;
  enabled: boolean;
  updatedAt: string;
};

export default function GuardrailsPage() {
  const [policy, setPolicy] = useState<GuardrailPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPolicy() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/agent/guardrails", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load guardrail policy");
      }

      const data = await response.json();

      if (data.policy) {
        setPolicy(data.policy);
      } else {
        throw new Error("Guardrail policy not found");
      }
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load guardrail policy. Please refresh the page."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicy();
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      {/* HEADER */}
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
              Guardrails
            </h1>

            <p className="text-xs text-slate-500">
              Autonomous recovery safety controls
            </p>
          </div>
        </div>

        <button
          onClick={loadPolicy}
          disabled={loading}
          className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        {/* PAGE INTRO */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <span>Controls</span>
            <span>/</span>
            <span className="text-slate-900">
              Guardrails
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">
            Recovery Guardrails
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Merchant-defined limits that keep autonomous
            recovery decisions safe, controlled, and auditable.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* STATUS */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <ShieldCheck size={22} />
              </div>

              <div>
                <h3 className="font-semibold">
                  Autonomous Recovery Protection
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Every automated recovery action is evaluated
                  against these policies.
                </p>
              </div>
            </div>

            {policy?.enabled ? (
              <span className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                <CheckCircle2 size={14} />
                ACTIVE
              </span>
            ) : (
              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                DISABLED
              </span>
            )}
          </div>
        </div>

        {/* POLICY */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <RefreshCw
                size={17}
                className="animate-spin"
              />
              Loading guardrails...
            </div>
          </div>
        ) : policy ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PolicyCard
                title="Maximum Retries"
                value={`${policy.maxRetries}`}
                description="Attempts per transaction"
              />

              <PolicyCard
                title="Maximum Incentive"
                value={`${policy.maxIncentivePercent}%`}
                description="Maximum customer incentive"
              />

              <PolicyCard
                title="Maximum Auto Recovery"
                value={formatCurrency(
                  policy.maxAutoRecovery
                )}
                description="Maximum automated recovery amount"
              />

              <PolicyCard
                title="Customer Contacts"
                value={`${policy.maxCustomerContacts}`}
                description="Maximum recovery contacts"
              />

              <PolicyCard
                title="Recovery Window"
                value={`${policy.recoveryWindowHours}h`}
                description="Maximum recovery window"
              />

              <PolicyCard
                title="Human Approval"
                value={formatCurrency(
                  policy.requireHumanAbove
                )}
                description="Escalation threshold"
              />
            </div>

            {/* POLICY EXPLANATION */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Clock3 size={19} />
                <h3 className="font-semibold">
                  How Guardrails Protect Revenue Recovery
                </h3>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Info
                  title="Prevent Over-Retrying"
                  text={`The agent stops after ${policy.maxRetries} retry attempts.`}
                />

                <Info
                  title="Protect Customers"
                  text={`Customer recovery contact is limited to ${policy.maxCustomerContacts} interactions.`}
                />

                <Info
                  title="Escalate High Value"
                  text={`Transactions above ${formatCurrency(
                    policy.requireHumanAbove
                  )} require human oversight.`}
                />
              </div>
            </div>

            <p className="mt-5 text-xs text-slate-400">
              Last updated:{" "}
              {new Date(policy.updatedAt).toLocaleString(
                "en-IN"
              )}
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}

function PolicyCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

function Info({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-semibold">{title}</p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}