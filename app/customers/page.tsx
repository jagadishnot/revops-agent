"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Users,
  AlertTriangle,
  IndianRupee,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string;
  segment: string;
  lifetimeValue: number;
  previousFailures: number;
  totalTransactions: number;
  successfulTransactions: number;
  totalSpent: number;
  createdAt: string;
};

type Transaction = {
  id: string;
  externalId: string;
  customerId: string;
  amount: number;
  status: string;
  revenueAtRisk: number;
  riskLevel: string | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<
    Transaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] =
    useState("ALL");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const [customerResponse, transactionResponse] =
        await Promise.all([
          fetch("/api/customers?limit=100", {
            cache: "no-store",
          }),
          fetch("/api/transactions?limit=100", {
            cache: "no-store",
          }),
        ]);

      if (!customerResponse.ok) {
        throw new Error(
          "Failed to load customers"
        );
      }

      if (!transactionResponse.ok) {
        throw new Error(
          "Failed to load transactions"
        );
      }

      const customerData =
        await customerResponse.json();

      const transactionData =
        await transactionResponse.json();

      setCustomers(
        customerData.customers || []
      );

      setTransactions(
        transactionData.transactions || []
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load customer intelligence."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const query =
        search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        customer.name
          .toLowerCase()
          .includes(query) ||
        customer.email
          .toLowerCase()
          .includes(query);

      const matchesSegment =
        segmentFilter === "ALL" ||
        customer.segment === segmentFilter;

      return (
        matchesSearch &&
        matchesSegment
      );
    });
  }, [
    customers,
    search,
    segmentFilter,
  ]);

  const totalCustomers =
    customers.length;

  const highValueCustomers =
    customers.filter(
      (customer) =>
        customer.segment === "HIGH_VALUE"
    ).length;

  const atRiskCustomers =
    customers.filter(
      (customer) =>
        customer.segment === "AT_RISK"
    ).length;

  const totalCustomerValue =
    customers.reduce(
      (sum, customer) =>
        sum + customer.lifetimeValue,
      0
    );

  const customerRisk = transactions.reduce(
    (sum, transaction) =>
      sum + transaction.revenueAtRisk,
    0
  );

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
              Customers
            </h1>

            <p className="text-xs text-slate-500">
              Customer value and recovery intelligence
            </p>
          </div>

        </div>

        <button
          onClick={loadCustomers}
          disabled={loading}
          className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
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


      <main className="mx-auto max-w-7xl p-6">

        {/* TITLE */}

        <div className="mb-6">

          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
            <span>Revenue Operations</span>
            <span>/</span>
            <span className="text-slate-900">
              Customers
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">
            Customer Intelligence
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Understand customer value, payment history,
            failure patterns and revenue recovery opportunity.
          </p>

        </div>


        {/* ERROR */}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            <AlertTriangle size={18} />

            {error}

          </div>
        )}


        {/* METRICS */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <MetricCard
            title="Customers"
            value={totalCustomers.toLocaleString(
              "en-IN"
            )}
            description="Customer records loaded"
            icon={
              <Users size={18} />
            }
          />

          <MetricCard
            title="Customer Value"
            value={formatCurrency(
              totalCustomerValue
            )}
            description="Lifetime value"
            icon={
              <IndianRupee size={18} />
            }
          />

          <MetricCard
            title="High Value"
            value={highValueCustomers.toLocaleString(
              "en-IN"
            )}
            description="High-value customers"
            icon={
              <TrendingUp size={18} />
            }
          />

          <MetricCard
            title="At Risk"
            value={atRiskCustomers.toLocaleString(
              "en-IN"
            )}
            description={`₹${formatCompact(
              customerRisk
            )} current exposure`}
            icon={
              <AlertTriangle size={18} />
            }
          />

        </div>


        {/* SEARCH + FILTER */}

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 lg:flex-row">

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
                placeholder="Search customer name or email..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
              />

            </div>

            <select
              value={segmentFilter}
              onChange={(event) =>
                setSegmentFilter(
                  event.target.value
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
            >

              <option value="ALL">
                All Segments
              </option>

              <option value="HIGH_VALUE">
                High Value
              </option>

              <option value="REGULAR">
                Regular
              </option>

              <option value="NEW">
                New
              </option>

              <option value="AT_RISK">
                At Risk
              </option>

            </select>

          </div>

        </div>


        {/* RESULTS */}

        <div className="mb-3 flex items-center justify-between">

          <p className="text-xs text-slate-500">

            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filteredCustomers.length}
            </span>{" "}
            customers

          </p>

          <p className="text-xs text-slate-400">
            Latest 100 records
          </p>

        </div>


        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {loading ? (

            <div className="flex h-72 items-center justify-center">

              <div className="flex items-center gap-2 text-sm text-slate-500">

                <RefreshCw
                  size={17}
                  className="animate-spin"
                />

                Loading customer intelligence...

              </div>

            </div>

          ) : filteredCustomers.length ===
            0 ? (

            <div className="flex h-72 flex-col items-center justify-center">

              <Users
                size={30}
                className="text-slate-300"
              />

              <p className="mt-3 text-sm font-medium">
                No customers found
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Try changing your search or segment filter.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1050px]">

                <thead>

                  <tr className="border-b border-slate-200 bg-slate-50">

                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Segment
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Lifetime Value
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Transactions
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Previous Failures
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Customer Risk
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      View
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-100">

                  {filteredCustomers.map(
                    (customer) => (

                      <CustomerRow
                        key={customer.id}
                        customer={customer}
                        transactions={
                          transactions
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
   CUSTOMER ROW
========================================================== */

function CustomerRow({
  customer,
  transactions,
}: {
  customer: Customer;
  transactions: Transaction[];
}) {
  const customerTransactions =
    transactions.filter(
      (transaction) =>
        transaction.customerId ===
        customer.id
    );

  const customerRisk =
    customerTransactions.reduce(
      (sum, transaction) =>
        sum + transaction.revenueAtRisk,
      0
    );

  return (
    <tr className="transition hover:bg-slate-50">

      {/* CUSTOMER */}

      <td className="px-5 py-4">

        <div>

          <p className="text-sm font-semibold">
            {customer.name}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {customer.email}
          </p>

        </div>

      </td>


      {/* SEGMENT */}

      <td className="px-5 py-4">

        <SegmentBadge
          segment={
            customer.segment
          }
        />

      </td>


      {/* LTV */}

      <td className="px-5 py-4">

        <p className="text-sm font-semibold">
          {formatCurrency(
            customer.lifetimeValue
          )}
        </p>

        <p className="mt-1 text-[10px] text-slate-400">
          Total spent{" "}
          {formatCurrency(
            customer.totalSpent
          )}
        </p>

      </td>


      {/* TRANSACTIONS */}

      <td className="px-5 py-4">

        <p className="text-sm font-semibold">
          {customer.totalTransactions}
        </p>

        <p className="mt-1 text-[10px] text-green-600">
          {customer.successfulTransactions} successful
        </p>

      </td>


      {/* FAILURES */}

      <td className="px-5 py-4">

        {customer.previousFailures >
        0 ? (

          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">

            <AlertTriangle
              size={11}
            />

            {customer.previousFailures}

          </span>

        ) : (

          <span className="text-xs text-slate-400">
            None
          </span>

        )}

      </td>


      {/* CUSTOMER RISK */}

      <td className="px-5 py-4">

        {customerRisk > 0 ? (

          <div>

            <p className="text-sm font-semibold text-red-600">
              {formatCurrency(
                customerRisk
              )}
            </p>

            <p className="mt-1 text-[10px] text-slate-400">
              Current exposure
            </p>

          </div>

        ) : (

          <span className="text-xs text-green-600">
            No current exposure
          </span>

        )}

      </td>


      {/* VIEW */}

      <td className="px-5 py-4 text-right">

        <Link
          href={`/transactions?customerId=${customer.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          View
          <ChevronRight
            size={13}
          />
        </Link>

      </td>

    </tr>
  );
}


/* ==========================================================
   SEGMENT BADGE
========================================================== */

function SegmentBadge({
  segment,
}: {
  segment: string | null | undefined;
}) {
  const safeSegment =
    segment || "REGULAR";

  const config: Record<
    string,
    string
  > = {
    HIGH_VALUE:
      "bg-purple-50 text-purple-700",

    REGULAR:
      "bg-slate-100 text-slate-700",

    NEW:
      "bg-blue-50 text-blue-700",

    AT_RISK:
      "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
        config[safeSegment] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {safeSegment.replaceAll(
        "_",
        " "
      )}
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
   COMPACT CURRENCY
========================================================== */

function formatCompact(
  value: number
) {
  if (value >= 10000000) {
    return `${(
      value / 10000000
    ).toFixed(2)} Cr`;
  }

  if (value >= 100000) {
    return `${(
      value / 100000
    ).toFixed(2)} L`;
  }

  if (value >= 1000) {
    return `${(
      value / 1000
    ).toFixed(1)}K`;
  }

  return value.toFixed(0);
}