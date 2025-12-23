import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui/custom-components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, MoreHorizontal, Shield, UserCheck, Eye, Trash2, Briefcase, Users } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { getUsers, saveUser, generateId } from '@/lib/storage';
import { AppUser } from '@/types/accounting';

export default function UsersPage() {
  const { profile } = useAuth();
  const userRole = (profile?.role || 'viewer') as 'admin' | 'manager' | 'staff' | 'viewer';
  const [users, setUsers] = useState<AppUser[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'viewer' as 'admin' | 'manager' | 'staff' | 'viewer',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  function loadUsers() {
    setUsers(getUsers());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast.error('Username and password are required');
      return;
    }

    // Check if username already exists
    if (users.some(u => u.username === formData.username)) {
      toast.error('Username already exists');
      return;
    }

    const newUser: AppUser = {
      id: generateId(),
      username: formData.username,
      password: `__NEEDS_HASH__:${formData.password}`, // Simple marker for local auth
      name: formData.name || formData.username,
      email: formData.email,
      role: formData.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    saveUser(newUser);
    loadUsers();
    resetForm();
    setDialogOpen(false);
    toast.success('User created successfully!');
  }

  function handleDelete(userId: string) {
    // Basic local delete simulation - in a real app, we'd delete from storage
    // But storage.ts doesn't export deleteUser, so we'll skip for now or add it later if needed.
    // Actually, let's just manually filter and save back to storage to support deletion.

    if (userId === 'admin-1' || userId === profile?.id) {
      toast.error("Cannot delete yourself or the main admin");
      return;
    }

    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem('accounting_users', JSON.stringify(updatedUsers));
    toast.success('User deleted');
  }

  function resetForm() {
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      role: 'viewer',
    });
  }

  const columns: ColumnDef<AppUser>[] = [
    {
      accessorKey: "username",
      header: "User",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              {(user.name || user.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{user.name || user.username}</p>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <div className="flex items-center gap-2">
            {role === 'admin' ? <Shield className="h-4 w-4" /> :
              role === 'manager' ? <Briefcase className="h-4 w-4" /> :
                role === 'staff' ? <UserCheck className="h-4 w-4" /> :
                  <Eye className="h-4 w-4" />}
            <StatusBadge
              status={role}
              variant={role === 'admin' ? 'danger' : role === 'manager' ? 'warning' : role === 'staff' ? 'info' : 'default'}
            />
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        // Don't simplify deletion of main admin
        if (user.id === 'admin-1' || user.id === profile?.id) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users and their roles"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="johndoe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'manager' | 'staff' | 'viewer') => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Viewer - Can view only
                        </div>
                      </SelectItem>
                      <SelectItem value="staff">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Staff - Can add data
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin - Full access
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Manager - Manage data
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Create User
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <Shield className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Staff</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'staff').length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card p-6">
        <DataTable columns={columns} data={users} searchKey="username" />
      </Card>

      {/* Footer branding */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>Developed by <strong>Ehsaan Ahmad</strong> | Phone: +923224875471</p>
      </div>
    </div>
  );
}
