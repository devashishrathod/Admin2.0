import React, { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  CalendarClock,
  CheckCircle2,
  Clock3,
  XCircle,
  Wallet,
  ArrowUpRight,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------
 * Shared Table component (same as provided) — kept in this file so the
 * artifact stays single-file. In your real project keep this in its own
 * Table.jsx and just `import Table from "./Table"` here.
 * ---------------------------------------------------------------------- */

export function StatusBadge({ status, activeLabel = "Active" }) {
  const isActive = status === activeLabel;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
        ${
          isActive
            ? "bg-emerald-400/10 text-emerald-400"
            : "bg-neutral-700/40 text-neutral-400"
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-400" : "bg-neutral-500"
        }`}
      />
      {status}
    </span>
  );
}

export function Table({
  columns = [],
  data = [],
  emptyMessage = "No records found.",
  rowKey = "id",
}) {
  const alignClass = (align) =>
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-800/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 ${alignClass(
                    col.align
                  )} ${col.width || ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-neutral-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row[rowKey] ?? rowIndex}
                  className={`border-b border-neutral-800/70 transition-colors last:border-b-0 hover:bg-neutral-800/30 ${
                    row.isToday ? "bg-cyan-400/[0.04]" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-neutral-300 ${alignClass(
                        col.align
                      )}`}
                    >
                      {col.render ? col.render(row, rowIndex) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Mock data — replace with API data (e.g. GET /admin/transactions)
 * ---------------------------------------------------------------------- */

const PAYMENT_METHODS = ["UPI", "Debit Card", "Credit Card", "Net Banking", "Wallet"];

const VENDORS = [
  "Rajwada Sweets & Namkeen",
  "Kavya Mehndi Art Studio",
  "UrbanFit Studio",
  "Spice Route Kitchen",
  "Om Electronics",
];

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

let seed = 42;
function rand() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

function buildMockTransactions() {
  const rows = [];
  const statuses = ["Success", "Pending", "Failed"];
  const dateOffsets = [0, 0, 0, 1, 2, 3, 5, 7, 10, 14];

  let counter = 1;
  dateOffsets.forEach((offset) => {
    const perDay = offset === 0 ? 6 : 3;
    for (let i = 0; i < perDay; i++) {
      const status =
        offset === 0
          ? statuses[Math.floor(rand() * statuses.length)]
          : rand() > 0.15
          ? "Success"
          : rand() > 0.5
          ? "Pending"
          : "Failed";
      const vendor = VENDORS[Math.floor(rand() * VENDORS.length)];
      const method = PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)];
      const amount = Math.round(500 + rand() * 45000);
      const date = daysAgoStr(offset);
      const id = `TXN${String(100000 + counter).slice(1)}`;
      rows.push({
        id,
        vendor,
        customer: `Customer ${counter}`,
        date,
        time: `${String(Math.floor(9 + rand() * 10)).padStart(2, "0")}:${String(
          Math.floor(rand() * 60)
        ).padStart(2, "0")}`,
        amount,
        method,
        status,
        isToday: offset === 0,
        reference: `REF${Math.floor(100000000 + rand() * 899999999)}`,
        failureReason:
          status === "Failed"
            ? ["Insufficient funds", "Bank timeout", "Card declined", "Gateway error"][
                Math.floor(rand() * 4)
              ]
            : null,
      });
      counter++;
    }
  });

  // sort newest first
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

const INITIAL_TRANSACTIONS = buildMockTransactions();

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

function TxnStatusBadge({ status }) {
  const map = {
    Success: {
      cls: "bg-emerald-400/10 text-emerald-400 ring-emerald-400/30",
      icon: CheckCircle2,
    },
    Pending: {
      cls: "bg-amber-400/10 text-amber-400 ring-amber-400/30",
      icon: Clock3,
    },
    Failed: {
      cls: "bg-red-400/10 text-red-400 ring-red-400/30",
      icon: XCircle,
    },
  };
  const cfg = map[status] || map.Pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${cfg.cls}`}
    >
      <Icon size={12} />
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, amount, sub, tone = "emerald", live }) {
  const toneCls = {
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    red: "text-red-400",
  }[tone];
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center gap-2 text-[12.5px] text-neutral-400">
        <Icon size={15} className={toneCls} />
        {label}
        {live && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        )}
      </div>
      <div className="mt-3 text-[22px] font-semibold text-neutral-50">
        {inr(amount)}
      </div>
      <div className="mt-1 text-[12px] text-neutral-500">{sub}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * CSV export
 * ---------------------------------------------------------------------- */

