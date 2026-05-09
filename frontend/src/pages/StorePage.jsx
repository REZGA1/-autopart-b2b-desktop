/**
 * [STORE PAGE]
 * Merchant store interface for browsing supplier products and managing purchase requests
 * 
 * [FEATURES]
 * - Browse supplier products with search and filters
 * - View product details with vehicle compatibility
 * - Create purchase requests (cart-like functionality)
 * - Manage purchase requests (view, fulfill, delete)
 * - Real-time status tracking
 * 
 * [TABS]
 * - Products: Browse and add to request
 * - Requests: View and manage purchase requests
 */

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Plus,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  X,
  Trash2,
  XCircle,
  Package,
  Car,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Store,
  ClipboardList,
  Clock
} from 'lucide-react';
import {
  getStoreProducts,
  getStoreProductById,
  getStoreSuppliers,
  getPurchaseRequests,
  createPurchaseRequest,
  fulfillPurchaseRequest,
  deletePurchaseRequest,
  updatePurchaseRequestStatus,
  getStoreProductImageUrl
} from '@/lib/storeApi';
import ProductImage from '@/components/ProductImage';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

// Part types for filter
const PART_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'ENGINE_GROUP', label: 'Engine Group' },
  { value: 'ENGINE_SUPPORT_SYSTEMS', label: 'Engine Support Systems' },
  { value: 'DRIVETRAIN_TRANSMISSION', label: 'Drivetrain & Transmission' },
  { value: 'SUSPENSION_STEERING', label: 'Suspension & Steering' },
  { value: 'BRAKING_SYSTEM', label: 'Braking System' },
  { value: 'ELECTRICAL_ELECTRONICS', label: 'Electrical & Electronics' },
  { value: 'HVAC_SYSTEM', label: 'HVAC System' },
  { value: 'EXHAUST_EMISSION', label: 'Exhaust & Emission' },
  { value: 'BODY_GLASS', label: 'Body & Glass' },
  { value: 'LIGHTING_SYSTEM', label: 'Lighting System' },
  { value: 'INTERIOR_SAFETY', label: 'Interior & Safety' },
  { value: 'WHEELS_TIRES', label: 'Wheels & Tires' },
  { value: 'MAINTENANCE_FLUIDS', label: 'Maintenance & Fluids' },
  { value: 'ACCESSORIES_CAR_CARE', label: 'Accessories & Car Care' },
  { value: 'OTHER', label: 'Other' },
];

const PRODUCT_CONDITIONS = [
  { value: '', label: 'All Conditions' },
  { value: 'NEW', label: 'New' },
  { value: 'USED', label: 'Used' },
  { value: 'REFURBISHED', label: 'Refurbished' },
  { value: 'REMANUFACTURED', label: 'Remanufactured' },
];

