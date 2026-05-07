import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/authStore'

const HEARTBEAT_INTERVAL = 60000 // 1 minute

/**
 * Sends heartbeat to keep user online status updated in the database.
 * Also syncs with browser online/offline events.
 */
export function useOnlineStatus() {
  const { token, heartbeat } = useAuth()
  const intervalRef = useRef(null)

  useEffect(() => {
    // Only send heartbeats if user is logged in
    if (!token) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Send initial heartbeat
    heartbeat()

    // Set up interval for periodic heartbeats
    intervalRef.current = setInterval(() => {
      heartbeat()
    }, HEARTBEAT_INTERVAL)

    // Cleanup on unmount or logout
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [token, heartbeat])
}