function exportToCsv(rows, filename) {
  if (!rows.length) return;
  const headers = [
    "Transaction Id",
    "Vendor",
    "Customer",
    "Date",
    "Time",
    "Amount",
    "Payment Method",
    "Status",
    "Reference",
    "Failure Reason",
  ];
  const escapeCell = (val) => {
    const s = val === null || val === undefined ? "" : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.vendor,
        r.customer,
        r.date,
        r.time,
        r.amount,
        r.method,
        r.status,
        r.reference,
        r.failureReason || "",
      ]
        .map(escapeCell)
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------
 * Tabs config
 * ---------------------------------------------------------------------- */

const TABS = [
  { key: "all", label: "All Transactions" },
  { key: "today", label: "Today Transaction" },
  { key: "pending", label: "Pending Transaction" },
  { key: "success", label: "Success Transaction" },
  { key: "failed", label: "Failed Transaction" },
];

function matchesTab(row, tab) {
  switch (tab) {
    case "today":
      return row.isToday;
    case "pending":
      return row.status === "Pending";
    case "success":
      return row.status === "Success";
    case "failed":
      return row.status === "Failed";
    default:
      return true;
  }
}

/* -------------------------------------------------------------------------
 * Transaction detail drawer
 * ---------------------------------------------------------------------- */

function TransactionDrawer({ txn, onClose }) {
  if (!txn) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto border-l border-neutral-800 bg-neutral-900 p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-neutral-50">
            {txn.id}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-5 flex items-center justify-between rounded-xl bg-neutral-950 px-4 py-4">
          <div>
            <p className="text-[11.5px] text-neutral-500">Amount</p>
            <p className="mt-0.5 text-[20px] font-semibold text-neutral-50">
              {inr(txn.amount)}
            </p>
          </div>
          <TxnStatusBadge status={txn.status} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DrawerField label="Vendor" value={txn.vendor} />
          <DrawerField label="Customer" value={txn.customer} />
          <DrawerField label="Date" value={formatDate(txn.date)} />
          <DrawerField label="Time" value={txn.time} />
          <DrawerField label="Payment Method" value={txn.method} />
          <DrawerField label="Reference" value={txn.reference} />
        </div>

        {txn.status === "Failed" && (
          <div className="mt-5 rounded-xl bg-red-400/10 px-4 py-3">
            <p className="text-[11.5px] font-medium text-red-400">
              Failure reason
            </p>
            <p className="mt-1 text-[13px] text-neutral-300">
              {txn.failureReason}
            </p>
          </div>
        )}

        {txn.status === "Pending" && (
          <div className="mt-5 rounded-xl bg-amber-400/10 px-4 py-3 text-[13px] text-neutral-300">
            This transaction is still being processed by the payment gateway.
          </div>
        )}

        {txn.status === "Success" && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-3 text-[13px] text-neutral-300">
            <CheckCircle2 size={15} className="text-emerald-400" />
            Payment completed and confirmed.
          </div>
        )}
      </div>
    </div>
  );
}

