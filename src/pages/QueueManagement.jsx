import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import AddPatientPanel from '../components/AddPatientPanel'
import sessionApi from '../api/sessionApi'
import queueApi from '../api/queueApi'
import doctorApi from '../api/doctorApi'
import departmentApi from '../api/departmentApi'
import { useAuth } from '../context/AuthContext'

const SESSION_LABELS = ['MORNING', 'EVENING', 'FULL_DAY']

function fmtToken(n) {
  return String(n).padStart(3, '0')
}

function useElapsed(calledAt) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!calledAt) { setElapsed(0); return }
    // Append Z to treat the server's LocalDateTime (Docker UTC) as UTC
    const iso = calledAt.endsWith('Z') ? calledAt : calledAt + 'Z'
    const start = new Date(iso).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [calledAt])
  return elapsed
}

function formatElapsed(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function QueueManagement() {
  const location = useLocation()
  const { user } = useAuth()
  const isDoctor = user?.role === 'DOCTOR'

  // Sessions
  const [sessions, setSessions]             = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Queue
  const [queueEntries, setQueueEntries] = useState([])
  const [loadingQueue, setLoadingQueue] = useState(false)
  const pollRef = useRef(null)

  // UI state
  const [showAddPanel, setShowAddPanel]   = useState(false)
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [toast, setToast]                 = useState(null)
  const [dismissingId, setDismissingId]   = useState(null)

  // Derived
  const activeSession   = sessions.find(s => s.id === activeSessionId) ?? null
  const serving         = queueEntries.find(e => e.status === 'CALLED') ?? null
  const waitingRows     = queueEntries.filter(e => e.status === 'WAITING')
  const completedRows   = queueEntries.filter(e => ['DONE', 'SKIPPED', 'NO_SHOW'].includes(e.status))

  const waitElapsed = useElapsed(serving?.calledAt ?? null)

  // Per-entry consultation start time (local state, lost on refresh — acceptable)
  const [consultStartedAt, setConsultStartedAt] = useState({})
  const consultIso = serving ? (consultStartedAt[serving.id] ?? null) : null
  const consultElapsed = useElapsed(consultIso)
  const inConsultation = !!consultIso

  // ── Load sessions ──────────────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    try {
      const data = await sessionApi.getOpenSessions()
      // Doctors only see their own session
      const visible = isDoctor && user?.doctorId
        ? data.filter(s => s.doctorId === user.doctorId)
        : data
      setSessions(visible)
      setActiveSessionId(prev => {
        if (prev && visible.find(s => s.id === prev)) return prev
        return visible.length > 0 ? visible[0].id : null
      })
    } catch (err) {
      console.error(err)
    }
  }, [isDoctor, user?.doctorId])

  useEffect(() => {
    loadSessions().finally(() => setLoadingSessions(false))
  }, [loadSessions])

  // ── Load queue + polling ───────────────────────────────────────────────────

  const fetchQueue = useCallback(async () => {
    if (!activeSessionId) return
    try {
      const data = await queueApi.getQueue(activeSessionId)
      setQueueEntries(data)
    } catch (err) {
      console.error(err)
    }
  }, [activeSessionId])

  useEffect(() => {
    if (!activeSessionId) { setQueueEntries([]); return }
    setLoadingQueue(true)
    fetchQueue().finally(() => setLoadingQueue(false))
    clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchQueue, 10_000)
    return () => clearInterval(pollRef.current)
  }, [activeSessionId, fetchQueue])

  // ── Open add panel from sidebar ────────────────────────────────────────────

  useEffect(() => {
    if (location.state?.openAddPanel) setShowAddPanel(true)
  }, [location.state])

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Queue actions ──────────────────────────────────────────────────────────

  async function handleCall(entryId) {
    const isRecall = queueEntries.find(e => e.id === entryId)?.status === 'CALLED'
    try {
      await queueApi.call(entryId)
      await fetchQueue()
      if (isRecall) showToast('Patient re-called')
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  async function handleStartConsultation(entryId) {
    setConsultStartedAt(prev => ({ ...prev, [entryId]: new Date().toISOString() }))
  }

  async function handleRequeue(entryId) {
    try {
      await queueApi.requeue(entryId)
      setConsultStartedAt(prev => { const n = { ...prev }; delete n[entryId]; return n })
      await fetchQueue()
      showToast('Patient requeued')
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  async function handleRemind(entryId) {
    try {
      await queueApi.remind(entryId)
      showToast('Reminder SMS sent')
    } catch (err) {
      showToast(`Error: ${err.message}`)
    }
  }

  async function handleDone(entryId) {
    setConsultStartedAt(prev => { const n = { ...prev }; delete n[entryId]; return n })
    setDismissingId(entryId)
    setTimeout(async () => {
      try {
        await queueApi.done(entryId)
        // Auto-advance: call the next waiting patient automatically
        const updated = await queueApi.getQueue(activeSessionId)
        const nextWaiting = updated.find(e => e.status === 'WAITING')
        if (nextWaiting) {
          await queueApi.call(nextWaiting.id)
        }
        await fetchQueue()
      } catch (err) {
        showToast(`Error: ${err.message}`)
      } finally {
        setDismissingId(null)
      }
    }, 680)
  }

  async function handleSkip(entryId) {
    setDismissingId(entryId)
    setTimeout(async () => {
      try {
        await queueApi.skip(entryId)
        // Auto-advance if no one else is being called
        const updated = await queueApi.getQueue(activeSessionId)
        const stillCalled = updated.find(e => e.status === 'CALLED')
        const nextWaiting = updated.find(e => e.status === 'WAITING')
        if (!stillCalled && nextWaiting) {
          await queueApi.call(nextWaiting.id)
        }
        await fetchQueue()
      } catch (err) {
        showToast(`Error: ${err.message}`)
      } finally {
        setDismissingId(null)
      }
    }, 680)
  }

  async function handleNoShow(entryId) {
    setDismissingId(entryId)
    setTimeout(async () => {
      try {
        await queueApi.noShow(entryId)
        await fetchQueue()
      } catch (err) {
        showToast(`Error: ${err.message}`)
      } finally {
        setDismissingId(null)
      }
    }, 680)
  }

  // ── Open Session ───────────────────────────────────────────────────────────

  async function handleSessionOpened(newSession) {
    setSessions(prev => [...prev, newSession])
    setActiveSessionId(newSession.id)
    setShowOpenModal(false)
    showToast(`Session opened · ${newSession.doctorName} · ${newSession.departmentName}`)
  }

  // ── Close Session ──────────────────────────────────────────────────────────

  async function handleCloseSession() {
    if (!activeSessionId) return
    try {
      await sessionApi.closeSession(activeSessionId)
      setSessions(prev => prev.filter(s => s.id !== activeSessionId))
      setActiveSessionId(null)
      setQueueEntries([])
      setShowCloseConfirm(false)
      showToast('Session closed')
    } catch (err) {
      showToast(`Error: ${err.message}`)
      setShowCloseConfirm(false)
    }
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Sidebar showAddPatient />

      {/* Add Patient Panel */}
      <AddPatientPanel
        open={showAddPanel}
        session={activeSession}
        onClose={() => setShowAddPanel(false)}
        onAdd={(entry) => {
          setQueueEntries(prev => [...prev, entry])
          setShowAddPanel(false)
          showToast(`Patient added · Token ${fmtToken(entry.tokenNumber)} assigned`)
        }}
      />

      {/* Open Session Modal */}
      {showOpenModal && (
        <OpenSessionModal
          onClose={() => setShowOpenModal(false)}
          onOpened={handleSessionOpened}
        />
      )}

      {/* Close Session Confirm */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-8 max-w-sm w-full mx-4 clinical-shadow">
            <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-error text-2xl">warning</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-on-surface mb-2">Close session?</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              This will end {activeSession?.doctorName}'s session. Patients still in queue will not be served.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-3 rounded-lg border border-outline-variant/30 text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseSession}
                className="flex-1 py-3 rounded-lg bg-error text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 right-8 z-[70] bg-on-surface text-inverse-on-surface px-5 py-4 rounded-xl clinical-shadow flex items-center gap-3 max-w-xs">
          <span className="material-symbols-outlined text-secondary-fixed text-xl shrink-0">check_circle</span>
          <p className="text-sm font-medium leading-snug">{toast}</p>
        </div>
      )}

      <main className="ml-16 lg:ml-64 h-screen flex flex-col overflow-hidden">
        {/* Top Nav */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-8 h-16 w-full bg-slate-50/80 backdrop-blur-md border-b border-slate-200 shadow-sm font-sans tracking-tight text-sm">
          <div className="flex flex-col">
            {user?.hospitalName
              ? <span className="text-xl font-black tracking-tight text-slate-900 leading-none">{user.hospitalName}</span>
              : <span className="text-xl font-black tracking-tight text-slate-900 leading-none">Queue Management</span>
            }
            {user?.planType && (
              <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${
                user.planType === 'PRO' ? 'text-teal-600' : 'text-slate-400'
              }`}>{user.planType} Plan</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <RoleAvatar role={user?.role} name={user?.name} />
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full flex-1 overflow-hidden flex flex-col">

          {/* Page Header */}
          <div className="flex justify-between items-start mb-8 gap-4 flex-wrap shrink-0">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Queue Management</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-on-surface-variant text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary pulse-secondary"></span>
                  {activeSession
                    ? `${activeSession.doctorName} · ${activeSession.departmentName}`
                    : 'No session selected'}
                  {waitingRows.length > 0 && ` · ${waitingRows.length} waiting`}
                </p>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  activeSession
                    ? 'bg-secondary/10 text-secondary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeSession ? 'bg-secondary animate-pulse' : 'bg-outline-variant'}`} />
                  {activeSession ? 'Session Active' : 'No Active Session'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Session tabs — each has its own close button */}
              {!isDoctor && sessions.map(s => (
                <div
                  key={s.id}
                  className={`flex items-center gap-1 rounded-lg text-xs font-bold transition-all ${
                    s.id === activeSessionId
                      ? 'bg-secondary text-white'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  <button
                    onClick={() => setActiveSessionId(s.id)}
                    className="px-3 py-1.5"
                  >
                    {s.doctorName.replace('Dr. ', '')}
                  </button>
                  <button
                    onClick={() => { setActiveSessionId(s.id); setShowCloseConfirm(true) }}
                    className={`pr-2 py-1.5 transition-colors ${
                      s.id === activeSessionId
                        ? 'text-white/70 hover:text-white'
                        : 'text-on-surface-variant/50 hover:text-error'
                    }`}
                    title="Close this session"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </div>
              ))}

              {/* Doctor sees only their session tab + close */}
              {isDoctor && activeSession && (
                <div className="flex items-center gap-1 rounded-lg text-xs font-bold bg-secondary text-white">
                  <span className="px-3 py-1.5">{activeSession.doctorName.replace('Dr. ', '')}</span>
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    className="pr-2 py-1.5 text-white/70 hover:text-white"
                    title="Close session"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">close</span>
                  </button>
                </div>
              )}

              {/* Open Session — always available for non-doctors, distinct style */}
              {!isDoctor && (
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="px-4 py-2.5 rounded-lg font-bold text-sm bg-primary text-white hover:brightness-110 shadow-md shadow-primary/30 transition-all active:scale-[0.97] flex items-center gap-1.5 ring-2 ring-primary/20"
                >
                  <span className="material-symbols-outlined text-base leading-none">add_circle</span>
                  Open Session
                </button>
              )}

              <div className="bg-surface-container-low px-4 py-3 rounded-xl text-center min-w-[110px]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Daily</p>
                <p className="text-xl font-bold tracking-tight">{queueEntries.length}</p>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">

            {/* Currently Serving */}
            <div className="lg:col-span-4 space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Currently Serving</h3>
              <div className="bg-secondary-container/30 border border-secondary/20 rounded-xl p-6 ambient-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <span className="bg-secondary-fixed text-on-secondary-fixed-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {serving ? (inConsultation ? 'In Consultation' : 'Called') : 'Clear'}
                  </span>
                </div>

                {serving ? (
                  <div className={`flex flex-col h-full ${dismissingId === serving.id ? 'animate-whoosh-done' : ''}`}>
                    <div className="mb-6">
                      <span className="text-4xl font-black text-secondary tracking-tighter">{fmtToken(serving.tokenNumber)}</span>
                      <h4 className="text-2xl font-bold mt-2">{serving.patientName}</h4>
                      <p className="text-on-surface-variant text-sm mt-1">{activeSession?.departmentName} · {activeSession?.doctorName}</p>

                      {inConsultation ? (
                        /* Consultation timer */
                        <div className="mt-4 flex items-center gap-2 bg-secondary/10 rounded-lg px-3 py-2 w-fit">
                          <span className="material-symbols-outlined text-secondary text-base animate-pulse">timer</span>
                          <span className="text-secondary font-black text-sm tracking-tighter tabular-nums">
                            {formatElapsed(consultElapsed)}
                          </span>
                          <span className="text-secondary/60 text-[10px] font-bold uppercase tracking-widest">In Room</span>
                        </div>
                      ) : (
                        /* Wait timer — time since patient was called */
                        <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-fit">
                          <span className="material-symbols-outlined text-amber-500 text-base animate-pulse">hourglass_top</span>
                          <span className="text-amber-600 font-black text-sm tracking-tighter tabular-nums">
                            {formatElapsed(waitElapsed)}
                          </span>
                          <span className="text-amber-500/80 text-[10px] font-bold uppercase tracking-widest">Waiting</span>
                        </div>
                      )}
                    </div>

                    {inConsultation ? (
                      /* Phase 2: In consultation — Done + Skip */
                      <div className="mt-auto space-y-3">
                        <button
                          onClick={() => handleDone(serving.id)}
                          className="w-full py-4 bg-secondary text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                          Mark Done
                        </button>
                      </div>
                    ) : (
                      /* Phase 1: Patient called, waiting to enter — Start Consultation, Requeue, Re-call */
                      <div className="mt-auto space-y-3">
                        <button
                          onClick={() => handleStartConsultation(serving.id)}
                          className="w-full py-4 bg-secondary text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-lg">play_arrow</span>
                          Start Consultation
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleRequeue(serving.id)}
                            className="py-3 bg-surface-container-lowest text-on-surface-variant rounded-lg font-semibold text-xs border border-outline-variant/30 hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1"
                            title={serving.requeueCount === 0 ? 'Move to position 3' : 'Move to end of queue'}
                          >
                            <span className="material-symbols-outlined text-sm">low_priority</span>
                            Requeue {serving.requeueCount > 0 ? '→ Last' : '→ #3'}
                          </button>
                          <button
                            onClick={() => handleRemind(serving.id)}
                            className="py-3 bg-surface-container-lowest text-on-surface-variant rounded-lg font-semibold text-xs border border-outline-variant/30 hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1"
                            title="Send reminder SMS"
                          >
                            <span className="material-symbols-outlined text-sm">sms</span>
                            Re-call
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl mb-3 opacity-30">task_alt</span>
                    <p className="text-sm font-semibold">Queue is clear</p>
                    <p className="text-xs mt-1 opacity-60">No patient in consultation</p>
                    {waitingRows.length > 0 && (
                      <button
                        onClick={() => handleCall(waitingRows[0].id)}
                        className="mt-5 w-full py-3 bg-secondary text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">play_arrow</span>
                        Start Queue
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Queue List */}
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-6 px-1 shrink-0">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Up Next (Queue)</h3>
              </div>

              {loadingQueue ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-surface-container-low rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
                  {waitingRows.length === 0 && completedRows.length === 0 && (
                    <div className="bg-surface-container-low rounded-xl p-10 flex flex-col items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl mb-3 opacity-30">group_off</span>
                      <p className="text-sm font-semibold">
                        {activeSession ? 'No patients in queue' : 'Select or open a session to see the queue'}
                      </p>
                    </div>
                  )}

                  {waitingRows.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-xl p-5 flex items-center gap-6 transition-all group ambient-shadow bg-surface-container-lowest border-transparent hover:bg-surface-bright ${
                        dismissingId === entry.id ? 'animate-whoosh-done' : ''
                      }`}
                    >
                      <div className="text-center w-16">
                        <p className="text-2xl font-black tracking-tighter text-primary">
                          {fmtToken(entry.tokenNumber)}
                        </p>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase mt-1">Token</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h5 className="font-bold text-lg tracking-tight">{entry.patientName}</h5>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-tertiary-fixed text-on-tertiary-fixed-variant">
                            Waiting
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                          {entry.waitTimeMinutes != null && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              ~{entry.waitTimeMinutes} min wait
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!serving && (
                          <button
                            onClick={() => handleCall(entry.id)}
                            className="flex items-center justify-center gap-1 px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:brightness-110 transition-all active:scale-95 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-sm">volume_up</span>
                            Call
                          </button>
                        )}
                        <button
                          onClick={() => handleSkip(entry.id)}
                          className="p-2 text-on-surface-variant bg-surface-container-low hover:bg-surface-container-high rounded-lg transition-colors active:scale-95"
                          title="Send to back of queue"
                        >
                          <span className="material-symbols-outlined text-lg">redo</span>
                        </button>
                        <button
                          onClick={() => handleNoShow(entry.id)}
                          className="p-2 text-on-surface-variant bg-surface-container-low hover:bg-error/10 hover:text-error rounded-lg transition-colors active:scale-95"
                          title="Mark as no-show"
                        >
                          <span className="material-symbols-outlined text-lg">person_off</span>
                        </button>
                        <button
                          onClick={() => handleDone(entry.id)}
                          className="p-2 text-on-surface-variant bg-surface-container-low hover:bg-surface-container-high rounded-lg transition-colors active:scale-95"
                          title="Mark as done"
                        >
                          <span className="material-symbols-outlined text-lg">done_all</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Completed rows */}
                  {completedRows.map((entry) => (
                    <div key={entry.id} className="bg-surface-container-low/50 opacity-60 rounded-xl p-5 flex items-center gap-6 grayscale">
                      <div className="text-center w-16">
                        <p className="text-2xl font-black text-on-surface-variant tracking-tighter">{fmtToken(entry.tokenNumber)}</p>
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase mt-1">Token</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h5 className="font-bold text-lg tracking-tight">{entry.patientName}</h5>
                          <span className="bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                            {entry.status === 'DONE' ? 'Done' : entry.status === 'SKIPPED' ? 'Skipped' : 'No Show'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FAB */}
      <div className="fixed bottom-8 right-8 z-50 group/fab flex flex-col items-end gap-2">
        {!activeSession && (
          <span className="mb-1 px-3 py-1.5 bg-on-surface text-inverse-on-surface text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/fab:opacity-100 transition-opacity pointer-events-none">
            Open a session first
          </span>
        )}
        <button
          onClick={() => { if (activeSession) setShowAddPanel(true) }}
          disabled={!activeSession}
          className={`h-14 w-14 bg-primary text-white rounded-full flex items-center justify-center ambient-shadow transition-all ${
            activeSession
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

// ── Role Avatar ───────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  DOCTOR:         { icon: 'stethoscope',    bg: 'bg-blue-100',   text: 'text-blue-600',   label: 'Doctor' },
  RECEPTIONIST:   { icon: 'badge',          bg: 'bg-violet-100', text: 'text-violet-600', label: 'Receptionist' },
  HOSPITAL_ADMIN: { icon: 'admin_panel_settings', bg: 'bg-teal-100', text: 'text-teal-600', label: 'Admin' },
  SUPER_ADMIN:    { icon: 'shield_person',  bg: 'bg-amber-100',  text: 'text-amber-600',  label: 'Super Admin' },
}

function RoleAvatar({ role, name }) {
  const cfg = ROLE_CONFIG[role] ?? { icon: 'person', bg: 'bg-slate-100', text: 'text-slate-500', label: role }
  return (
    <div className="flex items-center gap-2.5" title={`${name} · ${cfg.label}`}>
      <div className={`h-9 w-9 rounded-full ${cfg.bg} flex items-center justify-center border border-white shadow-sm`}>
        <span className={`material-symbols-outlined text-lg ${cfg.text}`}>{cfg.icon}</span>
      </div>
      <div className="hidden lg:flex flex-col leading-none">
        <span className="text-sm font-bold text-slate-800 truncate max-w-[120px]">{name}</span>
        <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${cfg.text}`}>{cfg.label}</span>
      </div>
    </div>
  )
}

// ── Open Session Modal ─────────────────────────────────────────────────────────

function OpenSessionModal({ onClose, onOpened }) {
  const [doctors, setDoctors]       = useState([])
  const [departments, setDepartments] = useState([])
  const [doctorId, setDoctorId]     = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [label, setLabel]           = useState('MORNING')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    Promise.all([doctorApi.list(), departmentApi.list()])
      .then(([docs, depts]) => {
        setDoctors(docs)
        setDepartments(depts)
        if (docs.length > 0) setDoctorId(docs[0].id)
        if (depts.length > 0) setDepartmentId(depts[0].id)
      })
      .catch(() => setError('Failed to load doctors or departments'))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!doctorId || !departmentId) return
    setLoading(true)
    setError('')
    try {
      const session = await sessionApi.openSession(doctorId, departmentId, label)
      onOpened(session)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-2xl p-8 max-w-sm w-full mx-4 clinical-shadow">
        <h3 className="text-xl font-bold tracking-tight text-on-surface mb-1">Open Session</h3>
        <p className="text-sm text-on-surface-variant mb-6">Start a new OPD queue for a doctor.</p>

        {error && (
          <div className="flex items-center gap-2 bg-error/10 border border-error/20 text-error rounded-lg px-3 py-2 text-xs mb-4">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Doctor</label>
            <select
              value={doctorId}
              onChange={e => setDoctorId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30"
            >
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name} · {d.specialization}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Department</label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">Session</label>
            <select
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface border-0 outline-none ring-2 ring-transparent focus:ring-secondary/30"
            >
              {SESSION_LABELS.map(l => (
                <option key={l} value={l}>{l.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-outline-variant/30 text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !doctorId || !departmentId}
              className="flex-1 py-3 rounded-lg bg-secondary text-white font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
              Open Session
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
