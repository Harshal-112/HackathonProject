import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon, Palette, Brain, ScanText, Building2,
  FileType, Moon, Sun, Save, Plus, Trash2,
} from 'lucide-react'
import { mockApi } from '@/lib/mock-api'
import { useToast } from '@/lib/toast-context'
import { useTheme } from '@/lib/theme-context'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newDept, setNewDept] = useState({ name: '', code: '' })
  const [newCat, setNewCat] = useState({ name: '', color: '#1e40af' })

  useEffect(() => {
    mockApi.getSettings().then((s) => { setSettings(s); setLoading(false) })
  }, [])

  const handleSave = async (section) => {
    setSaving(true)
    try {
      await mockApi.updateSettings(settings)
      toast({ title: 'Settings saved', description: `${section} settings updated`, variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const addDepartment = () => {
    if (!newDept.name || !newDept.code) return
    const id = newDept.code.toLowerCase()
    setSettings({
      ...settings,
      departments: [...settings.departments, { id, name: newDept.name, code: newDept.code.toUpperCase() }],
    })
    setNewDept({ name: '', code: '' })
  }

  const removeDepartment = (id) => {
    setSettings({ ...settings, departments: settings.departments.filter((d) => d.id !== id) })
  }

  const addCategory = () => {
    if (!newCat.name) return
    const id = newCat.name.toLowerCase().replace(/\s+/g, '-')
    setSettings({
      ...settings,
      categories: [...settings.categories, { id, name: newCat.name, color: newCat.color }],
    })
    setNewCat({ name: '', color: '#1e40af' })
  }

  const removeCategory = (id) => {
    setSettings({ ...settings, categories: settings.categories.filter((c) => c.id !== id) })
  }

  if (loading || !settings) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure system preferences, AI, OCR, and organizational structure" />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="ocr">OCR Settings</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Appearance & Theme
              </CardTitle>
              <CardDescription>Customize the look and feel of the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Theme</Label>
                <div className="mt-2 grid grid-cols-2 gap-3 max-w-md">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border-2 p-4 transition-all',
                      theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                    )}
                  >
                    <Sun className="h-5 w-5 text-warning" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Light Mode</p>
                      <p className="text-xs text-muted-foreground">Blue + White theme</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border-2 p-4 transition-all',
                      theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                    )}
                  >
                    <Moon className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">Easy on the eyes</p>
                    </div>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> AI Configuration
              </CardTitle>
              <CardDescription>Configure AI provider and automation settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>AI Provider</Label>
                  <Select
                    value={settings.ai.provider}
                    onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, provider: v } })}
                    options={[{ value: 'openai', label: 'OpenAI' }, { value: 'gemini', label: 'Google Gemini' }]}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input
                    value={settings.ai.model}
                    onChange={(e) => setSettings({ ...settings, ai: { ...settings.ai, model: e.target.value } })}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={settings.ai.apiKey}
                  onChange={(e) => setSettings({ ...settings, ai: { ...settings.ai, apiKey: e.target.value } })}
                  placeholder="sk-..."
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">Stored securely in environment variables</p>
              </div>
              <div className="space-y-3">
                <Toggle
                  label="Auto Classify Documents"
                  desc="Automatically categorize documents using AI"
                  checked={settings.ai.autoClassify}
                  onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, autoClassify: v } })}
                />
                <Toggle
                  label="Auto Summarize"
                  desc="Generate AI summaries for uploaded documents"
                  checked={settings.ai.autoSummarize}
                  onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, autoSummarize: v } })}
                />
                <Toggle
                  label="Auto Tag"
                  desc="Automatically generate tags and keywords"
                  checked={settings.ai.autoTag}
                  onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, autoTag: v } })}
                />
              </div>
              <div>
                <Label>Confidence Threshold: {settings.ai.confidenceThreshold}%</Label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={settings.ai.confidenceThreshold}
                  onChange={(e) => setSettings({ ...settings, ai: { ...settings.ai, confidenceThreshold: parseInt(e.target.value) } })}
                  className="w-full mt-2"
                />
              </div>
              <Button onClick={() => handleSave('AI')} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save AI Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OCR Settings */}
        <TabsContent value="ocr">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ScanText className="h-4 w-4 text-primary" /> OCR Configuration
              </CardTitle>
              <CardDescription>Configure text extraction settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>OCR Language Pack</Label>
                <Select
                  value={settings.ocr.language}
                  onChange={(v) => setSettings({ ...settings, ocr: { ...settings.ocr, language: v } })}
                  options={[
                    { value: 'eng', label: 'English' },
                    { value: 'eng+mar', label: 'English + Marathi' },
                    { value: 'eng+hin', label: 'English + Hindi' },
                    { value: 'eng+mar+hin', label: 'English + Marathi + Hindi' },
                  ]}
                  className="mt-1.5"
                />
              </div>
              <div className="space-y-3">
                <Toggle
                  label="Auto Run OCR"
                  desc="Start OCR automatically after upload"
                  checked={settings.ocr.autoRun}
                  onChange={(v) => setSettings({ ...settings, ocr: { ...settings.ocr, autoRun: v } })}
                />
                <Toggle
                  label="Enhance Image"
                  desc="Pre-process images for better accuracy"
                  checked={settings.ocr.enhanceImage}
                  onChange={(v) => setSettings({ ...settings, ocr: { ...settings.ocr, enhanceImage: v } })}
                />
                <Toggle
                  label="Extract Tables"
                  desc="Detect and extract tabular data"
                  checked={settings.ocr.extractTables}
                  onChange={(v) => setSettings({ ...settings, ocr: { ...settings.ocr, extractTables: v } })}
                />
              </div>
              <Button onClick={() => handleSave('OCR')} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save OCR Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Manage Departments
              </CardTitle>
              <CardDescription>Add or remove government departments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Department Name" value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} />
                <Input placeholder="Code" value={newDept.code} onChange={(e) => setNewDept({ ...newDept, code: e.target.value })} className="w-24" />
                <Button onClick={addDepartment}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {settings.departments.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{d.code}</Badge>
                      <span className="text-sm font-medium">{d.name}</span>
                    </div>
                    <button onClick={() => removeDepartment(d.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button onClick={() => handleSave('Departments')} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Departments'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileType className="h-4 w-4 text-primary" /> Manage Categories
              </CardTitle>
              <CardDescription>Add or remove document categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Category Name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
                <input type="color" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} className="h-10 w-12 rounded-md border border-input cursor-pointer" />
                <Button onClick={addCategory}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {settings.categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-sm font-medium">{c.name}</span>
                    </div>
                    <button onClick={() => removeCategory(c.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button onClick={() => handleSave('Categories')} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Categories'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )} />
      </button>
    </div>
  )
}
