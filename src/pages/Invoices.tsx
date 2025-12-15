import { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, Client } from '@/types/accounting';
import { getInvoices, saveInvoice, deleteInvoice, getClients, generateId, formatCurrency, canCreate, canEdit, canDelete, getCompanySettings } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/custom-components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Search, FileText, Send, CheckCircle, AlertCircle, X, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function Invoices() {
  const { profile } = useAuth();
  const userRole = (profile?.role || 'viewer') as 'admin' | 'staff' | 'viewer';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft' as Invoice['status'],
    items: [{ id: generateId(), description: '', quantity: 1, rate: 0, amount: 0 }] as InvoiceItem[],
    taxRate: 10,
  });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { filterInvoices(); }, [invoices, searchQuery, statusFilter]);

  function loadData() {
    setInvoices(getInvoices());
    setClients(getClients());
  }

  function filterInvoices() {
    let filtered = [...invoices];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.invoiceNumber.toLowerCase().includes(query) || i.clientName.toLowerCase().includes(query));
    }
    if (statusFilter !== 'all') filtered = filtered.filter(i => i.status === statusFilter);
    filtered.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    setFilteredInvoices(filtered);
  }

  function calculateTotals() {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * (formData.taxRate / 100);
    return { subtotal, tax, total: subtotal + tax };
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    const items = [...formData.items];
    items[index] = { ...items[index], [field]: value };
    if (field === 'quantity' || field === 'rate') items[index].amount = items[index].quantity * items[index].rate;
    setFormData({ ...formData, items });
  }

  function addItem() {
    setFormData({ ...formData, items: [...formData.items, { id: generateId(), description: '', quantity: 1, rate: 0, amount: 0 }] });
  }

  function removeItem(index: number) {
    if (formData.items.length > 1) setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { subtotal, tax, total } = calculateTotals();
    const client = clients.find(c => c.id === formData.clientId);
    if (!client) { toast.error('Please select a client'); return; }

    const invoice: Invoice = {
      id: editingInvoice?.id || generateId(),
      invoiceNumber: editingInvoice?.invoiceNumber || `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      clientId: formData.clientId,
      clientName: client.name,
      items: formData.items,
      subtotal, tax, total,
      status: formData.status,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      paidDate: formData.status === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
    };

    saveInvoice(invoice);
    loadData();
    resetForm();
    setDialogOpen(false);
    toast.success(editingInvoice ? 'Invoice updated!' : 'Invoice created!');
  }

  function handleEdit(invoice: Invoice) {
    if (!canEdit(userRole)) { toast.error('No permission'); return; }
    setEditingInvoice(invoice);
    setFormData({
      clientId: invoice.clientId,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      items: invoice.items,
      taxRate: invoice.subtotal > 0 ? (invoice.tax / invoice.subtotal) * 100 : 10,
    });
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    if (!canDelete(userRole)) { toast.error('No permission'); return; }
    deleteInvoice(id);
    loadData();
    toast.success('Invoice deleted!');
  }

  function handleStatusChange(invoice: Invoice, status: Invoice['status']) {
    const updated = { ...invoice, status, paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : invoice.paidDate };
    saveInvoice(updated);
    loadData();
    toast.success(`Invoice marked as ${status}`);
  }

  function handlePrint(invoice: Invoice) {
    const settings = getCompanySettings();
    const client = clients.find(c => c.id === invoice.clientId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Allow popups to print'); return; }

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:20px}
    .header h1{margin:0;font-size:24px}.header h2{font-size:32px;margin:0}
    table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;text-align:left;border-bottom:1px solid #ddd}
    th{background:#333;color:#fff}.total-row{font-weight:bold;font-size:18px}
    .footer{margin-top:40px;text-align:center;font-size:10px;color:#999}</style></head>
    <body><div class="header"><div><h1>${settings.name}</h1><p>${settings.address}</p><p>${settings.phone} | ${settings.email}</p></div>
    <div style="text-align:right"><h2>INVOICE</h2><p style="font-size:18px">${invoice.invoiceNumber}</p></div></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:20px">
    <div><strong>Bill To:</strong><br>${client?.name || invoice.clientName}<br>${client?.address || ''}</div>
    <div style="text-align:right"><p>Issue: ${invoice.issueDate}</p><p>Due: ${invoice.dueDate}</p><p><strong>${invoice.status.toUpperCase()}</strong></p></div></div>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
    ${invoice.items.map(item => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${formatCurrency(item.rate)}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('')}
    </tbody></table>
    <div style="text-align:right;margin-top:20px"><p>Subtotal: ${formatCurrency(invoice.subtotal)}</p><p>Tax: ${formatCurrency(invoice.tax)}</p>
    <p class="total-row">Total: ${formatCurrency(invoice.total)}</p></div>
    <div class="footer"><p>Thank you for your business!</p><p><strong>Developed by Ehsaan Ahmad</strong> | Phone: +923224875471</p></div></body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  function resetForm() {
    setEditingInvoice(null);
    setFormData({ clientId: '', issueDate: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'draft', items: [{ id: generateId(), description: '', quantity: 1, rate: 0, amount: 0 }], taxRate: 10 });
  }

  const { subtotal, tax, total } = calculateTotals();
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const totalPending = invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.total, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.total, 0);
  const getStatusVariant = (status: Invoice['status']): 'success' | 'info' | 'danger' | 'default' | 'warning' => ({ paid: 'success' as const, sent: 'info' as const, overdue: 'danger' as const, draft: 'default' as const, cancelled: 'danger' as const }[status] || 'default');
  const userCanCreate = canCreate(userRole);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Create and manage invoices" actions={userCanCreate && (
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Create Invoice</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Client *</Label>
                  <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v: Invoice['status']) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Issue Date</Label><Input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} /></div>
                <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Items</Label>
                <div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Qty</TableHead><TableHead>Rate</TableHead><TableHead>Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>{formData.items.map((item, i) => (
                    <TableRow key={item.id}><TableCell><Input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Item" className="border-0" /></TableCell>
                      <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="w-16 border-0" /></TableCell>
                      <TableCell><Input type="number" min="0" value={item.rate} onChange={(e) => updateItem(i, 'rate', parseFloat(e.target.value) || 0)} className="w-24 border-0" /></TableCell>
                      <TableCell>{formatCurrency(item.amount)}</TableCell>
                      <TableCell>{formData.items.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}><X className="h-4 w-4" /></Button>}</TableCell>
                    </TableRow>))}</TableBody></Table></div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="mr-2 h-4 w-4" />Add Item</Button></div>
              <div className="flex justify-end"><div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span>Tax ({formData.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editingInvoice ? 'Update' : 'Create'}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      )} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total</p><p className="text-xl font-bold">{invoices.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10"><CheckCircle className="h-6 w-6 text-success" /></div><div><p className="text-sm text-muted-foreground">Paid</p><p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10"><Send className="h-6 w-6 text-info" /></div><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold">{formatCurrency(totalPending)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"><AlertCircle className="h-6 w-6 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Overdue</p><p className="text-xl font-bold text-destructive">{formatCurrency(totalOverdue)}</p></div></CardContent></Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select>
      </div>

      {filteredInvoices.length === 0 ? <EmptyState icon={FileText} title="No invoices" description="Create your first invoice." action={userCanCreate && <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Create</Button>} /> : (
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead className="hidden sm:table-cell">Client</TableHead><TableHead className="hidden md:table-cell">Issue</TableHead><TableHead className="hidden md:table-cell">Due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{filteredInvoices.map(inv => (
            <TableRow key={inv.id}><TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell><TableCell className="hidden sm:table-cell">{inv.clientName}</TableCell><TableCell className="hidden md:table-cell">{new Date(inv.issueDate).toLocaleDateString()}</TableCell><TableCell className="hidden md:table-cell">{new Date(inv.dueDate).toLocaleDateString()}</TableCell><TableCell><StatusBadge status={inv.status} variant={getStatusVariant(inv.status)} /></TableCell><TableCell className="text-right font-semibold">{formatCurrency(inv.total)}</TableCell>
              <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePrint(inv)}><Printer className="mr-2 h-4 w-4" />Print</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEdit(inv)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  {inv.status === 'draft' && <DropdownMenuItem onClick={() => handleStatusChange(inv, 'sent')}><Send className="mr-2 h-4 w-4" />Mark Sent</DropdownMenuItem>}
                  {(inv.status === 'sent' || inv.status === 'overdue') && <DropdownMenuItem onClick={() => handleStatusChange(inv, 'paid')}><CheckCircle className="mr-2 h-4 w-4" />Mark Paid</DropdownMenuItem>}
                  <DropdownMenuItem onClick={() => handleDelete(inv.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}</TableBody></Table></div></CardContent></Card>
      )}
    </div>
  );
}
