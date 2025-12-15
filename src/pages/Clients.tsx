import { useState, useEffect, useRef } from 'react';
import { Client, ClientTransaction } from '@/types/accounting';
import { useProducts } from '@/hooks/useProducts';
import { getClients, saveClient, deleteClient, generateId, formatCurrency, canCreate, canEdit, canDelete, getCompanySettings } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/custom-components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Users, Mail, Phone, Building2, Printer, ShoppingCart, History } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function Clients() {
  const { profile } = useAuth();
  const { products } = useProducts();
  const userRole = (profile?.role || 'viewer') as 'admin' | 'staff' | 'viewer';
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
  });
  const [transactionForm, setTransactionForm] = useState({
    productSelection: 'inventory' as 'inventory' | 'other',
    productId: '',
    productName: '',
    quantity: 1,
    unitPrice: 0,
    type: 'sale' as 'sale' | 'return',
  });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchQuery]);

  function loadClients() {
    setClients(getClients());
  }

  function filterClients() {
    let filtered = [...clients];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.company?.toLowerCase().includes(query)
      );
    }

    setFilteredClients(filtered);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const client: Client = {
      id: editingClient?.id || generateId(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      company: formData.company,
      totalRevenue: editingClient?.totalRevenue || 0,
      outstandingBalance: editingClient?.outstandingBalance || 0,
      status: 'active',
      createdAt: editingClient?.createdAt || new Date().toISOString().split('T')[0],
      transactions: editingClient?.transactions || [],
    };

    saveClient(client);
    loadClients();
    resetForm();
    setDialogOpen(false);
    toast.success(editingClient ? 'Client updated!' : 'Client added!');
  }

  function handleEdit(client: Client) {
    if (!canEdit(userRole)) {
      toast.error('You do not have permission to edit');
      return;
    }
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      company: client.company || '',
    });
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (!canDelete(userRole)) {
      toast.error('You do not have permission to delete');
      return;
    }
    deleteClient(id);
    loadClients();
    toast.success('Client deleted!');
  }

  function handlePrintSlip(client: Client) {
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
        <title>Client Slip - ${client.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; font-size: 12px; }
          .client-info { margin-bottom: 20px; }
          .client-info h2 { font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
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
        <div class="client-info">
          <h2>Client Information</h2>
          <div class="info-row"><span>Name:</span><span>${client.name}</span></div>
          ${client.company ? `<div class="info-row"><span>Company:</span><span>${client.company}</span></div>` : ''}
          <div class="info-row"><span>Email:</span><span>${client.email}</span></div>
          <div class="info-row"><span>Phone:</span><span>${client.phone}</span></div>
          <div class="info-row"><span>Address:</span><span>${client.address}</span></div>
        </div>
        <div class="client-info">
          <h2>Account Summary</h2>
          <div class="info-row"><span>Total Revenue:</span><span>${formatCurrency(client.totalRevenue)}</span></div>
          <div class="info-row"><span>Outstanding Balance:</span><span>${formatCurrency(client.outstandingBalance)}</span></div>
          <div class="info-row"><span>Status:</span><span style="text-transform: capitalize;">${client.status}</span></div>
          <div class="info-row"><span>Client Since:</span><span>${client.createdAt}</span></div>
        </div>
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
    setEditingClient(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
    });
  }

  function openTransactionDialog(client: Client) {
    setSelectedClient(client);
    setTransactionForm({
      productSelection: 'inventory',
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      type: 'sale',
    });
    setTransactionDialogOpen(true);
  }

  function openHistoryDialog(client: Client) {
    setSelectedClient(client);
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
        unitPrice: product.selling_price,
      });
    }
  }

  function handleAddTransaction() {
    if (!selectedClient) return;

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

    const transaction: ClientTransaction = {
      id: generateId(),
      date: new Date().toISOString(),
      productId: transactionForm.productSelection === 'inventory' ? transactionForm.productId : undefined,
      productName: transactionForm.productName,
      quantity: transactionForm.quantity,
      unitPrice: transactionForm.unitPrice,
      total: transactionForm.quantity * transactionForm.unitPrice,
      type: transactionForm.type,
    };

    const updatedClient = {
      ...selectedClient,
      transactions: [...(selectedClient.transactions || []), transaction],
      totalRevenue: selectedClient.totalRevenue + (transactionForm.type === 'sale' ? transaction.total : -transaction.total),
    };

    saveClient(updatedClient);
    loadClients();
    setTransactionDialogOpen(false);
    toast.success('Transaction added successfully!');
  }

  const totalRevenue = clients.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalOutstanding = clients.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const activeClients = clients.filter((c) => c.status === 'active').length;

  const userCanCreate = canCreate(userRole);
  const userCanEdit = canEdit(userRole);
  const userCanDelete = canDelete(userRole);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client relationships"
        actions={
          userCanCreate && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Acme Inc"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+92 300 1234567"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main St, City, Pakistan"
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingClient ? 'Update' : 'Add'} Client</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Clients</p>
              <p className="text-xl font-bold">{activeClients}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Building2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <Mail className="h-6 w-6 text-warning-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-xl font-bold">{formatCurrency(totalOutstanding)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients by name, email, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Clients Table */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description="Start managing your clients by adding your first one."
          action={
            userCanCreate && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Total Revenue</TableHead>
                    <TableHead className="hidden md:table-cell">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            {client.company && (
                              <p className="text-xs text-muted-foreground">{client.company}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {client.email}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-semibold text-success">
                        {formatCurrency(client.totalRevenue)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {client.outstandingBalance > 0 ? (
                          <span className="font-semibold text-warning-foreground">
                            {formatCurrency(client.outstandingBalance)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={client.status}
                          variant={client.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openTransactionDialog(client)}>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              Add Transaction
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openHistoryDialog(client)}>
                              <History className="mr-2 h-4 w-4" />
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintSlip(client)}>
                              <Printer className="mr-2 h-4 w-4" />
                              Print Slip
                            </DropdownMenuItem>
                            {userCanEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(client)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {userCanDelete && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(client.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Transaction - {selectedClient?.name}</DialogTitle>
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
                        {product.name} - {formatCurrency(product.selling_price)}
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
              <Select value={transactionForm.type} onValueChange={(v: 'sale' | 'return') => setTransactionForm({ ...transactionForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Sale</SelectItem>
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
            <DialogTitle>Transaction History - {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedClient?.transactions || selectedClient.transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet for this client.
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
                    {selectedClient.transactions.map((txn) => (
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
                            variant={txn.type === 'sale' ? 'success' : 'info'} 
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
    </div>
  );
}
