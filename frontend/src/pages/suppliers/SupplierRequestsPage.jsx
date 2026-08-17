/**
 * [SUPPLIER REQUESTS PAGE]
 * Page for suppliers to view incoming purchase requests from merchants
 * 
 * [FEATURES]
 * - View all purchase requests sent to this supplier
 * - Filter by status (pending, accepted, rejected, fulfilled, cancelled)
 * - View request details (merchant info, items, total)
 * - Accept or reject pending requests
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  Store,
  ArrowLeft
} from 'lucide-react';
import Layout from '@/components/common/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getSupplierPurchaseRequests, getSupplierProductImageUrl, updateSupplierRequestStatus } from '@/services/supplierCatalogService';
import ProductImage from '@/components/common/ProductImage';
import ToastNotification from '@/components/common/ToastNotification';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  accepted: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  fulfilled: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function SupplierRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    status: ''
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState({ 
    open: false, 
    title: '', 
    message: '', 
    onConfirm: () => {}, 
    variant: 'default' 
  });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSupplierPurchaseRequests({
        status: filters.status,
        page: pagination.page,
        limit: pagination.limit
      });
      setRequests(result.requests);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages
      }));
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      showToast('Failed to fetch purchase requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters.status, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = (requestId, status) => {
    setConfirmDialog({
      open: true,
      title: `Confirm ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Are you sure you want to set this request status to ${status}?`,
      variant: status === 'rejected' || status === 'cancelled' ? 'destructive' : 'default',
      onConfirm: async () => {
        setUpdating(true);
        try {
          await updateSupplierRequestStatus(requestId, status);
          showToast(`Request ${status} successfully!`);
          fetchRequests();
          setIsDetailsOpen(false);
        } catch (error) {
          console.error('Failed to update status:', error);
          showToast(error.response?.data?.error || 'Failed to update status', 'error');
        } finally {
          setUpdating(true); // Keep updating true until dialog closes via state if needed, but here it's fine
          setUpdating(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const openDetails = (request) => {
    setSelectedRequest(request);
    setIsDetailsOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMerchantName = (request) => {
    if (!request.merchant) return 'Unknown Merchant';
    const fullName = `${request.merchant.first_name || ''} ${request.merchant.last_name || ''}`.trim();
    return fullName || request.merchant.company_name || 'Unknown Merchant';
  };

  const getTotalAmount = (items) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
  };

  return (
    <Layout title="Purchase Requests">
      {/* Standardized Toast Notification */}
      <ToastNotification toast={toast} onClose={hideToast} />

      {/* Standardized Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
        loading={updating}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              Purchase Requests
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              View and manage purchase requests from merchants
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/supplier/catalog')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Catalog
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Filter by Status:</span>
                <Select
                  value={filters.status}
                  onValueChange={(value) => {
                    setFilters({ status: value });
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({ status: '' });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                Reset Filter
              </Button>

              <div className="ml-auto text-sm text-slate-500">
                Total: <span className="font-medium text-slate-900">{pagination.total}</span> requests
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-slate-600">Loading requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No purchase requests</h3>
              <p className="text-sm text-slate-500 mt-1">
                {filters.status 
                  ? `No ${filters.status} requests found`
                  : "You don't have any purchase requests from merchants yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request, index) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Request Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-slate-900">
                          Request #{((pagination.page - 1) * pagination.limit) + index + 1}
                        </span>
                        <Badge className={`${STATUS_COLORS[request.status]} capitalize`}>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                        <Store className="h-4 w-4" />
                        <span className="font-medium">{getMerchantName(request)}</span>
                      </div>
                      
                      <div className="text-sm text-slate-500">
                        {formatDate(request.created_at)}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-slate-600">
                          <span className="font-medium">{request.items?.length || 0}</span> items
                        </span>
                        <span className="text-slate-600">
                          Total: <span className="font-semibold text-slate-900">{getTotalAmount(request.items).toFixed(2)} DA</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetails(request)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleUpdateStatus(request.id, 'accepted')}
                            disabled={updating}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleUpdateStatus(request.id, 'rejected')}
                            disabled={updating}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {request.status === 'accepted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-gray-600 border-gray-200 hover:bg-gray-50"
                          onClick={() => handleUpdateStatus(request.id, 'cancelled')}
                          disabled={updating}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Purchase Request Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Header */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Request ID</p>
                  <p className="font-mono text-sm">{selectedRequest.id}</p>
                </div>
                <Badge className={`${STATUS_COLORS[selectedRequest.status]} capitalize`}>
                  {selectedRequest.status}
                </Badge>
              </div>
              
              {/* Merchant Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">From Merchant</p>
                  <p className="font-medium text-slate-900">{getMerchantName(selectedRequest)}</p>
                  {selectedRequest.merchant?.business_email && (
                    <p className="text-sm text-slate-500">{selectedRequest.merchant.business_email}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Request Date</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>
              
              {/* Items */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Requested Items ({selectedRequest.items?.length || 0})
                </h4>
                <div className="space-y-3">
                  {selectedRequest.items?.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {(() => {
                          const productObj = item.supplier_product || item.product;
                          const imageUrl = item.image_url || productObj?.image_url;
                          
                          return (
                            <ProductImage 
                              src={imageUrl} 
                              productId={item.supplier_product_id} 
                              getProxyUrl={getSupplierProductImageUrl}
                              alt={item.product_snapshot_name}
                            />
                          );
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {item.product_snapshot_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Qty: {item.quantity} × {item.unit_price?.toLocaleString()} DA
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {(item.quantity * item.unit_price).toLocaleString()} DA
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t mt-3">
                  <span className="font-semibold text-slate-700">Total Amount:</span>
                  <span className="text-xl font-bold text-slate-900">
                    {getTotalAmount(selectedRequest.items).toLocaleString()} DA
                  </span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                >
                  Close
                </Button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'accepted')}
                      disabled={updating}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Request
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                      disabled={updating}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Request
                    </Button>
                  </>
                )}
                {selectedRequest.status === 'accepted' && (
                  <Button
                    variant="outline"
                    className="text-gray-600 border-gray-200 hover:bg-gray-50"
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'cancelled')}
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Request
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
