import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/authStore'
import Layout from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const { login, token } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (token) {
      nav('/')
    }
  }, [token, nav])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      nav('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout title="Login">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Login to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password">Password</Label>
                <Input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
              </div>
              {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
              <Button disabled={busy} className="w-full" type="submit">{busy ? '...' : 'Login'}</Button>
            </form>
            <div className="mt-4 text-sm text-slate-600">
              No account? <Link className="text-slate-900 underline" to="/register">Register</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

