import { useState, useEffect } from 'react'
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import Sidebar from '../components/Sidebar'
import { analyticsApi } from '../api/analyticsApi'
import { useAuth } from '../context/AuthContext'

const RANGE_OPTIONS = [
  { label: '7 Days',  value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
]

const DEPT_COLORS = [
  '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#ca8a04', '#dc2626', '#0891b2', '#9333ea',
]

function formatHour(h) {
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

const CustomTooltip = ({ active, payload, label, labelFormat }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900/90 backdrop-blur text-white rounded-xl px-4 py-3 shadow-2xl border border-slate-700 text-xs min-w-[150px]">
      <p className="text-slate-400 mb-2 font-medium">{labelFormat ? labelFormat(label) : label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-slate-300">{p.name}</span>
          </span>
          <span className="font-bold text-white">
            {typeof p.value === 'number' && !Number.isInteger(p.value)
              ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { user }  = useAuth()
  const [days, setDays]       = useState(30)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    analyticsApi.getSummary(days)
      .then(setData)
      .catch(e => setError(e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [days])

  const totalPatients = data?.dailyVolume.reduce((s, d) => s + d.total, 0) ?? 0
  const totalDone     = data?.dailyVolume.reduce((s, d) => s + d.done,  0) ?? 0
  const avgWait       = data?.dailyWait.length
    ? (data.dailyWait.reduce((s, d) => s + d.avgWaitMinutes, 0) / data.dailyWait.length).toFixed(1)
    : '—'
  const peakHour      = data?.hourlyVolume.length
    ? formatHour(data.hourlyVolume.reduce((a, b) => b.count > a.count ? b : a).hour)
    : '—'

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 ml-16 lg:ml-64 flex flex-col min-h-screen">

        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-8 h-16 border-b border-slate-200 bg-slate-50/90 backdrop-blur sticky top-0 z-10 shadow-sm">
          <div className="flex flex-col">
            {user?.hospitalName
              ? <span className="text-xl font-black tracking-tight text-slate-900 leading-none">{user.hospitalName}</span>
              : <span className="text-xl font-black tracking-tight text-slate-900 leading-none">Analytics</span>
            }
            {user?.planType && (
              <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${
                user.planType === 'PRO' ? 'text-teal-600' : 'text-slate-400'
              }`}>{user.planType} Plan</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  days === opt.value
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        <div className="p-8 space-y-6 flex-1">

          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Analytics</h1>
            <p className="text-sm text-slate-500 mt-0.5">Queue performance · last {days} days</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Loading analytics...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
          )}

          {data && !loading && (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total Patients"  value={totalPatients}    icon="group"       color="teal" />
                <KpiCard label="Completed"        value={totalDone}        icon="check_circle" color="blue"
                  sub={totalPatients ? `${((totalDone / totalPatients) * 100).toFixed(0)}% completion rate` : null} />
                <KpiCard label="Avg Wait Time"   value={`${avgWait} min`} icon="schedule"    color="violet" />
                <KpiCard label="Peak Hour"        value={peakHour}         icon="trending_up" color="amber" />
              </div>

              {/* Row 1: Peak Hours + Patients by Department */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Peak Hours — area curve */}
                <ChartCard title="Peak Hours" subtitle="Registrations by hour of day">
                  {data.hourlyVolume.length === 0 ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={data.hourlyVolume} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                        <defs>
                          <linearGradient id="gradHour" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={formatHour} axisLine={false} tickLine={false} interval={2} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip labelFormat={formatHour} />} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="Registrations"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          fill="url(#gradHour)"
                          dot={false}
                          activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                {/* Patients by Department — donut */}
                <ChartCard title="Patients by Department" subtitle="Distribution across departments">
                  {data.departmentVolume.length === 0 ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={data.departmentVolume}
                          dataKey="count"
                          nameKey="department"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {data.departmentVolume.map((_, i) => (
                            <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

              </div>

              {/* Row 2: Daily Patient Volume — full width area */}
              <ChartCard title="Daily Patient Volume" subtitle="Done · No Show · Pending trend over time" full>
                {data.dailyVolume.length === 0 ? <EmptyState /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data.dailyVolume} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                      <defs>
                        <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradNoShow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip labelFormat={l => `Date: ${l}`} />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                      <Area type="monotone" dataKey="done"    name="Done"    stroke="#0d9488" strokeWidth={2} fill="url(#gradDone)"    dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                      <Area type="monotone" dataKey="noShow"  name="No Show" stroke="#ef4444" strokeWidth={2} fill="url(#gradNoShow)"  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                      <Area type="monotone" dataKey="pending" name="Pending" stroke="#6366f1" strokeWidth={2} fill="url(#gradPending)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Row 3: Avg Wait Time + Avg Wait by Department */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Avg Wait Time trend */}
                <ChartCard title="Avg Wait Time Trend" subtitle="Daily average minutes from registration to call">
                  {data.dailyWait.length === 0 ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={data.dailyWait} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                        <defs>
                          <linearGradient id="gradWaitLine" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%"   stopColor="#0d9488" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="m" axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip labelFormat={l => `Date: ${l}`} />} />
                        <Line
                          type="monotone"
                          dataKey="avgWaitMinutes"
                          name="Avg Wait"
                          stroke="#0d9488"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, fill: '#0d9488', strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                {/* Avg Wait by Department — horizontal bars */}
                <ChartCard title="Avg Wait by Department" subtitle="Which departments have the longest queues">
                  {data.departmentWait.length === 0 ? <EmptyState /> : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={data.departmentWait}
                        layout="vertical"
                        margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
                      >
                        <defs>
                          <linearGradient id="gradDeptWait" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%"   stopColor="#0d9488" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} unit="m" axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="avgWaitMinutes"
                          name="Avg Wait"
                          fill="url(#gradDeptWait)"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, sub }) {
  const palette = {
    teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   border: 'border-teal-100' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  border: 'border-amber-100' },
  }
  const c = palette[color]
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
      <span className={`material-symbols-outlined text-xl ${c.icon}`}>{icon}</span>
      <p className="text-2xl font-black text-slate-800 tracking-tight mt-3">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, children, full }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${full ? 'col-span-1 xl:col-span-2' : ''}`}>
      <div className="mb-5">
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-slate-300 text-sm gap-2">
      <span className="material-symbols-outlined text-3xl">bar_chart</span>
      No data for this period
    </div>
  )
}
