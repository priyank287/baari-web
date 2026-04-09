import { createContext, useContext, useReducer } from 'react'
import { mockPatients, mockDoctor } from '../mock/data'

// ── Reducer ──────────────────────────────────────────────────────────────────

function reducer(patients, action) {
  switch (action.type) {

    case 'ADD_PATIENT': {
      const maxToken = patients.reduce(
        (max, p) => Math.max(max, parseInt(p.token.replace('#', ''), 10)),
        0,
      )
      const nextToken = `#${String(maxToken + 1).padStart(3, '0')}`
      return [
        ...patients,
        {
          id:       Date.now(),
          token:    nextToken,
          name:     action.fields.name.trim(),
          dept:     action.fields.dept || 'General Medicine',
          deptIcon: 'medical_services',
          addedAgo: 'just now',
          doctor:   mockDoctor.name,
          waitMins: null,
          note:     action.fields.note || '',
          status:   'waiting',
        },
      ]
    }

    case 'CALL_NEXT': {
      const next = patients.map(p => ({ ...p }))
      const inConsIdx    = next.findIndex(p => p.status === 'in-consultation')
      const notifiedIdx  = next.findIndex(p => p.status === 'notified')
      const firstWaitIdx = next.findIndex(p => p.status === 'waiting')
      if (inConsIdx    !== -1) next[inConsIdx].status    = 'done'
      if (notifiedIdx  !== -1) {
        next[notifiedIdx].status               = 'in-consultation'
        next[notifiedIdx].consultationStartedAt = Date.now()
      }
      if (firstWaitIdx !== -1) next[firstWaitIdx].status = 'notified'
      return next
    }

    case 'MARK_DONE':
      return patients.map(p => p.id === action.id ? { ...p, status: 'done' } : p)

    case 'RECALL':
      return patients.map(p => p.id === action.id ? { ...p, status: 'notified' } : p)

    case 'TRANSFER':
      return patients.map(p => p.id === action.id ? { ...p, status: 'transferred' } : p)

    case 'SKIP': {
      const patient = patients.find(p => p.id === action.id)
      if (!patient) return patients
      return [...patients.filter(p => p.id !== action.id), { ...patient, status: 'waiting' }]
    }

    default:
      return patients
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const QueueContext = createContext(null)

// Seed consultationStartedAt for any patient already in-consultation on load
const initialPatients = mockPatients.map(p =>
  p.status === 'in-consultation' ? { ...p, consultationStartedAt: Date.now() } : p
)

export function QueueProvider({ children }) {
  const [patients, dispatch] = useReducer(reducer, initialPatients)

  const actions = {
    addPatient:      (fields) => dispatch({ type: 'ADD_PATIENT', fields }),
    callNext:        ()       => dispatch({ type: 'CALL_NEXT' }),
    markDone:        (id)     => dispatch({ type: 'MARK_DONE', id }),
    recallPatient:   (id)     => dispatch({ type: 'RECALL',    id }),
    transferPatient: (id)     => dispatch({ type: 'TRANSFER',  id }),
    skipPatient:     (id)     => dispatch({ type: 'SKIP',      id }),
  }

  return (
    <QueueContext.Provider value={{ patients, ...actions }}>
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const ctx = useContext(QueueContext)
  if (!ctx) throw new Error('useQueue must be used inside QueueProvider')
  return ctx
}
