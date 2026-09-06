"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================
// TYPES
// ============================================================

type Transaction = {
  id: string;
  externalId: string;
  amount: number;
  currency: string;
  status: string;
  failureReason: string | null;
  paymentMethod: string | null;
  retryCount: number;
  checkoutDuration: number | null;
  abandoned: boolean;
  recoveryProbability: number | null;
  revenueAtRisk: number;
  riskLevel: string | null;
  createdAt: string;

  customer: {
    id: string;
    externalId: string;
    name: string;
    email: string;
    lifetimeValue: number;
    failedPayments: number;
    successfulPayments: number;
    customerSegment: string | null;
    preferredMethod: string | null;
  };

  recoveryCase: {
    id: string;
    status: string;
    diagnosis: string | null;
    predictedProbability: number | null;
    recommendedAction: string | null;
    expectedRecovery: number | null;
    actualRecovery: number;
  } | null;
};

type ApiResponse = {
  success: boolean;
  count: number;
  transactions: Transaction[];
};

type DashboardStats = {
  success: boolean;

  overview: {
    totalTransactions: number;
    totalAmount: number;
    revenueAtRisk: number;
    recoverableRevenue: number;
    successRate: number;
  };

  status: {
    success: number;
    failed: number;
    abandoned: number;
    expired: number;
    pending: number;
  };

  risk: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  recovery: {
    recovered: number;
    recoveryRate: number;
    recoveryOpportunity: number;
  };
};