const REQUEST_STATUS = [
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

const STATUS_ICONS = {
  pending: Clock,
  accepted: CheckCircle,
  rejected: XCircle,
  fulfilled: Package,
  cancelled: XCircle,
};

export default function StorePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState('products');

  // Products state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productPagination, setProductPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    part_type: '',
    product_condition: '',
    is_available: '',
    supplier_id: '',
    supplier_name: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_engine: '',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Product details dialog
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);

  // Cart state for purchase requests - load from localStorage on init
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('merchantCart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('merchantCart', JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [cart]);

  // Suppliers state
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  // Requests state
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestPagination, setRequestPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [requestStatusFilter, setRequestStatusFilter] = useState('');

  // Toast notification
  const { toast, showToast, hideToast } = useToast();

  // Request details dialog
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);

  // Loading states
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [fulfillingRequest, setFulfillingRequest] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [updatingRequest, setUpdatingRequest] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({ 
    open: false, 
    title: '', 
    message: '', 
    onConfirm: () => {}, 
    variant: 'default' 
  });

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = {
        search: searchQuery,
        ...filters,
        page: productPagination.page,
        limit: productPagination.limit,
      };
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      const result = await getStoreProducts(params);
      setProducts(result.products);
      setProductPagination(prev => ({ ...prev, total: result.pagination.total, totalPages: result.pagination.totalPages }));
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, [searchQuery, filters, productPagination.page, productPagination.limit]);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      const result = await getStoreSuppliers();
      setSuppliers(result);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  }, []);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const params = {
        status: requestStatusFilter,
        page: requestPagination.page,
        limit: requestPagination.limit,
      };
      const result = await getPurchaseRequests(params);
      setRequests(result.requests);
      setRequestPagination(prev => ({ ...prev, total: result.pagination.total, totalPages: result.pagination.totalPages }));
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, [requestStatusFilter, requestPagination.page, requestPagination.limit]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, [fetchProducts, fetchSuppliers]);

  // Fetch requests when tab changes
  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [activeTab, fetchRequests]);

  // View product details
  const handleViewProduct = async (productId) => {
    try {
      const product = await getStoreProductById(productId);
      setSelectedProduct(product);
      setProductDetailsOpen(true);
    } catch (err) {
      console.error('Failed to fetch product details:', err);
    }
  };

  // Add to cart
  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.supplier_product_id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.supplier_product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        supplier_product_id: product.id,
        supplier_id: product.supplier_id,
        supplier_name: product.supplier_name || 'Unknown Supplier',
        name: product.name,
        serial_number: product.serial_number,
        part_type: product.part_type,
        selling_price: product.selling_price,
        image_url: product.image_url,
        quantity: 1,
        unit_price: product.selling_price || 0,
      }]);
    }
  };

  // Remove from cart
  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.supplier_product_id !== productId));
  };

  // Update cart item quantity
  const handleUpdateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.supplier_product_id === productId
        ? { ...item, quantity }
        : item
    ));
  };

  // Create purchase request
  const handleCreateRequest = async () => {
    if (cart.length === 0) {
      showToast('Please add items to your cart', 'error');
      return;
    }

    // Group cart items by supplier
    const itemsBySupplier = cart.reduce((acc, item) => {
      const supplierId = item.supplier_id;
      if (!acc[supplierId]) {
        acc[supplierId] = [];
      }
      acc[supplierId].push({
        supplier_product_id: item.supplier_product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_name: item.name,
      });
      return acc;
    }, {});

    try {
      setCreatingRequest(true);

      // Create a separate request for each supplier
      for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
        await createPurchaseRequest({
          supplier_id: supplierId,
          items,
        });
      }

      // Clear cart from state and localStorage
      setCart([]);
      localStorage.removeItem('merchantCart');
      setCartOpen(false);
      
      // Switch to requests tab and refresh
      setActiveTab('requests');
      await fetchRequests();
      
      const supplierCount = Object.keys(itemsBySupplier).length;
      showToast(`${supplierCount} purchase request(s) submitted successfully!`, 'success');
    } catch (err) {
      console.error('Failed to create purchase request:', err);
      showToast(err.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setCreatingRequest(false);
    }
  };

  // View request details
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setRequestDetailsOpen(true);
  };

  // Fulfill request
  const handleFulfillRequest = (requestId) => {
    setConfirmDialog({
      open: true,
      title: 'Confirm Fulfillment',
      message: 'Are you sure you want to mark this request as fulfilled? This will add the items to your inventory.',
      onConfirm: async () => {
        setFulfillingRequest(true);
        try {
          await fulfillPurchaseRequest(requestId);
          fetchRequests();
          setRequestDetailsOpen(false);
          showToast('Request fulfilled successfully', 'success');
        } catch (err) {
          console.error('Failed to fulfill request:', err);
          showToast(err.message || 'Failed to fulfill request', 'error');
        } finally {
          setFulfillingRequest(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
      variant: 'success'
    });
  };

  // Cancel request (for accepted requests)
  const handleCancelRequest = (requestId) => {
    setConfirmDialog({
      open: true,
      title: 'Confirm Cancellation',
      message: 'Are you sure you want to cancel this request?',
      onConfirm: async () => {
        setUpdatingRequest(true);
        try {
          await updatePurchaseRequestStatus(requestId, 'cancelled');
          fetchRequests();
          setRequestDetailsOpen(false);
          showToast('Request cancelled successfully', 'success');
        } catch (err) {
          console.error('Failed to cancel request:', err);
          showToast(err.message || 'Failed to cancel request', 'error');
        } finally {
          setUpdatingRequest(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
      variant: 'danger'
    });
  };

  // Delete request
  const handleDeleteRequest = (requestId) => {
    setConfirmDialog({
      open: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      onConfirm: async () => {
        setDeletingRequest(true);
        try {
          await deletePurchaseRequest(requestId);
          fetchRequests();
          setRequestDetailsOpen(false);
          showToast('Request deleted successfully', 'success');
        } catch (err) {
          console.error('Failed to delete request:', err);
          showToast(err.message || 'Failed to delete request', 'error');
        } finally {
          setDeletingRequest(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      },
      variant: 'danger'
    });
  };

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toLocaleString();

  return (
    <Layout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Store</h1>
          <p className="text-gray-600 mt-1">Browse supplier products and manage purchase requests</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Purchase Requests
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {requests.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select
                    value={filters.part_type}
                    onValueChange={(value) => setFilters({ ...filters, part_type: value })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PART_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.product_condition}
                    onValueChange={(value) => setFilters({ ...filters, product_condition: value })}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CONDITIONS.map((cond) => (
                        <SelectItem key={cond.value} value={cond.value}>
                          {cond.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                    <Filter className="h-4 w-4 mr-2" />
                    {showAdvancedFilters ? 'Hide' : 'More'} Filters
                  </Button>
                  <Button variant="outline" onClick={() => setCartOpen(true)} className="relative">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart
                    {cart.length > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
                        {cart.length}
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                  <div className="flex flex-wrap gap-4 pt-4 border-t">
                    {/* Supplier Filter */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Supplier</Label>
                      <Select
                        value={filters.supplier_id}
                        onValueChange={(value) => setFilters({ ...filters, supplier_id: value })}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="All Suppliers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Suppliers</SelectItem>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.company_name || `${supplier.first_name} ${supplier.last_name}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Supplier Name Search */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Supplier Name</Label>
                      <Input
                        placeholder="Search supplier..."
                        value={filters.supplier_name}
                        onChange={(e) => setFilters({ ...filters, supplier_name: e.target.value })}
                        className="w-[200px]"
                      />
                    </div>

                    {/* Vehicle Make */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Vehicle Make</Label>
                      <Input
                        placeholder="e.g. Toyota"
                        value={filters.vehicle_make}
                        onChange={(e) => setFilters({ ...filters, vehicle_make: e.target.value })}
                        className="w-[150px]"
                      />
                    </div>

                    {/* Vehicle Model */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Vehicle Model</Label>
                      <Input
                        placeholder="e.g. Camry"
                        value={filters.vehicle_model}
                        onChange={(e) => setFilters({ ...filters, vehicle_model: e.target.value })}
                        className="w-[150px]"
                      />
                    </div>

                    {/* Vehicle Year */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Vehicle Year</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 2020"
                        value={filters.vehicle_year}
                        onChange={(e) => setFilters({ ...filters, vehicle_year: e.target.value })}
                        className="w-[120px]"
                      />
                    </div>

                    {/* Vehicle Engine */}
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Engine</Label>
                      <Input
                        placeholder="e.g. V6 2.5L"
                        value={filters.vehicle_engine}
                        onChange={(e) => setFilters({ ...filters, vehicle_engine: e.target.value })}
                        className="w-[150px]"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setFilters({
                            part_type: '',
                            product_condition: '',
                            is_available: '',
                            supplier_id: '',
                            supplier_name: '',
                            vehicle_make: '',
                            vehicle_model: '',
                            vehicle_year: '',
                            vehicle_engine: '',
                          });
                        }}
                      >
                        Reset All
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Products Grid */}
            {loadingProducts ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No products found</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div
                        className="aspect-square bg-gray-100 relative cursor-pointer"
                        onClick={() => handleViewProduct(product.id)}
                      >
                        <ProductImage 
                          src={product.image_url} 
                          productId={product.id} 
                          getProxyUrl={getStoreProductImageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        />
                        {!product.is_available && (
                          <Badge variant="secondary" className="absolute top-2 right-2 bg-gray-800 text-white">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{product.part_type}</p>
                        <p className="text-xs text-gray-400 mt-1">by {product.supplier_name || 'Unknown'}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-lg">
                            {product.selling_price?.toFixed(2) || '0.00'} DA
                          </span>
                          <Badge variant={product.is_available ? 'default' : 'secondary'}>
                            {product.product_condition}
                          </Badge>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleViewProduct(product.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={!product.is_available}
                            onClick={() => handleAddToCart(product)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {productPagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={productPagination.page <= 1}
                      onClick={() => setProductPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {productPagination.page} of {productPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={productPagination.page >= productPagination.totalPages}
                      onClick={() => setProductPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <Select
                  value={requestStatusFilter}
                  onValueChange={setRequestStatusFilter}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_STATUS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Requests Table */}
            {loadingRequests ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No purchase requests found</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request ID</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request, index) => {
                        const StatusIcon = STATUS_ICONS[request.status];
                        const displayId = (requestPagination.page - 1) * requestPagination.limit + index + 1;
                        return (
                          <TableRow key={request.id}>
                            <TableCell className="font-mono text-sm font-semibold">
                              #{displayId}
                            </TableCell>
                            <TableCell>
                              {`${request.supplier?.first_name || ''} ${request.supplier?.last_name || ''}`.trim() || 
                               request.supplier?.company_name || 
                               'Unknown Supplier'}
                            </TableCell>
                            <TableCell>{request.items?.length || 0} items</TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[request.status]}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(request.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRequest(request)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>

                {/* Pagination */}
                {requestPagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={requestPagination.page <= 1}
                      onClick={() => setRequestPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {requestPagination.page} of {requestPagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={requestPagination.page >= requestPagination.totalPages}
                      onClick={() => setRequestPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Product Details Dialog */}
        <Dialog open={productDetailsOpen} onOpenChange={setProductDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Product Details</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product Image */}
                <div className="lg:col-span-1">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <ProductImage 
                      src={selectedProduct.image_url} 
                      productId={selectedProduct.id} 
                      getProxyUrl={getStoreProductImageUrl}
                      alt={selectedProduct.name}
                    />
                  </div>
                </div>

                {/* Product Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Product Name & Type */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
                    <p className="text-gray-500 mt-1 text-lg">{selectedProduct.part_type}</p>
                  </div>

                  {/* Supplier Info with Avatar */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-3">Sold by</p>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {selectedProduct.supplier_avatar ? (
                          <img
                            src={selectedProduct.supplier_avatar}
                            alt={selectedProduct.supplier_name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-slate-300 flex items-center justify-center">
                            <span className="text-xl font-semibold text-white">
                              {selectedProduct.supplier_name?.charAt(0)?.toUpperCase() || 'S'}
                            </span>
                          </div>
                        )}
                        {/* Online Status Indicator */}
                        <span
                          className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
                            selectedProduct.supplier_online ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={selectedProduct.supplier_online ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedProduct.supplier_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">
                          {selectedProduct.supplier_online ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Online
                            </span>
                          ) : (
                            <span className="text-gray-400 flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                              Offline
                            </span>
                          )}
                        </p>
                        {(selectedProduct.supplier_email || selectedProduct.supplier_phone) && (
                          <div className="mt-1 text-sm text-gray-400">
                            {selectedProduct.supplier_email && <p>{selectedProduct.supplier_email}</p>}
                            {selectedProduct.supplier_phone && <p>{selectedProduct.supplier_phone}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Product Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">Serial Number</p>
                      <p className="font-medium">{selectedProduct.serial_number || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">Condition</p>
                      <Badge className="mt-1">{selectedProduct.product_condition}</Badge>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-bold text-xl text-slate-900">{selectedProduct.selling_price?.toFixed(2) || '0.00'} DA</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">Availability</p>
                      <Badge variant={selectedProduct.is_available ? 'default' : 'secondary'} className="mt-1">
                        {selectedProduct.is_available ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedProduct.description && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{selectedProduct.description}</p>
                    </div>
                  )}

                  {/* Compatible Vehicles */}
                  {selectedProduct.vehicles && selectedProduct.vehicles.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        Compatible Vehicles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.vehicles.map((vehicle) => (
                          <Badge key={vehicle.id} variant="outline" className="px-3 py-2 text-sm">
                            {vehicle.make} {vehicle.model} ({vehicle.year})
                            {vehicle.body_type && ` • ${vehicle.body_type}`}
                            {vehicle.engine_capacity && ` • ${vehicle.engine_capacity}L`}
                            {vehicle.fuel_type && ` • ${vehicle.fuel_type}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <Button
                    className="w-full py-6 text-lg"
                    disabled={!selectedProduct.is_available}
                    onClick={() => {
                      handleAddToCart(selectedProduct);
                      setProductDetailsOpen(false);
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cart Dialog */}
        <Dialog open={cartOpen} onOpenChange={setCartOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Shopping Cart ({cart.length} items)
              </DialogTitle>
            </DialogHeader>
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* Group cart items by supplier */}
                {(() => {
                  // Get unique suppliers from cart
                  const supplierGroups = cart.reduce((acc, item) => {
                    const supplierId = item.supplier_id;
                    if (!acc[supplierId]) {
                      acc[supplierId] = {
                        supplier_id: supplierId,
                        supplier_name: item.supplier_name || 'Unknown Supplier',
                        items: []
                      };
                    }
                    acc[supplierId].items.push(item);
                    return acc;
                  }, {});
                  
                  return Object.values(supplierGroups).map((group, index) => (
                    <div key={group.supplier_id} className="border rounded-lg overflow-hidden">
                      {/* Supplier Header */}
                      <div className="bg-blue-50 px-4 py-3 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-sm text-blue-900">
                            {group.supplier_name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {group.items.length} items
                          </Badge>
                        </div>
                        <span className="text-xs text-blue-600">
                          Request #{index + 1}
                        </span>
                      </div>
                      
                      {/* Items for this supplier */}
                      <div className="p-3 space-y-3">
                        {group.items.map((item) => (
                          <div key={item.supplier_product_id} className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                              <ProductImage 
                                src={item.image_url} 
                                productId={item.supplier_product_id} 
                                getProxyUrl={getStoreProductImageUrl}
                                alt={item.name}
                                placeholderClass="h-6 w-6 text-gray-400"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{item.name}</h4>
                              <p className="text-xs text-gray-500">{item.unit_price?.toLocaleString()} DA each</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleUpdateQuantity(item.supplier_product_id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-6 text-center text-sm">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleUpdateQuantity(item.supplier_product_id, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 h-7 w-7 p-0"
                              onClick={() => handleRemoveFromCart(item.supplier_product_id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Supplier subtotal */}
                        <div className="pt-2 border-t mt-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal:</span>
                            <span className="font-medium">
                              {group.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toLocaleString()} DA
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
                
                {/* Grand Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Suppliers:</span>
                    <span className="text-sm font-medium">
                      {new Set(cart.map(i => i.supplier_id)).size}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Grand Total:</span>
                    <span className="text-xl font-bold">{cartTotal.toFixed(2)} DA</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Will create {new Set(cart.map(i => i.supplier_id)).size} separate purchase request(s)
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCartOpen(false)}>
                    Continue Shopping
                  </Button>
                  <Button
                    onClick={handleCreateRequest}
                    disabled={creatingRequest}
                  >
                    {creatingRequest ? 'Creating...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Request Details Dialog */}
        <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Purchase Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-500">Request ID</span>
                    <p className="font-mono text-lg font-semibold">
                      #{requests.findIndex(r => r.id === selectedRequest.id) >= 0 
                        ? (requestPagination.page - 1) * requestPagination.limit + requests.findIndex(r => r.id === selectedRequest.id) + 1 
                        : '-'}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[selectedRequest.status]}>
                    {selectedRequest.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Supplier</span>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedRequest.supplier?.avatar_url ? (
                        <img 
                          src={selectedRequest.supplier.avatar_url} 
                          alt="Supplier" 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            {(selectedRequest.supplier?.first_name?.[0] || 'S').toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {`${selectedRequest.supplier?.first_name || ''} ${selectedRequest.supplier?.last_name || ''}`.trim() || 
                           selectedRequest.supplier?.company_name || 
                           selectedRequest.supplier?.business_name || 
                           'Unknown Supplier'}
                        </p>
                        <p className="text-sm text-gray-500">{selectedRequest.supplier?.business_email}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Created</span>
                    <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Items</h4>
                  <div className="space-y-2">
                    {(selectedRequest.items || []).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                            {(() => {
                              const productObj = item.supplier_product || item.product;
                              const imageUrl = item.image_url || (Array.isArray(productObj) ? productObj[0]?.image_url : productObj?.image_url);
                              
                              return (
                                <ProductImage 
                                  src={imageUrl} 
                                  productId={item.supplier_product_id} 
                                  getProxyUrl={getStoreProductImageUrl}
                                  alt={item.product_snapshot_name}
                                  placeholderClass="h-6 w-6 text-gray-400"
                                />
                              );
                            })()}
                          </div>
                          <div>
                            {(() => {
                              const product = Array.isArray(item.supplier_product) 
                                ? item.supplier_product[0] 
                                : item.supplier_product;
                              // Get vehicle info
                              const vehicles = product?.vehicles;
                              let vehicleText = '';
                              if (vehicles) {
                                const vehicleArray = Array.isArray(vehicles) ? vehicles : [vehicles];
                                const vehicle = vehicleArray[0]?.vehicle || vehicleArray[0];
                                if (vehicle) {
                                  vehicleText = `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim();
                                }
                              }
                              return (
                                <>
                                  <p className="font-medium">{item.product_snapshot_name || product?.name || 'Unknown Product'}</p>
                                  <p className="text-sm text-gray-500">
                                    {item.quantity} x {item.unit_price?.toFixed(2)} DA
                                  </p>
                                  {vehicleText && (
                                    <p className="text-xs text-blue-600 mt-0.5">
                                      Fits: {vehicleText}
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <p className="font-semibold">{(item.quantity * item.unit_price).toFixed(2)} DA</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="text-xl font-bold">
                      {(selectedRequest.items || []).reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)} DA
                    </span>
                  </div>
                </div>

                <DialogFooter>
                  {['pending', 'rejected'].includes(selectedRequest.status) && (
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteRequest(selectedRequest.id)}
                      disabled={deletingRequest}
                      className="bg-red-100 hover:bg-red-200 text-red-700 border-red-200"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deletingRequest ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                  {selectedRequest.status === 'accepted' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleCancelRequest(selectedRequest.id)}
                        disabled={updatingRequest}
                        className="text-gray-600 border-gray-200 hover:bg-gray-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {updatingRequest ? 'Cancelling...' : 'Cancel'}
                      </Button>
                      <Button
                        onClick={() => handleFulfillRequest(selectedRequest.id)}
                        disabled={fulfillingRequest}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {fulfillingRequest ? 'Processing...' : 'Mark as Fulfilled'}
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={() => setRequestDetailsOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
      {/* Standardized Toast Notification */}
      <ToastNotification toast={toast} onClose={hideToast} />

      {/* Standardized Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }}
        variant={confirmDialog.variant === 'danger' ? 'destructive' : 'default'}
        loading={updatingRequest}
      />
      </div>
    </Layout>
  );
}
