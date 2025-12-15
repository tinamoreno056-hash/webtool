import { Transaction, Client, Invoice, Account, CompanySettings, DashboardStats, AppUser, AuthState, CURRENCIES } from '@/types/accounting';

const STORAGE_KEYS = {
  TRANSACTIONS: 'accounting_transactions',
  CLIENTS: 'accounting_clients',
  INVOICES: 'accounting_invoices',
  ACCOUNTS: 'accounting_accounts',
  COMPANY_SETTINGS: 'accounting_company_settings',
  USERS: 'accounting_users',
  AUTH: 'accounting_auth',
  THEME: 'accounting_theme',
} as const;

// Utility functions for localStorage
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Theme
export function getTheme(): 'light' | 'dark' {
  return getItem<'light' | 'dark'>(STORAGE_KEYS.THEME, 'light');
}

export function setTheme(theme: 'light' | 'dark'): void {
  setItem(STORAGE_KEYS.THEME, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Initialize theme on load
export function initializeTheme(): void {
  const theme = getTheme();
  setTheme(theme);
}

// Authentication
// Default admin password hash (pre-computed for 'Ehsaan')
const DEFAULT_ADMIN_HASH = '7c4a8d09ca3762af61e59520943dc26494f8941b'; // Will be replaced on first run

export function getUsers(): AppUser[] {
  const users = getItem<AppUser[]>(STORAGE_KEYS.USERS, []);
  if (users.length === 0) {
    // Create default admin user with hashed password placeholder
    // Password will be hashed on first login attempt
    const defaultAdmin: AppUser = {
      id: 'admin-1',
      username: 'admin',
      password: '__NEEDS_HASH__:Ehsaan', // Marker for migration
      role: 'admin',
      name: 'Administrator',
      email: 'admin@example.com',
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    setItem(STORAGE_KEYS.USERS, [defaultAdmin]);
    return [defaultAdmin];
  }
  return users;
}

export function saveUser(user: AppUser): void {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  setItem(STORAGE_KEYS.USERS, users);
}

export function deleteUser(id: string): void {
  const users = getUsers().filter(u => u.id !== id);
  setItem(STORAGE_KEYS.USERS, users);
}

export function getAuthState(): AuthState {
  return getItem<AuthState>(STORAGE_KEYS.AUTH, { isAuthenticated: false, currentUser: null });
}

export function setAuthState(state: AuthState): void {
  setItem(STORAGE_KEYS.AUTH, state);
}

// Async login with password verification
export async function loginAsync(username: string, password: string): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const { hashPassword, verifyPassword, generateSessionToken, setSessionToken, generateSalt } = await import('./crypto');
  const users = getUsers();
  const user = users.find(u => u.username === username && u.isActive);
  
  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }

  let isValid = false;
  
  // Handle legacy plaintext passwords (migration)
  if (user.password.startsWith('__NEEDS_HASH__:')) {
    const plainPassword = user.password.replace('__NEEDS_HASH__:', '');
    if (password === plainPassword) {
      // Migrate to hashed password with unique salt
      const salt = generateSalt();
      user.salt = salt;
      user.password = await hashPassword(password, salt);
      saveUser(user);
      isValid = true;
    }
  } else if (!user.password.match(/^[a-f0-9]{64}$/) || !user.salt) {
    // Legacy plaintext password or missing salt - needs migration
    if (password === user.password || !user.salt) {
      // If password matches OR we have a hash but no salt, migrate
      if (password === user.password || (user.salt === undefined && await verifyLegacyPassword(password, user.password))) {
        const salt = generateSalt();
        user.salt = salt;
        user.password = await hashPassword(password, salt);
        saveUser(user);
        isValid = true;
      }
    }
  } else {
    // Already hashed with salt - verify
    isValid = await verifyPassword(password, user.password, user.salt);
  }

  if (isValid) {
    const sessionToken = generateSessionToken();
    setSessionToken(sessionToken);
    
    // Store session with token (not password)
    const userForSession = { ...user, password: '[PROTECTED]', salt: undefined };
    setAuthState({ isAuthenticated: true, currentUser: userForSession, sessionToken });
    return { success: true, user: userForSession };
  }
  
  return { success: false, error: 'Invalid username or password' };
}

// Helper for verifying old passwords without per-user salt (for migration only)
async function verifyLegacyPassword(password: string, hash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'accubooks-salt-ehsaan-ahmad');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === hash;
}

// Sync login wrapper for backward compatibility
export function login(username: string, password: string): { success: boolean; user?: AppUser; error?: string } {
  // This is now deprecated - use loginAsync instead
  // Keeping for compatibility but it will not work with hashed passwords
  const users = getUsers();
  const user = users.find(u => u.username === username && u.isActive);
  
  if (user && (user.password === password || user.password === `__NEEDS_HASH__:${password}`)) {
    setAuthState({ isAuthenticated: true, currentUser: user });
    return { success: true, user };
  }
  return { success: false, error: 'Invalid username or password' };
}

