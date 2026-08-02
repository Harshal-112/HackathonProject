import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, FileSpreadsheet, FileText, Calendar, Building2, Users, FileType,
  TrendingUp, Download,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from 'recharts'
import { mockApi } from '@/lib/mock-api'
import { useToast } from '@/lib/toast-context'
import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/input'
import { toCSV, downloadFile, formatNumber, formatDate } from '@/lib/utils'

const PIE_COLORS = ['#1e40af', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0f766e', '#475569']

const periods = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
]

export default function ReportsPage() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('monthly')

  useEffect(() => {
    setLoading(true)
    mockApi.getReports({ period })
      .then(setData)
      .catch((err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [period, toast])

  const handleExport = (type) => {
    if (!data) return
    if (type === 'csv') {
      const rows = data.byDepartment.map((d) => ({
        Department: d.department,
        Total: d.count,
        Approved: d.approved,
        Pending: d.pending,
      }))
      downloadFile(`report_${period}_${Date.now()}.csv`, toCSV(rows))
      toast({ title: 'Exported', description: 'Report exported as CSV', variant: 'success' })
    } else if (type === 'pdf') {
      toast({ title: 'Generating PDF', description: 'PDF report download will begin shortly', variant: 'success' })
      const content = `Government Document Report\nPeriod: ${period}\nGenerated: ${formatDate(new Date())}\n\nTotal Documents: ${data.total}\n\nBy Department:\n${data.byDepartment.map((d) => `  ${d.department}: ${d.count} (Approved: ${d.approved}, Pending: ${d.pending})`).join('\n')}\n\nBy Type:\n${data.byType.map((t) => `  ${t.type}: ${t.count}`).join('\n')}`
      downloadFile(`report_${period}_${Date.now()}.txt`, content, 'text/plain')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Generate and export comprehensive reports"
      >
        <Select
          value={period}
          onChange={setPeriod}
          options={periods}
          className="w-40"
        />
        <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="h-4 w-4" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
          <FileText className="h-4 w-4" /> Export PDF
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={FileText} label="Total Documents" value={data.total} color="text-primary" bg="bg-primary/10" />
        <SummaryCard icon={Building2} label="Departments" value={data.byDepartment.filter((d) => d.count > 0).length} color="text-accent" bg="bg-accent/10" />
        <SummaryCard icon={Users} label="Active Users" value={data.byUser.length} color="text-success" bg="bg-success/10" />
        <SummaryCard icon={FileType} label="Categories" value={data.byType.filter((t) => t.count > 0).length} color="text-warning" bg="bg-warning/10" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents by Department</CardTitle>
            <CardDescription>Approved vs Pending breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byDepartment.filter((d) => d.count > 0)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))' }} />
                <Legend />
                <Bar dataKey="approved" stackId="a" fill="#059669" name="Approved" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending" stackId="a" fill="#d97706" name="Pending" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents by Type</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.byType.filter((t) => t.count > 0)} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {data.byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User-wise report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User-wise Document Uploads</CardTitle>
          <CardDescription>Documents uploaded by each user ({period})</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">User</th>
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Role</th>
                  <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase">Documents</th>
                </tr>
              </thead>
              <tbody>
                {data.byUser.map((u, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b last:border-0 hover:bg-accent/30"
                  >
                    <td className="p-3 text-sm font-medium">{u.user}</td>
                    <td className="p-3 text-sm text-muted-foreground capitalize">{u.role}</td>
                    <td className="p-3 text-sm font-medium text-right">{formatNumber(u.count)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Department table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department-wise Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                  <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase">Total</th>
                  <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase">Approved</th>
                  <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase">Pending</th>
                </tr>
              </thead>
              <tbody>
                {data.byDepartment.filter((d) => d.count > 0).map((d, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-accent/30">
                    <td className="p-3 text-sm font-medium">{d.department}</td>
                    <td className="p-3 text-sm text-right">{d.count}</td>
                    <td className="p-3 text-sm text-right text-success">{d.approved}</td>
                    <td className="p-3 text-sm text-right text-warning">{d.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} mb-3`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <p className="text-2xl font-bold">{formatNumber(value)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}
