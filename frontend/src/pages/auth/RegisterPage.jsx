import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'
import api from '@/api/apiClient'
import Layout from '@/components/common/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ToastNotification from '@/components/common/ToastNotification'
import { useToast } from '@/hooks/useToast'

export default function RegisterPage() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [merchantExists, setMerchantExists] = useState(null)
  const [checkingMerchant, setCheckingMerchant] = useState(true)
  const { toast, showToast, hideToast } = useToast()

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'merchant',
    companyName: '',
  })

  // Check if merchant exists on page load
  useEffect(() => {
    async function checkMerchant() {
      try {
        const { data } = await api.get('/auth/merchant-exists')
        const exists = data?.data?.exists || false
        setMerchantExists(exists)
        // Set default role: merchant if none exists, supplier if one exists
        setForm(prev => ({ ...prev, role: exists ? 'supplier' : 'merchant' }))
      } catch (err) {
        console.error('Failed to check merchant status:', err)
        // Default to supplier-only view on error
        setMerchantExists(true)
        setForm(prev => ({ ...prev, role: 'supplier' }))
      } finally {
        setCheckingMerchant(false)
      }
    }
    checkMerchant()
  }, [])

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        role: form.role,
        companyName: form.companyName || undefined,
      })

      // If email confirmation is required
      if (result?.requiresEmailConfirmation) {
        showToast(result?.message || 'Please check your email to confirm', 'success')
        setTimeout(() => nav('/login'), 2000)
        return
      }

      nav('/')
    } catch (err) {
      console.error('Register error:', err)
      const msg = err?.response?.data?.message || err?.message || 'Register failed'
      const details = err?.response?.data?.errors
      const fullError = details?.length ? `${msg}: ${details.join(', ')}` : msg
      setError(fullError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout title="Register">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={form.email} onChange={(e) => setField('email', e.target.value)} type="email" required />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password">Password</Label>
                <Input id="password" value={form.password} onChange={(e) => setField('password', e.target.value)} type="password" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 text-left">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2 text-left">
                <Label className="text-slate-900 font-semibold">Role</Label>
                {checkingMerchant ? (
                   <div className="h-10 flex items-center text-sm text-slate-500">Checking availability...</div>
                ) : (
                  <>
                    <Select value={form.role} onValueChange={(v) => setField('role', v)}>
                      <SelectTrigger className="w-full font-bold text-slate-900 border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merchant" disabled={merchantExists}>
                          Merchant {merchantExists && '(Already exists)'}
                        </SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                    {merchantExists ? (
                      <p className="text-xs text-amber-600 mt-1 font-medium">Only one merchant is allowed. Please register as a supplier.</p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">Choose your role. Only one merchant is allowed in the system.</p>
                    )}
                  </>
                )}
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} />
              </div>

              {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
              <Button disabled={busy} className="w-full" type="submit">{busy ? '...' : 'Create account'}</Button>
            </form>

            <div className="mt-4 text-sm text-center text-slate-600">
              Already have an account? <Link className="text-slate-900 font-medium underline underline-offset-4" to="/login">Login</Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <ToastNotification toast={toast} onClose={hideToast} />
    </Layout>
  )
}

