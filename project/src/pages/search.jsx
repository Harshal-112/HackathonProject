import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Sparkles, FileText, Brain, Send, MessageSquare, X,
  TrendingUp, Clock, Filter, Wand2, Zap,
} from 'lucide-react'
import { mockApi } from '@/lib/mock-api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge, CategoryBadge } from '@/components/shared/badges'
import { formatDate, timeAgo, cn } from '@/lib/utils'
import { isAIAvailable } from '@/services/aiService'

const suggestedQueries = [
  'Show all land documents uploaded in January',
  'How many pending approvals are there?',
  'Find documents from Revenue Department',
  'Show recent uploads',
  'Find property tax related documents',
  'List all urgent priority documents',
]

export default function SearchPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Chat state
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSearch = async (q) => {
    const searchQuery = q || query
    if (!searchQuery.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await mockApi.searchDocuments(searchQuery)
      setResults(res)
    } catch (err) {
      toast({ title: 'Search error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleChat = async (e) => {
    e?.preventDefault()
    if (!chatInput.trim()) return
    const userMsg = chatInput
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await mockApi.chatWithDocuments(userMsg, user)
      setChatMessages((prev) => [...prev, { role: 'assistant', text: res.response, aiPowered: res.aiPowered }])
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Search"
        description="Search across all documents using natural language, file names, OCR text, and AI metadata"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search documents... e.g. 'land documents from January'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-12 h-12 text-base"
                />
                {query && (
                  <button onClick={() => { setQuery(''); setResults(null); setSearched(false) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              <Button className="w-full mt-3" onClick={() => handleSearch()} disabled={loading}>
                {loading ? 'Searching...' : <>Search Documents</>}
              </Button>
            </CardContent>
          </Card>

          {/* Suggested queries */}
          {!searched && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Try these searches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(q); handleSearch(q) }}
                    className="flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors"
                  >
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    {q}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {searched && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Search Results
                  {results && <span className="text-sm font-normal text-muted-foreground">{results.length} found</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : !results?.length ? (
                  <EmptyState
                    icon={Search}
                    title="No results found"
                    description="Try a different search term or check spelling"
                  />
                ) : (
                  <div className="space-y-2">
                    {results.map((doc, i) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.documentNumber} • {formatDate(doc.createdAt)} • {doc.uploadedByName}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={doc.status} />
                          <CategoryBadge category={doc.category} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Chat Assistant */}
        <div>
          <Card className="flex flex-col h-[600px]">
            <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> AI Document Assistant
                {isAIAvailable() && (
                  <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 ml-auto border border-violet-200 dark:border-violet-800">
                    <Zap className="h-2.5 w-2.5" /> Gemini Powered
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Ask me anything about your documents</p>
                    <p className="text-xs text-muted-foreground mt-1">I can search, summarize, and analyze</p>
                  </div>
                )}
                <AnimatePresence>
                  {chatMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div className={cn(
                        'max-w-[85%] rounded-lg p-3 text-sm',
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                        {msg.aiPowered && (
                          <p className="text-[10px] text-violet-500 mt-1 flex items-center gap-0.5">
                            <Wand2 className="h-2.5 w-2.5" /> Gemini AI
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChat} className="border-t p-3 flex gap-2">
                <Input
                  placeholder="Ask a question..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
