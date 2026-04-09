import { useEffect, useState } from 'react'
import { mockPatients, mockDoctor } from '../mock/data'

const serving  = mockPatients.find(p => p.status === 'in-consultation')
const upNext   = mockPatients
  .filter(p => p.status === 'notified' || p.status === 'waiting')
  .slice(0, 3)
  .map((p, i) => ({
    label:   i === 0 ? 'Next' : 'Up Coming',
    token:   p.token,
    wait:    p.waitMins > 0 ? `~${p.waitMins} min` : 'Now',
    opacity: i === 0 ? 'text-white/90' : 'text-white/70',
  }))

export default function TVDisplay() {
  const [time, setTime] = useState('')

  useEffect(() => {
    function updateClock() {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div
      className="h-screen w-screen overflow-hidden font-body text-white selection:bg-secondary/30 relative"
      style={{ backgroundColor: '#0A1628' }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-fixed-dim/5 blur-[120px]"></div>
      </div>

      {/* Main */}
      <main className="relative z-10 h-full flex flex-col px-24 py-16">
        {/* Header */}
        <header className="flex justify-between items-end border-b border-white/10 pb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
              BAARI
            </h1>
            <p className="font-label uppercase tracking-[0.3em] text-lg font-bold text-white/80">ITS YOUR TURN NOW</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-light tracking-tight">{time}</div>
            <div className="text-on-primary-container font-label uppercase tracking-widest text-sm font-semibold mt-1">{date}</div>
          </div>
        </header>

        {/* Currently Serving */}
        <section className="flex-1 flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4 text-on-primary-container mb-2">
              <span className="pulse-dot w-4 h-4 rounded-full bg-secondary"></span>
              <span className="font-label uppercase tracking-[0.5em] text-xl font-bold">Now Serving</span>
            </div>
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-secondary/20 blur-[80px] rounded-full scale-150"></div>
              <div className="relative flex flex-col items-center">
                <span className="text-[22rem] leading-none font-black tracking-tighter text-secondary drop-shadow-[0_20px_50px_rgba(0,106,97,0.4)]">
                  {serving?.token ?? '--'}
                </span>
                <div className="px-12 py-4 rounded-full bg-secondary/10 border border-secondary/30 backdrop-blur-md">
                  <span className="text-3xl font-semibold text-secondary-fixed uppercase tracking-widest">Proceed to {mockDoctor.counter}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Next in Line */}
        <footer className="mt-auto">
          <div className="grid grid-cols-3 gap-12">
            {upNext.map(({ label, token, wait, opacity }) => (
              <div key={token} className="group p-10 rounded-xl bg-white/5 border border-white/5 ethereal-blur flex flex-col items-center text-center space-y-4 transition-all duration-500 hover:bg-white/10">
                <span className="font-label uppercase tracking-widest text-on-primary-container text-sm font-bold">{label}</span>
                <span className={`text-7xl font-bold tracking-tight ${opacity}`}>{token}</span>
                <span className="text-lg text-white/40 font-medium">Wait: {wait}</span>
              </div>
            ))}
          </div>
        </footer>

        {/* Status Bar */}
        <div className="absolute bottom-8 left-24 right-24 flex justify-between items-center opacity-30 text-xs uppercase tracking-[0.4em] font-bold">
          <div className="flex items-center gap-6">
            <span>System Online</span>
            <span className="w-1 h-1 bg-white rounded-full"></span>
            <span>Refresh: 5s</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="material-symbols-outlined text-sm">wifi</span>
            <span>Clinica-Secure-5G</span>
          </div>
        </div>
      </main>

      {/* Edge accents */}
      <div className="fixed top-0 left-0 w-1.5 h-full bg-gradient-to-b from-secondary/0 via-secondary/50 to-secondary/0 opacity-20"></div>
      <div className="fixed top-0 right-0 w-1.5 h-full bg-gradient-to-b from-secondary/0 via-secondary/50 to-secondary/0 opacity-20"></div>
    </div>
  )
}
