import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api, { setAuthToken } from '@/api/apiClient'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: '',
      profile: null,
      allowDocumentReupload: false,
      loading: true,

      setToken: (token) => {
        set({ token })
        setAuthToken(token)
        if (token) {
          localStorage.setItem('accessToken', token)
        } else {
          localStorage.removeItem('accessToken')
        }
      },

      setProfile: (profile) => set({ profile }),

      setAllowDocumentReupload: (allow) => set({ allowDocumentReupload: allow }),

      setLoading: (loading) => set({ loading }),

      refreshMe: async () => {
        const { data } = await api.get('/auth/me')
        const d = data?.data
        set({
          profile: d?.profile || null,
          allowDocumentReupload: !!d?.allowDocumentReupload
        })
        return d?.profile || null
      },

      initializeAuth: async () => {
        const { token, setToken, setProfile, setAllowDocumentReupload, setLoading } = get()

        if (!token) {
          setProfile(null)
          setAllowDocumentReupload(false)
          setLoading(false)
          return
        }

        try {
          const { data } = await api.get('/auth/me')
          const d = data?.data
          setProfile(d?.profile || null)
          setAllowDocumentReupload(!!d?.allowDocumentReupload)
        } catch {
          setToken('')
          setProfile(null)
          setAllowDocumentReupload(false)
        } finally {
          setLoading(false)
        }
      },

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        const payload = data?.data
        const { setToken, setProfile, setAllowDocumentReupload } = get()

        setToken(payload?.accessToken || '')
        setProfile(payload?.profile || null)
        setAllowDocumentReupload(!!payload?.allowDocumentReupload)
        return payload
      },

      register: async (payload) => {
        const { data } = await api.post('/auth/register', payload)
        const res = data?.data

        if (res?.requiresEmailConfirmation) {
          return res
        }

        const { setToken, setProfile, setAllowDocumentReupload } = get()

        setToken(res?.accessToken || '')
        setProfile(res?.profile || null)
        setAllowDocumentReupload(!!res?.allowDocumentReupload)
        return res
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore server errors during logout
        }
        const { setToken, setProfile, setAllowDocumentReupload } = get()
        setToken('')
        setProfile(null)
        setAllowDocumentReupload(false)
      },

      updateProfile: async (fields) => {
        const { data } = await api.put('/auth/profile', fields)
        const p = data?.data?.profile
        get().setProfile(p || null)
        return p
      },

      uploadAvatar: async (file) => {
        const form = new FormData()
        form.append('avatar', file)
        const { data } = await api.post('/auth/upload-avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const url = data?.data?.url
        if (url) {
          get().setProfile((p) => (p ? { ...p, avatar_url: url } : p))
        }
        try {
          await get().refreshMe()
        } catch {
          // keep optimistic update if refresh fails
        }
        return data?.data
      },

      uploadDocument: async (file, docType) => {
        const form = new FormData()
        form.append('document', file)
        form.append('docType', docType)
        const { data } = await api.post('/auth/upload-document', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const url = data?.data?.url
        if (url) {
          get().setProfile((p) => {
            if (!p) return p
            if (docType === 'rc') return { ...p, rc_image_url: url }
            if (docType === 'id_card') return { ...p, id_card_url: url }
            return p
          })
        }
        try {
          await get().refreshMe()
        } catch {
          // keep optimistic update if refresh fails
        }
        return data?.data
      },

      heartbeat: async () => {
        try {
          await api.post('/auth/heartbeat')
          const { data } = await api.get('/auth/me')
          const d = data?.data
          if (d?.profile) {
            const { setProfile, setAllowDocumentReupload } = get()
            setProfile(d.profile)
            setAllowDocumentReupload(!!d?.allowDocumentReupload)
          }
        } catch {
          // Silently fail
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthToken(state.token)
        }
      },
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('token-refreshed', (event) => {
    const { token } = event.detail
    const store = useAuthStore.getState()
    if (store.token !== token) {
      store.setToken(token)
    }
  })
}

export const useAuth = () => {
  const store = useAuthStore()
  return {
    token: store.token,
    profile: store.profile,
    allowDocumentReupload: store.allowDocumentReupload,
    loading: store.loading,
    setProfile: store.setProfile,
    login: store.login,
    register: store.register,
    logout: store.logout,
    refreshMe: store.refreshMe,
    updateProfile: store.updateProfile,
    uploadAvatar: store.uploadAvatar,
    uploadDocument: store.uploadDocument,
    heartbeat: store.heartbeat,
  }
}