// ============================================================
// HELPERS
// ============================================================

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function riskClass(risk: string | null) {
  switch (risk) {
    case "CRITICAL":
      return "bg-red-50 text-red-700 border-red-200";

    case "HIGH":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "MEDIUM":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";

    default:
      return "bg-green-50 text-green-700 border-green-200";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "SUCCESS":
      return "bg-green-50 text-green-700";

    case "FAILED":
      return "bg-red-50 text-red-700";

    case "ABANDONED":
      return "bg-orange-50 text-orange-700";

    case "EXPIRED":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

// ============================================================
// COMPONENT
// ============================================================

export default function DashboardPage() {
  const pathname = usePathname();

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [riskFilter, setRiskFilter] = useState("ALL");

  const [statusFilter, setStatusFilter] = useState("ALL");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ==========================================================
  // FETCH DATA
  // ==========================================================

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [transactionsResponse, statsResponse] =
        await Promise.all([
          fetch("/api/transactions?limit=100", {
            cache: "no-store",
          }),

          fetch("/api/dashboard/stats", {
            cache: "no-store",
          }),
        ]);

      if (!transactionsResponse.ok) {
        throw new Error("Failed to fetch transactions");
      }

      if (!statsResponse.ok) {
        throw new Error("Failed to fetch dashboard statistics");
      }

      const transactionsData: ApiResponse =
        await transactionsResponse.json();

      const statsData: DashboardStats =
        await statsResponse.json();

      if (!transactionsData.success) {
        throw new Error(
          "Transaction API returned an error"
        );
      }

      if (!statsData.success) {
        throw new Error(
          "Dashboard stats API returned an error"
        );
      }

      setTransactions(
        transactionsData.transactions
      );

      setStats(statsData);
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError(
        "Unable to load dashboard data. Please try refreshing."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==========================================================
  // FILTER TRANSACTIONS
  // ==========================================================

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        transaction.externalId
          .toLowerCase()
          .includes(searchValue) ||
        transaction.customer.name
          .toLowerCase()
          .includes(searchValue) ||
        transaction.customer.email
          .toLowerCase()
          .includes(searchValue);

      const matchesRisk =
        riskFilter === "ALL" ||
        transaction.riskLevel === riskFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        transaction.status === statusFilter;

      return (
        matchesSearch &&
        matchesRisk &&
        matchesStatus
      );
    });
  }, [
    transactions,
    search,
    riskFilter,
    statusFilter,
  ]);

  // ==========================================================
  // REAL DATABASE CHART DATA
  // ==========================================================

  const riskData = [
    {
      name: "Critical",
      value: stats?.risk.critical ?? 0,
    },
    {
      name: "High",
      value: stats?.risk.high ?? 0,
    },
    {
      name: "Medium",
      value: stats?.risk.medium ?? 0,
    },
    {
      name: "Low",
      value: stats?.risk.low ?? 0,
    },
  ];

  const statusData = [
    {
      name: "Success",
      value: stats?.status.success ?? 0,
    },
    {
      name: "Failed",
      value: stats?.status.failed ?? 0,
    },
    {
      name: "Abandoned",
      value: stats?.status.abandoned ?? 0,
    },
    {
      name: "Expired",
      value: stats?.status.expired ?? 0,
    },
  ];

  const riskColors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
  ];

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      {/* ================================================== */}
      {/* MOBILE OVERLAY */}
      {/* ================================================== */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ================================================== */}
      {/* SIDEBAR */}
      {/* ================================================== */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          h-screen
          w-64
          border-r
          border-slate-200
          bg-white
          transition-transform
          lg:translate-x-0
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* LOGO */}

        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
              <Zap
                size={19}
                className="text-white"
              />
            </div>

            <div>
              <div className="text-lg font-bold">
                ReviveAI
              </div>

              <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                Revenue Intelligence
              </div>
            </div>
          </div>

          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}

        <nav className="p-4">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Command Center"
            href="/dashboard"
            active={pathname === "/dashboard"}
          />

          <NavItem
            icon={<CreditCard size={18} />}
            label="Transactions"
            href="/transactions"
            active={pathname.startsWith("/transactions")}
          />

          <NavItem
            icon={<RefreshCw size={18} />}
            label="Recovery"
            href="/recovery"
            active={pathname.startsWith("/recovery")}
          />

          <NavItem
            icon={<Users size={18} />}
            label="Customers"
            href="/customers"
            active={pathname.startsWith("/customers")}
          />

          <NavItem
            icon={<BrainCircuit size={18} />}
            label="AI Agent"
            href="/agent"
            active={pathname.startsWith("/agent")}
          />

          <div className="my-5 border-t border-slate-100" />

          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Controls
          </p>

          <NavItem
            icon={<ShieldCheck size={18} />}
            label="Guardrails"
            href="/guardrails"
            active={pathname.startsWith("/guardrails")}
          />

          <NavItem
            icon={<Clock3 size={18} />}
            label="Audit Trail"
            href="/audit"
            active={pathname.startsWith("/audit")}
          />
        </nav>

        {/* SYSTEM STATUS */}

        <div className="absolute bottom-0 w-full border-t border-slate-200 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />

              <span className="text-xs font-medium">
                System Operational
              </span>
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Razorpay Test Mode
            </p>
          </div>
        </div>
      </aside>

      {/* ================================================== */}
      {/* MAIN */}
      {/* ================================================== */}

      <main className="lg:ml-64">
        {/* HEADER */}

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <h1 className="text-lg font-semibold">
                Command Center
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Autonomous revenue recovery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
              <div className="h-2 w-2 rounded-full bg-green-500" />

              <span className="text-xs font-medium">
                Live
              </span>
            </div>

            <button
              onClick={loadDashboard}
              className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
              title="Refresh dashboard"
              disabled={loading}
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

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              JG
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {/* ================================================== */}
          {/* PAGE INTRO */}
          {/* ================================================== */}

          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                <span>Overview</span>

                <ChevronRight size={13} />

                <span className="text-slate-900">
                  Today
                </span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Revenue Recovery
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Detect lost revenue and prioritize
                the best recovery opportunities.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
              <Clock3 size={14} />

              <span>
                {loading
                  ? "Updating..."
                  : "Live database data"}
              </span>
            </div>
          </div>

          {/* ================================================== */}
          {/* ERROR */}
          {/* ================================================== */}

          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle size={18} />

              {error}
            </div>
          )}

          {/* ================================================== */}
          {/* KPI CARDS */}
          {/* ================================================== */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Revenue At Risk"
              value={formatCurrency(
                stats?.overview.revenueAtRisk ?? 0
              )}
              subtitle="across all transactions"
              icon={
                <CircleDollarSign size={20} />
              }
              trend={
                stats
                  ? `${formatPercent(
                      stats.overview.successRate
                    )} success`
                  : "Loading"
              }
              positive={false}
            />

            <MetricCard
              title="Recovery Opportunity"
              value={formatCurrency(
                stats?.recovery.recoveryOpportunity ?? 0
              )}
              subtitle="AI model not deployed yet"
              icon={
                <TrendingUp size={20} />
              }
              trend="Awaiting AI"
              positive={false}
            />

            <MetricCard
              title="Critical Cases"
              value={formatNumber(
                stats?.risk.critical ?? 0
              )}
              subtitle="need immediate attention"
              icon={
                <AlertTriangle size={20} />
              }
              trend="Priority"
              positive={false}
            />

            <MetricCard
              title="Transactions"
              value={formatNumber(
                stats?.overview.totalTransactions ?? 0
              )}
              subtitle="from database"
              icon={
                <CreditCard size={20} />
              }
              trend={`${formatNumber(
                stats?.status.failed ?? 0
              )} failed`}
              positive={false}
            />
          </div>

          {/* ================================================== */}
          {/* DATABASE OVERVIEW */}
          {/* ================================================== */}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MiniInfo
              title="Total Transaction Value"
              value={formatCurrency(
                stats?.overview.totalAmount ?? 0
              )}
            />

            <MiniInfo
              title="Recoverable Revenue"
              value={formatCurrency(
                stats?.overview.recoverableRevenue ?? 0
              )}
            />

            <MiniInfo
              title="Success Rate"
              value={formatPercent(
                stats?.overview.successRate ?? 0
              )}
            />
          </div>

          {/* ================================================== */}
          {/* CHARTS */}
          {/* ================================================== */}

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* STATUS OVERVIEW */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">
                    Transaction Status
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Real transaction distribution
                    from the database
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  All Data
                </div>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart data={statusData}>
                    <defs>
                      <linearGradient
                        id="statusGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#0f172a"
                          stopOpacity={0.18}
                        />

                        <stop
                          offset="95%"
                          stopColor="#0f172a"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                      tickFormatter={(value) =>
                        formatNumber(Number(value))
                      }
                    />

                    <Tooltip
                      formatter={(value) =>
                        formatNumber(Number(value))
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#0f172a"
                      fill="url(#statusGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatusSummary
                  label="Success"
                  value={stats?.status.success ?? 0}
                  className="text-green-600"
                />

                <StatusSummary
                  label="Failed"
                  value={stats?.status.failed ?? 0}
                  className="text-red-600"
                />

                <StatusSummary
                  label="Abandoned"
                  value={stats?.status.abandoned ?? 0}
                  className="text-orange-600"
                />

                <StatusSummary
                  label="Expired"
                  value={stats?.status.expired ?? 0}
                  className="text-slate-600"
                />
              </div>
            </div>

            {/* RISK DISTRIBUTION */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">
                Risk Distribution
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Current transaction risk
              </p>

              <div className="relative mt-4 h-[220px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {riskData.map(
                        (_, index) => (
                          <Cell
                            key={index}
                            fill={
                              riskColors[index]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      formatter={(value) =>
                        formatNumber(Number(value))
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="text-2xl font-bold">
                    {formatNumber(
                      stats?.overview
                        .totalTransactions ?? 0
                    )}
                  </div>

                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Transactions
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {riskData.map(
                  (item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              riskColors[index],
                          }}
                        />

                        <span className="text-slate-600">
                          {item.name}
                        </span>
                      </div>

                      <span className="font-semibold">
                        {formatNumber(
                          item.value
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* RECOVERY INSIGHT */}
          {/* ================================================== */}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <BrainCircuit size={22} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      ReviveAI Agent
                    </h3>

                    <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[10px] font-medium text-yellow-300">
                      MODEL PENDING
                    </span>
                  </div>

                  <p className="mt-1 max-w-2xl text-sm text-slate-300">
                    The system has identified{" "}
                    <strong className="text-white">
                      {formatNumber(
                        (stats?.risk.critical ?? 0) +
                          (stats?.risk.high ?? 0)
                      )}
                    </strong>{" "}
                    high-priority transactions
                    requiring recovery decisions.
                    The AI recovery probability model
                    will determine which cases are worth
                    pursuing.
                  </p>
                </div>
              </div>

              <Link
                href="/agent"
                className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Open Agent
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          {/* ================================================== */}
          {/* TRANSACTION SECTION */}
          {/* ================================================== */}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold">
                    Recovery Queue
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Latest 100 transactions
                    prioritized by revenue risk
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {/* SEARCH */}

                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value
                        )
                      }
                      placeholder="Search transaction..."
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-slate-400 sm:w-52"
                    />
                  </div>

                  {/* RISK */}

                  <select
                    value={riskFilter}
                    onChange={(e) =>
                      setRiskFilter(
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
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

                  {/* STATUS */}

                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none"
                  >
                    <option value="ALL">
                      All Status
                    </option>

                    <option value="FAILED">
                      Failed
                    </option>

                    <option value="ABANDONED">
                      Abandoned
                    </option>

                    <option value="SUCCESS">
                      Success
                    </option>

                    <option value="EXPIRED">
                      Expired
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* TABLE */}

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <RefreshCw
                      size={17}
                      className="animate-spin"
                    />

                    Loading transactions...
                  </div>
                </div>
              ) : filteredTransactions.length ===
                0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <Search
                    size={28}
                    className="text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium">
                    No transactions found
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Try changing your filters.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3 font-semibold">
                        Transaction
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Customer
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Amount
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Status
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Risk
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Revenue At Risk
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions
                      .slice(0, 20)
                      .map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >
                          {/* TRANSACTION */}

                          <td className="px-5 py-4">
                            <div className="font-mono text-xs font-medium">
                              {
                                transaction.externalId
                              }
                            </div>

                            <div className="mt-1 text-[11px] text-slate-400">
                              {new Date(
                                transaction.createdAt
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </div>
                          </td>

                          {/* CUSTOMER */}

                          <td className="px-5 py-4">
                            <div className="text-sm font-medium">
                              {
                                transaction.customer
                                  .name
                              }
                            </div>

                            <div className="mt-1 text-[11px] text-slate-400">
                              {
                                transaction.customer
                                  .customerSegment
                              }
                            </div>
                          </td>

                          {/* AMOUNT */}

                          <td className="px-5 py-4">
                            <div className="text-sm font-semibold">
                              {formatCurrency(
                                transaction.amount
                              )}
                            </div>

                            <div className="mt-1 text-[11px] text-slate-400">
                              {
                                transaction.paymentMethod
                              }
                            </div>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(
                                transaction.status
                              )}`}
                            >
                              {transaction.status}
                            </span>
                          </td>

                          {/* RISK */}

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${riskClass(
                                transaction.riskLevel
                              )}`}
                            >
                              {
                                transaction.riskLevel
                              }
                            </span>
                          </td>

                          {/* REVENUE AT RISK */}

                          <td className="px-5 py-4">
                            <div className="text-sm font-semibold">
                              {formatCurrency(
                                transaction.revenueAtRisk
                              )}
                            </div>
                          </td>

                          {/* ACTION */}

                          <td className="px-5 py-4">
                            {transaction.revenueAtRisk >
                            0 ? (
                              <Link
                                href={`/agent?transactionId=${encodeURIComponent(
                                  transaction.id
                                )}`}
                                className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-slate-700"
                              >
                                Analyze
                                <ChevronRight size={13} />
                              </Link>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2
                                  size={14}
                                />

                                Clear
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* TABLE FOOTER */}

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <span className="text-xs text-slate-500">
                Showing{" "}
                {Math.min(
                  filteredTransactions.length,
                  20
                )}{" "}
                of{" "}
                {filteredTransactions.length}{" "}
                loaded transactions
              </span>

              <Link
                href="/transactions"
                className="flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                View all
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* ================================================== */}
          {/* FOOTER STATS */}
          {/* ================================================== */}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <MiniStat
              icon={
                <CheckCircle2 size={17} />
              }
              title="Successful Payments"
              value={formatNumber(
                stats?.status.success ?? 0
              )}
            />

            <MiniStat
              icon={
                <ShoppingCart size={17} />
              }
              title="Abandoned Checkouts"
              value={formatNumber(
                stats?.status.abandoned ?? 0
              )}
            />

            <MiniStat
              icon={
                <ArrowDownRight size={17} />
              }
              title="Failed Payments"
              value={formatNumber(
                stats?.status.failed ?? 0
              )}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// NAV ITEM
// ============================================================

function NavItem({
  icon,
  label,
  href,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        mb-1
        flex
        w-full
        items-center
        gap-3
        rounded-lg
        px-3
        py-2.5
        text-sm
        font-medium
        transition
        ${
          active
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

// ============================================================
// METRIC CARD
// ============================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  positive,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>

        <span
          className={`flex items-center gap-1 text-[11px] font-semibold ${
            positive
              ? "text-green-600"
              : "text-slate-500"
          }`}
        >
          {positive ? (
            <ArrowUpRight size={13} />
          ) : null}

          {trend}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-slate-500">
          {title}
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight">
          {value}
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MINI INFO
// ============================================================

function MiniInfo({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-lg font-bold">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// STATUS SUMMARY
// ============================================================

function StatusSummary({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-bold ${className}`}
      >
        {formatNumber(value)}
      </p>
    </div>
  );
}

// ============================================================
// MINI STAT
// ============================================================

function MiniStat({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>

        <span className="text-xs font-medium text-slate-500">
          {title}
        </span>
      </div>

      <span className="text-sm font-bold">
        {value}
      </span>
    </div>
  );
}