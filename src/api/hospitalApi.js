import api from './apiClient'

const hospitalApi = {
  list: async () => {
    const res = await api.get('/api/hospitals')
    if (!res.ok) throw new Error('Failed to fetch hospitals')
    return res.json()
  },

  create: async ({ name, address, phone, whatsappSenderId }) => {
    const res = await api.post('/api/hospitals', { name, address, phone, whatsappSenderId })
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to create hospital')
      throw new Error(msg)
    }
    return res.json()
  },

  createAdmin: async (hospitalId, { name, email, password }) => {
    const res = await api.post(`/api/hospitals/${hospitalId}/admin`, {
      name,
      email,
      password,
      role: 'HOSPITAL_ADMIN',
      doctorId: null,
    })
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to create admin account')
      throw new Error(msg)
    }
    return res.json()
  },

  regenerateDisplayToken: async (id) => {
    const res = await api.put(`/api/hospitals/${id}/display-token/regenerate`)
    if (!res.ok) throw new Error('Failed to regenerate token')
    return res.json()
  },
}

export default hospitalApi
