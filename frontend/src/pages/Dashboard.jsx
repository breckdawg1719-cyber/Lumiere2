import { useEffect, useState } from "react";
import { api, formatMoney, getCurrencySymbol } from "@/lib/api";
import CountUp from "@/components/CountUp";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  CheckCircle2,
  Clock,
  Users,
  Heart,
  Calendar,
  TrendingDown,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const PALETTE = ["#C5A880", "#E2C2B3", "#9CB4A6", "#E8CBA5", "#D48A8A", "#B6C4B6", "#8a6e47", "#76726B"];

function StatCard({ label, value, sublabel, icon: Icon, color = "#C5A880", testId, prefix = "", decimals = 0 }) {
  return (
    <div className="soft-card p-6" data-testid={testId}>
      <div className="flex items-start justify-between">
        <div className="label-overline">{label}</div>
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color }} />
        </div>
      </div>
      <div className="font-serif text-3xl mt-4 text-[#2C2C2C]">
        <CountUp value={value} prefix={prefix} decimals={decimals} />
      </div>
      {sublabel && <div className="text-xs text-[#76726B] mt-1.5">{sublabel}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([api.get("/profile"), api.get("/stats")]);
        setProfile(p.data);
        setStats(s.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div className="py-20 flex justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#C5A880] border-t-transparent animate-spin" />
      </div>
    );
  }

  const currency = stats.currency;
  const sym = getCurrencySymbol(currency);
  const spentPct =
    stats.total_budget > 0
      ? Math.min(100, ((stats.total_spent + stats.total_pending) / stats.total_budget) * 100)
      : 0;

  const pieData = (stats.by_category || [])
    .filter((c) => c.spent + c.pending > 0)
    .map((c) => ({ name: c.name, value: c.spent + c.pending, color: c.color }));

  const barData = (stats.by_category || [])
    .filter((c) => c.planned > 0 || c.spent > 0 || c.pending > 0)
    .slice(0, 8)
    .map((c) => ({
      name: c.name,
      Planned: Math.round(c.planned),
      Spent: Math.round(c.spent),
      Pending: Math.round(c.pending),
    }));

  const daysUntil = (() => {
    if (!profile?.wedding_date) return null;
    const t = new Date(profile.wedding_date).getTime();
    if (isNaN(t)) return null;
    const days = Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  })();

  return (
    <div className="space-y-10" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="label-overline">Your wedding overview</span>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#2C2C2C] mt-2">
            {profile?.partner1_name || "Welcome"}
            {profile?.partner2_name ? (
              <>
                {" "}
                <span className="text-[#C5A880]">&</span> {profile.partner2_name}
              </>
            ) : null}
          </h1>
          <p className="text-[#5b574f] mt-2 flex items-center gap-2">
            {daysUntil != null ? (
              <>
                <Calendar className="h-4 w-4 text-[#C5A880]" strokeWidth={1.5} />
                {daysUntil > 0
                  ? `${daysUntil} day${daysUntil === 1 ? "" : "s"} until the big day`
                  : daysUntil === 0
                  ? "Today is the day"
                  : `Married ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} ago`}
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 text-[#C5A880]" strokeWidth={1.5} fill="#C5A880" />
                Set your wedding date in Settings to see the countdown.
              </>
            )}
          </p>
        </div>
        <Link to="/expenses" className="btn-primary" data-testid="dashboard-add-expense">
          + Add expense
        </Link>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          testId="stat-total-budget"
          label="Total Budget"
          value={stats.total_budget}
          prefix={sym}
          sublabel={`Planned: ${formatMoney(stats.total_planned, currency)}`}
          icon={Wallet}
          color="#C5A880"
        />
        <StatCard
          testId="stat-spent"
          label="Paid"
          value={stats.total_spent}
          prefix={sym}
          sublabel={`${stats.expense_count} expense${stats.expense_count === 1 ? "" : "s"}`}
          icon={CheckCircle2}
          color="#9CB4A6"
        />
        <StatCard
          testId="stat-pending"
          label="Pending"
          value={stats.total_pending}
          prefix={sym}
          sublabel="Outstanding amounts"
          icon={Clock}
          color="#E8CBA5"
        />
        <StatCard
          testId="stat-remaining"
          label="Remaining"
          value={stats.remaining}
          prefix={sym}
          sublabel={stats.remaining < 0 ? "Over budget" : "Still available"}
          icon={TrendingDown}
          color={stats.remaining < 0 ? "#D48A8A" : "#C5A880"}
        />
      </div>

      {/* Budget progress */}
      <div className="soft-card p-6 lg:p-8" data-testid="budget-progress-card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="label-overline">Budget Allocation</span>
            <h2 className="font-serif text-2xl mt-1.5">Where the money goes</h2>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-[#9c958a]">
              {spentPct.toFixed(0)}% allocated
            </div>
            <div className="font-serif text-2xl text-[#2C2C2C]">
              {formatMoney(stats.total_spent + stats.total_pending, currency)} /{" "}
              <span className="text-[#76726B]">{formatMoney(stats.total_budget, currency)}</span>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <Progress value={spentPct} className="h-2 bg-[#EAE5DF]" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="soft-card p-6 lg:p-7 lg:col-span-2" data-testid="chart-pie">
          <span className="label-overline">Spending Breakdown</span>
          <h3 className="font-serif text-xl mt-1.5">By category</h3>
          <div className="h-64 mt-4">
            {pieData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-sm text-[#76726B]">
                <p>No expenses yet.</p>
                <Link to="/expenses" className="text-[#8a6e47] underline-offset-4 hover:underline mt-1">
                  Add your first one
                </Link>
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color || PALETTE[idx % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => `${sym}${Number(v).toLocaleString()}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #EAE5DF",
                      background: "#FFFFFF",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="soft-card p-6 lg:p-7 lg:col-span-3" data-testid="chart-bar">
          <span className="label-overline">Planned vs Actual</span>
          <h3 className="font-serif text-xl mt-1.5">Category performance</h3>
          <div className="h-64 mt-4">
            {barData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[#76726B]">
                Set planned amounts in Categories to compare against actuals.
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#EAE5DF" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#76726B", fontSize: 11 }}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fill: "#76726B", fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => `${sym}${Number(v).toLocaleString()}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #EAE5DF",
                      background: "#FFFFFF",
                    }}
                  />
                  <Bar dataKey="Planned" fill="#E2C2B3" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Spent" fill="#C5A880" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Pending" fill="#9CB4A6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Guests overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="soft-card p-6 lg:col-span-1" data-testid="guests-overview">
          <div className="flex items-center justify-between">
            <span className="label-overline">Guests</span>
            <Users className="h-4 w-4 text-[#C5A880]" strokeWidth={1.5} />
          </div>
          <div className="font-serif text-3xl mt-3"><CountUp value={stats.guests.total} /></div>
          <div className="text-xs text-[#76726B] mt-1">
            {stats.guests.estimated_attending} expected to attend
          </div>
        </div>
        {[
          { key: "attending", label: "Attending", color: "#9CB4A6" },
          { key: "pending", label: "Pending", color: "#E8CBA5" },
          { key: "declined", label: "Declined", color: "#D48A8A" },
        ].map((b) => (
          <div key={b.key} className="soft-card p-6" data-testid={`rsvp-${b.key}`}>
            <span className="label-overline" style={{ color: b.color }}>
              {b.label}
            </span>
            <div className="font-serif text-3xl mt-3">
              <CountUp value={stats.guests.rsvp[b.key]} />
            </div>
            <div className="text-xs text-[#76726B] mt-1">RSVPs marked {b.label.toLowerCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
