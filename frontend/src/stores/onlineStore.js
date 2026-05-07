import { create } from 'zustand'

export const useOnlineStore = create((set) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setOnline: (online) => set({ online }),
}))
