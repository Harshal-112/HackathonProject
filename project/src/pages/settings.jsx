import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Palette, Brain, ScanText, Building2, FileType, Moon, Sun, Save, Plus, Trash2, AlertCircle,
  Bell, Shield, RefreshCw, Lightbulb, Lock, Eye, EyeOff, Fingerprint, CreditCard, Phone, Mail,
  Database, ScrollText, ShieldCheck,
} from 'lucide-react'
import { mockApi } from '@/lib/mock-api'
import { DEMO_SETTINGS } from '@/lib/mock-data'
import { useToast } from '@/lib/toast-context'
import { useTheme } from '@/lib/theme-context'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { isAIAvailable } from '@/services/aiService'

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  
  const [newDept, setNewDept] = useState({ name: '', code: '' })
  const [newCat, setNewCat] = useState({ name: '', color: '#1e40af' })

  useEffect(() => {
    setLoading(true)
    mockApi.getSettings()
      .then((s) => {
        const loaded = s && Object.keys(s).length ? s : DEMO_SETTINGS
        
        // Ensure defaults
        const completeSettings = {
          ...loaded,
          ai: {
            ...loaded.ai,
            xaiEnabled: loaded.ai?.xaiEnabled ?? true,
            xaiVerbosity: loaded.ai?.xaiVerbosity ?? 'detailed'
          },
          notifications: {
            approvals: loaded.notifications?.approvals ?? true,
            uploads: loaded.notifications?.uploads ?? true,
            system: loaded.notifications?.system ?? true,
            email: loaded.notifications?.email ?? false,
            ...loaded.notifications
          },
          privacy: {
            localOnly: loaded.privacy?.localOnly ?? loaded.privacy?.e2eEncrypted ?? false,
            piiMasking: {
              aadhaar: loaded.privacy?.piiMasking?.aadhaar ?? true,
              pan: loaded.privacy?.piiMasking?.pan ?? true,
              phone: loaded.privacy?.piiMasking?.phone ?? true,
              email: loaded.privacy?.piiMasking?.email ?? true,
              gst: loaded.privacy?.piiMasking?.gst ?? true,
            },
            dataRetention: loaded.privacy?.dataRetention ?? '90 days',
            auditLog: loaded.privacy?.auditLog ?? true,
            ...loaded.privacy
          }
        }
        setSettings(completeSettings)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Settings load error:', err)
        setError(err.message)
        
        // Defaults for DEMO_SETTINGS
        const completeSettings = {
          ...DEMO_SETTINGS,
          ai: {
            ...DEMO_SETTINGS.ai,
            xaiEnabled: DEMO_SETTINGS.ai?.xaiEnabled ?? true,
            xaiVerbosity: DEMO_SETTINGS.ai?.xaiVerbosity ?? 'detailed'
          },
          notifications: { approvals: true, uploads: true, system: true, email: false },
          privacy: {
            localOnly: false,
            piiMasking: { aadhaar: true, pan: true, phone: true, email: true, gst: true },
            dataRetention: '90 days',
            auditLog: true
          }
        }
        setSettings(completeSettings)
        setLoading(false)
      })
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full max-w-lg" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const navItems = [
    { id: 'general', label: 'General', icon: Palette, status: theme },
    { id: 'ai', label: 'AI Settings', icon: Brain, status: settings.ai?.apiKey ? 'Active' : 'Inactive' },
    { id: 'ocr', label: 'OCR Settings', icon: ScanText, status: settings.ocr?.language?.substring(0,3).toUpperCase() },
    { id: 'departments', label: 'Departments', icon: Building2, status: settings.departments?.length.toString() },
    { id: 'categories', label: 'Categories', icon: FileType, status: settings.categories?.length.toString() },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, status: settings.privacy?.localOnly ? 'Local' : 'Cloud' },
  ]

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Settings" description="Configure system preferences, AI, OCR, and organizational structure" />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Using local settings</p>
            <p className="text-xs text-muted-foreground mt-0.5">Could not reach the database. Changes will be saved locally in this browser.</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-muted-foreground hover:text-foreground text-xs">✕</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-[220px] shrink-0">
          <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-2 lg:pb-0 scrollbar-none rounded-xl border bg-card p-2 shadow-sm">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap lg:whitespace-normal",
                  activeTab === item.id 
                    ? "bg-primary/10 text-primary lg:border-l-2 lg:border-l-primary lg:rounded-l-none" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.status && (
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground ml-2">
                    {item.status}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === 'general' && (
            <Card className="border-t-4 border-t-blue-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4 text-blue-500" /> Appearance & Theme
                </CardTitle>
                <CardDescription>Customize the look and feel of the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
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
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <Card className="border-t-4 border-t-violet-500 overflow-hidden">
                <CardHeader className="bg-gradient-to-b from-violet-50 to-transparent dark:from-violet-900/20">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-500" /> AI Configuration
                  </CardTitle>
                  <CardDescription>Configure AI provider and automation settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>AI Provider</Label>
                      <Select
                        value={settings.ai.provider}
                        onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, provider: v } })}
                        options={[{ value: 'openai', label: 'OpenAI' }, { value: 'gemini', label: 'Google AI' }]}
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
                  <div className="space-y-3 pt-2">
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
                  <div className="pt-2">
                    <Label>Confidence Threshold: {settings.ai.confidenceThreshold}%</Label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={settings.ai.confidenceThreshold}
                      onChange={(e) => setSettings({ ...settings, ai: { ...settings.ai, confidenceThreshold: parseInt(e.target.value) } })}
                      className="w-full mt-2 accent-violet-500"
                    />
                  </div>
                  
                  {/* Explainable AI Subsection */}
                  <div className="pt-6 border-t mt-6">
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                      <Lightbulb className="h-4 w-4 text-amber-500" /> Explainable AI (XAI)
                    </h4>
                    <div className="space-y-4">
                      <Toggle
                        label="Enable Explainable AI"
                        desc="Provide human-readable explanations for AI decisions"
                        checked={settings.ai.xaiEnabled}
                        onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, xaiEnabled: v } })}
                      />
                      <div>
                        <Label>Verbosity Level</Label>
                        <Select
                          value={settings.ai.xaiVerbosity}
                          onChange={(v) => setSettings({ ...settings, ai: { ...settings.ai, xaiVerbosity: v } })}
                          options={[
                            { value: 'brief', label: 'Brief - High level summary only' },
                            { value: 'detailed', label: 'Detailed - Step by step reasoning' }
                          ]}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={() => handleSave('AI')} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
                      <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save AI Settings'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'ocr' && (
            <Card className="border-t-4 border-t-cyan-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-b from-cyan-50 to-transparent dark:from-cyan-900/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <ScanText className="h-4 w-4 text-cyan-500" /> OCR Configuration
                </CardTitle>
                <CardDescription>Configure text extraction settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
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
                <div className="space-y-3 pt-2">
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
                <div className="pt-4">
                  <Button onClick={() => handleSave('OCR')} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save OCR Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'departments' && (
            <Card className="border-t-4 border-t-amber-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-900/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-500" /> Manage Departments
                </CardTitle>
                <CardDescription>Add or remove government departments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <Input placeholder="Department Name" value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} />
                  <Input placeholder="Code" value={newDept.code} onChange={(e) => setNewDept({ ...newDept, code: e.target.value })} className="w-24" />
                  <Button onClick={addDepartment} variant="secondary"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2 pt-2">
                  {settings.departments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border p-3 bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-background">{d.code}</Badge>
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                      <button onClick={() => removeDepartment(d.id)} className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="pt-4">
                  <Button onClick={() => handleSave('Departments')} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Departments'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'categories' && (
            <Card className="border-t-4 border-t-emerald-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-900/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileType className="h-4 w-4 text-emerald-500" /> Manage Categories
                </CardTitle>
                <CardDescription>Add or remove document categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <Input placeholder="Category Name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
                  <input type="color" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} className="h-10 w-12 rounded-md border border-input cursor-pointer" />
                  <Button onClick={addCategory} variant="secondary"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2 pt-2">
                  {settings.categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: c.color }} />
                        <span className="text-sm font-medium">{c.name}</span>
                      </div>
                      <button onClick={() => removeCategory(c.id)} className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="pt-4">
                  <Button onClick={() => handleSave('Categories')} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Categories'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="border-t-4 border-t-orange-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-b from-orange-50 to-transparent dark:from-orange-900/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" /> Notification Preferences
                </CardTitle>
                <CardDescription>Control when and how you receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <Toggle
                    label="Document Approval Alerts"
                    desc="Notify when a document is approved or rejected"
                    checked={settings.notifications?.approvals ?? true}
                    onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, approvals: v } })}
                  />
                  <Toggle
                    label="Upload Notifications"
                    desc="Confirm successful document uploads"
                    checked={settings.notifications?.uploads ?? true}
                    onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, uploads: v } })}
                  />
                  <Toggle
                    label="System Alerts"
                    desc="Critical system events and maintenance notices"
                    checked={settings.notifications?.system ?? true}
                    onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, system: v } })}
                  />
                  <Toggle
                    label="Email Notifications"
                    desc="Send notifications to your registered email address"
                    checked={settings.notifications?.email ?? false}
                    onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, email: v } })}
                  />
                </div>
                <div className="pt-4">
                  <Button onClick={() => handleSave('Notifications')} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'privacy' && (
            <Card className="border-t-4 border-t-rose-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-b from-rose-50 to-transparent dark:from-rose-900/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-rose-500" /> Privacy & Security
                </CardTitle>
                <CardDescription>Manage encryption, masking, and data retention policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-900/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 text-rose-700 dark:text-rose-400">
                        <Lock className="h-4 w-4" /> Confidential Mode (Local Processing)
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-md">
                        When enabled, all OCR extraction and classification run 100% locally in your browser using WebAssembly (Tesseract.js). Cloud AI API calls are completely disabled.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newVal = !settings.privacy?.localOnly;
                        setSettings({ ...settings, privacy: { ...settings.privacy, localOnly: newVal } });
                        localStorage.setItem('sdds_confidential_mode', newVal.toString());
                      }}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none',
                        settings.privacy?.localOnly ? 'bg-rose-500' : 'bg-muted',
                      )}
                    >
                      <span className={cn(
                        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                        settings.privacy?.localOnly ? 'translate-x-5' : 'translate-x-0',
                      )} />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <EyeOff className="h-4 w-4 text-muted-foreground" /> PII Auto-Masking
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Toggle
                      label="Aadhaar Numbers"
                      desc="Mask all but last 4 digits"
                      checked={settings.privacy?.piiMasking?.aadhaar ?? true}
                      onChange={(v) => setSettings({ ...settings, privacy: { ...settings.privacy, piiMasking: { ...settings.privacy.piiMasking, aadhaar: v } } })}
                    />
                    <Toggle
                      label="PAN Cards"
                      desc="Mask sensitive alphanumeric chars"
                      checked={settings.privacy?.piiMasking?.pan ?? true}
                      onChange={(v) => setSettings({ ...settings, privacy: { ...settings.privacy, piiMasking: { ...settings.privacy.piiMasking, pan: v } } })}
                    />
                    <Toggle
                      label="Phone Numbers"
                      desc="Mask middle digits"
                      checked={settings.privacy?.piiMasking?.phone ?? true}
                      onChange={(v) => setSettings({ ...settings, privacy: { ...settings.privacy, piiMasking: { ...settings.privacy.piiMasking, phone: v } } })}
                    />
                    <Toggle
                      label="Email Addresses"
                      desc="Mask user handle"
                      checked={settings.privacy?.piiMasking?.email ?? true}
                      onChange={(v) => setSettings({ ...settings, privacy: { ...settings.privacy, piiMasking: { ...settings.privacy.piiMasking, email: v } } })}
                    />
                    <Toggle
                      label="GST Numbers"
                      desc="Mask business identifiers"
                      checked={settings.privacy?.piiMasking?.gst ?? true}
                      onChange={(v) => setSettings({ ...settings, privacy: { ...settings.privacy, piiMasking: { ...settings.privacy.piiMasking, gst: v } } })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <Label className="flex items-center gap-2 mb-1.5">
                      <Database className="h-4 w-4 text-muted-foreground" /> Data Retention Policy
                    </Label>
                    <Select
                      value={settings.privacy?.dataRetention ?? '90 days'}
                      onChange={(v) => setSettings({ ...settings, privacy: { ...settings.privacy, dataRetention: v } })}
                      options={[
                        { value: '30 days', label: '30 days' },
                        { value: '90 days', label: '90 days' },
                        { value: '1 year', label: '1 year' },
                        { value: 'Indefinite', label: 'Indefinite' }
                      ]}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2 mb-1.5">
                      <ScrollText className="h-4 w-4 text-muted-foreground" /> System Audit Log
                    </Label>
                    <div className="border rounded-md p-2.5 flex items-center justify-between bg-card">
                      <span className="text-sm">Enable detailed audit logging</span>
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, privacy: { ...settings.privacy, auditLog: !settings.privacy?.auditLog } })}
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none',
                          settings.privacy?.auditLog ? 'bg-primary' : 'bg-muted',
                        )}
                      >
                        <span className={cn(
                          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                          settings.privacy?.auditLog ? 'translate-x-4' : 'translate-x-0',
                        )} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={() => handleSave('Privacy')} disabled={saving} className="bg-rose-600 hover:bg-rose-700">
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Security Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 bg-card hover:bg-muted/50 transition-colors">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

