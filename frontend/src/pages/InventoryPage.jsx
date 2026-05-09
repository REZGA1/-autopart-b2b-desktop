/**
 * [INVENTORY PAGE]
 * Main inventory management interface for merchants
 * 
 * [FEATURES]
 * - Product CRUD (Create, Read, Update, Delete)
 * - Search & Filter (name, serial, type, quantity, price, stock alerts)
 * - Vehicle Compatibility (link products to vehicles)
 * - Stock Management (quick +/- adjustments with transaction logging)
 * - Image Upload (to Supabase Storage)
 * - Responsive Table with pagination
 * 
 * [STATE SECTIONS]
 * 1. Data: products, vehicles, pagination
 * 2. UI: dialogs (create, edit, details), filters visibility
 * 3. Forms: react-hook-form for create/edit
 * 4. Filters: searchQuery, filters, vehicleFilters
 * 
 * [DIALOGS]
 * - CreateDialog: Add new product with vehicle links
 * - EditDialog: Modify product + manage vehicles
 * - DetailsDialog: View product info + transactions
 * - DeleteDialog: Confirm deletion
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Car,
  X,
  Upload,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  BarChart3,
  DollarSign,
  Printer,
  Settings2,
  CheckSquare,
  Square
} from 'lucide-react'
import Layout from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  adjustInventory,
  getVehicles,
  getProductImageUrl,
  getProductTransactions,
  updateTransactionReason
} from '@/lib/inventoryApi'
import ProductImage from '@/components/ProductImage'
import ToastNotification from '@/components/ToastNotification'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useToast } from '@/hooks/useToast'

// Part types/categories
const PART_TYPES = [
  { value: '', label: 'Select Part Type' },
  { value: 'ENGINE_GROUP', label: 'ENGINE GROUP' },
  { value: 'ENGINE_SUPPORT_SYSTEMS', label: 'ENGINE SUPPORT SYSTEMS' },
  { value: 'DRIVETRAIN_TRANSMISSION', label: 'DRIVETRAIN & TRANSMISSION' },
  { value: 'SUSPENSION_STEERING', label: 'SUSPENSION & STEERING' },
  { value: 'BRAKING_SYSTEM', label: 'BRAKING SYSTEM' },
  { value: 'ELECTRICAL_ELECTRONICS', label: 'ELECTRICAL & ELECTRONICS' },
  { value: 'HVAC_SYSTEM', label: 'HVAC SYSTEM' },
  { value: 'EXHAUST_EMISSION', label: 'EXHAUST & EMISSION' },
  { value: 'BODY_GLASS', label: 'BODY & GLASS' },
  { value: 'LIGHTING_SYSTEM', label: 'LIGHTING SYSTEM' },
  { value: 'INTERIOR_SAFETY', label: 'INTERIOR & SAFETY' },
  { value: 'WHEELS_TIRES', label: 'WHEELS & TIRES' },
  { value: 'MAINTENANCE_FLUIDS', label: 'MAINTENANCE & FLUIDS' },
  { value: 'ACCESSORIES_CAR_CARE', label: 'ACCESSORIES & CAR CARE' },
  { value: 'OTHER', label: 'OTHER' },
];

// Product conditions
const PRODUCT_CONDITIONS = [
  { value: '', label: 'Select Condition' },
  { value: 'NEW', label: 'New' },
  { value: 'USED', label: 'Used' },
  { value: 'REFURBISHED', label: 'Refurbished' },
  { value: 'REMANUFACTURED', label: 'Remanufactured' },
];

// Validation schema
const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  serial_number: z.string().optional().nullable(),
  part_type: z.string().min(1, 'Part type is required'),
  purchase_price: z.string().min(1, 'Purchase price is required').refine((val) => !val || parseFloat(val) >= 0, { message: 'Price cannot be negative' }),
  selling_price: z.string().min(1, 'Selling price is required').refine((val) => !val || parseFloat(val) > 0, { message: 'Price must be greater than 0' }),
  description: z.string().optional().nullable(),
  quantity: z.string().default('0').refine((val) => !val || parseInt(val) >= 0, { message: 'Quantity cannot be negative' }),
  minimum: z.string().default('0').refine((val) => !val || parseInt(val) >= 0, { message: 'Minimum cannot be negative' }),
  product_condition: z.string().optional().nullable(),
});

export default function InventoryPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    part_type: '',
    product_condition: '',
    min_quantity: '',
    max_quantity: '',
    min_price: '',
    max_price: '',
    stock_alert: 'all',
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  
  // Vehicle filter fields
  const [vehicleFilters, setVehicleFilters] = useState({
    make: '',
    model: '',
    year: '',
    engine: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Toast notification
  const { toast, showToast, hideToast } = useToast();
  
  // Transactions
  const [productTransactions, setProductTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // Form
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema)
  });
  
  // Image upload
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(null);
  
  // Vehicles
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  // New vehicle form
  const [newVehicle, setNewVehicle] = useState({ make: '', model: '', year: '', trim: '', fuel_type: '', engine: '' });
  const [newVehiclesList, setNewVehiclesList] = useState([]);

  // Print functionality
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    showSellingPrice: true,
    showPurchasePrice: true,
    showCondition: true,
    showQuantity: true,
    showPartType: true
  });

  // Track if this is initial load vs search update
  const isSearchUpdate = useRef(false);
  
  // Fetch products
  const fetchProducts = useCallback(async () => {
    // Only show full loading state on initial load, not search
    if (!isSearchUpdate.current) {
      setLoading(true);
    }
    isSearchUpdate.current = false;
    
    // Reset image errors when fetching new products
    try {
      const params = {
        search: searchQuery || undefined,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
        // Add vehicle filters with proper naming
        ...(vehicleFilters.make && { vehicle_make: vehicleFilters.make }),
        ...(vehicleFilters.model && { vehicle_model: vehicleFilters.model }),
        ...(vehicleFilters.year && { vehicle_year: vehicleFilters.year }),
        ...(vehicleFilters.engine && { vehicle_engine: vehicleFilters.engine }),
        page: pagination.page,
        limit: pagination.limit
      };
      
      const response = await getProducts(params);
      setProducts(response.products);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, vehicleFilters, pagination.page, pagination.limit]);

  // Fetch vehicles for dropdown
  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setVehiclesLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounce search - mark as search update to prevent loading spinner
  useEffect(() => {
    const timer = setTimeout(() => {
      isSearchUpdate.current = true;
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        fetchProducts();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filters, vehicleFilters]);

  // Handle create product
  const onCreateSubmit = async (data) => {
    setImageError(null);
    try {
      console.log('Creating product with data:', data);
      console.log('Selected vehicles:', selectedVehicles);
      
      // Combine selected vehicle IDs and new vehicle objects
      const vehicleData = [
        ...selectedVehicles, // existing vehicle IDs (strings)
        ...newVehiclesList    // new vehicle objects
      ];
      
      const newProduct = await createProduct({
        ...data,
        purchase_price: parseFloat(data.purchase_price),
        selling_price: parseFloat(data.selling_price),
        quantity: parseInt(data.quantity) || 0,
        minimum: parseInt(data.minimum) || 0,
        vehicle_ids: vehicleData.length > 0 ? vehicleData : undefined
      });
      
      console.log('Product created:', newProduct);
      
      // Upload image if selected
      if (selectedImage && newProduct?.id) {
        try {
          await uploadProductImage(newProduct.id, selectedImage);
        } catch (imgError) {
          console.error('Failed to upload image:', imgError);
          setImageError('Product created but image upload failed. You can edit the product to try again.');
        }
      }
      
      // Reset form first
      reset();
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedVehicles([]);
      setNewVehiclesList([]);
      setNewVehicle({ make: '', model: '', year: '', trim: '', fuel_type: '', engine: '' });
      setIsCreateDialogOpen(false);
      
      // Reset to page 1 and refresh products list (new product will be at top)
      setPagination(prev => ({ ...prev, page: 1 }));
      
      // Small delay to ensure pagination state updates before fetching
      setTimeout(async () => {
        await fetchProducts();
      }, 100);
      
      // Show success message
      showToast('Product created successfully!');
      
      if (imageError) {
        showToast(imageError, 'error');
      }
    } catch (error) {
      console.error('Failed to create product:', error);
      console.error('Error response:', error.response?.data);
      showToast(error.response?.data?.error || error.message || 'Failed to create product', 'error');
    }
  };

  // Handle edit product
  const onEditSubmit = async (data) => {
    if (!selectedProduct) return;
    
    setImageError(null);
    try {
      const updateData = {
        ...data,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : undefined,
        selling_price: data.selling_price ? parseFloat(data.selling_price) : undefined,
        quantity: data.quantity !== undefined ? parseInt(data.quantity) : undefined,
        vehicle_ids: selectedVehicles
      };
      
      await updateProduct(selectedProduct.id, updateData);
      
      // Upload new image if selected
      if (selectedImage) {
        try {
          await uploadProductImage(selectedProduct.id, selectedImage);
        } catch (imgError) {
          console.error('Failed to upload image:', imgError);
          setImageError('Product updated but image upload failed.');
        }
      }
      
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedVehicles([]);
      reset();
      fetchProducts();
      showToast('Product updated successfully!');
      
      if (imageError) {
        showToast(imageError, 'error');
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      showToast(error.response?.data?.error || 'Failed to update product', 'error');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      await deleteProduct(selectedProduct.id);
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      showToast('Product deleted successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      showToast(error.response?.data?.error || 'Failed to delete product', 'error');
    }
  };

  // Fetch product transactions
  const fetchProductTransactions = async (productId) => {
    if (!productId) return;
    
    setTransactionsLoading(true);
    try {
      const result = await getProductTransactions(productId);
      setProductTransactions(result.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      showToast('Failed to fetch transactions', 'error');
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Handle update transaction reason
  const handleUpdateTransactionReason = async (transactionId, newReason) => {
    try {
      await updateTransactionReason(transactionId, newReason);
      showToast('Transaction reason updated!');
      // Refresh transactions
      if (selectedProduct) {
        fetchProductTransactions(selectedProduct.id);
      }
    } catch (error) {
      console.error('Failed to update transaction reason:', error);
      showToast('Failed to update reason', 'error');
    }
  };

  // Handle inventory adjustment
  const handleAdjustInventory = async (change) => {
    if (!selectedProduct || isAdjusting) return;
    
    setIsAdjusting(true);
    try {
      await adjustInventory(selectedProduct.id, change, change > 0 ? 'شراء من مورد' : 'بيع');
      setIsAdjustDialogOpen(false);
      setSelectedProduct(null);
      showToast('Inventory adjusted successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Failed to adjust inventory:', error);
      showToast(error.message || 'Failed to adjust inventory', 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = async (product) => {
    setSelectedProduct(product);
    setValue('name', product.name);
    setValue('serial_number', product.serial_number);
    setValue('part_type', product.part_type);
    setValue('purchase_price', product.purchase_price?.toString());
    setValue('selling_price', product.selling_price?.toString());
    setValue('description', product.description);
    setValue('quantity', product.quantity?.toString());
    setValue('minimum', product.minimum?.toString() || '0');
    setValue('product_condition', product.product_condition);
    setImagePreview(product.image_url);
    
    // Clear and set selected vehicles from product data
    setSelectedVehicles([]);
    if (product.vehicles && Array.isArray(product.vehicles)) {
      const vehicleIds = product.vehicles
        .filter(v => v && v.id) // Ensure valid vehicle objects
        .map(v => v.id);
      setSelectedVehicles(vehicleIds);
    }
    
    // Fetch vehicles for dropdown
    await fetchVehicles();
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  // Open adjust dialog
  const openAdjustDialog = (product) => {
    setSelectedProduct(product);
    setIsAdjustDialogOpen(true);
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset dialogs
  const resetDialogs = () => {
    setSelectedProduct(null);
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedVehicles([]);
    setNewVehiclesList([]);
    setNewVehicle({ make: '', model: '', year: '', trim: '', fuel_type: '', engine: '' });
    setImageError(null);
    reset();
  };
  
  // Open create dialog
  const openCreateDialog = async () => {
    resetDialogs();
    await fetchVehicles();
    setIsCreateDialogOpen(true);
  };

  // Handle print functionality
  const handlePrint = () => {
    const printContent = document.getElementById('print-preview');
    if (!printContent) return;

    const selectedCount = selectedProducts.length;
    const estimatedPages = Math.ceil(selectedCount / 40); // ~40 rows per page

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to print', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Report</title>
          <style>
            @page {
              size: A4;
              margin: 15mm 10mm;
            }
            @page :first {
              margin-top: 10mm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              font-size: 10pt;
              line-height: 1.3;
            }
            .page-header {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #333;
            }
            h1 { 
              margin: 0 0 5px 0; 
              font-size: 18pt;
            }
            .subtitle { 
              color: #666; 
              font-size: 10pt; 
              margin: 0;
            }
            .report-info {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              font-size: 9pt;
              color: #666;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 10px;
              page-break-inside: auto;
            }
            thead {
              display: table-header-group;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th { 
              border: 1px solid #333; 
              padding: 6px 4px; 
              text-align: left;
              font-weight: bold;
              background-color: #f0f0f0;
              font-size: 9pt;
            }
            td { 
              border: 1px solid #ccc; 
              padding: 5px 4px; 
              text-align: left;
              font-size: 9pt;
              vertical-align: top;
            }
            tr:nth-child(even) { 
              background-color: #fafafa; 
            }
            .page-footer {
              position: fixed;
              bottom: 5mm;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 8pt;
              color: #666;
            }
            .summary-box {
              margin-top: 15px;
              padding: 10px;
              background: #f5f5f5;
              border: 1px solid #ddd;
              page-break-inside: avoid;
            }
            .summary-title {
              font-weight: bold;
              margin-bottom: 5px;
            }
            @media print {
              body { 
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print { display: none; }
              thead { display: table-header-group; }
              .page-footer {
                position: fixed;
                bottom: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-header">
            <h1>Inventory Report</h1>
            <p class="subtitle">${new Date().toLocaleDateString()} - ${selectedCount} Products</p>
          </div>
          
          <div class="report-info">
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            <span>Estimated Pages: ${estimatedPages}</span>
          </div>

          ${printContent.innerHTML}
          
          <div class="no-print" style="text-align: center; margin-top: 30px; padding: 20px;">
            <p style="color: #666; margin-bottom: 15px;">
              Ready to print ${selectedCount} products across ${estimatedPages} pages
            </p>
            <button onclick="window.print()" style="padding: 12px 24px; font-size: 14px; cursor: pointer; background: #333; color: white; border: none; border-radius: 4px;">
              Print Document
            </button>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 200);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Layout title="Inventory Management">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white transition-all ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              className="ml-2 p-1 hover:bg-white/20 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Header with stats button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Inventory</h1>
            <p className="text-sm text-slate-600">
              Manage your products and track stock levels
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Stats Overview Button */}
            <Button 
              variant="outline"
              onClick={() => navigate('/statistics')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Statistics
            </Button>
            
            <Button variant="outline" onClick={() => navigate('/vehicles')}>
              <Car className="mr-2 h-4 w-4" />
              Add Car
            </Button>

            <Button 
              variant="outline" 
              onClick={() => {
                setIsPrintMode(true);
                setSelectedProducts([]);
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
                
                {(Object.values(filters).some(v => v !== '') || searchQuery || Object.values(vehicleFilters).some(v => v !== '')) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setFilters({
                        part_type: '',
                        product_condition: '',
                        min_quantity: '',
                        max_quantity: '',
                        min_price: '',
                        max_price: '',
                        stock_alert: 'all',
                        sort_by: 'created_at',
                        sort_order: 'desc'
                      });
                      setVehicleFilters({ make: '', model: '', year: '', engine: '' });
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>

              {showFilters && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs">Part Type</Label>
                    <Select
                      value={filters.part_type}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, part_type: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Part Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PART_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Condition</Label>
                    <Select
                      value={filters.product_condition}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, product_condition: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CONDITIONS.map((condition) => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Vehicle Filters - 4 Fields */}
                  <div>
                    <Label className="text-xs">Vehicle</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Make (e.g., BMW)"
                        value={vehicleFilters.make}
                        onChange={(e) => {
                          const value = e.target.value;
                          setVehicleFilters(prev => ({ ...prev, make: value }));
                        }}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Model (e.g., M5)"
                        value={vehicleFilters.model}
                        onChange={(e) => {
                          const value = e.target.value;
                          setVehicleFilters(prev => ({ ...prev, model: value }));
                        }}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Year (e.g., 2020)"
                        value={vehicleFilters.year}
                        onChange={(e) => {
                          const value = e.target.value;
                          setVehicleFilters(prev => ({ ...prev, year: value }));
                        }}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Engine (e.g., 2.0L)"
                        value={vehicleFilters.engine}
                        onChange={(e) => {
                          const value = e.target.value;
                          setVehicleFilters(prev => ({ ...prev, engine: value }));
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Quantity Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.min_quantity}
                        onChange={(e) => setFilters(prev => ({ ...prev, min_quantity: e.target.value }))}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.max_quantity}
                        onChange={(e) => setFilters(prev => ({ ...prev, max_quantity: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Price Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min DA"
                        value={filters.min_price}
                        onChange={(e) => setFilters(prev => ({ ...prev, min_price: e.target.value }))}
                      />
                      <Input
                        type="number"
                        placeholder="Max DA"
                        value={filters.max_price}
                        onChange={(e) => setFilters(prev => ({ ...prev, max_price: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Stock Alert</Label>
                    <Select
                      value={filters.stock_alert}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, stock_alert: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="low">Low Stock (Below Min)</SelectItem>
                        <SelectItem value="critical">Critical (Zero Stock)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Sort By</Label>
                    <Select
                      value={filters.sort_by}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, sort_by: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Date Added</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="quantity">Quantity</SelectItem>
                        <SelectItem value="selling_price">Price</SelectItem>
                        <SelectItem value="stock_ratio">Stock Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Print Mode Banner */}
        {isPrintMode && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Printer className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Print Mode: Select products to print ({selectedProducts.length} selected)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedProducts.length === products.length) {
                        setSelectedProducts([]);
                      } else {
                        setSelectedProducts(products.map(p => p.id));
                      }
                    }}
                  >
                    {selectedProducts.length === products.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPrintDialogOpen(true)}
                    disabled={selectedProducts.length === 0}
                  >
                    <Settings2 className="mr-1 h-4 w-4" />
                    Print Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsPrintMode(false);
                      setSelectedProducts([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {isPrintMode && (
                      <th className="px-2 py-2 text-center text-xs font-medium text-slate-600 w-10">Select</th>
                    )}
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Image</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Serial #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Condition</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Stock</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Buy</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Sell</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={isPrintMode ? 10 : 9} className="px-3 py-6 text-center text-slate-500">
                        Loading...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={isPrintMode ? 10 : 9} className="px-3 py-6 text-center text-slate-500">
                        No products found. Add your first product!
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className={`hover:bg-slate-50 ${selectedProducts.includes(product.id) ? 'bg-blue-50' : ''}`}>
                        {isPrintMode && (
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => {
                                if (selectedProducts.includes(product.id)) {
                                  setSelectedProducts(prev => prev.filter(id => id !== product.id));
                                } else {
                                  setSelectedProducts(prev => [...prev, product.id]);
                                }
                              }}
                              className="p-1 hover:bg-slate-200 rounded"
                            >
                              {selectedProducts.includes(product.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-slate-400" />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <div 
                            className="h-10 w-10 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => { setSelectedProduct(product); setIsDetailsDialogOpen(true); }}
                          >
                            <ProductImage 
                              src={product.image_url} 
                              productId={product.id} 
                              getProxyUrl={getProductImageUrl}
                              alt={product.name}
                              placeholderClass="h-5 w-5 text-slate-400"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-sm text-slate-900">{product.name}</div>
                          {product.vehicles?.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Car className="h-3 w-3" />
                              {product.vehicles.slice(0, 2).map(v => `${v.make} ${v.model}`).join(', ')}
                              {product.vehicles.length > 2 && ` +${product.vehicles.length - 2}`}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-600">{product.serial_number || '-'}</td>
                        <td className="px-3 py-2 text-sm text-slate-600">
                          {PART_TYPES.find(t => t.value === product.part_type)?.label || product.part_type || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-600">{product.product_condition || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-medium ${
                              product.quantity <= (product.minimum || 0) ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {product.quantity}
                            </span>
                            {product.quantity <= (product.minimum || 0) && (
                              <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-600">
                                LOW
                              </span>
                            )}
                            <button
                              onClick={() => openAdjustDialog(product)}
                              className="rounded p-0.5 hover:bg-slate-200 text-xs"
                              title="Adjust"
                            >
                              ±
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-600">
                          {product.purchase_price?.toLocaleString()} DA
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-slate-900">
                          {product.selling_price?.toLocaleString()} DA
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setSelectedProduct(product); setIsDetailsDialogOpen(true); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => openDeleteDialog(product)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="text-sm text-slate-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-2 text-sm text-slate-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Product Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 w-32 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                      <Package className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="product-image"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('product-image').click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && (
                    <p className="text-xs text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input id="serial_number" {...register('serial_number')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="part_type">Part Type *</Label>
                  <Select
                    onValueChange={(value) => setValue('part_type', value)}
                    defaultValue=""
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Part Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PART_TYPES.filter(t => t.value !== '').map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.part_type && (
                    <p className="text-xs text-red-500">{errors.part_type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_condition">Condition</Label>
                  <Select
                    value={watch('product_condition') || ''}
                    onValueChange={(value) => setValue('product_condition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CONDITIONS.filter(c => c.value !== '').map((condition) => (
                        <SelectItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Purchase Price (DA) *</Label>
                  <Input id="purchase_price" type="number" step="0.01" {...register('purchase_price')} />
                  {errors.purchase_price && (
                    <p className="text-xs text-red-500">{errors.purchase_price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price (DA) *</Label>
                  <Input id="selling_price" type="number" step="0.01" {...register('selling_price')} />
                  {errors.selling_price && (
                    <p className="text-xs text-red-500">{errors.selling_price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Initial Quantity</Label>
                  <Input id="quantity" type="number" {...register('quantity')} defaultValue="0" />
                  {errors.quantity && (
                    <p className="text-xs text-red-500">{errors.quantity.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum">Minimum Stock Alert</Label>
                  <Input id="minimum" type="number" {...register('minimum')} defaultValue="0" />
                  {errors.minimum && (
                    <p className="text-xs text-red-500">{errors.minimum.message}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Warn when stock falls below this level
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm"
                />
              </div>

              {/* Vehicle Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Compatible Vehicles</Label>
                
                {/* Existing Vehicles */}
                {vehicles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600">Select from existing:</Label>
                    <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 p-2">
                      {vehicles.map((vehicle) => (
                        <label
                          key={vehicle.id}
                          className="flex items-center gap-2 py-1 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedVehicles.includes(vehicle.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVehicles([...selectedVehicles, vehicle.id]);
                              } else {
                                setSelectedVehicles(selectedVehicles.filter(id => id !== vehicle.id));
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">
                            {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Add New Vehicle */}
                <div className="space-y-2 rounded-md border border-slate-200 p-3">
                  <Label className="text-sm text-slate-600">Add new vehicle:</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="v-make" className="text-xs">Make *</Label>
                      <Input 
                        id="v-make" 
                        value={newVehicle.make}
                        onChange={(e) => setNewVehicle({...newVehicle, make: e.target.value})}
                        placeholder="e.g. Toyota"
                      />
                    </div>
                    <div>
                      <Label htmlFor="v-model" className="text-xs">Model *</Label>
                      <Input 
                        id="v-model" 
                        value={newVehicle.model}
                        onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                        placeholder="e.g. Corolla"
                      />
                    </div>
                    <div>
                      <Label htmlFor="v-year" className="text-xs">Year</Label>
                      <Input 
                        id="v-year" 
                        type="number"
                        value={newVehicle.year}
                        onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})}
                        placeholder="e.g. 2020"
                      />
                    </div>
                    <div>
                      <Label htmlFor="v-trim" className="text-xs">Trim</Label>
                      <Input 
                        id="v-trim" 
                        value={newVehicle.trim}
                        onChange={(e) => setNewVehicle({...newVehicle, trim: e.target.value})}
                        placeholder="e.g. LE, XLE"
                      />
                    </div>
                    <div>
                      <Label htmlFor="v-fuel" className="text-xs">Fuel Type</Label>
                      <Input 
                        id="v-fuel" 
                        value={newVehicle.fuel_type}
                        onChange={(e) => setNewVehicle({...newVehicle, fuel_type: e.target.value})}
                        placeholder="e.g. Gasoline, Diesel"
                      />
                    </div>
                    <div>
                      <Label htmlFor="v-engine" className="text-xs">Engine</Label>
                      <Input 
                        id="v-engine" 
                        value={newVehicle.engine}
                        onChange={(e) => setNewVehicle({...newVehicle, engine: e.target.value})}
                        placeholder="e.g. 2.0L, V6"
                      />
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    disabled={!newVehicle.make || !newVehicle.model}
                    onClick={() => {
                      if (newVehicle.make && newVehicle.model) {
                        setNewVehiclesList([...newVehiclesList, { ...newVehicle }]);
                        setNewVehicle({ make: '', model: '', year: '', trim: '', fuel_type: '', engine: '' });
                      }
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Vehicle
                  </Button>
                </div>
                
                {/* Selected/New Vehicles Summary */}
                {(selectedVehicles.length > 0 || newVehiclesList.length > 0) && (
                  <div className="rounded-md bg-slate-50 p-2">
                    <p className="text-xs font-medium text-slate-600 mb-1">
                      Vehicles to be linked ({selectedVehicles.length + newVehiclesList.length}):
                    </p>
                    <ul className="text-sm space-y-1">
                      {selectedVehicles.map((vid, idx) => {
                        // Look up in product vehicles first, then in global list
                        const v = selectedProduct?.vehicles?.find(pv => pv.id === vid) 
                                 || vehicles.find(ve => ve.id === vid);
                        return <li key={`existing-${idx}`}>• {v?.make || 'Unknown'} {v?.model || ''} {v?.year && `(${v.year})`} (existing)</li>;
                      })}
                      {newVehiclesList.map((v, idx) => (
                        <li key={`new-${idx}`} className="text-blue-600">
                          • {v.make} {v.model} {v.year && `(${v.year})`} (new)
                          <button 
                            type="button"
                            onClick={() => setNewVehiclesList(newVehiclesList.filter((_, i) => i !== idx))}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetDialogs();
                }}>
                  Cancel
                </Button>
                <Button type="submit">Create Product</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 w-32 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                      <Package className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="edit-product-image"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('edit-product-image').click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {selectedProduct?.image_url ? 'Change Image' : 'Upload Image'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Product Name *</Label>
                  <Input id="edit-name" {...register('name')} />
                  {errors.name && (
                    <p className="text-xs text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-serial_number">Serial Number</Label>
                  <Input id="edit-serial_number" {...register('serial_number')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-part_type">Part Type *</Label>
                  <Select
                    onValueChange={(value) => setValue('part_type', value)}
                    value={watch('part_type') || ''}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Part Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PART_TYPES.filter(t => t.value !== '').map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.part_type && (
                    <p className="text-xs text-red-500">{errors.part_type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-product_condition">Condition</Label>
                  <Select
                    value={watch('product_condition') || ''}
                    onValueChange={(value) => setValue('product_condition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CONDITIONS.filter(c => c.value !== '').map((condition) => (
                        <SelectItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-purchase_price">Purchase Price (DA) *</Label>
                  <Input id="edit-purchase_price" type="number" step="0.01" {...register('purchase_price')} />
                  {errors.purchase_price && (
                    <p className="text-xs text-red-500">{errors.purchase_price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-selling_price">Selling Price (DA) *</Label>
                  <Input id="edit-selling_price" type="number" step="0.01" {...register('selling_price')} />
                  {errors.selling_price && (
                    <p className="text-xs text-red-500">{errors.selling_price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Quantity</Label>
                  <Input id="edit-quantity" type="number" {...register('quantity')} />
                  {errors.quantity && (
                    <p className="text-xs text-red-500">{errors.quantity.message}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Changes will create an automatic inventory transaction
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-minimum">Minimum Stock Alert</Label>
                  <Input id="edit-minimum" type="number" {...register('minimum')} />
                  {errors.minimum && (
                    <p className="text-xs text-red-500">{errors.minimum.message}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Warn when stock falls below this level
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  {...register('description')}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm"
                />
              </div>

              {/* Vehicle Selection - Edit */}
              <div className="space-y-2">
                <Label>Compatible Vehicles</Label>
                {vehiclesLoading ? (
                  <div className="text-sm text-slate-500">Loading vehicles...</div>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 p-2">
                    {vehicles.length === 0 ? (
                      <div className="text-sm text-slate-500">No vehicles available</div>
                    ) : (
                      vehicles.map((vehicle) => (
                        <label
                          key={vehicle.id}
                          className="flex items-center gap-2 py-1 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedVehicles.includes(vehicle.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVehicles([...selectedVehicles, vehicle.id]);
                              } else {
                                setSelectedVehicles(selectedVehicles.filter(id => id !== vehicle.id));
                              }
                            }}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">
                            {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
                {selectedVehicles.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {selectedVehicles.length} vehicle(s) selected
                  </p>
                )}
              </div>

              {/* Add New Vehicle - Edit */}
              <div className="space-y-2">
                <Label>Add new vehicle:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Make *</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Toyota"
                      value={newVehicle.make}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, make: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Model *</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Corolla"
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Year</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 2020"
                      value={newVehicle.year}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, year: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Trim</Label>
                    <Input
                      type="text"
                      placeholder="e.g., LE"
                      value={newVehicle.trim}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, trim: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Fuel Type</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Petrol, Diesel, Electric"
                      value={newVehicle.fuel_type}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, fuel_type: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Engine</Label>
                    <Input
                      type="text"
                      placeholder="e.g., 2.0L, V6"
                      value={newVehicle.engine}
                      onChange={(e) => setNewVehicle(prev => ({ ...prev, engine: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!newVehicle.make.trim() || !newVehicle.model.trim()) {
                      showToast('Make and Model are required', 'error');
                      return;
                    }
                    const vehicleToAdd = {
                      ...newVehicle,
                      make: newVehicle.make.trim(),
                      model: newVehicle.model.trim(),
                      trim: newVehicle.trim?.trim() || null,
                      fuel_type: newVehicle.fuel_type?.trim() || null,
                      engine: newVehicle.engine?.trim() || null,
                      year: newVehicle.year ? parseInt(newVehicle.year) : null
                    };
                    setSelectedVehicles(prev => [...prev, vehicleToAdd]);
                    setNewVehicle({ make: '', model: '', year: '', trim: '', fuel_type: '', engine: '' });
                    showToast('Vehicle added to list');
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Vehicle
                </Button>
                
                {selectedVehicles.filter(v => typeof v === 'object').length > 0 && (
                  <div className="text-sm text-slate-500">
                    <p className="font-medium">New vehicles to add:</p>
                    <ul className="list-disc list-inside">
                      {selectedVehicles.filter(v => typeof v === 'object').map((v, idx) => (
                        <li key={idx}>{v.make} {v.model} ({v.year || 'N/A'}) (new)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  resetDialogs();
                }}>
                  Cancel
                </Button>
                <Button type="submit">Update Product</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-slate-600">
                Are you sure you want to delete <strong>{selectedProduct?.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedProduct(null);
                }}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Adjust Inventory Dialog */}
        <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Inventory - {selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Current stock: <strong>{selectedProduct?.quantity}</strong>
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAdjustInventory(1)}
                  disabled={isAdjusting}
                >
                  <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                  +1 Stock
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={selectedProduct?.quantity <= 0 || isAdjusting}
                  onClick={() => handleAdjustInventory(-1)}
                >
                  <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                  -1 Stock
                </Button>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => {
                  setIsAdjustDialogOpen(false);
                  setSelectedProduct(null);
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Product Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-6">
                {/* Image */}
                <div className="flex justify-center">
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="h-48 w-48 rounded-lg object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`h-48 w-48 rounded-lg bg-slate-100 items-center justify-center ${selectedProduct.image_url ? 'hidden' : 'flex'}`}
                  >
                    <Package className="h-20 w-20 text-slate-300" />
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-slate-500">Product Name</Label>
                    <p className="font-medium">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Serial Number</Label>
                    <p className="font-medium">{selectedProduct.serial_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Part Type</Label>
                    <p className="font-medium">
                      {selectedProduct.part_type 
                        ? PART_TYPES.find(t => t.value === selectedProduct.part_type)?.label || selectedProduct.part_type
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Condition</Label>
                    <p className="font-medium">{selectedProduct.product_condition || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Stock Quantity</Label>
                    <p className={`font-medium ${
                      selectedProduct.quantity <= (selectedProduct.minimum || 0) ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {selectedProduct.quantity} {selectedProduct.quantity <= (selectedProduct.minimum || 0) && '(Low Stock!)'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Minimum Alert Level</Label>
                    <p className="font-medium">{selectedProduct.minimum || 0}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Purchase Price</Label>
                    <p className="font-medium">{selectedProduct.purchase_price?.toLocaleString()} DA</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Selling Price</Label>
                    <p className="font-medium">{selectedProduct.selling_price?.toLocaleString()} DA</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Supplier</Label>
                    <p className="font-medium">
                      {selectedProduct.supplier_name || (selectedProduct.supplier_id ? 'Unknown Supplier' : 'External')}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div>
                    <Label className="text-xs text-slate-500">Description</Label>
                    <p className="mt-1 text-sm text-slate-700">{selectedProduct.description}</p>
                  </div>
                )}

                {/* Compatible Vehicles */}
                <div>
                  <Label className="text-xs text-slate-500 flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    Compatible Vehicles ({selectedProduct.vehicles?.length || 0})
                  </Label>
                  {selectedProduct.vehicles && selectedProduct.vehicles.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {selectedProduct.vehicles.map((vehicle, idx) => (
                        <div key={idx} className="rounded-md border border-slate-200 p-2 text-sm">
                          <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                          {vehicle.year && <span className="text-slate-500"> ({vehicle.year})</span>}
                          {vehicle.trim && <span className="text-slate-500"> - {vehicle.trim}</span>}
                          {vehicle.engine && <span className="text-slate-500"> • {vehicle.engine}</span>}
                          {vehicle.fuel_type && <span className="text-slate-500"> • {vehicle.fuel_type}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">No vehicles linked to this product</p>
                  )}
                </div>

                {/* Inventory Transactions */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Inventory Transactions ({productTransactions.length || 0})
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!showTransactions) {
                          fetchProductTransactions(selectedProduct.id);
                        }
                        setShowTransactions(!showTransactions);
                      }}
                    >
                      {showTransactions ? 'Hide' : 'View'} Transactions
                    </Button>
                  </div>
                  
                  {showTransactions && (
                    <div className="mt-2">
                      {transactionsLoading ? (
                        <p className="text-sm text-slate-500">Loading transactions...</p>
                      ) : productTransactions.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {productTransactions.map((transaction) => (
                            <div key={transaction.id} className="rounded-md border border-slate-200 p-2 text-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {transaction.change > 0 ? (
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                  )}
                                  <span className="font-medium">
                                    {transaction.change > 0 ? '+' : ''}{transaction.change} units
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(transaction.created_at).toLocaleString('en-GB', { 
                                      day: '2-digit', 
                                      month: '2-digit', 
                                      year: '2-digit', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                                
                                {/* Editable Reason */}
                                {editingTransaction === transaction.id ? (
                                  <div className="flex items-center gap-1">
                                    <select
                                      className="text-xs border rounded px-1 py-0.5"
                                      defaultValue={transaction.reason}
                                      onChange={(e) => handleUpdateTransactionReason(transaction.id, e.target.value)}
                                      onBlur={() => setEditingTransaction(null)}
                                      autoFocus
                                    >
                                      <option value="buying">Buying</option>
                                      <option value="sale">Sale</option>
                                      <option value="damaged">Damaged</option>
                                      <option value="replaced">Replaced</option>
                                      <option value="lost">Lost</option>
                                    </select>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0"
                                      onClick={() => setEditingTransaction(null)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      transaction.reason === 'buying' 
                                        ? 'bg-green-100 text-green-700'
                                        : transaction.reason === 'sale'
                                        ? 'bg-red-100 text-red-700'
                                        : transaction.reason === 'damaged'
                                        ? 'bg-orange-100 text-orange-700'
                                        : transaction.reason === 'replaced'
                                        ? 'bg-blue-100 text-blue-700'
                                        : transaction.reason === 'lost'
                                        ? 'bg-gray-100 text-gray-700'
                                        : transaction.change > 0 
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {transaction.reason || (transaction.change > 0 ? 'buying' : 'sale')}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0"
                                      onClick={() => setEditingTransaction(transaction.id)}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {transaction.notes && (
                                <p className="mt-1 text-xs text-slate-500">{transaction.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No transactions found for this product</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="border-t pt-4 text-xs text-slate-400">
                  <p>Created: {new Date(selectedProduct.created_at).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedProduct.updated_at).toLocaleString()}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsDetailsDialogOpen(false);
                    setSelectedProduct(null);
                  }}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setIsDetailsDialogOpen(false);
                    openEditDialog(selectedProduct);
                  }}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Product
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Print Settings Dialog */}
        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Print Settings
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-sm text-slate-600 mb-4">
                {selectedProducts.length} products selected for printing
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Fields to Include</Label>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showQuantity"
                    checked={printSettings.showQuantity}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, showQuantity: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="showQuantity" className="text-sm cursor-pointer">Quantity</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPartType"
                    checked={printSettings.showPartType}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, showPartType: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="showPartType" className="text-sm cursor-pointer">Part Type</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showCondition"
                    checked={printSettings.showCondition}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, showCondition: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="showCondition" className="text-sm cursor-pointer">Condition</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPurchasePrice"
                    checked={printSettings.showPurchasePrice}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, showPurchasePrice: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="showPurchasePrice" className="text-sm cursor-pointer">Purchase Price</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showSellingPrice"
                    checked={printSettings.showSellingPrice}
                    onChange={(e) => setPrintSettings(prev => ({ ...prev, showSellingPrice: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="showSellingPrice" className="text-sm cursor-pointer">Selling Price</Label>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setIsPrintDialogOpen(false);
                  handlePrint();
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Print Preview - Hidden until print */}
        <div id="print-preview" className="hidden">
          <div className="print-content p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">Inventory Report</h1>
              <p className="text-sm text-slate-600">Generated on {new Date().toLocaleDateString()}</p>
            </div>
            
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium">#</th>
                  <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium">Product Name</th>
                  <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium">Serial Number</th>
                  {printSettings.showPartType && (
                    <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium">Part Type</th>
                  )}
                  {printSettings.showCondition && (
                    <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium">Condition</th>
                  )}
                  {printSettings.showQuantity && (
                    <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium">Quantity</th>
                  )}
                  {printSettings.showPurchasePrice && (
                    <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium">Purchase Price</th>
                  )}
                  {printSettings.showSellingPrice && (
                    <th className="border border-slate-300 px-3 py-2 text-left text-sm font-medium">Selling Price</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(p => selectedProducts.includes(p.id))
                  .map((product, index) => (
                    <tr key={product.id}>
                      <td className="border border-slate-300 px-3 py-2 text-sm">{index + 1}</td>
                      <td className="border border-slate-300 px-3 py-2 text-sm">{product.name}</td>
                      <td className="border border-slate-300 px-3 py-2 text-sm">{product.serial_number || '-'}</td>
                      {printSettings.showPartType && (
                        <td className="border border-slate-300 px-3 py-2 text-sm">
                          {PART_TYPES.find(t => t.value === product.part_type)?.label || product.part_type || '-'}
                        </td>
                      )}
                      {printSettings.showCondition && (
                        <td className="border border-slate-300 px-3 py-2 text-sm">{product.product_condition || '-'}</td>
                      )}
                      {printSettings.showQuantity && (
                        <td className="border border-slate-300 px-3 py-2 text-sm">{product.quantity}</td>
                      )}
                      {printSettings.showPurchasePrice && (
                        <td className="border border-slate-300 px-3 py-2 text-sm">
                          {product.purchase_price?.toLocaleString()} DA
                        </td>
                      )}
                      {printSettings.showSellingPrice && (
                        <td className="border border-slate-300 px-3 py-2 text-sm">
                          {product.selling_price?.toLocaleString()} DA
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
            
            <div className="mt-6 text-sm text-slate-600">
              <p>Total Products: {selectedProducts.length}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
