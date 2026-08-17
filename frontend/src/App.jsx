import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth, useAuthStore } from '@/stores/authStore'
import HomePage from '@/pages/home/HomePage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ProfilePage from '@/pages/profile/ProfilePage'
import InventoryPage from '@/pages/inventory/InventoryPage'
import VehiclesPage from '@/pages/vehicles/VehiclesPage'
import SupplierCatalogPage from '@/pages/suppliers/SupplierCatalogPage'
import SupplierRequestsPage from '@/pages/suppliers/SupplierRequestsPage'
import StorePage from '@/pages/store/StorePage'
import StatisticsPage from '@/pages/statistics/StatisticsPage'

function RequireAuth({ children }) {
  const { token, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/inventory" element={<RequireAuth><InventoryPage /></RequireAuth>} />
        <Route path="/vehicles" element={<RequireAuth><VehiclesPage /></RequireAuth>} />
        <Route path="/catalog" element={<RequireAuth><SupplierCatalogPage /></RequireAuth>} />
        <Route path="/supplier/requests" element={<RequireAuth><SupplierRequestsPage /></RequireAuth>} />
        <Route path="/store" element={<RequireAuth><StorePage /></RequireAuth>} />
        <Route path="/statistics" element={<RequireAuth><StatisticsPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