function DrawerField({ label, value }) {
  return (
    <div>
      <p className="text-[11.5px] text-neutral-500">{label}</p>
      <p className="mt-0.5 truncate text-[13.5px] font-medium text-neutral-100">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function Transaction() {
  const [transactions] = useState(INITIAL_TRANSACTIONS);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const stats = useMemo(() => {
    const today = transactions.filter((t) => t.isToday);
    const pending = transactions.filter((t) => t.status === "Pending");
    const success = transactions.filter((t) => t.status === "Success");
    const failed = transactions.filter((t) => t.status === "Failed");
    const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);
    return {
      total: { amount: sum(transactions), count: transactions.length },
      today: { amount: sum(today), count: today.length },
      pending: { amount: sum(pending), count: pending.length },
      success: { amount: sum(success), count: success.length },
      failed: { amount: sum(failed), count: failed.length },
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      const inTab = matchesTab(t, activeTab);
      const inMethod = methodFilter === "All" || t.method === methodFilter;
      const inSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.vendor.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q);
      return inTab && inMethod && inSearch;
    });
  }, [transactions, activeTab, methodFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleExport = () => {
    const tabLabel = TABS.find((t) => t.key === activeTab)?.label || "transactions";
    const filename = `${tabLabel.replace(/\s+/g, "_").toLowerCase()}_${todayStr()}.csv`;
    exportToCsv(filtered, filename);
  };

  const columns = [
    { key: "id", label: "Transaction Id", render: (r) => (
      <button
        onClick={() => setSelected(r)}
        className="font-medium text-emerald-400 hover:underline"
      >
        {r.id}
      </button>
    ) },
    { key: "vendor", label: "Vendor" },
    { key: "customer", label: "Customer" },
    {
      key: "date",
      label: "Date",
      render: (r) => (
        <span>
          {formatDate(r.date)}{" "}
          {r.isToday && (
            <span className="ml-1 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
              Today
            </span>
          )}
          <span className="ml-1 text-neutral-500">· {r.time}</span>
        </span>
      ),
    },
    { key: "method", label: "Method" },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (r) => (
        <span className="font-medium text-neutral-50">{inr(r.amount)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <TxnStatusBadge status={r.status} />,
    },
    {
      key: "reference",
      label: "Reference",
      render: (r) => (
        <span className="text-neutral-500">{r.reference}</span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">
              Transactions
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Track every payment transaction across vendors — today's,
              pending, successful and failed.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 hover:bg-emerald-300"
            >
              <Download size={15} />
              Export CSV
            </button>
            <button className="flex h-10 items-center gap-2 rounded-xl border border-neutral-800 px-4 text-[13.5px] font-medium text-neutral-300 hover:bg-neutral-800">
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard
            icon={Wallet}
            label="Total"
            amount={stats.total.amount}
            sub={`${stats.total.count} transactions`}
          />
          <StatCard
            icon={CalendarClock}
            label="Today"
            amount={stats.today.amount}
            sub={`${stats.today.count} transactions`}
            tone="cyan"
            live
          />
          <StatCard
            icon={Clock3}
            label="Pending"
            amount={stats.pending.amount}
            sub={`${stats.pending.count} transactions`}
            tone="amber"
          />
          <StatCard
            icon={CheckCircle2}
            label="Success"
            amount={stats.success.amount}
            sub={`${stats.success.count} transactions`}
            tone="emerald"
          />
          <StatCard
            icon={XCircle}
            label="Failed"
            amount={stats.failed.amount}
            sub={`${stats.failed.count} transactions`}
            tone="red"
          />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 p-1.5">
          {TABS.map((t) => {
            const count =
              t.key === "all"
                ? stats.total.count
                : stats[t.key === "today" ? "today" : t.key]?.count;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-emerald-400 text-neutral-950"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${
                    active
                      ? "bg-neutral-950/20 text-neutral-950"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5">
            <Search size={15} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search transaction id, vendor, customer, reference..."
              className="w-72 bg-transparent text-[13px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-1 py-1">
              <Filter size={14} className="ml-1.5 text-neutral-500" />
              {["All", ...PAYMENT_METHODS].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMethodFilter(m);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                    methodFilter === m
                      ? "bg-emerald-400/15 text-emerald-400"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={pageRows}
          emptyMessage="No transactions match your filters."
        />

        {/* Pagination */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-[12.5px] text-neutral-500">
            Rows per page
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-200 focus:outline-none"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="ml-2">
              Showing {pageRows.length} of {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium ${
                  page === n
                    ? "bg-emerald-400 text-neutral-950"
                    : "text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TransactionDrawer txn={selected} onClose={() => setSelected(null)} />
    </div>
  );
}