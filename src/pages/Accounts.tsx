import { useState, useEffect } from 'react';
import { Account } from '@/types/accounting';
import { getAccounts, saveAccount, deleteAccount, generateId } from '@/lib/storage';
import { PageHeader, EmptyState } from '@/components/ui/custom-components';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, CreditCard, Wallet, Building, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

const accountTypeIcons = {
  asset: Wallet,
  liability: CreditCard,
  equity: Building,
  revenue: TrendingUp,
  expense: TrendingDown,
};

const accountTypeColors = {
  asset: 'text-success bg-success/10',
  liability: 'text-destructive bg-destructive/10',
  equity: 'text-info bg-info/10',
  revenue: 'text-primary bg-primary/10',
  expense: 'text-warning-foreground bg-warning/10',
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'asset' as Account['type'],
    balance: '',
    currency: 'USD',
    isActive: true,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  function loadAccounts() {
    setAccounts(getAccounts());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const account: Account = {
      id: editingAccount?.id || generateId(),
      name: formData.name,
      type: formData.type,
      balance: parseFloat(formData.balance) || 0,
      currency: formData.currency,
      isActive: formData.isActive,
    };

    saveAccount(account);
    loadAccounts();
    resetForm();
    setDialogOpen(false);
    toast.success(editingAccount ? 'Account updated!' : 'Account added!');
  }

  function handleEdit(account: Account) {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
      isActive: account.isActive,
    });
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    deleteAccount(id);
    loadAccounts();
    toast.success('Account deleted!');
  }

  function resetForm() {
    setEditingAccount(null);
    setFormData({
      name: '',
      type: 'asset',
      balance: '',
      currency: 'USD',
      isActive: true,
    });
  }

  const groupedAccounts = {
    asset: accounts.filter((a) => a.type === 'asset'),
    liability: accounts.filter((a) => a.type === 'liability'),
    equity: accounts.filter((a) => a.type === 'equity'),
    revenue: accounts.filter((a) => a.type === 'revenue'),
    expense: accounts.filter((a) => a.type === 'expense'),
  };

  const totalAssets = groupedAccounts.asset.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = groupedAccounts.liability.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = groupedAccounts.equity.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        description="Manage your accounting structure"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Cash on Hand"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Account Type *</Label>
                    <Select value={formData.type} onValueChange={(value: Account['type']) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="balance">Opening Balance</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Active Account</Label>
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingAccount ? 'Update' : 'Add'} Account</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Wallet className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalAssets)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <CreditCard className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Liabilities</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(totalLiabilities)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10">
              <Building className="h-6 w-6 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Worth</p>
              <p className="text-xl font-bold">{formatCurrency(totalAssets - totalLiabilities)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No accounts found"
          description="Set up your chart of accounts to start tracking finances."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(groupedAccounts) as Account['type'][]).map((type) => {
            const typeAccounts = groupedAccounts[type];
            if (typeAccounts.length === 0) return null;

            const Icon = accountTypeIcons[type];
            const colorClass = accountTypeColors[type];

            return (
              <Card key={type}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base capitalize">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {type} Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {typeAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{account.currency}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(account.balance)}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(account)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(account.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
