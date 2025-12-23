import { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, Supplier, Purchase } from '@/types/accounting';
import { getPurchases, saveInvoice, deleteInvoice, getSuppliers, generateId, formatCurrency, canCreate, canEdit, canDelete, getCompanySettings } from '@/lib/storage';
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
import { Plus, MoreHorizontal, Pencil, Trash2, Search, ShoppingCart, Send, CheckCircle, AlertCircle, X, Printer, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

export default function Purchases() {
    const { profile } = useAuth();
    const userRole = (profile?.role || 'viewer') as 'admin' | 'manager' | 'staff' | 'viewer';
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
    const [formData, setFormData] = useState({
        clientId: '', // Used for supplierId
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft' as Purchase['status'],
        items: [{ id: generateId(), description: '', quantity: 1, rate: 0, amount: 0 }] as InvoiceItem[],
        taxRate: 0,
    });

    useEffect(() => { loadData(); }, []);

    function loadData() {
        setPurchases(getPurchases());
        setSuppliers(getSuppliers());
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
        const supplier = suppliers.find(s => s.id === formData.clientId);
        if (!supplier) { toast.error('Please select a supplier'); return; }

        const purchase: Purchase = {
            id: editingPurchase?.id || generateId(),
            invoiceNumber: editingPurchase?.invoiceNumber || `PO-${String(purchases.length + 1).padStart(3, '0')}`,
            type: 'purchase',
            clientId: formData.clientId,
            clientName: supplier.name,
            items: formData.items,
            subtotal, tax, total,
            status: formData.status,
            issueDate: formData.issueDate,
            dueDate: formData.dueDate,
            paidDate: formData.status === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
        };

        saveInvoice(purchase); // saveInvoice handles both types
        loadData();
        resetForm();
        setDialogOpen(false);
        toast.success(editingPurchase ? 'Purchase order updated!' : 'Purchase order created!');
    }

    function handleEdit(purchase: Purchase) {
        if (!canEdit(userRole)) { toast.error('No permission'); return; }
        setEditingPurchase(purchase);
        setFormData({
            clientId: purchase.clientId,
            issueDate: purchase.issueDate,
            dueDate: purchase.dueDate,
            status: purchase.status,
            items: purchase.items,
            taxRate: purchase.subtotal > 0 ? (purchase.tax / purchase.subtotal) * 100 : 0,
        });
        setDialogOpen(true);
    }

    function handleDelete(id: string) {
        if (!canDelete(userRole)) { toast.error('No permission'); return; }
        deleteInvoice(id);
        loadData();
        toast.success('Purchase order deleted!');
    }

    function handleStatusChange(purchase: Purchase, status: Purchase['status']) {
        const updated = { ...purchase, status, paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : purchase.paidDate };
        saveInvoice(updated);
        loadData();
        toast.success(`Marked as ${status}`);
    }

    function handlePrint(purchase: Purchase) {
        const settings = getCompanySettings();
        const supplier = suppliers.find(s => s.id === purchase.clientId);
        const printWindow = window.open('', '_blank');
        if (!printWindow) { toast.error('Allow popups to print'); return; }

        // Simple Purchase Order Template
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Purchase Order ${purchase.invoiceNumber}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:20px}
    .header h1{margin:0;font-size:24px}.header h2{font-size:32px;margin:0}
    table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;text-align:left;border-bottom:1px solid #ddd}
    th{background:#333;color:#fff}.total-row{font-weight:bold;font-size:18px}
    .footer{margin-top:40px;text-align:center;font-size:10px;color:#999}</style></head>
    <body><div class="header"><div><h1>${settings.name}</h1><p>${settings.address}</p><p>${settings.phone} | ${settings.email}</p></div>
    <div style="text-align:right"><h2>PURCHASE ORDER</h2><p style="font-size:18px">${purchase.invoiceNumber}</p></div></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:20px">
    <div><strong>Vendor:</strong><br>${supplier?.name || purchase.clientName}<br>${supplier?.address || ''}</div>
    <div style="text-align:right"><p>Date: ${purchase.issueDate}</p><p>Due: ${purchase.dueDate}</p><p><strong>${purchase.status.toUpperCase()}</strong></p></div></div>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
    ${purchase.items.map(item => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${formatCurrency(item.rate)}</td><td>${formatCurrency(item.amount)}</td></tr>`).join('')}
    </tbody></table>
    <div style="text-align:right;margin-top:20px"><p>Subtotal: ${formatCurrency(purchase.subtotal)}</p><p>Tax: ${formatCurrency(purchase.tax)}</p>
    <p class="total-row">Total: ${formatCurrency(purchase.total)}</p></div>
    <div class="footer"><p>Authorized Signature _______________________</p><p><strong>Developed by Ehsaan Ahmad</strong> | Phone: +923224875471</p></div></body></html>`);
        printWindow.document.close();
        printWindow.print();
    }

    function resetForm() {
        setEditingPurchase(null);
        setFormData({ clientId: '', issueDate: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'draft', items: [{ id: generateId(), description: '', quantity: 1, rate: 0, amount: 0 }], taxRate: 0 });
    }

    const columns: ColumnDef<Purchase>[] = [
        {
            accessorKey: "invoiceNumber",
            header: "PO #",
            cell: ({ row }) => <span className="font-mono font-medium">{row.getValue("invoiceNumber")}</span>,
        },
        {
            accessorKey: "clientName",
            header: "Supplier",
        },
        {
            accessorKey: "issueDate",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => new Date(row.getValue("issueDate")).toLocaleDateString(),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as Purchase['status'];
                const variant = ({ paid: 'success', sent: 'info', overdue: 'danger', draft: 'default', cancelled: 'danger' } as const)[status] || 'default';
                return <StatusBadge status={status} variant={variant} />;
            },
        },
        {
            accessorKey: "total",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Amount
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="font-semibold text-right">{formatCurrency(row.getValue("total"))}</div>,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const po = row.original;
                const canEditRec = canEdit(userRole);
                const canDeleteRec = canDelete(userRole);

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePrint(po)}><Printer className="mr-2 h-4 w-4" />Print PO</DropdownMenuItem>
                            {canEditRec && <DropdownMenuItem onClick={() => handleEdit(po)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
                            {canEditRec && po.status === 'draft' && <DropdownMenuItem onClick={() => handleStatusChange(po, 'sent')}><Send className="mr-2 h-4 w-4" />Mark Sent</DropdownMenuItem>}
                            {canEditRec && (po.status === 'sent' || po.status === 'overdue') && <DropdownMenuItem onClick={() => handleStatusChange(po, 'paid')}><CheckCircle className="mr-2 h-4 w-4" />Mark Paid</DropdownMenuItem>}
                            {canDeleteRec && <DropdownMenuItem onClick={() => handleDelete(po.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const { subtotal, tax, total } = calculateTotals();
    const totalPaid = purchases.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
    const totalPending = purchases.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.total, 0);
    const userCanCreate = canCreate(userRole);

    return (
        <div className="space-y-6">
            <PageHeader title="Purchases" description="Manage supplier purchase orders" actions={userCanCreate && (
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Create Purchase Order</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingPurchase ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Supplier *</Label>
                                    <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                                        <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select></div>
                                <div className="space-y-2"><Label>Status</Label>
                                    <Select value={formData.status} onValueChange={(v: Purchase['status']) => setFormData({ ...formData, status: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Ordered</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
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
                            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editingPurchase ? 'Update' : 'Create'}</Button></div>
                        </form>
                    </DialogContent>
                </Dialog>
            )} />

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="glass-card"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><ShoppingCart className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Orders</p><p className="text-xl font-bold">{purchases.length}</p></div></CardContent></Card>
                <Card className="glass-card"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10"><CheckCircle className="h-6 w-6 text-success" /></div><div><p className="text-sm text-muted-foreground">Paid</p><p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p></div></CardContent></Card>
                <Card className="glass-card"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10"><Send className="h-6 w-6 text-info" /></div><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold">{formatCurrency(totalPending)}</p></div></CardContent></Card>
            </div>

            <Card className="glass-card p-6">
                <DataTable columns={columns} data={purchases} searchKey="clientName" />
            </Card>

            {/* Footer Branding */}
            <div className="text-center text-xs text-muted-foreground pt-4">
                <p>Developed by <strong>Ehsaan Ahmad</strong> | Phone: +923224875471</p>
            </div>
        </div>
    );
}
