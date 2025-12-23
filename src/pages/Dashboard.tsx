import { useEffect, useState } from 'react';
import { getDashboardStats, getTransactions, getInvoices } from '@/lib/storage';
import { DashboardStats, Transaction, Invoice } from '@/types/accounting';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FileText,
  Activity,
  MoreHorizontal
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';

const revenueData = [
  { month: 'Jan', revenue: 12000, expenses: 8000 },
  { month: 'Feb', revenue: 15000, expenses: 9500 },
  { month: 'Mar', revenue: 18000, expenses: 11000 },
  { month: 'Apr', revenue: 16500, expenses: 10000 },
  { month: 'May', revenue: 21000, expenses: 12500 },
  { month: 'Jun', revenue: 19500, expenses: 11500 },
];

const expenseCategories = [
  { name: 'Operations', value: 35, color: 'hsl(var(--primary))' },
  { name: 'Marketing', value: 25, color: 'hsl(var(--chart-2))' },
  { name: 'Salaries', value: 30, color: 'hsl(var(--chart-3))' },
  { name: 'Other', value: 10, color: 'hsl(var(--chart-4))' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Dashboard() {
  const { products } = useProducts();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    setStats(getDashboardStats());
    setRecentTransactions(getTransactions().slice(0, 5));
    setRecentInvoices(getInvoices().slice(0, 4));
  }, []);

  if (!stats) return null;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Executive Overview</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="glass hover:bg-white/20">
            <Link to="/reports">
              <FileText className="mr-2 h-4 w-4" /> Reports
            </Link>
          </Button>
          <Button asChild className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
            <Link to="/transactions">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="glass-card hover:border-primary/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign className="w-24 h-24 text-primary transform rotate-12 translate-x-8 -translate-y-8" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-500 font-medium flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" /> +{stats.revenueChange}%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:border-red-500/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CreditCard className="w-24 h-24 text-red-500 transform rotate-12 translate-x-8 -translate-y-8" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <CreditCard className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatCurrency(stats.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-red-500 font-medium flex items-center">
                  <ArrowDownRight className="h-3 w-3 mr-0.5" /> {stats.expenseChange}%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:border-emerald-500/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-24 h-24 text-emerald-500 transform rotate-12 translate-x-8 -translate-y-8" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatCurrency(stats.netIncome)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-500 font-medium flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" /> +12.5%
                </span>
                profit margin
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card hover:border-blue-500/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Receipt className="w-24 h-24 text-blue-500 transform rotate-12 translate-x-8 -translate-y-8" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Receipt className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatCurrency(stats.cashBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Available liquid funds
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Charts Area */}
      <div className="grid gap-6 lg:grid-cols-7">
        <motion.div variants={item} className="lg:col-span-4">
          <Card className="h-full glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Financial Performance</CardTitle>
                  <CardDescription>Revenue vs Expenses analysis</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8">Last 6 Months</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      itemStyle={{ borderRadius: '4px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                      name="Expenses"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="lg:col-span-3">
          <Card className="h-full glass-card">
            <CardHeader>
              <CardTitle>Expense Distribution</CardTitle>
              <CardDescription>Breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="text-3xl font-bold block">{stats.expenseChange}%</span>
                    <span className="text-xs text-muted-foreground uppercase">Change</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 mt-4">
                {expenseCategories.map((category) => (
                  <div key={category.name} className="flex items-center justify-between text-sm group cursor-default">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-transparent group-hover:ring-offset-1 transition-all"
                        style={{ backgroundColor: category.color, borderColor: category.color }}
                      />
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{category.name}</span>
                    </div>
                    <span className="font-medium font-mono">{category.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions Feed */}
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest financial movements</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentTransactions.map((t, i) => (
                  <div key={t.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`
                               h-10 w-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110 shadow-sm
                               ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}
                            `}>
                        {t.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{t.category} • {t.date}</p>
                      </div>
                    </div>
                    <div className={`text-right font-mono font-medium ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-2" asChild>
                  <Link to="/transactions">View All History</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.div variants={item}>
          <div className="grid grid-cols-2 gap-4 h-full">
            <Link to="/invoices" className="col-span-1">
              <Card className="h-full glass-card hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center gap-3 p-6 group border-dashed">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-foreground group-hover:text-blue-500 transition-colors">Create Invoice</h3>
                  <p className="text-xs text-muted-foreground mt-1">Bill a client</p>
                </div>
              </Card>
            </Link>
            <Link to="/clients" className="col-span-1">
              <Card className="h-full glass-card hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center gap-3 p-6 group border-dashed">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-foreground group-hover:text-purple-500 transition-colors">Add Client</h3>
                  <p className="text-xs text-muted-foreground mt-1">Register new customer</p>
                </div>
              </Card>
            </Link>
            <Link to="/inventory" className="col-span-2">
              <Card className="h-full glass-card hover:bg-primary/5 cursor-pointer flex items-center justify-between p-6 group border-dashed">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-amber-500 transition-colors">Inventory Status</h3>
                    <p className="text-xs text-muted-foreground mt-1">Check stock levels & reorders</p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </Card>
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
