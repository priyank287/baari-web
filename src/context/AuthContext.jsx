import { createContext, useContext, useState } from 'react'
import api from '../api/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('baari_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  async function login(email, password) {
    const response = await api.post('/api/auth/login', { email, password })

    if (!response.ok) {
      // 401 = bad credentials, anything else = server error
      throw new Error(response.status === 401 ? 'Invalid email or password.' : 'Something went wrong. Try again.')
    }

    const data = await response.json()

    const userData = {
      name:       data.name,
      role:       data.role,
      hospitalId: data.hospitalId,
    }

    localStorage.setItem('baari_token', data.token)
    localStorage.setItem('baari_user', JSON.stringify(userData))
    setUser(userData)

    return userData
  }

  function logout() {
    localStorage.removeItem('baari_token')
    localStorage.removeItem('baari_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
