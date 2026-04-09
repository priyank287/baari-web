import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import AddPatientPanel from '../components/AddPatientPanel'
import { mockStats } from '../mock/data'
import { useQueue } from '../context/QueueContext'

export default function QueueManagement() {
  const {
    patients,
    addPatient,
    callNext,
    markDone,
    recallPatient,
    transferPatient,
    skipPatient,
  } = useQueue()

  const location = useLocation()

  const [sessionOpen, setSessionOpen]   = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [toast, setToast]               = useState(null)
  const [dismissingId, setDismissingId] = useState(null)
  const [elapsed, setElapsed]           = useState(0)

  // ── Consultation timer ───────────────────────────────────────────────────────

  const serving = patients.find(p => p.status === 'in-consultation')

  useEffect(() => {
    if (!serving) { setElapsed(0); return }
    const start = serving.consultationStartedAt ?? Date.now()
    setElapsed(Math.floor((Date.now() - start) / 1000))
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [serving?.id])

  function formatElapsed(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function triggerDismiss(id, action) {
    setDismissingId(id)
    setTimeout(() => {
      action()
      setDismissingId(null)
    }, 680)
  }

  useEffect(() => {
    if (location.state?.openAddPanel) {
      setShowAddPanel(true)
    }
  }, [location.state])

  // ── Toast helper ─────────────────────────────────────────────────────────────

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Session management ───────────────────────────────────────────────────────

  function closeSession() {
    setSessionOpen(false)
    setShowConfirm(false)
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const notified      = patients.find(p => p.status === 'notified')
  const waiting       = patients.filter(p => p.status === 'waiting')
  const completedList = patients.filter(p => p.status === 'done' || p.status === 'transferred')
  const queueRows     = [...(notified ? [notified] : []), ...waiting]

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Sidebar showAddPatient />

      {/* ── Add Patient Panel ──────────────────────────────────────────────── */}
      <AddPatientPanel
        open={showAddPanel}
        onClose={() => setShowAddPanel(false)}
        onAdd={(fields) => {
          addPatient(fields)
          setShowAddPanel(false)
          showToast('Patient added · Token assigned · WhatsApp notification will be sent')
        }}
      />

      {/* ── Close Session Confirmation ─────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-8 max-w-sm w-full mx-4 clinical-shadow">
            <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-error text-2xl">warning</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-on-surface mb-2">Are you sure?</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              This will end today's OPD session.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-lg border border-outline-variant/30 text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={closeSession}
                className="flex-1 py-3 rounded-lg bg-error text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-24 right-8 z-[70] bg-on-surface text-inverse-on-surface px-5 py-4 rounded-xl clinical-shadow flex items-center gap-3 max-w-xs">
          <span className="material-symbols-outlined text-secondary-fixed text-xl shrink-0">check_circle</span>
          <p className="text-sm font-medium leading-snug">{toast}</p>
        </div>
      )}

      <main className="ml-16 lg:ml-64 h-screen flex flex-col overflow-hidden">
        {/* Top Nav */}
        <header className="sticky top-0 z-50 flex justify-between items-center px-8 h-16 w-full bg-slate-50/80 backdrop-blur-md border-b border-slate-200 shadow-sm font-sans tracking-tight text-sm">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tighter text-slate-900 leading-none">Baari</span>
              <span className="text-[10px] font-medium text-slate-500 tracking-normal">It&apos;s your turn now</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <span className="material-symbols-outlined text-lg">search</span>
              </span>
              <input className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-1.5 text-xs focus:ring-2 focus:ring-secondary/20 w-64" placeholder="Search records..." type="text" />
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95 duration-150">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95 duration-150">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden ml-2 border border-slate-300" />
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full flex-1 overflow-hidden flex flex-col">

          {/* ── Page Header ───────────────────────────────────────────────── */}
          <div className="flex justify-between items-start mb-10 gap-4 flex-wrap shrink-0">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Queue Management</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-on-surface-variant text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary pulse-secondary"></span>
                  Live updates for Wing A — {queueRows.length} patient{queueRows.length !== 1 ? 's' : ''} waiting
                </p>
                {/* Session badge */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  sessionOpen
                    ? 'bg-secondary/10 text-secondary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sessionOpen ? 'bg-secondary animate-pulse' : 'bg-outline-variant'}`} />
                  {sessionOpen ? 'Session Active' : 'No Active Session'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Open / Close Session button */}
              <button
                onClick={sessionOpen ? () => setShowConfirm(true) : () => setSessionOpen(true)}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-[0.97] ${
                  sessionOpen
                    ? 'border border-error/40 text-error hover:bg-error/5'
                    : 'bg-secondary text-white hover:brightness-110 shadow-sm'
                }`}
              >
                {sessionOpen ? 'Close Session' : 'Open Session'}
              </button>

              <div className="bg-surface-container-low px-4 py-3 rounded-xl text-center min-w-[110px]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Avg. Wait</p>
                <p className="text-xl font-bold tracking-tight">{mockStats.avgWait}<span className="text-xs font-medium ml-1">min</span></p>
              </div>
              <div className="bg-surface-container-low px-4 py-3 rounded-xl text-center min-w-[110px]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Daily</p>
                <p className="text-xl font-bold tracking-tight">{patients.length}</p>
              </div>
            </div>
          </div>

          {/* ── Main Grid ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">

            {/* Currently Serving */}
            <div className="lg:col-span-4 space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Currently Serving</h3>
              <div className="bg-secondary-container/30 border border-secondary/20 rounded-xl p-6 ambient-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className="bg-secondary-fixed text-on-secondary-fixed-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {serving ? 'In Consultation' : 'Clear'}
                  </span>
                </div>

                {serving ? (
                  <div className={`flex flex-col h-full ${dismissingId === serving.id ? 'animate-whoosh-done' : ''}`}>
                    <div className="mb-6">
                      <span className="text-4xl font-black text-secondary tracking-tighter">{serving.token}</span>
                      <h4 className="text-2xl font-bold mt-2">{serving.name}</h4>
                      <p className="text-on-surface-variant text-sm mt-1">{serving.dept} • {serving.doctor}</p>

                      {/* Consultation timer */}
                      <div className="mt-4 flex items-center gap-2 bg-secondary/10 rounded-lg px-3 py-2 w-fit">
                        <span className="material-symbols-outlined text-secondary text-base animate-pulse">timer</span>
                        <span className="text-secondary font-black text-sm tracking-tighter tabular-nums">
                          {formatElapsed(elapsed)}
                        </span>
                        <span className="text-secondary/60 text-[10px] font-bold uppercase tracking-widest">In Room</span>
                      </div>
                    </div>
                    <div className="mt-auto space-y-3">
                      <button
                        onClick={() => triggerDismiss(serving.id, callNext)}
                        className="w-full py-4 bg-secondary text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        Mark Done
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => recallPatient(serving.id)}
                          className="py-3 bg-surface-container-lowest text-on-surface-variant rounded-lg font-semibold text-xs border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
                        >
                          Re-call
                        </button>
                        <button
                          onClick={() => transferPatient(serving.id)}
                          className="py-3 bg-surface-container-lowest text-on-surface-variant rounded-lg font-semibold text-xs border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
                        >
                          Transfer
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-3 opacity-30">task_alt</span>
                    <p className="text-sm font-semibold">Queue is clear</p>
                    <p className="text-xs mt-1 opacity-60">No patient in consultation</p>
                    {queueRows.length > 0 && (
                      <button
                        onClick={callNext}
                        className="mt-5 w-full py-3 bg-secondary text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">play_arrow</span>
                        Start Queue
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-surface-container-low rounded-xl p-6">
                <h4 className="text-sm font-bold mb-4">Patient History Notes</h4>
                {serving?.note ? (
                  <div className="flex gap-3">
                    <div className="w-1 self-stretch bg-outline-variant rounded-full shrink-0"></div>
                    <p className="text-xs text-on-surface-variant leading-relaxed italic">&quot;{serving.note}&quot;</p>
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant opacity-50 italic">No notes on file.</p>
                )}
              </div>
            </div>

            {/* Queue List */}
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-6 px-1 shrink-0">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Up Next (Queue)</h3>
                <div className="flex gap-2">
                  <button className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded-md transition-colors">
                    <span className="material-symbols-outlined text-sm">filter_list</span>
                  </button>
                  <button className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded-md transition-colors">
                    <span className="material-symbols-outlined text-sm">sort</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                {queueRows.length === 0 && (
                  <div className="bg-surface-container-low rounded-xl p-10 flex flex-col items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-3 opacity-30">group_off</span>
                    <p className="text-sm font-semibold">No patients in queue</p>
                  </div>
                )}

                {queueRows.map((patient) => {
                  const isNotified = patient.status === 'notified'
                  return (
                    <div
                      key={patient.id}
                      className={`rounded-xl p-5 flex items-center gap-6 transition-all group ambient-shadow ${
                        isNotified
                          ? 'bg-secondary-container/30 border border-secondary/20'
                          : 'bg-surface-container-lowest border-transparent hover:bg-surface-bright'
                      } ${dismissingId === patient.id ? 'animate-whoosh-done' : ''}`}
                    >
                      <div className="text-center w-16">
                        <p className={`text-2xl font-black tracking-tighter ${isNotified ? 'text-secondary' : 'text-primary'}`}>
                          {patient.token}
                        </p>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase mt-1">Token</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h5 className="font-bold text-lg tracking-tight">{patient.name}</h5>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            isNotified
                              ? 'bg-secondary text-white'
                              : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                          }`}>
                            {isNotified ? 'Notified' : 'Waiting'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            Added {patient.addedAgo}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">{patient.deptIcon}</span>
                            {patient.dept}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isNotified && (
                          <button
                            onClick={callNext}
                            className="flex items-center justify-center gap-1 px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all active:scale-95 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-sm">volume_up</span>
                            Call Next
                          </button>
                        )}
                        <button
                          onClick={() => skipPatient(patient.id)}
                          className="p-2 text-on-surface-variant bg-surface-container-low hover:bg-surface-container-high rounded-lg transition-colors active:scale-95"
                          title="Send to back of queue"
                        >
                          <span className="material-symbols-outlined text-lg">redo</span>
                        </button>
                        <button
                          onClick={() => triggerDismiss(patient.id, () => markDone(patient.id))}
                          className="p-2 text-on-surface-variant bg-surface-container-low hover:bg-surface-container-high rounded-lg transition-colors active:scale-95"
                          title="Mark as done"
                        >
                          <span className="material-symbols-outlined text-lg">done_all</span>
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Completed / Transferred */}
                {completedList.map((patient) => (
                  <div key={patient.id} className="bg-surface-container-low/50 opacity-60 rounded-xl p-5 flex items-center gap-6 grayscale">
                    <div className="text-center w-16">
                      <p className="text-2xl font-black text-on-surface-variant tracking-tighter">{patient.token}</p>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase mt-1">Token</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h5 className="font-bold text-lg tracking-tight">{patient.name}</h5>
                        <span className="bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          {patient.status === 'transferred' ? 'Transferred' : 'Done'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">task_alt</span>
                          {patient.status === 'transferred' ? 'Transferred out' : 'Completed'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-4">Session Ended</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-8 right-8 z-50 group/fab flex flex-col items-end gap-2">
        {/* Tooltip — shown on hover when session is closed */}
        {!sessionOpen && (
          <span className="mb-1 px-3 py-1.5 bg-on-surface text-inverse-on-surface text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/fab:opacity-100 transition-opacity pointer-events-none">
            Open a session first
          </span>
        )}
        <button
          onClick={() => { if (sessionOpen) setShowAddPanel(true) }}
          disabled={!sessionOpen}
          className={`h-14 w-14 bg-primary text-white rounded-full flex items-center justify-center ambient-shadow transition-all ${
            sessionOpen
              ? 'hover:scale-105 active:scale-95 cursor-pointer'
              : 'opacity-40 cursor-not-allowed'
          }`}
        >
          <span className="material-symbols-outlined text-3xl">person_add</span>
        </button>
      </div>
    </div>
  )
}
