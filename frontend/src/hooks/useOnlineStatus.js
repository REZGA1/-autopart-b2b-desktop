import { useEffect, useRef } from 'react'
import { useAuth } from '@/stores/authStore'

const HEARTBEAT_INTERVAL = 60000 // 1 minute

export function useOnlineStatus() {
  const { token, heartbeat } = useAuth()
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!token) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    heartbeat()

    intervalRef.current = setInterval(() => {
      heartbeat()
    }, HEARTBEAT_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [token, heartbeat])
}
