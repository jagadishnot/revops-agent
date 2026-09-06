"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  Search,
  RefreshCw,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  XCircle,
  Brain,
  ChevronRight,
  X,
} from "lucide-react";


/* ==========================================================
   TYPES
========================================================== */

type Transaction = {
  id: string;

  externalId: string;

  amount: number;

  currency: string;

  status: string;

  failureReason: string | null;

  paymentMethod: string | null;

  retryCount: number;

  abandoned: boolean;

  recoveryProbability: number | null;

  revenueAtRisk: number;

  initialRevenueAtRisk: number;

  riskLevel: string | null;

  createdAt: string;

  customer: {
    id: string;

    name: string;

    email: string;

    segment: string;
  };

  recoveryCase?: {
    id: string;

    status: string;

    recommendedAction: string | null;

    expectedRecovery: number | null;

    actualRecovery: number | null;
  } | null;
};


/* ==========================================================
   PAGE
========================================================== */

function TransactionsPageContent() {

  const searchParams =
    useSearchParams();


  /* ========================================================
     CUSTOMER FILTER FROM URL
  ======================================================== */

  const customerId =
    searchParams.get(
      "customerId"
    );


  /* ========================================================
     STATE
  ======================================================== */

  const [
    transactions,
    setTransactions,
  ] = useState<Transaction[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");


  const [
    riskFilter,
    setRiskFilter,
  ] = useState("ALL");


  /* ========================================================
     LOAD TRANSACTIONS
  ======================================================== */

  async function loadTransactions() {

    try {

      setLoading(true);

      setError("");


      /* ------------------------------------------------------
         BUILD API URL
      ------------------------------------------------------ */

      const url = customerId
        ? `/api/transactions?limit=100&customerId=${encodeURIComponent(
            customerId
          )}`
        : "/api/transactions?limit=100";


      const response =
        await fetch(
          url,
          {
            cache: "no-store",
          }
        );


      if (!response.ok) {

        throw new Error(
          "Failed to fetch transactions"
        );
      }


      const data =
        await response.json();


      setTransactions(
        data.transactions || []
      );


    } catch (err) {

      console.error(
        "Transaction page error:",
        err
      );


      setError(
        "Unable to load transactions."
      );


    } finally {

      setLoading(false);
    }
  }


  /* ========================================================
     LOAD WHEN CUSTOMER FILTER CHANGES
  ======================================================== */

  useEffect(() => {

    loadTransactions();

  }, [customerId]);


  /* ========================================================
     CLIENT-SIDE FILTERING
  ======================================================== */

  const filteredTransactions =
    useMemo(() => {

      return transactions.filter(
        (transaction) => {

          const searchValue =
            search
              .toLowerCase()
              .trim();


          /* ------------------------------------------------
             SEARCH
          ------------------------------------------------ */

          const matchesSearch =
            !searchValue ||

            transaction.externalId
              .toLowerCase()
              .includes(
                searchValue
              ) ||

            transaction.customer.name
              .toLowerCase()
              .includes(
                searchValue
              ) ||

            transaction.customer.email
              .toLowerCase()
              .includes(
                searchValue
              );


          /* ------------------------------------------------
             STATUS
          ------------------------------------------------ */

          const matchesStatus =
            statusFilter === "ALL" ||
            transaction.status ===
              statusFilter;


          /* ------------------------------------------------
             RISK
          ------------------------------------------------ */

          const matchesRisk =
            riskFilter === "ALL" ||
            transaction.riskLevel ===
              riskFilter;


          return (
            matchesSearch &&
            matchesStatus &&
            matchesRisk
          );
        }
      );

    }, [
      transactions,
      search,
      statusFilter,
      riskFilter,
    ]);


  /* ========================================================
     METRICS
  ======================================================== */

  const totalAmount =
    transactions.reduce(
      (
        sum,
        transaction
      ) =>
        sum +
        transaction.amount,

      0
    );


  const atRisk =
    transactions.reduce(
      (
        sum,
        transaction
      ) =>
        sum +
        transaction.revenueAtRisk,

      0
    );


  const failedCount =
    transactions.filter(
      (transaction) =>
        transaction.status ===
        "FAILED"
    ).length;


  const abandonedCount =
    transactions.filter(
      (transaction) =>
        transaction.status ===
        "ABANDONED"
    ).length;


  const highRiskCount =
    transactions.filter(
      (transaction) =>
        transaction.riskLevel ===
          "HIGH" ||

        transaction.riskLevel ===
          "CRITICAL"
    ).length;


  const recoveredCount =
    transactions.filter(
      (transaction) =>
        transaction.recoveryCase
          ?.actualRecovery &&
        transaction.recoveryCase
          .actualRecovery > 0
    ).length;


  /* ========================================================
     CLEAR CUSTOMER FILTER
  ======================================================== */

  function clearCustomerFilter() {

    window.location.href =
      "/transactions";
  }


  /* ========================================================
     UI
  ======================================================== */

  return (

    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">


      {/* ======================================================
         HEADER
      ====================================================== */}

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">


        <div className="flex items-center gap-4">


          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-200 p-2 transition hover:bg-slate-50"
          >

            <ArrowLeft
              size={17}
            />

          </Link>


          <div>

            <h1 className="text-lg font-semibold">
              Transactions
            </h1>


            <p className="text-xs text-slate-500">
              Revenue risk and payment intelligence
            </p>

          </div>

        </div>


        <button
          onClick={
            loadTransactions
          }
          disabled={loading}
          title="Refresh transactions"
          className="rounded-lg border border-slate-200 p-2 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >

          <RefreshCw
            size={17}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

        </button>

      </header>


      {/* ======================================================
         MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl p-6">


        {/* ====================================================
           TITLE
        ==================================================== */}

        <div className="mb-6">


          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">

            <span>
              Revenue Operations
            </span>

            <span>
              /
            </span>

            <span className="text-slate-900">
              Transactions
            </span>

          </div>


          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">

            <div>

              <h2 className="text-3xl font-bold tracking-tight">
                Transaction Intelligence
              </h2>


              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Monitor payment outcomes, identify revenue
                at risk, and launch AI-powered recovery.
              </p>

            </div>


            {/* CUSTOMER FILTER */}

            {customerId && (

              <button
                onClick={
                  clearCustomerFilter
                }
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >

                <Filter
                  size={13}
                />

                Customer Filter Active

                <X
                  size={13}
                />

              </button>

            )}

          </div>

        </div>


        {/* ====================================================
           ERROR
        ==================================================== */}

        {error && (

          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <AlertTriangle
              size={18}
            />

            <span>
              {error}
            </span>

          </div>

        )}


        {/* ====================================================
           KPI CARDS
        ==================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">


          <MetricCard
            title="Transactions"
            value={transactions.length.toLocaleString(
              "en-IN"
            )}
            description={
              customerId
                ? "For selected customer"
                : "Latest 100 records"
            }
            icon={
              <Clock3
                size={18}
              />
            }
          />


          <MetricCard
            title="Transaction Value"
            value={formatCurrency(
              totalAmount
            )}
            description="Total transaction value"
            icon={
              <CheckCircle2
                size={18}
              />
            }
          />


          <MetricCard
            title="Current Revenue At Risk"
            value={formatCurrency(
              atRisk
            )}
            description="Unresolved exposure"
            icon={
              <AlertTriangle
                size={18}
              />
            }
          />


          <MetricCard
            title="High / Critical"
            value={highRiskCount.toLocaleString(
              "en-IN"
            )}
            description="High-risk transactions"
            icon={
              <Brain
                size={18}
              />
            }
          />


          <MetricCard
            title="Recovered"
            value={recoveredCount.toLocaleString(
              "en-IN"
            )}
            description={`${failedCount} failed · ${abandonedCount} abandoned`}
            icon={
              <CheckCircle2
                size={18}
              />
            }
          />

        </div>


        {/* ====================================================
           FILTER BAR
        ==================================================== */}

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">


          <div className="flex flex-col gap-3 lg:flex-row">


            {/* SEARCH */}

            <div className="relative flex-1">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />


              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search transaction, customer or email..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />

            </div>


            {/* STATUS */}

            <div className="flex items-center gap-2">

              <Filter
                size={15}
                className="text-slate-400"
              />


              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
              >

                <option value="ALL">
                  All Status
                </option>

                <option value="SUCCESS">
                  Success
                </option>

                <option value="FAILED">
                  Failed
                </option>

                <option value="ABANDONED">
                  Abandoned
                </option>

                <option value="EXPIRED">
                  Expired
                </option>

              </select>

            </div>


            {/* RISK */}

            <select
              value={
                riskFilter
              }
              onChange={(event) =>
                setRiskFilter(
                  event.target.value
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            >

              <option value="ALL">
                All Risk
              </option>

              <option value="CRITICAL">
                Critical
              </option>

              <option value="HIGH">
                High
              </option>

              <option value="MEDIUM">
                Medium
              </option>

              <option value="LOW">
                Low
              </option>

            </select>

          </div>

        </div>


        {/* ====================================================
           RESULTS BAR
        ==================================================== */}

        <div className="mb-3 flex items-center justify-between">

          <p className="text-xs text-slate-500">

            Showing{" "}

            <span className="font-semibold text-slate-900">

              {
                filteredTransactions.length
              }

            </span>{" "}

            transactions

          </p>


          <p className="text-xs text-slate-400">

            {customerId
              ? "Customer filtered"
              : "Latest 100 records"}

          </p>

        </div>


        {/* ====================================================
           TABLE
        ==================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">


          {loading ? (

            <div className="flex h-72 items-center justify-center">

              <div className="flex items-center gap-2 text-sm text-slate-500">

                <RefreshCw
                  size={17}
                  className="animate-spin"
                />

                Loading transactions...

              </div>

            </div>

          ) : filteredTransactions.length === 0 ? (

            <div className="flex h-72 flex-col items-center justify-center text-center">

              <Search
                size={30}
                className="text-slate-300"
              />


              <p className="mt-3 text-sm font-medium">
                No transactions found
              </p>


              <p className="mt-1 text-xs text-slate-400">
                Try changing your search or filters.
              </p>


              {customerId && (

                <button
                  onClick={
                    clearCustomerFilter
                  }
                  className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  View All Transactions
                </button>

              )}

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1150px]">


                {/* TABLE HEADER */}

                <thead>

                  <tr className="border-b border-slate-200 bg-slate-50">


                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Transaction
                    </th>


                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>


                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>


                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>


                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Risk
                    </th>


                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Revenue At Risk
                    </th>


                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Recovery
                    </th>


                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>

                  </tr>

                </thead>


                {/* TABLE BODY */}

                <tbody className="divide-y divide-slate-100">

                  {filteredTransactions.map(
                    (
                      transaction
                    ) => (

                      <TransactionRow
                        key={
                          transaction.id
                        }
                        transaction={
                          transaction
                        }
                      />

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </main>

    </div>
  );
}


/* ==========================================================
   METRIC CARD
========================================================== */

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
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


      <p className="mt-3 text-2xl font-bold tracking-tight">
        {value}
      </p>


      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}


/* ==========================================================
   TRANSACTION ROW
========================================================== */

function TransactionRow({
  transaction,
}: {
  transaction: Transaction;
}) {

  const isRecoverable =
    transaction.status ===
      "FAILED" ||

    transaction.status ===
      "ABANDONED";


  const actualRecovery =
    transaction.recoveryCase
      ?.actualRecovery ?? 0;


  const recovered =
    actualRecovery > 0;


  return (

    <tr className="transition hover:bg-slate-50">


      {/* TRANSACTION */}

      <td className="px-5 py-4">

        <div>

          <p className="font-mono text-xs font-semibold">
            {transaction.externalId}
          </p>


          <p className="mt-1 text-[10px] text-slate-400">

            {new Date(
              transaction.createdAt
            ).toLocaleString(
              "en-IN"
            )}

          </p>

        </div>

      </td>


      {/* CUSTOMER */}

      <td className="px-5 py-4">

        <div>

          <p className="text-sm font-medium">
            {transaction.customer.name}
          </p>


          <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
            {transaction.customer.email}
          </p>

        </div>

      </td>


      {/* AMOUNT */}

      <td className="px-5 py-4">

        <p className="text-sm font-semibold">
          {formatCurrency(
            transaction.amount
          )}
        </p>


        <p className="mt-1 text-[10px] uppercase text-slate-400">
          {transaction.paymentMethod ||
            "Unknown"}
        </p>

      </td>


      {/* STATUS */}

      <td className="px-5 py-4">

        <StatusBadge
          status={
            transaction.status
          }
        />

      </td>


      {/* RISK */}

      <td className="px-5 py-4">

        <RiskBadge
          risk={
            transaction.riskLevel
          }
        />

      </td>


      {/* REVENUE AT RISK */}

      <td className="px-5 py-4">

        {transaction.revenueAtRisk >
        0 ? (

          <div>

            <p className="text-sm font-semibold">
              {formatCurrency(
                transaction.revenueAtRisk
              )}
            </p>


            <p className="mt-1 text-[10px] text-slate-400">
              Current exposure
            </p>

          </div>

        ) : recovered ? (

          <div className="flex items-center gap-1 text-xs font-semibold text-green-600">

            <CheckCircle2
              size={13}
            />

            Recovered

          </div>

        ) : (

          <span className="text-xs text-slate-400">
            —
          </span>

        )}

      </td>


      {/* RECOVERY */}

      <td className="px-5 py-4">

        {recovered ? (

          <div>

            <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
              RECOVERED
            </span>


            <p className="mt-1 text-[10px] text-slate-400">
              {formatCurrency(
                actualRecovery
              )}
            </p>

          </div>

        ) : transaction.recoveryCase ? (

          <div>

            <p className="text-xs font-semibold">
              {transaction
                .recoveryCase
                .recommendedAction ||
                "Evaluating"}
            </p>


            {transaction
              .recoveryCase
              .expectedRecovery !=
              null && (

              <p className="mt-1 text-[10px] text-slate-400">

                Expected{" "}

                {formatCurrency(
                  transaction
                    .recoveryCase
                    .expectedRecovery
                )}

              </p>

            )}

          </div>

        ) : (

          <span className="text-xs text-slate-400">
            Not evaluated
          </span>

        )}

      </td>


      {/* ACTION */}

      <td className="px-5 py-4 text-right">

        {isRecoverable ? (

          <Link
            href={`/agent?transactionId=${encodeURIComponent(
              transaction.id
            )}`}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
          >

            <Brain
              size={13}
            />

            Analyze

            <ChevronRight
              size={13}
            />

          </Link>

        ) : (

          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-400">

            <CheckCircle2
              size={13}
            />

            Completed

          </span>

        )}

      </td>

    </tr>
  );
}


/* ==========================================================
   STATUS BADGE
========================================================== */

function StatusBadge({
  status,
}: {
  status: string;
}) {

  const config: Record<
    string,
    {
      label: string;
      className: string;
      icon: React.ReactNode;
    }
  > = {

    SUCCESS: {
      label: "SUCCESS",
      className:
        "bg-green-50 text-green-700",
      icon: (
        <CheckCircle2
          size={12}
        />
      ),
    },


    FAILED: {
      label: "FAILED",
      className:
        "bg-red-50 text-red-700",
      icon: (
        <XCircle
          size={12}
        />
      ),
    },


    ABANDONED: {
      label: "ABANDONED",
      className:
        "bg-amber-50 text-amber-700",
      icon: (
        <AlertTriangle
          size={12}
        />
      ),
    },


    EXPIRED: {
      label: "EXPIRED",
      className:
        "bg-slate-100 text-slate-600",
      icon: (
        <Clock3
          size={12}
        />
      ),
    },

  };


  const item =
    config[status] || {
      label: status,
      className:
        "bg-slate-100 text-slate-600",
      icon: null,
    };


  return (

    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${item.className}`}
    >

      {item.icon}

      {item.label}

    </span>
  );
}


/* ==========================================================
   RISK BADGE
========================================================== */

function RiskBadge({
  risk,
}: {
  risk: string | null;
}) {

  if (!risk) {

    return (

      <span className="text-xs text-slate-400">
        —
      </span>

    );
  }


  const config: Record<
    string,
    string
  > = {

    CRITICAL:
      "bg-red-100 text-red-700",

    HIGH:
      "bg-orange-50 text-orange-700",

    MEDIUM:
      "bg-amber-50 text-amber-700",

    LOW:
      "bg-green-50 text-green-700",

  };


  return (

    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
        config[risk] ||
        "bg-slate-100 text-slate-600"
      }`}
    >

      {risk}

    </span>

  );
}


/* ==========================================================
   CURRENCY
========================================================== */

function formatCurrency(
  value: number
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


/* ==========================================================
   PRODUCTION SUSPENSE BOUNDARY
   Next.js 16 requires useSearchParams() to be rendered
   inside a Suspense boundary during production builds.
========================================================== */

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-sm text-slate-500">
          Loading transactions...
        </div>
      }
    >
      <TransactionsPageContent />
    </Suspense>
  );
}
