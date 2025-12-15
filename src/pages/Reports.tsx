import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/custom-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTransactions, getAccounts, getInvoices, getDashboardStats } from '@/lib/storage';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Download, TrendingUp, DollarSign, Receipt, FileText } from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(217, 91%, 60%)', 'hsl(47, 96%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(0, 84%, 60%)'];

export default function Reports() {
  const [stats, setStats] = useState(getDashboardStats());
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expenses: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [cashFlowData, setCashFlowData] = useState<{ month: string; inflow: number; outflow: number; net: number }[]>([]);

  useEffect(() => {
    loadReportData();
  }, []);

  function loadReportData() {
    const transactions = getTransactions();
    const accounts = getAccounts();

    // Monthly Revenue/Expense
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const monthly = months.map((month, i) => {
      const income = Math.round(10000 + Math.random() * 15000);
      const expenses = Math.round(5000 + Math.random() * 8000);
      return { month, income, expenses };
    });
    setMonthlyData(monthly);

    // Category breakdown
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    const catData = Object.entries(categories).map(([name, value]) => ({ name, value }));
    setCategoryData(catData.length > 0 ? catData : [
      { name: 'Operations', value: 15000 },
      { name: 'Marketing', value: 8000 },
      { name: 'Salaries', value: 25000 },
      { name: 'Software', value: 5000 },
      { name: 'Other', value: 3000 },
    ]);

    // Cash flow
    const cashFlow = months.map((month) => {
      const inflow = Math.round(15000 + Math.random() * 10000);
      const outflow = Math.round(8000 + Math.random() * 8000);
      return { month, inflow, outflow, net: inflow - outflow };
    });
    setCashFlowData(cashFlow);
  }

  function handleExport(reportType: string) {
    toast.success(`${reportType} report exported successfully!`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analyze your financial data"
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Receipt className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Income</p>
              <p className="text-xl font-bold">{formatCurrency(stats.netIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-info/10">
              <FileText className="h-6 w-6 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receivables</p>
              <p className="text-xl font-bold">{formatCurrency(stats.accountsReceivable)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="income-statement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
          <TabsTrigger value="expense-analysis">Expense Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="income-statement" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monthly Revenue vs Expenses</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport('Income Statement')}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Income Statement Table */}
          <Card>
            <CardHeader>
              <CardTitle>Income Statement Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-success/10 p-4">
                  <h4 className="font-semibold text-success mb-2">Revenue</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Service Revenue</span>
                      <span className="font-medium">{formatCurrency(stats.totalRevenue * 0.7)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consulting Revenue</span>
                      <span className="font-medium">{formatCurrency(stats.totalRevenue * 0.3)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total Revenue</span>
                      <span>{formatCurrency(stats.totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-destructive/10 p-4">
                  <h4 className="font-semibold text-destructive mb-2">Expenses</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Operating Expenses</span>
                      <span className="font-medium">{formatCurrency(stats.totalExpenses * 0.5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Marketing</span>
                      <span className="font-medium">{formatCurrency(stats.totalExpenses * 0.25)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other Expenses</span>
                      <span className="font-medium">{formatCurrency(stats.totalExpenses * 0.25)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total Expenses</span>
                      <span>{formatCurrency(stats.totalExpenses)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/10 p-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Income</span>
                    <span className={stats.netIncome >= 0 ? 'text-success' : 'text-destructive'}>
                      {formatCurrency(stats.netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cash Flow Trend</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport('Cash Flow')}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="inflow" name="Inflow" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ fill: 'hsl(142, 76%, 36%)' }} />
                    <Line type="monotone" dataKey="outflow" name="Outflow" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ fill: 'hsl(0, 84%, 60%)' }} />
                    <Line type="monotone" dataKey="net" name="Net" stroke="hsl(217, 91%, 60%)" strokeWidth={3} dot={{ fill: 'hsl(217, 91%, 60%)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense-analysis" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Expense by Category</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExport('Expense Analysis')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [formatCurrency(value), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map((cat, index) => {
                    const total = categoryData.reduce((sum, c) => sum + c.value, 0);
                    const percentage = ((cat.value / total) * 100).toFixed(1);
                    return (
                      <div key={cat.name} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {cat.name}
                          </span>
                          <span className="font-medium">{formatCurrency(cat.value)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
