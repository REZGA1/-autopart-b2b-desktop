import { useEffect, useState, useCallback } from 'react';
import { getUnvalidatedSuppliers, validateSupplier } from '@/services/merchantService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function AccordionSupplierCard({ supplier, onValidate, onViewDocument, validating }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const name = [supplier.first_name, supplier.last_name].filter(Boolean).join(' ') || 'Unknown';
  const hasRcImage = !!supplier.rc_image_url;
  const hasIdCard = !!supplier.id_card_url;
  const hasAvatar = !!supplier.avatar_url;
  const canValidate = hasRcImage && hasIdCard && supplier.rc_number;
  const isOnline = supplier.online_status === true;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 border-2 border-white shadow-sm">
          {hasAvatar ? (
            <img 
              src={supplier.avatar_url} 
              alt={name} 
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`h-full w-full items-center justify-center text-lg font-semibold text-slate-400 ${hasAvatar ? 'hidden' : 'flex'}`}>
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900 truncate">{name}</h4>
            <span 
              className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}
              title={isOnline ? 'Online' : 'Offline'}
            />
          </div>
          <p className="text-sm text-slate-600 truncate">{supplier.company_name || 'No company name'}</p>
          <p className="text-xs text-slate-400">
            Registered: {new Date(supplier.created_at).toLocaleDateString()}
          </p>
        </div>

        <svg 
          className={`h-5 w-5 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-2">
          <div className="mb-4 bg-amber-50 rounded-lg p-3 border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Verification Data (Required)
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-100">
                <span className="font-medium text-slate-600">RC Number:</span>
                <span className="font-mono font-semibold text-slate-900">{supplier.rc_number || '—'}</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-100">
                <span className="font-medium text-slate-600">NIF Number:</span>
                <span className="font-mono font-semibold text-slate-900">{supplier.nif_number || '—'}</span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Documents (Click to enlarge)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DocumentThumbnail 
                url={supplier.rc_image_url} 
                label="RC Document" 
                onClick={() => onViewDocument(supplier.rc_image_url, `RC Document - ${supplier.company_name || name}`)}
              />
              <DocumentThumbnail 
                url={supplier.id_card_url} 
                label="ID Card" 
                onClick={() => onViewDocument(supplier.id_card_url, `ID Card - ${name}`)}
              />
            </div>
            {(!hasRcImage || !hasIdCard) && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Missing required documents - cannot validate
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {canValidate ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  All documents present - ready to validate
                </span>
              ) : (
                <span className="text-amber-600">Awaiting complete documentation</span>
              )}
            </div>
            <Button
              onClick={() => onValidate(supplier.id)}
              disabled={validating === supplier.id || !canValidate}
              variant={canValidate ? "default" : "outline"}
              className={canValidate ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {validating === supplier.id ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Validating...
                </span>
              ) : (
                'Validate Supplier'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentThumbnail({ url, label, onClick }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  if (!url) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <div className="h-24 w-full flex items-center justify-center">
          <div className="text-center">
            <svg className="h-8 w-8 mx-auto text-slate-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-slate-400 mt-1 block">No {label}</span>
          </div>
        </div>
        <div className="px-2 py-1.5 text-xs font-medium text-slate-400 border-t border-slate-200 bg-white">
          {label} (Missing)
        </div>
      </div>
    );
  }
  
  const isPdf = url.toLowerCase().endsWith('.pdf');
  
  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-400 hover:shadow-md transition-all"
    >
      <div className="relative h-24 w-full">
        {isPdf ? (
          <div className="flex h-full w-full items-center justify-center bg-red-50">
            <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
        ) : hasError ? (
          <div className="flex h-full w-full items-center justify-center bg-red-50">
            <div className="text-center">
              <svg className="h-8 w-8 mx-auto text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-red-500 mt-1 block">Failed to load</span>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                <svg className="h-6 w-6 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
            <img 
              src={url} 
              alt={label}
              className={`h-full w-full object-cover group-hover:scale-105 transition-transform ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
              onLoad={() => setIsLoading(false)}
            />
          </>
        )}
        {!hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <span className="opacity-0 group-hover:opacity-100 bg-white/90 px-2 py-1 rounded text-xs font-medium text-slate-900">
              Click to enlarge
            </span>
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 text-xs font-medium text-slate-700 border-t border-slate-200 bg-white truncate">
        {label}
      </div>
    </div>
  );
}

function DocumentViewer({ url, title, onClose }) {
  if (!url) return null;
  const isPdf = url.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div 
        className="max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <div className="flex items-center gap-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Open in new tab
            </a>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>
        <div className="p-4 bg-slate-100">
          {isPdf ? (
            <iframe src={url} className="h-[80vh] w-full rounded" title={title} />
          ) : (
            <img src={url} alt={title} className="max-h-[80vh] w-auto mx-auto rounded shadow-lg" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSection({ onValidateSuccess }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);

  const fetchSuppliers = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const data = await getUnvalidatedSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    const interval = setInterval(() => fetchSuppliers(true), 5000);
    return () => clearInterval(interval);
  }, [fetchSuppliers]);

  const handleValidate = async (supplierId) => {
    try {
      setValidating(supplierId);
      await validateSupplier(supplierId);
      setSuppliers(prev => prev.filter(s => s.id !== supplierId));
      if (onValidateSuccess) {
        onValidateSuccess(supplierId);
      }
    } catch (err) {
      alert(err.message || 'Failed to validate supplier');
    } finally {
      setValidating(null);
    }
  };

  const handleViewDocument = (url, title) => {
    setViewingDoc({ url, title });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Administration</CardTitle>
          <CardDescription>Review and validate suppliers waiting for approval</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center text-slate-500">
          <svg className="h-8 w-8 mx-auto mb-2 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading pending suppliers...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Administration</CardTitle>
          <CardDescription>Review and validate suppliers waiting for approval</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center text-red-600">
          <svg className="h-8 w-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p>{error}</p>
          <Button onClick={fetchSuppliers} variant="outline" className="mt-3">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Administration
              </CardTitle>
              <CardDescription className="mt-1">
                Review and validate suppliers waiting for approval
              </CardDescription>
            </div>
            {suppliers.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                {suppliers.length} pending
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-8">
              <svg className="h-12 w-12 mx-auto mb-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-slate-600 font-medium">No suppliers waiting for validation</p>
              <p className="text-sm text-slate-400 mt-1">All caught up! Validated suppliers appear in My Suppliers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map(supplier => (
                <AccordionSupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onValidate={handleValidate}
                  onViewDocument={handleViewDocument}
                  validating={validating}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {viewingDoc && (
        <DocumentViewer
          url={viewingDoc.url}
          title={viewingDoc.title}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </>
  );
}
