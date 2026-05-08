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
      const msg = err?.response?.data?.message
      if (msg === 'Invalid credentials') {
        setError('Invalid email or password')
      } else {
        setError(msg || 'Login failed')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout title="Login">
      <div className="mx-auto max-w-md">
        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>Login to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  type="email" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  type="password" 
                  required 
                />
              </div>
              {error ? (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-100 animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              ) : null}
              <Button disabled={busy} className="w-full bg-slate-900 hover:bg-slate-800" type="submit">
                {busy ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-600">
              Don't have an account? <Link className="text-slate-900 font-medium underline underline-offset-4" to="/register">Register</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

