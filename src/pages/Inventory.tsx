import { useState, useEffect } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { Product, PRODUCT_CATEGORIES, UNITS, MOVEMENT_TYPES, StockHistory } from '@/types/inventory';
import { formatCurrency } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  History, 
  Search,
  Edit,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  RotateCcw,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Inventory() {
  const { products, isLoading, alerts, addProduct, updateProduct, deleteProduct, adjustStock, fetchStockHistory } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    quantity: 0,
    unit: 'pcs',
    cost_price: 0,
    selling_price: 0,
    reorder_point: 10,
    low_stock_threshold: 5,
    supplier: '',
    location: '',
    is_active: true,
  });

  const [stockForm, setStockForm] = useState({
    quantity: 0,
    movementType: 'in' as 'in' | 'out' | 'adjustment' | 'return',
    reference: '',
    notes: '',
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalProducts: products.length,
    totalValue: products.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0),
    lowStock: alerts.filter(a => a.alertType === 'low_stock').length,
    outOfStock: alerts.filter(a => a.alertType === 'out_of_stock').length,
  };

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      sku: '',
      category: '',
      quantity: 0,
      unit: 'pcs',
      cost_price: 0,
      selling_price: 0,
      reorder_point: 10,
      low_stock_threshold: 5,
      supplier: '',
      location: '',
      is_active: true,
    });
    setSelectedProduct(null);
  }

  function handleEdit(product: Product) {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      category: product.category || '',
      quantity: product.quantity,
      unit: product.unit,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      reorder_point: product.reorder_point,
      low_stock_threshold: product.low_stock_threshold,
      supplier: product.supplier || '',
      location: product.location || '',
      is_active: product.is_active,
    });
    setShowAddDialog(true);
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const productData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      sku: formData.sku.trim() || null,
      category: formData.category || null,
      quantity: formData.quantity,
      unit: formData.unit,
      cost_price: formData.cost_price,
      selling_price: formData.selling_price,
      reorder_point: formData.reorder_point,
      low_stock_threshold: formData.low_stock_threshold,
      supplier: formData.supplier.trim() || null,
      location: formData.location.trim() || null,
      is_active: formData.is_active,
    };

    if (selectedProduct) {
      await updateProduct(selectedProduct.id, productData);
    } else {
      await addProduct(productData);
    }

    setShowAddDialog(false);
    resetForm();
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
    }
  }

  function openStockDialog(product: Product) {
    setSelectedProduct(product);
    setStockForm({
      quantity: 0,
      movementType: 'in',
      reference: '',
      notes: '',
    });
    setShowStockDialog(true);
  }

  async function handleStockAdjust() {
    if (!selectedProduct || stockForm.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    await adjustStock(
      selectedProduct.id,
      stockForm.quantity,
      stockForm.movementType,
      stockForm.reference || undefined,
      stockForm.notes || undefined
    );

    setShowStockDialog(false);
    setSelectedProduct(null);
  }

  async function openHistoryDialog(product: Product) {
    setSelectedProduct(product);
    setIsHistoryLoading(true);
    setShowHistoryDialog(true);
    
    const history = await fetchStockHistory(product.id);
    setStockHistory(history);
    setIsHistoryLoading(false);
  }

  function getStockBadge(product: Product) {
    if (product.quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (product.quantity <= product.low_stock_threshold) {
      return <Badge variant="destructive" className="bg-orange-500">Low Stock</Badge>;
    }
    if (product.quantity <= product.reorder_point) {
      return <Badge variant="secondary" className="bg-yellow-500 text-black">Reorder</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">In Stock</Badge>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your products and stock levels</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              <DialogDescription>
                {selectedProduct ? 'Update product details' : 'Enter the details for the new product'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g., PRD-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(unit => (
                        <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Initial Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Selling Price</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reorder_point">Reorder Point</Label>
                  <Input
                    id="reorder_point"
                    type="number"
                    min="0"
                    value={formData.reorder_point}
                    onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    min="0"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Storage Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Warehouse A, Shelf 5"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active Product</Label>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {selectedProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Bell className="h-5 w-5" />
              Stock Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {alerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className={cn(
                    "h-4 w-4",
                    alert.alertType === 'out_of_stock' ? 'text-red-500' : 
                    alert.alertType === 'low_stock' ? 'text-orange-500' : 'text-yellow-500'
                  )} />
                  <span>{alert.message}</span>
                </div>
              ))}
              {alerts.length > 5 && (
                <p className="text-sm text-muted-foreground">... and {alerts.length - 5} more alerts</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.outOfStock}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PRODUCT_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading products...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {products.length === 0 ? 'No products yet. Add your first product!' : 'No products match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        {product.supplier && (
                          <div className="text-xs text-muted-foreground">{product.supplier}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku || '-'}</TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {product.quantity} {product.unit}
                      </TableCell>
                      <TableCell>{getStockBadge(product)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.selling_price)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openStockDialog(product)} title="Adjust Stock">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openHistoryDialog(product)} title="View History">
                            <History className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Current stock: {selectedProduct?.quantity} {selectedProduct?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Movement Type</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant={stockForm.movementType === 'in' ? 'default' : 'outline'}
                  onClick={() => setStockForm({ ...stockForm, movementType: 'in' })}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <ArrowUpCircle className="h-5 w-5 text-green-500" />
                  <span className="text-xs">Stock In</span>
                </Button>
                <Button
                  variant={stockForm.movementType === 'out' ? 'default' : 'outline'}
                  onClick={() => setStockForm({ ...stockForm, movementType: 'out' })}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <ArrowDownCircle className="h-5 w-5 text-red-500" />
                  <span className="text-xs">Stock Out</span>
                </Button>
                <Button
                  variant={stockForm.movementType === 'adjustment' ? 'default' : 'outline'}
                  onClick={() => setStockForm({ ...stockForm, movementType: 'adjustment' })}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <RefreshCw className="h-5 w-5 text-yellow-500" />
                  <span className="text-xs">Adjust</span>
                </Button>
                <Button
                  variant={stockForm.movementType === 'return' ? 'default' : 'outline'}
                  onClick={() => setStockForm({ ...stockForm, movementType: 'return' })}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <RotateCcw className="h-5 w-5 text-blue-500" />
                  <span className="text-xs">Return</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_quantity">
                {stockForm.movementType === 'adjustment' ? 'New Quantity' : 'Quantity'}
              </Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                value={stockForm.quantity}
                onChange={(e) => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                value={stockForm.reference}
                onChange={(e) => setStockForm({ ...stockForm, reference: e.target.value })}
                placeholder="e.g., Invoice #123, PO-456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={stockForm.notes}
                onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                placeholder="Add any notes about this adjustment"
              />
            </div>

            <Button onClick={handleStockAdjust} className="w-full">
              Update Stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Stock History - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              View all stock movements for this product
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            {isHistoryLoading ? (
              <div className="text-center py-8">Loading history...</div>
            ) : stockHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No stock history yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockHistory.map((record) => {
                    const type = MOVEMENT_TYPES.find(t => t.value === record.movement_type);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm">
                          {new Date(record.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={type?.color}>{type?.label}</Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-medium",
                          record.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {record.quantity_change > 0 ? '+' : ''}{record.quantity_change}
                        </TableCell>
                        <TableCell className="text-right">{record.previous_quantity}</TableCell>
                        <TableCell className="text-right font-medium">{record.new_quantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{record.reference || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Footer branding */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>Developed by <strong>Ehsaan Ahmad</strong> | Phone: +923224875471</p>
      </div>
    </div>
  );
}