export function logout(): void {
  import('./crypto').then(({ clearSessionToken }) => {
    clearSessionToken();
  });
  setAuthState({ isAuthenticated: false, currentUser: null });
}

export async function changePasswordAsync(userId: string, newPassword: string): Promise<boolean> {
  const { hashPassword, generateSalt } = await import('./crypto');
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    const salt = generateSalt();
    user.salt = salt;
    user.password = await hashPassword(newPassword, salt);
    saveUser(user);
    return true;
  }
  return false;
}

// Deprecated - use changePasswordAsync
export function changePassword(userId: string, newPassword: string): boolean {
  changePasswordAsync(userId, newPassword);
  return true;
}

// Role-based permissions
export function canCreate(role: AppUser['role']): boolean {
  return role === 'admin' || role === 'staff';
}

export function canEdit(role: AppUser['role']): boolean {
  return role === 'admin'; // Staff can only add, not edit
}

export function canDelete(role: AppUser['role']): boolean {
  return role === 'admin';
}

export function canManageUsers(role: AppUser['role']): boolean {
  return role === 'admin';
}

// Transactions
export function getTransactions(): Transaction[] {
  return getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, getDefaultTransactions());
}

export function saveTransaction(transaction: Transaction): void {
  const transactions = getTransactions();
  const index = transactions.findIndex(t => t.id === transaction.id);
  if (index >= 0) {
    transactions[index] = transaction;
  } else {
    transactions.push(transaction);
  }
  setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
}

export function deleteTransaction(id: string): void {
  const transactions = getTransactions().filter(t => t.id !== id);
  setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
}

// Clients
export function getClients(): Client[] {
  return getItem<Client[]>(STORAGE_KEYS.CLIENTS, getDefaultClients());
}

export function saveClient(client: Client): void {
  const clients = getClients();
  const index = clients.findIndex(c => c.id === client.id);
  if (index >= 0) {
    clients[index] = client;
  } else {
    clients.push(client);
  }
  setItem(STORAGE_KEYS.CLIENTS, clients);
}

export function deleteClient(id: string): void {
  const clients = getClients().filter(c => c.id !== id);
  setItem(STORAGE_KEYS.CLIENTS, clients);
}

// Invoices
export function getInvoices(): Invoice[] {
  return getItem<Invoice[]>(STORAGE_KEYS.INVOICES, getDefaultInvoices());
}

export function saveInvoice(invoice: Invoice): void {
  const invoices = getInvoices();
  const index = invoices.findIndex(i => i.id === invoice.id);
  if (index >= 0) {
    invoices[index] = invoice;
  } else {
    invoices.push(invoice);
  }
  setItem(STORAGE_KEYS.INVOICES, invoices);
}

export function deleteInvoice(id: string): void {
  const invoices = getInvoices().filter(i => i.id !== id);
  setItem(STORAGE_KEYS.INVOICES, invoices);
}

// Accounts
export function getAccounts(): Account[] {
  return getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, getDefaultAccounts());
}

export function saveAccount(account: Account): void {
  const accounts = getAccounts();
  const index = accounts.findIndex(a => a.id === account.id);
  if (index >= 0) {
    accounts[index] = account;
  } else {
    accounts.push(account);
  }
  setItem(STORAGE_KEYS.ACCOUNTS, accounts);
}

export function deleteAccount(id: string): void {
  const accounts = getAccounts().filter(a => a.id !== id);
  setItem(STORAGE_KEYS.ACCOUNTS, accounts);
}

// Company Settings
export function getCompanySettings(): CompanySettings {
  return getItem<CompanySettings>(STORAGE_KEYS.COMPANY_SETTINGS, getDefaultCompanySettings());
}

export function saveCompanySettings(settings: CompanySettings): void {
  setItem(STORAGE_KEYS.COMPANY_SETTINGS, settings);
}

// Currency formatting
export function formatCurrency(amount: number, currencyCode?: string): string {
  const settings = getCompanySettings();
  const code = currencyCode || settings.currency;
  const currency = CURRENCIES.find(c => c.code === code);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: code === 'PKR' ? 0 : 2,
    maximumFractionDigits: code === 'PKR' ? 0 : 2,
  }).format(amount);
}

// Date formatting with timezone
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const settings = getCompanySettings();
  const date = new Date(dateString);
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone || 'Asia/Karachi',
    ...options,
  }).format(date);
}

export function getCurrentDateTime(): string {
  const settings = getCompanySettings();
  return new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone || 'Asia/Karachi',
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date());
}

// Dashboard Stats
export function getDashboardStats(): DashboardStats {
  const transactions = getTransactions();
  const invoices = getInvoices();
  
  const totalRevenue = transactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const accountsReceivable = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0);
  
  const accounts = getAccounts();
  const cashBalance = accounts
    .filter(a => a.type === 'asset' && a.name.toLowerCase().includes('cash'))
    .reduce((sum, a) => sum + a.balance, 0);
  
  return {
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    accountsReceivable,
    accountsPayable: 15000,
    cashBalance: cashBalance || 125000,
    revenueChange: 12.5,
    expenseChange: -3.2,
  };
}

