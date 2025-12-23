import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanySettings, CURRENCIES, TIMEZONES } from '@/types/accounting';
import { getCompanySettings, saveCompanySettings, exportData, importData, changePassword, getTheme, setTheme } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/custom-components';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Save, Download, Upload, Database, Globe, Lock, Moon, Sun, Github, Clock, DollarSign, Mail, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, user, updatePassword, updateEmail, updateProfile } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [settings, setSettings] = useState<CompanySettings>(getCompanySettings());
  const [isSaving, setIsSaving] = useState(false);
  const [isDark, setIsDark] = useState(getTheme() === 'dark');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    setIsSaving(true);
    saveCompanySettings(settings);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Settings saved successfully!');
    }, 500);
  }

  function handleExport() {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accubooks-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported! Save this file to your computer or upload to GitHub/Google Drive.');
  }

  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importData(content)) {
        toast.success('Data imported successfully! Refreshing...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    updatePassword(passwordForm.newPassword).then(({ error }) => {
      if (error) {
        toast.error(error.message);
      } else {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed successfully!');
      }
    });
  }

  function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();

    if (!emailForm.newEmail || !emailForm.newEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    updateEmail(emailForm.newEmail).then(({ error }) => {
      if (error) {
        toast.error(error.message);
      } else {
        setEmailForm({ newEmail: '' });
        toast.success('Email updated successfully!');
      }
    });
  }

  function handleUpdateName() {
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    updateProfile({ full_name: newName }).then(({ error }) => {
      setIsSaving(false);
      if (error) {
        toast.error(error.message);
      } else {
        setIsEditingName(false);
        toast.success('Name updated successfully');
      }
    });
  }

  function toggleTheme() {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    setIsDark(!isDark);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your company settings and preferences"
      />

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="data">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Update your company details that appear on invoices and reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / Registration Number</Label>
                  <Input
                    id="taxId"
                    value={settings.taxId}
                    onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="123 Business Street, City, State 12345"
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="+92 300 0000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="contact@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={settings.website}
                  onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                  placeholder="https://yourcompany.com"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Currency Settings
              </CardTitle>
              <CardDescription>
                Choose your default currency for all transactions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => setSettings({ ...settings, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscalYear">Fiscal Year Start</Label>
                  <Select
                    value={settings.fiscalYearStart}
                    onValueChange={(value) => setSettings({ ...settings, fiscalYearStart: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01-01">January 1</SelectItem>
                      <SelectItem value="04-01">April 1</SelectItem>
                      <SelectItem value="07-01">July 1</SelectItem>
                      <SelectItem value="10-01">October 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timezone Settings
              </CardTitle>
              <CardDescription>
                Set your timezone for accurate date and time display.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.timezone || 'Asia/Karachi'}
                  onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the application looks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Toggle dark theme on or off</p>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleTheme} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {profile?.role === 'admin' && (
            <Card className="glass-card bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage system users, roles, and permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">System Users</p>
                    <p className="text-sm text-muted-foreground">Add, edit, or remove users and assign roles.</p>
                  </div>
                  <Button onClick={() => navigate('/users')}>Manage Users</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password for security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit">
                  <Lock className="mr-2 h-4 w-4" />
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username:</span>
                  <span className="font-medium">{profile?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-medium capitalize">{profile?.role}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Name:</span>
                  <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="h-8 w-40"
                        />
                        <Button size="sm" onClick={handleUpdateName} disabled={isSaving}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{profile?.full_name || profile?.username}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                          setNewName(profile?.full_name || profile?.username || '');
                          setIsEditingName(true);
                        }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Change Email
              </CardTitle>
              <CardDescription>
                Update your account email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangeEmail} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentEmail">Current Email</Label>
                  <Input
                    id="currentEmail"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">New Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm({ newEmail: e.target.value })}
                    placeholder="new@email.com"
                    required
                  />
                </div>
                <Button type="submit">
                  <Mail className="mr-2 h-4 w-4" />
                  Update Email
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup & Restore
              </CardTitle>
              <CardDescription>
                Export your data for backup. You can save this file to Google Drive or GitHub.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-border p-6 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Export Data</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Download all your data as a JSON file. Save to Google Drive, GitHub, or your computer.
                    </p>
                  </div>
                  <Button onClick={handleExport} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export All Data
                  </Button>
                </div>

                <div className="rounded-lg border border-border p-6 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                    <Upload className="h-6 w-6 text-warning-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Restore Data</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Restore your data from a previously exported backup file.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    <Button variant="outline" className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Import Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  <span className="font-medium">GitHub Backup Instructions:</span>
                </div>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Click "Export All Data" to download the JSON file</li>
                  <li>Go to your GitHub repository (or create one)</li>
                  <li>Upload the JSON file to a "backups" folder</li>
                  <li>To restore: download the file and use "Import Data"</li>
                </ol>
              </div>

              <div className="rounded-lg bg-info/10 p-4">
                <p className="text-sm">
                  <strong>Tip:</strong> Your data is stored locally in your browser.
                  Export regularly and save to Google Drive or GitHub for safe keeping!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
