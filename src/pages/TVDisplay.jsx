import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/apiClient'

function fmtToken(n) {
  return String(n).padStart(3, '0')
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18)
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.8)
      osc.start(ctx.currentTime + i * 0.18)
      osc.stop(ctx.currentTime + i * 0.18 + 0.8)
    })
  } catch {
    // Audio not available — silent fail
  }
}

export default function TVDisplay() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [time, setTime]       = useState('')
  const [display, setDisplay] = useState(null)
  const [error, setError]     = useState(null)
  const [flashRows, setFlashRows] = useState({}) // { doctorName: true }
  const prevTokens = useRef({})                  // { doctorName: tokenNumber }
  const pollRef    = useRef(null)

  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  // Clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Fetch display data
  const fetchDisplay = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.get(`/api/queue/display?token=${token}`)
      if (res.status === 404) { setError('invalid-token'); return }
      if (!res.ok) { setError('server-error'); return }
      const data = await res.json()

      // Detect token changes per session → chime + flash
      const newFlash = {}
      data.sessions?.forEach(row => {
        const key = row.doctorName
        const current = row.inConsultation?.tokenNumber ?? null
        const prev = prevTokens.current[key] ?? null
        if (current !== null && current !== prev) {
          newFlash[key] = true
          playChime()
        }
        prevTokens.current[key] = current
      })

      if (Object.keys(newFlash).length > 0) {
        setFlashRows(newFlash)
        setTimeout(() => setFlashRows({}), 2000)
      }

      setDisplay(data)
      setError(null)
    } catch {
      setError('network-error')
    }
  }, [token])

  useEffect(() => {
    if (!token) { setError('no-token'); return }
    fetchDisplay()
    pollRef.current = setInterval(fetchDisplay, 5000)
    return () => clearInterval(pollRef.current)
  }, [token, fetchDisplay])

  // ── Error states ───────────────────────────────────────────────────────────
  if (error === 'no-token' || error === 'invalid-token') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center text-white" style={{ background: '#060E1E' }}>
        <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
        <p className="text-xl font-bold mb-2">
          {error === 'no-token' ? 'No display token provided' : 'Invalid display token'}
        </p>
        <p className="text-white/40 text-sm">
          {error === 'no-token' ? 'Open as /tv?token=YOUR_TOKEN' : 'Check token in Admin console'}
        </p>
      </div>
    )
  }

  const sessions = display?.sessions ?? []

  return (
    <div className="h-screen w-screen overflow-hidden text-white select-none" style={{ background: '#060E1E', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #00897B, transparent)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #1565C0, transparent)' }} />
      </div>

      <div className="relative z-10 h-full flex flex-col px-12 py-8 gap-6">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
              <span className="material-symbols-outlined text-teal-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white leading-none">
                {display?.hospitalName ?? 'Loading…'}
              </h1>
              <p className="text-teal-400/70 text-xs font-bold uppercase tracking-widest mt-0.5">Live Queue Status</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-light tabular-nums tracking-tight">{time}</div>
            <div className="text-white/40 text-xs uppercase tracking-widest font-semibold mt-1">{date}</div>
          </div>
        </header>

        {/* Table */}
        <div className="flex-1 flex flex-col min-h-0">
          {sessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/20">
              <span className="material-symbols-outlined text-6xl">calendar_today</span>
              <p className="text-xl font-semibold uppercase tracking-widest">No active sessions today</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl border border-white/8" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>

              {/* Column headers */}
              <div className="grid grid-cols-12 px-6 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="col-span-3 text-[11px] font-bold uppercase tracking-widest text-white/30">Doctor / Dept</div>
                <div className="col-span-4 text-[11px] font-bold uppercase tracking-widest text-teal-400/60">In Consultation</div>
                <div className="col-span-3 text-[11px] font-bold uppercase tracking-widest text-white/30">Next</div>
                <div className="col-span-2 text-[11px] font-bold uppercase tracking-widest text-white/30">After Next</div>
              </div>

              {/* Session rows */}
              <div className="flex-1 overflow-y-auto divide-y" style={{ divideColor: 'rgba(255,255,255,0.06)' }}>
                {sessions.map((row, idx) => {
                  const isFlashing = flashRows[row.doctorName]
                  const next0 = row.upNext?.[0] ?? null
                  const next1 = row.upNext?.[1] ?? null
                  return (
                    <div
                      key={row.doctorName}
                      className="grid grid-cols-12 px-6 items-center transition-all duration-700"
                      style={{
                        minHeight: sessions.length <= 3 ? '160px' : sessions.length <= 5 ? '120px' : '90px',
                        background: isFlashing ? 'rgba(0,137,123,0.12)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        borderColor: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      {/* Doctor / Dept */}
                      <div className="col-span-3 pr-6">
                        <p className="font-bold text-white/90 truncate" style={{ fontSize: sessions.length <= 3 ? '1.1rem' : '0.95rem' }}>
                          {row.doctorName}
                        </p>
                        <p className="text-white/35 font-medium truncate mt-0.5" style={{ fontSize: '0.8rem' }}>
                          {row.departmentName}
                        </p>
                      </div>

                      {/* In Consultation */}
                      <div className="col-span-4 pr-8">
                        {row.inConsultation ? (
                          <div className={`flex items-center gap-4 ${isFlashing ? 'animate-pulse' : ''}`}>
                            <span
                              className="font-black tabular-nums text-teal-300 leading-none"
                              style={{ fontSize: sessions.length <= 3 ? '4rem' : sessions.length <= 5 ? '3rem' : '2.2rem' }}
                            >
                              {fmtToken(row.inConsultation.tokenNumber)}
                            </span>
                            <div>
                              <p className="font-semibold text-white/80 truncate max-w-[180px]" style={{ fontSize: sessions.length <= 3 ? '1rem' : '0.85rem' }}>
                                {row.inConsultation.patientName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse inline-block" />
                                <span className="text-teal-400/60 text-[10px] font-bold uppercase tracking-widest">Calling</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-white/15 font-black" style={{ fontSize: sessions.length <= 3 ? '3rem' : '2rem' }}>—</span>
                            <span className="text-white/20 text-xs font-bold uppercase tracking-widest">Clear</span>
                          </div>
                        )}
                      </div>

                      {/* Next */}
                      <div className="col-span-3 pr-6">
                        {next0 ? (
                          <div className="flex items-center gap-3">
                            <span className="font-bold tabular-nums text-white/50" style={{ fontSize: sessions.length <= 3 ? '2.5rem' : '1.8rem' }}>
                              {fmtToken(next0.tokenNumber)}
                            </span>
                            <p className="text-white/35 font-medium truncate max-w-[140px]" style={{ fontSize: '0.8rem' }}>{next0.patientName}</p>
                          </div>
                        ) : (
                          <span className="text-white/15 font-bold text-2xl">—</span>
                        )}
                      </div>

                      {/* After Next */}
                      <div className="col-span-2">
                        {next1 ? (
                          <div>
                            <span className="font-bold tabular-nums text-white/30" style={{ fontSize: sessions.length <= 3 ? '2rem' : '1.5rem' }}>
                              {fmtToken(next1.tokenNumber)}
                            </span>
                            <p className="text-white/20 font-medium truncate" style={{ fontSize: '0.75rem' }}>{next1.patientName}</p>
                          </div>
                        ) : (
                          <span className="text-white/15 font-bold text-2xl">—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer status */}
        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-white/15">
          <span>Baari Queue Management</span>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-teal-500 animate-pulse'}`} />
            <span>{error ? 'Reconnecting…' : 'Live · Refreshes every 5s'}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
