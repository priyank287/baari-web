import { useState, useEffect } from 'react'
import queueApi from '../api/queueApi'

const EMPTY = { name: '', phone: '' }

function validate(f) {
  const e = {}
  if (!f.name || f.name.trim().length < 2)
    e.name = 'Name must be at least 2 characters'
  if (!/^\d{10}$/.test(f.phone))
    e.phone = 'Enter a valid 10-digit mobile number'
  return e
}

// session: SessionDto | null
export default function AddPatientPanel({ open, session, onClose, onAdd }) {
  const [fields, setFields]     = useState(EMPTY)
  const [errors, setErrors]     = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleChange(e) {
    const { name, value } = e.target
    setFields(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  function handleNumericChange(name, maxLen) {
    return (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, maxLen)
      setFields(prev => ({ ...prev, [name]: val }))
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(fields)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    if (!session) return

    setSubmitting(true)
    setApiError('')
    try {
      const entry = await queueApi.addToQueue(session.id, fields.name.trim(), fields.phone)
      onAdd(entry)
      setFields(EMPTY)
      setErrors({})
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setFields(EMPTY)
    setErrors({})
    setApiError('')
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm" onClick={handleClose} />

      {/* Slide panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-[70] bg-surface-container-lowest shadow-2xl flex flex-col">
        {/* Panel header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant/20 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-on-surface">Add Patient</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {session
                ? `Adding to ${session.doctorName}'s queue`
                : "Register a walk-in for today's session"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

            {apiError && (
              <div className="flex items-center gap-2 bg-error/10 border border-error/20 text-error rounded-lg px-3 py-2 text-xs">
                <span className="material-symbols-outlined text-base">error</span>
                {apiError}
              </div>
            )}

            {/* Patient Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Patient Name <span className="text-error">*</span>
              </label>
              <input
                name="name"
                value={fields.name}
                onChange={handleChange}
                placeholder="e.g. Aditya Sharma"
                className={`w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 transition-all ${
                  errors.name ? 'ring-error' : 'ring-transparent focus:ring-secondary/30'
                }`}
              />
              {errors.name && <FieldError msg={errors.name} />}
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">
                Mobile Number <span className="text-error">*</span>
              </label>
              <input
                name="phone"
                value={fields.phone}
                onChange={handleNumericChange('phone', 10)}
                placeholder="10-digit number"
                inputMode="numeric"
                className={`w-full px-4 py-3 rounded-lg bg-surface-container-low text-sm text-on-surface placeholder:text-outline border-0 outline-none ring-2 transition-all ${
                  errors.phone ? 'ring-error' : 'ring-transparent focus:ring-secondary/30'
                }`}
              />
              {errors.phone && <FieldError msg={errors.phone} />}
            </div>

            {/* Session — read-only */}
            {session && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant block">
                  Attending Doctor
                </label>
                <div className="w-full px-4 py-3 rounded-lg bg-surface-container text-sm text-on-surface-variant flex items-center gap-2 select-none">
                  <span className="material-symbols-outlined text-sm">person</span>
                  {session.doctorName}
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-outline">{session.departmentName}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-outline-variant/20 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 rounded-lg border border-outline-variant/30 text-on-surface-variant font-semibold text-sm hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !session}
              className="flex-1 py-3 rounded-lg bg-secondary text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {submitting
                ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-sm">person_add</span>
              }
              {submitting ? 'Adding…' : 'Add to Queue'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function FieldError({ msg }) {
  return (
    <p className="text-[11px] text-error font-medium flex items-center gap-1 mt-1">
      <span className="material-symbols-outlined text-sm leading-none">error</span>
      {msg}
    </p>
  )
}
