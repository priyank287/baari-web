import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import sessionApi from '../api/sessionApi'
import queueApi from '../api/queueApi'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = { name: '', phone: '' }

function validate(f) {
  const e = {}
  if (!f.name || f.name.trim().length < 2)
    e.name = 'Name must be at least 2 characters'
  if (!/^\d{10}$/.test(f.phone))
    e.phone = 'Enter a valid 10-digit mobile number'
  return e
}

function fmtToken(n) {
  return String(n).padStart(3, '0')
}

export default function ReceptionDashboard() {
  const { user } = useAuth()

  const [sessions, setSessions]           = useState([])
  const [queues, setQueues]               = useState({})
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Registration modal state
  const [regSession, setRegSession]       = useState(null) // session to register into
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [errors, setErrors]               = useState({})
  const [submitting, setSubmitting]       = useState(false)

  const [toast, setToast]                 = useState(null)
  const pollRef                           = useRef(null)

  const allEntries  = Object.values(queues).flat()
  const totalWaiting = allEntries.filter(e => e.status === 'WAITING').length
  const totalCalled  = allEntries.filter(e => e.status === 'CALLED').length

  // ── Fetch sessions ────────────────────────────────────────────────────────

  useEffect(() => {
    sessionApi.getOpenSessions()
      .then(data => setSessions(data))
      .catch(console.error)
      .finally(() => setLoadingSessions(false))
  }, [])

  // ── Fetch all queues in parallel + polling ────────────────────────────────

  const fetchAllQueues = useCallback(async () => {
    if (sessions.length === 0) return
    const results = await Promise.all(
      sessions.map(s => queueApi.getQueue(s.id).then(entries => ({ id: s.id, entries })))
    )
    setQueues(Object.fromEntries(results.map(r => [r.id, r.entries])))
  }, [sessions])

  useEffect(() => {
    if (sessions.length === 0) return
    fetchAllQueues()
    clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchAllQueues, 10_000)
    return () => clearInterval(pollRef.current)
  }, [sessions, fetchAllQueues])

  // ── Registration modal handlers ───────────────────────────────────────────

  function openRegModal(session) {
    setRegSession(session)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  function closeRegModal() {
    setRegSession(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  function handleNumericChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setForm(prev => ({ ...prev, phone: val }))
    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    if (!regSession) return

    setSubmitting(true)
    try {
      const entry = await queueApi.addToQueue(regSession.id, form.name.trim(), form.phone)
      setQueues(prev => ({ ...prev, [regSession.id]: [...(prev[regSession.id] ?? []), entry] }))
      showToast(`Token ${fmtToken(entry.tokenNumber)} · ${form.name.trim()} added to ${regSession.departmentName}`)
      closeRegModal()
    } catch (err) {
      showToast(`Error: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface text-on-surface flex min-h-screen">
      <Sidebar showAddPatient />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 bg-on-surface text-inverse-on-surface px-5 py-4 rounded-xl clinical-shadow flex items-center gap-3 max-w-xs">
          <span className="material-symbols-outlined text-secondary-fixed text-xl shrink-0">check_circle</span>
          <p className="text-sm font-medium leading-snug">{toast}</p>
        </div>
      )}

      {/* Registration modal */}
      {regSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="bg-secondary px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-base leading-tight">New Registration</p>
                <p className="text-white/70 text-xs mt-0.5">
                  {regSession.doctorName} · {regSession.departmentName}
                </p>
              </div>
              <button
                onClick={closeRegModal}
                className="text-white/70 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4" noValidate>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
                  Full Name <span className="text-error">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Aditya Sharma"
                  autoFocus
                  className={`w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm placeholder:text-slate-400 border-0 outline-none ring-2 transition-all ${
                    errors.name ? 'ring-error' : 'ring-transparent focus:ring-secondary/30'
                  }`}
                />
                {errors.name && <FieldError msg={errors.name} />}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block">
                  Mobile Number <span className="text-error">*</span>
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleNumericChange}
                  placeholder="10-digit number"
                  inputMode="numeric"
                  className={`w-full bg-surface-container-low rounded-lg px-4 py-3 text-sm placeholder:text-slate-400 border-0 outline-none ring-2 transition-all ${
                    errors.phone ? 'ring-error' : 'ring-transparent focus:ring-secondary/30'
                  }`}
                />
                {errors.phone && <FieldError msg={errors.phone} />}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeRegModal}
                  className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-secondary text-white font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-base">person_add</span>
                  }
                  {submitting ? 'Adding…' : 'Add to Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 ml-16 lg:ml-64 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-6 h-16 w-full bg-slate-50/90 backdrop-blur border-b border-slate-200 shadow-sm">
          <div className="flex flex-col">
            {user?.hospitalName
              ? <span className="text-xl font-black tracking-tight text-slate-900 leading-none">{user.hospitalName}</span>
              : <span className="text-xl font-black tracking-tight text-slate-900 leading-none">Reception</span>
            }
            {user?.planType && (
              <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${
                user.planType === 'PRO' ? 'text-teal-600' : 'text-slate-400'
              }`}>{user.planType} Plan</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden lg:flex items-center gap-1.5 bg-secondary/10 text-secondary px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse" />
              {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
            </span>
            <span className="hidden lg:flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full text-xs font-bold text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">group</span>
              {totalWaiting} Waiting
            </span>
            {totalCalled > 0 && (
              <span className="hidden lg:flex items-center gap-1.5 bg-tertiary-fixed/30 text-on-tertiary-fixed-variant px-3 py-1 rounded-full text-xs font-bold">
                <span className="material-symbols-outlined text-sm">stethoscope</span>
                {totalCalled} In Consult
              </span>
            )}
          </div>
        </header>

        {/* Department columns — full width now */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {loadingSessions ? (
            <div className="flex gap-4 p-6 h-full">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-72 shrink-0 bg-surface-container-low rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant gap-3">
              <span className="material-symbols-outlined text-5xl opacity-20">calendar_today</span>
              <p className="text-sm font-semibold">No open sessions today</p>
              <p className="text-xs opacity-60">Sessions are opened from Queue Management</p>
            </div>
          ) : (
            <div className="flex gap-4 p-6 h-full items-start">
              {sessions.map(session => (
                <DepartmentColumn
                  key={session.id}
                  session={session}
                  entries={queues[session.id] ?? []}
                  onRegister={() => openRegModal(session)}
                />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}

// ── Department Column ──────────────────────────────────────────────────────────

function DepartmentColumn({ session, entries, onRegister }) {
  const waiting   = entries.filter(e => e.status === 'WAITING')
  const inConsult = entries.find(e => e.status === 'CALLED') ?? null

  return (
    <div className="w-72 shrink-0 flex flex-col rounded-2xl border border-slate-100 shadow-sm bg-surface-container-lowest h-full max-h-full overflow-hidden hover:border-secondary/30 hover:shadow-md transition-all">

      {/* Column header */}
      <div className="px-4 py-3 shrink-0 bg-surface-container-low border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm text-on-surface truncate leading-tight">{session.doctorName}</p>
            <p className="text-[10px] uppercase tracking-widest font-bold mt-0.5 text-on-surface-variant truncate">
              {session.departmentName}
            </p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            waiting.length > 0 ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {waiting.length} waiting
          </span>
        </div>
      </div>

      {/* In consultation */}
      {inConsult && (
        <div className="mx-3 mt-3 shrink-0 bg-secondary-container/40 border border-secondary/20 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-white leading-none">TOKEN</span>
            <span className="text-sm font-black text-white leading-none">{fmtToken(inConsult.tokenNumber)}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-on-surface truncate">{inConsult.patientName}</p>
            <p className="text-[10px] text-secondary font-bold uppercase tracking-wide">In Consultation</p>
          </div>
        </div>
      )}

      {/* Waiting list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {waiting.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant opacity-40">
            <span className="material-symbols-outlined text-2xl mb-1">group_off</span>
            <p className="text-xs font-medium">Queue is clear</p>
          </div>
        ) : (
          waiting.map((entry, idx) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 bg-surface-container rounded-xl px-3 py-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-on-surface">{fmtToken(entry.tokenNumber)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">{entry.patientName}</p>
                <p className="text-[10px] text-on-surface-variant">#{idx + 1} in line</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Register button */}
      <button
        onClick={onRegister}
        className="shrink-0 mx-3 mb-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-sm">person_add</span>
        Register Patient
      </button>
    </div>
  )
}

function FieldError({ msg }) {
  return (
    <p className="text-[11px] text-error font-medium flex items-center gap-1 mt-1 ml-1">
      <span className="material-symbols-outlined text-sm leading-none">error</span>
      {msg}
    </p>
  )
}
