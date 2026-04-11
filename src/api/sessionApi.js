import api from './apiClient'

const sessionApi = {
  getOpenSessions: async () => {
    const res = await api.get('/api/sessions/open')
    if (!res.ok) throw new Error('Failed to fetch sessions')
    return res.json()
  },

  openSession: async (doctorId, departmentId, label) => {
    const res = await api.post('/api/sessions', { doctorId, departmentId, label })
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to open session')
      throw new Error(msg)
    }
    return res.json()
  },

  closeSession: async (id) => {
    const res = await api.patch(`/api/sessions/${id}/close`)
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to close session')
      throw new Error(msg)
    }
    return res.json()
  },
}

export default sessionApi
