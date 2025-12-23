import { useState, useEffect } from 'react';
import { Supplier, SupplierTransaction } from '@/types/supplier';
import { useProducts } from '@/hooks/useProducts';
import { generateId, formatCurrency, canCreate, canEdit, canDelete, getCompanySettings } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, StatusBadge } from '@/components/ui/custom-components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Truck, Mail, Phone, Building2, Printer, User, ShoppingBag, History } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // For history

const STORAGE_KEY = 'accounting_suppliers';

function getSuppliers(): Supplier[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSupplier(supplier: Supplier): void {
  const suppliers = getSuppliers();
  const index = suppliers.findIndex(s => s.id === supplier.id);
  if (index >= 0) {
    suppliers[index] = supplier;
  } else {
    suppliers.push(supplier);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
}

function deleteSupplierStorage(id: string): void {
  const suppliers = getSuppliers().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
}

export default function Suppliers() {
  const { profile } = useAuth();
  const { products } = useProducts();
  const userRole = (profile?.role || 'viewer') as 'admin' | 'staff' | 'viewer';
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    contactPerson: '',
    notes: '',
  });
  const [transactionForm, setTransactionForm] = useState({
    productSelection: 'inventory' as 'inventory' | 'other',
    productId: '',
    productName: '',
    quantity: 1,
    unitPrice: 0,
    type: 'purchase' as 'purchase' | 'return',
  });

  const userCanCreate = canCreate(userRole);
  const userCanEdit = canEdit(userRole);
  const userCanDelete = canDelete(userRole);

  useEffect(() => {
    loadSuppliers();
  }, []);

  function loadSuppliers() {
    setSuppliers(getSuppliers());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    const supplier: Supplier = {
      id: editingSupplier?.id || generateId(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      company: formData.company || undefined,
      contactPerson: formData.contactPerson || undefined,
      notes: formData.notes || undefined,
      totalPurchases: editingSupplier?.totalPurchases || 0,
      outstandingBalance: editingSupplier?.outstandingBalance || 0,
      status: editingSupplier?.status || 'active',
      createdAt: editingSupplier?.createdAt || new Date().toISOString().split('T')[0],
      transactions: editingSupplier?.transactions || [],
    };

    saveSupplier(supplier);
    loadSuppliers();
    resetForm();
    setDialogOpen(false);
    toast.success(editingSupplier ? 'Supplier updated!' : 'Supplier added!');
  }

  function handleEdit(supplier: Supplier) {
    if (!canEdit(userRole)) {
      toast.error('You do not have permission to edit');
      return;
    }
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      company: supplier.company || '',
      contactPerson: supplier.contactPerson || '',
      notes: supplier.notes || '',
    });
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (!canDelete(userRole)) {
      toast.error('You do not have permission to delete');
      return;
    }
    deleteSupplierStorage(id);
    loadSuppliers();
    toast.success('Supplier deleted!');
  }

  function handlePrintSlip(supplier: Supplier) {
    const settings = getCompanySettings();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Supplier Slip - ${supplier.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; font-size: 12px; }
          .supplier-info { margin-bottom: 20px; }
          .supplier-info h2 { font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .info-row span:first-child { color: #666; }
          .info-row span:last-child { font-weight: 500; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${settings.name}</h1>
          <p>${settings.address}</p>
          <p>Phone: ${settings.phone} | Email: ${settings.email}</p>
        </div>
        <div class="supplier-info">
          <h2>Supplier Information</h2>
          <div class="info-row"><span>Name:</span><span>${supplier.name}</span></div>
          ${supplier.company ? `<div class="info-row"><span>Company:</span><span>${supplier.company}</span></div>` : ''}
          ${supplier.contactPerson ? `<div class="info-row"><span>Contact Person:</span><span>${supplier.contactPerson}</span></div>` : ''}
          <div class="info-row"><span>Email:</span><span>${supplier.email}</span></div>
          <div class="info-row"><span>Phone:</span><span>${supplier.phone}</span></div>
          <div class="info-row"><span>Address:</span><span>${supplier.address}</span></div>
        </div>
        <div class="supplier-info">
          <h2>Account Summary</h2>
          <div class="info-row"><span>Total Purchases:</span><span>${formatCurrency(supplier.totalPurchases)}</span></div>
          <div class="info-row"><span>Outstanding Balance:</span><span>${formatCurrency(supplier.outstandingBalance)}</span></div>
          <div class="info-row"><span>Status:</span><span style="text-transform: capitalize;">${supplier.status}</span></div>
          <div class="info-row"><span>Supplier Since:</span><span>${supplier.createdAt}</span></div>
        </div>
        ${supplier.notes ? `<div class="supplier-info"><h2>Notes</h2><p>${supplier.notes}</p></div>` : ''}
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p><strong>Developed by Ehsaan Ahmad</strong></p>
          <p>Phone: +923224875471</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function resetForm() {
    setEditingSupplier(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      contactPerson: '',
      notes: '',
    });
  }

  function openTransactionDialog(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setTransactionForm({
      productSelection: 'inventory',
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      type: 'purchase',
    });
    setTransactionDialogOpen(true);
  }

  function openHistoryDialog(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setHistoryDialogOpen(true);
  }

  function handleProductSelectionChange(value: 'inventory' | 'other') {
    setTransactionForm({
      ...transactionForm,
      productSelection: value,
      productId: '',
      productName: '',
      unitPrice: 0,
    });
  }

  function handleProductChange(productId: string) {
    const product = products.find(p => p.id === productId);
    if (product) {
      setTransactionForm({
        ...transactionForm,
        productId: productId,
        productName: product.name,
        unitPrice: product.cost_price,
      });
    }
  }

  function handleAddTransaction() {
    if (!selectedSupplier) return;

    if (transactionForm.productSelection === 'inventory' && !transactionForm.productId) {
      toast.error('Please select a product');
      return;
    }

    if (transactionForm.productSelection === 'other' && !transactionForm.productName.trim()) {
      toast.error('Please enter product name');
      return;
    }

    if (transactionForm.quantity <= 0 || transactionForm.unitPrice <= 0) {
      toast.error('Quantity and price must be greater than 0');
      return;
    }

    const transaction: SupplierTransaction = {
      id: generateId(),
      date: new Date().toISOString(),
      productId: transactionForm.productSelection === 'inventory' ? transactionForm.productId : undefined,
      productName: transactionForm.productName,
      quantity: transactionForm.quantity,
      unitPrice: transactionForm.unitPrice,
      total: transactionForm.quantity * transactionForm.unitPrice,
      type: transactionForm.type,
    };

    const updatedSupplier = {
      ...selectedSupplier,
      transactions: [...(selectedSupplier.transactions || []), transaction],
      totalPurchases: selectedSupplier.totalPurchases + (transactionForm.type === 'purchase' ? transaction.total : -transaction.total),
    };

    saveSupplier(updatedSupplier);
    loadSuppliers();
    setTransactionDialogOpen(false);
    toast.success('Transaction added successfully!');
  }

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <div>
            <p className="font-medium">{supplier.name}</p>
            {supplier.company && <p className="text-sm text-muted-foreground">{supplier.company}</p>}
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Contact",
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm">
              <Mail className="h-3 w-3" /> {supplier.email}
            </div>
            {supplier.phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" /> {supplier.phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "totalPurchases",
      header: "Total Purchases",
      cell: ({ row }) => formatCurrency(row.original.totalPurchases),
    },
    {
      accessorKey: "outstandingBalance",
      header: "Outstanding",
      cell: ({ row }) => {
        const amount = row.original.outstandingBalance;
        return (
          <span className={amount > 0 ? 'text-destructive font-medium' : ''}>
            {formatCurrency(amount)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          variant={row.original.status === 'active' ? 'success' : 'default'}
        />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const supplier = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openTransactionDialog(supplier)}>
                <ShoppingBag className="mr-2 h-4 w-4" /> Add Transaction
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openHistoryDialog(supplier)}>
                <History className="mr-2 h-4 w-4" /> View History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintSlip(supplier)}>
                <Printer className="mr-2 h-4 w-4" /> Print Slip
              </DropdownMenuItem>
              {userCanEdit && (
                <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {userCanDelete && (
                <DropdownMenuItem onClick={() => handleDelete(supplier.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const totalPurchases = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);
  const totalOutstanding = suppliers.reduce((sum, s) => sum + s.outstandingBalance, 0);
  const activeSuppliers = suppliers.filter((s) => s.status === 'active').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your suppliers and vendors"
        actions={
          userCanCreate && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input id="contactPerson" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Suppliers</p>
                <p className="text-2xl font-bold">{activeSuppliers}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPurchases)}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
              </div>
              <Truck className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card p-6">
        <DataTable columns={columns} data={suppliers} searchKey="name" />
      </Card>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Transaction - {selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Source</Label>
              <Select value={transactionForm.productSelection} onValueChange={handleProductSelectionChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">From Inventory</SelectItem>
                  <SelectItem value="other">Other (Manual Entry)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {transactionForm.productSelection === 'inventory' ? (
              <div className="space-y-2">
                <Label htmlFor="product">Select Product *</Label>
                <Select value={transactionForm.productId} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.filter(p => p.is_active).map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.cost_price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  value={transactionForm.productName}
                  onChange={(e) => setTransactionForm({ ...transactionForm, productName: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={transactionForm.quantity}
                  onChange={(e) => setTransactionForm({ ...transactionForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={transactionForm.unitPrice}
                  onChange={(e) => setTransactionForm({ ...transactionForm, unitPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={transactionForm.type} onValueChange={(v: 'purchase' | 'return') => setTransactionForm({ ...transactionForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-bold">{formatCurrency(transactionForm.quantity * transactionForm.unitPrice)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTransactionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTransaction}>Add Transaction</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Transaction History - {selectedSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedSupplier?.transactions || selectedSupplier.transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet for this supplier.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSupplier.transactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="text-sm">
                          {new Date(txn.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{txn.productName}</TableCell>
                        <TableCell className="text-right">{txn.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(txn.unitPrice)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(txn.total)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={txn.type}
                            variant={txn.type === 'purchase' ? 'info' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer branding */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>Developed by <strong>Ehsaan Ahmad</strong> | Phone: +923224875471</p>
      </div>
    </div>
  );
}
