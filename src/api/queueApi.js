import api from './apiClient'

const queueApi = {
  getQueue: async (sessionId) => {
    const res = await api.get(`/api/queue?sessionId=${sessionId}`)
    if (!res.ok) throw new Error('Failed to fetch queue')
    return res.json()
  },

  addToQueue: async (sessionId, patientName, mobileNumber) => {
    const res = await api.post('/api/queue/add', { sessionId, patientName, mobileNumber })
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to add patient')
      throw new Error(msg)
    }
    return res.json()
  },

  call: async (id) => {
    const res = await api.patch(`/api/queue/${id}/call`)
    if (!res.ok) { const msg = await res.text().catch(() => 'Failed'); throw new Error(msg) }
    return res.json()
  },
  done: async (id) => {
    const res = await api.patch(`/api/queue/${id}/done`)
    if (!res.ok) { const msg = await res.text().catch(() => 'Failed'); throw new Error(msg) }
    return res.json()
  },
  skip: async (id) => {
    const res = await api.patch(`/api/queue/${id}/skip`)
    if (!res.ok) { const msg = await res.text().catch(() => 'Failed'); throw new Error(msg) }
    return res.json()
  },
  noShow: async (id) => {
    const res = await api.patch(`/api/queue/${id}/no-show`)
    if (!res.ok) { const msg = await res.text().catch(() => 'Failed'); throw new Error(msg) }
    return res.json()
  },
  requeue: async (id) => {
    const res = await api.patch(`/api/queue/${id}/requeue`)
    if (!res.ok) { const msg = await res.text().catch(() => 'Failed'); throw new Error(msg) }
    return res.json()
  },
  remind: async (id) => {
    const res = await api.post(`/api/queue/${id}/remind`)
    if (!res.ok) { const msg = await res.text().catch(() => 'Failed'); throw new Error(msg) }
    return res.json()
  },
}

export default queueApi
