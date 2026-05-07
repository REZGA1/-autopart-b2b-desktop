import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Car,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import Layout from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import * as inventoryApi from '@/lib/inventoryApi'
import * as supplierApi from '@/lib/supplierCatalogApi'
import { useAuth } from '@/lib/authStore'
import { useToast } from '@/hooks/useToast'

// Validation schema
const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.string().optional().transform((val) => val ? parseInt(val) : null),
  trim: z.string().optional().nullable(),
  fuel_type: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
});

export default function VehiclesPage() {
  const { profile } = useAuth()
  const isSupplier = profile?.role === 'supplier'
  
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { toast, showToast } = useToast()
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: '',
      model: '',
      year: '',
      trim: '',
      fuel_type: '',
      engine: '',
    }
  });

  // Fetch vehicles
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = isSupplier
        ? await supplierApi.getVehicles()
        : await inventoryApi.getVehicles();
      setVehicles(data || []);
    } catch {
      showToast('Failed to fetch vehicles', 'error');
    } finally {
      setLoading(false);
    }
  }, [isSupplier, showToast]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => {
    const query = searchQuery.toLowerCase();
    return (
      vehicle.make?.toLowerCase().includes(query) ||
      vehicle.model?.toLowerCase().includes(query) ||
      vehicle.year?.toString().includes(query) ||
      vehicle.engine?.toLowerCase().includes(query)
    );
  });

  const onCreate = async (data) => {
    try {
      if (isSupplier) {
        await supplierApi.createVehicle(data);
      } else {
        await inventoryApi.createVehicle(data);
      }
      showToast('Vehicle created successfully!');
      setIsCreateDialogOpen(false);
      reset();
      fetchVehicles();
    } catch {
      showToast('Failed to create vehicle', 'error');
    }
  };

  const onUpdate = async (data) => {
    try {
      if (isSupplier) {
        await supplierApi.updateVehicle(selectedVehicle.id, data);
      } else {
        await inventoryApi.updateVehicle(selectedVehicle.id, data);
      }
      showToast('Vehicle updated successfully!');
      setIsEditDialogOpen(false);
      setSelectedVehicle(null);
      reset();
      fetchVehicles();
    } catch {
      showToast('Failed to update vehicle', 'error');
    }
  };

  const onDelete = async () => {
    try {
      if (isSupplier) {
        await supplierApi.deleteVehicle(selectedVehicle.id);
      } else {
        await inventoryApi.deleteVehicle(selectedVehicle.id);
      }
      showToast('Vehicle deleted successfully!');
      setIsDeleteDialogOpen(false);
      setSelectedVehicle(null);
      fetchVehicles();
    } catch {
      showToast('Failed to delete vehicle', 'error');
    }
  };

  // Open edit dialog
  const openEditDialog = (vehicle) => {
    setSelectedVehicle(vehicle);
    setValue('make', vehicle.make);
    setValue('model', vehicle.model);
    setValue('year', vehicle.year?.toString() || '');
    setValue('trim', vehicle.trim || '');
    setValue('fuel_type', vehicle.fuel_type || '');
    setValue('engine', vehicle.engine || '');
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(isSupplier ? '/catalog' : '/inventory')}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {isSupplier ? 'Back to Catalog' : 'Back to Inventory'}
          </Button>
          <h1 className="text-2xl font-bold">Manage Vehicles</h1>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by make, model, year, or engine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Vehicle
          </Button>
        </div>

        {/* Vehicles Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Make</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Trim</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead>Engine</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading vehicles...
                    </TableCell>
                  </TableRow>
                ) : filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      {searchQuery ? 'No vehicles found matching your search' : 'No vehicles found. Add your first vehicle!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.make}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.year || '-'}</TableCell>
                      <TableCell>{vehicle.trim || '-'}</TableCell>
                      <TableCell>{vehicle.fuel_type || '-'}</TableCell>
                      <TableCell>{vehicle.engine || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(vehicle)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => openDeleteDialog(vehicle)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Vehicle Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="make">Make *</Label>
                  <Input id="make" {...register('make')} placeholder="e.g., Toyota" />
                  {errors.make && <p className="text-red-500 text-xs mt-1">{errors.make.message}</p>}
                </div>
                <div>
                  <Label htmlFor="model">Model *</Label>
                  <Input id="model" {...register('model')} placeholder="e.g., Corolla" />
                  {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input id="year" {...register('year')} placeholder="e.g., 2020" />
                </div>
                <div>
                  <Label htmlFor="trim">Trim</Label>
                  <Input id="trim" {...register('trim')} placeholder="e.g., LE, Sport" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fuel_type">Fuel Type</Label>
                  <Input id="fuel_type" {...register('fuel_type')} placeholder="e.g., Petrol, Diesel" />
                </div>
                <div>
                  <Label htmlFor="engine">Engine</Label>
                  <Input id="engine" {...register('engine')} placeholder="e.g., 2.0L, V6" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit">Create Vehicle</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Vehicle Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-make">Make *</Label>
                  <Input id="edit-make" {...register('make')} />
                  {errors.make && <p className="text-red-500 text-xs mt-1">{errors.make.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-model">Model *</Label>
                  <Input id="edit-model" {...register('model')} />
                  {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-year">Year</Label>
                  <Input id="edit-year" {...register('year')} />
                </div>
                <div>
                  <Label htmlFor="edit-trim">Trim</Label>
                  <Input id="edit-trim" {...register('trim')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-fuel_type">Fuel Type</Label>
                  <Input id="edit-fuel_type" {...register('fuel_type')} />
                </div>
                <div>
                  <Label htmlFor="edit-engine">Engine</Label>
                  <Input id="edit-engine" {...register('engine')} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedVehicle(null);
                  reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit">Update Vehicle</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Vehicle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-slate-600">
                Are you sure you want to delete this vehicle?
              </p>
              {selectedVehicle && (
                <div className="bg-slate-100 p-3 rounded-md">
                  <p className="font-medium">{selectedVehicle.make} {selectedVehicle.model}</p>
                  <p className="text-sm text-slate-500">
                    {selectedVehicle.year} • {selectedVehicle.engine || 'No engine info'}
                  </p>
                </div>
              )}
              <p className="text-sm text-red-600">
                This will also remove this vehicle from all linked products.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedVehicle(null);
                }}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={onDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
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
      </div>
    </Layout>
  );
}
