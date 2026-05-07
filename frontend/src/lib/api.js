import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // refreshToken cookie
})

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
}

// Update token in localStorage and trigger authStore sync
function updateStoredToken(token) {
  if (token) {
    localStorage.setItem('accessToken', token)
  } else {
    localStorage.removeItem('accessToken')
  }
  // Dispatch custom event to notify authStore
  window.dispatchEvent(new CustomEvent('token-refreshed', { detail: { token } }))
}

// Flag to prevent multiple refresh attemptsa
let isRefreshing = false
let refreshSubscribers = []

// Subscribe to token refresh
function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback)
}

// Notify all subscribers with new token
function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken))
  refreshSubscribers = []
}

// Handle 401 errors with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If not 401 or already retried, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Mark as retried to prevent infinite loop
    originalRequest._retry = true

    if (isRefreshing) {
      // Wait for refresh to complete then retry
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          resolve(api(originalRequest))
        })
      })
    }

    isRefreshing = true

    try {
      // Call refresh endpoint - cookie is sent automatically
      const { data } = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      )

      const newToken = data?.data?.accessToken
      if (!newToken) throw new Error('No token received')

      // Update token in axios + localStorage + authStore
      setAuthToken(newToken)
      updateStoredToken(newToken)

      // Notify all waiting requests
      onTokenRefreshed(newToken)

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)

    } catch (refreshError) {
      // Refresh failed - clear all tokens and redirect to login
      setAuthToken('')
      updateStoredToken('')
      window.location.href = '/login'
      return Promise.reject(refreshError)

    } finally {
      isRefreshing = false
    }
  }
)

export default api

