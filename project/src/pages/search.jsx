import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Sparkles, FileText, X } from 'lucide-react'
import { mockApi } from '@/lib/mock-api'
import { useToast } from '@/lib/toast-context'
import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge, CategoryBadge } from '@/components/shared/badges'
import { formatDate } from '@/lib/utils'

const suggestedQueries = [
  'Show all land documents uploaded in January',
  'How many pending approvals are there?',
  'Find documents from Revenue Department',
  'Show recent uploads',
  'Find property tax related documents',
  'List all urgent priority documents',
]

export default function SearchPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Smart Search"
        description="AI-powered semantic search across all documents, file names, OCR text, metadata, and departments"
      />

      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search documents... e.g. 'urgent land documents from Revenue Department'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-12 h-12 text-base"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setResults(null)
                  setSearched(false)
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <Button className="w-full mt-3" onClick={() => handleSearch()} disabled={loading}>
            {loading ? 'AI Searching...' : 'Search Documents'}
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
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestedQueries.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(q)
                  handleSearch(q)
                }}
                className="flex items-center gap-2 rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors"
              >
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{q}</span>
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
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : !results?.length ? (
              <EmptyState
                icon={Search}
                title="No results found"
                description="Try a different search term or check spelling"
              />
            ) : (
              <div className="space-y-3">
                {results.map((doc, i) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className="flex items-start gap-4 rounded-xl border p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0 mt-0.5">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{doc.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={doc.status} />
                          <CategoryBadge category={doc.category} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {doc.documentNumber} • {formatDate(doc.createdAt)} • {doc.uploadedByName}
                      </p>
                      {doc.snippet && (
                        <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2 italic bg-muted/40 p-2 rounded-lg border border-border/40">
                          "{doc.snippet}"
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
