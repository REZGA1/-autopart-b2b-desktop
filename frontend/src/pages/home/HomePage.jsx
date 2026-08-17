import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/stores/authStore'
import Layout from '@/components/common/Layout'
import UserPageHeader from '@/components/common/UserPageHeader'
import ValidatedBadge from '@/components/common/ValidatedBadge'
import AdminSection from '@/components/admin/AdminSection'
import ContactsSection from '@/components/admin/ContactsSection'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function PlaceholderLinks({ role }) {
  const items =
    role === 'supplier'
      ? [
          { to: '/catalog', label: 'My Catalog' },
        ]
      : [
          { to: '/inventory', label: 'My Inventory' },
        ]

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((x) => (
        <Link
          key={x.to}
          to={x.to}
          className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-900 hover:bg-slate-50"
        >
          {x.label}
        </Link>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { profile } = useAuth()
  const [contactsRefetchTrigger, setContactsRefetchTrigger] = useState(0)

  const handleSupplierValidated = () => {
    setContactsRefetchTrigger(prev => prev + 1)
  }

  const subtitle = (
    <>
      Role:
      {' '}
      <span className="font-medium text-slate-900">{profile?.role}</span>
      {' '}
      ·
      {' '}
      <Link to="/profile" className="font-medium text-slate-900 underline">
        Profile settings
      </Link>
    </>
  )

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        <UserPageHeader
          profile={profile}
          subtitle={subtitle}
          right={<ValidatedBadge validated={!!profile?.validated} />}
        />

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Account summary</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            <div>
              Business email:
              {' '}
              <span className="font-medium text-slate-900">{profile?.business_email || '—'}</span>
            </div>
            <div>
              Business phone:
              {' '}
              <span className="font-medium text-slate-900">{profile?.business_phone || '—'}</span>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-900">Quick sections</div>
          <PlaceholderLinks role={profile?.role} />
        </div>

        {profile?.role === 'merchant' && (
          <AdminSection onValidateSuccess={handleSupplierValidated} />
        )}

        <ContactsSection 
          role={profile?.role} 
          refetchTrigger={contactsRefetchTrigger}
        />
      </div>
    </Layout>
  )
}
