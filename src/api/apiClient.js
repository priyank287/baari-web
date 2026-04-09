const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

function getToken() {
  return localStorage.getItem('baari_token')
}

async function request(path, options = {}) {
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // Only auto-logout on 401 when a token was already present (expired session)
  // During login there is no token, so a 401 means wrong credentials — let the caller handle it
  if (response.status === 401 && token) {
    localStorage.removeItem('baari_token')
    localStorage.removeItem('baari_user')
    window.location.href = '/login'
    return response
  }

  return response
}

const api = {
  get:    (path)        => request(path, { method: 'GET' }),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body)  => request(path, { method: 'PATCH',  body: body ? JSON.stringify(body) : undefined }),
  put:    (path, body)  => request(path, { method: 'PUT',    body: body ? JSON.stringify(body) : undefined }),
  delete: (path)        => request(path, { method: 'DELETE' }),
}

export default api
