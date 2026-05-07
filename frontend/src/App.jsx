import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth, useAuthStore } from '@/lib/authStore'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ProfilePage from '@/pages/ProfilePage'
import InventoryPage from './pages/InventoryPage.jsx'
import VehiclesPage from './pages/VehiclesPage.jsx'
import SupplierCatalogPage from './pages/SupplierCatalogPage.jsx'
import SupplierRequestsPage from './pages/SupplierRequestsPage.jsx'
import StorePage from './pages/StorePage.jsx'
import StatisticsPage from './pages/StatisticsPage.jsx'

// Protected route component - redirects to login if not authenticated
function RequireAuth({ children }) {
  const { token, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  // Initialize auth state on app mount
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