// Default data
function getDefaultTransactions(): Transaction[] {
  return [
    {
      id: '1',
      date: '2024-01-15',
      description: 'Website Development Services',
      amount: 5000,
      type: 'income',
      category: 'Services',
      account: 'Business Account',
      status: 'completed',
      reference: 'INV-001',
    },
    {
      id: '2',
      date: '2024-01-14',
      description: 'Office Supplies',
      amount: 250,
      type: 'expense',
      category: 'Office',
      account: 'Business Account',
      status: 'completed',
      reference: 'EXP-001',
    },
    {
      id: '3',
      date: '2024-01-13',
      description: 'Consulting Fee',
      amount: 3500,
      type: 'income',
      category: 'Consulting',
      account: 'Business Account',
      status: 'completed',
      reference: 'INV-002',
    },
  ];
}

function getDefaultClients(): Client[] {
  return [
    {
      id: '1',
      name: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: '+92 300 1234567',
      address: '123 Business Ave, Karachi, Pakistan',
      company: 'Acme Corporation',
      totalRevenue: 45000,
      outstandingBalance: 5000,
      status: 'active',
      createdAt: '2023-06-15',
    },
    {
      id: '2',
      name: 'TechStart Inc',
      email: 'hello@techstart.io',
      phone: '+92 321 9876543',
      address: '456 Innovation Blvd, Lahore, Pakistan',
      company: 'TechStart Inc',
      totalRevenue: 32000,
      outstandingBalance: 0,
      status: 'active',
      createdAt: '2023-08-22',
    },
  ];
}

function getDefaultInvoices(): Invoice[] {
  return [
    {
      id: '1',
      invoiceNumber: 'INV-001',
      clientId: '1',
      clientName: 'Acme Corporation',
      items: [
        { id: '1', description: 'Web Development', quantity: 40, rate: 100, amount: 4000 },
        { id: '2', description: 'UI/UX Design', quantity: 10, rate: 120, amount: 1200 },
      ],
      subtotal: 5200,
      tax: 520,
      total: 5720,
      status: 'paid',
      issueDate: '2024-01-01',
      dueDate: '2024-01-31',
      paidDate: '2024-01-15',
    },
  ];
}

function getDefaultAccounts(): Account[] {
  return [
    { id: '1', name: 'Cash on Hand', type: 'asset', balance: 25000, currency: 'PKR', isActive: true },
    { id: '2', name: 'Business Checking', type: 'asset', balance: 100000, currency: 'PKR', isActive: true },
    { id: '3', name: 'Accounts Receivable', type: 'asset', balance: 15000, currency: 'PKR', isActive: true },
    { id: '4', name: 'Accounts Payable', type: 'liability', balance: 8500, currency: 'PKR', isActive: true },
    { id: '5', name: 'Retained Earnings', type: 'equity', balance: 75000, currency: 'PKR', isActive: true },
  ];
}

function getDefaultCompanySettings(): CompanySettings {
  return {
    name: 'AccuBooks',
    address: 'Karachi, Pakistan',
    phone: '+92 300 0000000',
    email: 'contact@accubooks.pk',
    website: 'https://accubooks.pk',
    taxId: 'XX-XXXXXXX',
    currency: 'PKR',
    fiscalYearStart: '01-01',
    timezone: 'Asia/Karachi',
  };
}

// Export data as JSON for GitHub backup (excludes sensitive data)
export function exportData(): string {
  // Get users but remove password hashes for security
  const usersForExport = getUsers().map(user => ({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    isActive: user.isActive,
    // Password intentionally excluded for security
  }));

  const data = {
    transactions: getTransactions(),
    clients: getClients(),
    invoices: getInvoices(),
    accounts: getAccounts(),
    companySettings: getCompanySettings(),
    users: usersForExport,
    exportedAt: new Date().toISOString(),
    exportedBy: 'Ehsaan Ahmad - AccuBooks',
    version: '1.0.0',
    securityNote: 'User passwords are not included in exports for security. Users will need to reset passwords after import.',
  };
  return JSON.stringify(data, null, 2);
}

// Import data from JSON
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.transactions) setItem(STORAGE_KEYS.TRANSACTIONS, data.transactions);
    if (data.clients) setItem(STORAGE_KEYS.CLIENTS, data.clients);
    if (data.invoices) setItem(STORAGE_KEYS.INVOICES, data.invoices);
    if (data.accounts) setItem(STORAGE_KEYS.ACCOUNTS, data.accounts);
    if (data.companySettings) setItem(STORAGE_KEYS.COMPANY_SETTINGS, data.companySettings);
    if (data.users) setItem(STORAGE_KEYS.USERS, data.users);
    return true;
  } catch {
    return false;
  }
}

// Clear all data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
