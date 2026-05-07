import { useEffect, useState, useCallback } from 'react';
import { getMerchantContacts, getSupplierContacts, toggleSupplierBlock } from '@/lib/merchantApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ban, CheckCircle } from 'lucide-react';

function ContactCard({ contact, role, onToggleBlock }) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown';
  const isOnline = contact.online_status;
  const isActive = contact.is_active !== false;

  return (
    <Card className={`relative hover:shadow-md transition-shadow ${!isActive ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar with online indicator */}
          <div className="relative shrink-0">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-100 border-2 border-white shadow-sm">
              {contact.avatar_url ? (
                <img src={contact.avatar_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-semibold text-slate-400">
                  {name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            {/* Online/Offline indicator */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
              title={isOnline ? 'Online now' : 'Offline'}
            />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold ${!isActive ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{name}</h4>
              {!isActive && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                  Blocked
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600">{contact.company_name || 'No company name'}</p>

            {/* Online status badge */}
            <div className="mt-1.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                isOnline 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="mt-2 space-y-1 text-xs text-slate-500">
              {contact.business_email && (
                <p className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${contact.business_email}`} className="text-blue-600 hover:underline">
                    {contact.business_email}
                  </a>
                </p>
              )}
              {contact.business_phone && (
                <p className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${contact.business_phone}`} className="text-blue-600 hover:underline">
                    {contact.business_phone}
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Block/Unblock button - only for merchants */}
          {role === 'merchant' && onToggleBlock && (
            <div className="shrink-0">
              <Button
                variant={isActive ? "outline" : "default"}
                size="sm"
                onClick={() => onToggleBlock(contact.id, !isActive)}
                className={isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'bg-emerald-600 hover:bg-emerald-700'}
              >
                {isActive ? (
                  <>
                    <Ban className="h-4 w-4 mr-1" />
                    Block
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Unblock
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContactsSection({ role, refetchTrigger }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchContacts = useCallback(async (isBackground = false) => {
    try {
      // Only show loading spinner on initial load, not on background polls
      if (!isBackground) setLoading(true);
      setError(null);

      // Use different endpoints based on role
      const data = role === 'merchant'
        ? await getMerchantContacts()
        : await getSupplierContacts();

      setContacts(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [role]);

  // Handle block/unblock supplier (merchant only)
  const handleToggleBlock = useCallback(async (supplierId, isActive) => {
    try {
      await toggleSupplierBlock(supplierId, isActive);
      // Refresh contacts after toggle
      fetchContacts(true);
    } catch (err) {
      console.error('[handleToggleBlock] Failed to toggle block:', err);
      setError(err.message || 'Failed to update supplier status');
    }
  }, [fetchContacts]);

  // Initial fetch
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Refetch when refetchTrigger changes (e.g., after validation)
  useEffect(() => {
    if (refetchTrigger) {
      fetchContacts();
    }
  }, [refetchTrigger, fetchContacts]);

  // Poll for updates every 5 seconds (background update for online/offline status)
  useEffect(() => {
    const interval = setInterval(() => fetchContacts(true), 5000);
    return () => clearInterval(interval);
  }, [fetchContacts]);

  if (loading && contacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{role === 'merchant' ? 'My Suppliers' : 'My Merchants'}</CardTitle>
          <CardDescription>Loading your contacts...</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center text-slate-500">
          <svg className="h-8 w-8 mx-auto mb-2 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading contacts...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{role === 'merchant' ? 'My Suppliers' : 'My Merchants'}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-red-600">
          <svg className="h-8 w-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p>{error}</p>
          <Button onClick={fetchContacts} variant="outline" className="mt-3">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const title = role === 'merchant' ? 'My Suppliers' : 'My Merchants';
  const description = role === 'merchant'
    ? `Your validated suppliers (${contacts.length})`
    : `Merchants who have validated you (${contacts.length})`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          {contacts.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {contacts.length} contacts
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            {role === 'merchant' ? (
              <>
                <svg className="h-12 w-12 mx-auto mb-3 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                <p className="text-slate-600 font-medium">No validated suppliers yet</p>
                <p className="text-sm text-slate-400 mt-1">Validate suppliers in the Administration section to see them here.</p>
              </>
            ) : (
              <>
                <svg className="h-12 w-12 mx-auto mb-3 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-slate-600 font-medium">No merchants have validated you yet</p>
                <p className="text-sm text-slate-400 mt-1">Once a merchant validates you, they will appear here.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map(contact => (
              <ContactCard 
                key={contact.id} 
                contact={contact} 
                role={role} 
                onToggleBlock={role === 'merchant' ? handleToggleBlock : null}
              />
            ))}
          </div>
        )}
        
        {lastUpdated && contacts.length > 0 && (
          <p className="mt-4 text-center text-xs text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
