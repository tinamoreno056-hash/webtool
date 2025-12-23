import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getTheme, setTheme, getCurrentDateTime } from '@/lib/storage';
import {
  LayoutDashboard,
  Receipt,
  Users,
  FileText,
  Settings,
  TrendingUp,
  CreditCard,
  Menu,
  ChevronLeft,
  ChevronRight,
  Building2,
  LogOut,
  Moon,
  Sun,
  UserCog,
  Shield,
  Package,
  Truck,
  Search,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Accounts', href: '/accounts', icon: CreditCard },
  { name: 'Reports', href: '/reports', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(getTheme() === 'dark');
  const [dateTime, setDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(getCurrentDateTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function toggleTheme() {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  }

  async function handleLogout() {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/login');
  }

  // Admin users can see Users page
  const allNavigation = profile?.role === 'admin'
    ? [...navigation.slice(0, -1), { name: 'Users', href: '/users', icon: UserCog }, navigation[navigation.length - 1]]
    : navigation;

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ width: 280 }}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative z-30 hidden lg:flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-md"
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-4 border-b border-border/50">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-white shadow-lg shadow-primary/20">
              <Building2 className="h-5 w-5" />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col"
              >
                <span className="font-bold text-lg tracking-tight">AccuBooks</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Enterprise</span>
              </motion.div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hidden lg:flex absolute -right-3 top-6 border border-border bg-background shadow-sm z-50"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>
        </div>

        {/* Navigation Section */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {allNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 relative overflow-hidden',
                    isActive
                      ? 'text-primary-foreground shadow-md shadow-primary/25'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary z-0"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0 z-10 transition-transform duration-300',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:scale-110',
                      collapsed && 'mx-auto'
                    )}
                  />
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="z-10 truncate"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Footer */}
        <div className="p-3 border-t border-border/50">
          <div className={cn(
            "rounded-xl bg-muted/30 p-2 flex items-center gap-3 transition-all cursor-pointer hover:bg-muted/50",
            collapsed ? "justify-center" : ""
          )}>
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-sm">
              <span className="font-bold text-sm">{(profile?.username || 'A').charAt(0).toUpperCase()}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile?.full_name || 'Administrator'}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3 text-primary" />
                  {profile?.role || 'Admin'}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50 relative">
        {/* Header */}
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-background/60 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              {allNavigation.find((n) => n.href === location.pathname)?.name || 'Overview'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type / to search..."
                className="w-64 h-9 pl-9 bg-muted/40 border-transparent focus:bg-background transition-all"
              />
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50 rounded-full">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50 rounded-full" onClick={toggleTheme}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full h-8 w-8 p-0 ml-1 border-2 border-primary/20 hover:border-primary transition-colors">
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.username || 'admin'}`} alt="Avatar" className="rounded-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <ScrollArea className="flex-1">
          <main className="p-6 max-w-7xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
