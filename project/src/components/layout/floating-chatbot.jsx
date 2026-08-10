import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Brain, X, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { mockApi } from '@/lib/mock-api'
import { isAIAvailable } from '@/services/aiService'

const QUICK_ACTIONS = [
  '📊 Show document stats',
  '🔍 Find pending documents',
  '📋 Recent uploads',
  '❓ How to upload a document?',
]

function parseInlineMarkdown(text) {
  if (!text) return text
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function FormattedMarkdown({ content }) {
  if (!content) return null
  const lines = content.split('\n')

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-1" />

        if (trimmed === '---' || trimmed === '***') {
          return <hr key={idx} className="my-1.5 border-border/60" />
        }

        if (trimmed.startsWith('### ') || trimmed.startsWith('#### ') || trimmed.startsWith('# ')) {
          const headingText = trimmed.replace(/^#+\s*/, '')
          return (
            <h4 key={idx} className="font-bold text-sm text-foreground mt-2 mb-1">
              {parseInlineMarkdown(headingText)}
            </h4>
          )
        }

        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const bulletText = trimmed.replace(/^[*\-]\s*/, '')
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-primary font-bold select-none">•</span>
              <div>{parseInlineMarkdown(bulletText)}</div>
            </div>
          )
        }

        return <p key={idx}>{parseInlineMarkdown(line)}</p>
      })}
    </div>
  )
}

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSend = async (text = input.trim()) => {
    if (!text || loading) return

    const userMessage = { role: 'user', text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const result = await mockApi.chatWithDocuments(text)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: result.response, aiPowered: result.aiPowered },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Sorry, something went wrong. Please try again.', aiPowered: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = (actionText) => {
    const query = actionText.replace(/^[^\w\s]+\s*/, '')
    handleSend(query)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed bottom-24 right-4 z-50 flex flex-col sm:right-6',
              'w-[calc(100vw-2rem)] sm:w-[400px]',
              'h-[520px] max-h-[calc(100vh-8rem)]',
              'rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-blue-700 px-4 py-3.5 text-primary-foreground shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight text-white">AI Document Assistant</h3>
                  <p className="text-[11px] text-white/80 leading-tight">Ask me anything about your documents</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {isAIAvailable() && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    <Sparkles className="h-2.5 w-2.5" /> AI
                  </span>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                    <Brain className="h-7 w-7" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">How can I help you today?</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                    I can search your documents, give statistical summaries, or check pending approvals.
                  </p>
                  <div className="grid grid-cols-1 gap-2 w-full mt-5">
                    {QUICK_ACTIONS.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(action)}
                        className="text-left text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/50 rounded-xl p-2.5 transition-all text-foreground/80 font-medium"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex',
                        msg.role === 'user' ? 'justify-end' : 'justify-start',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md shadow-sm border border-border/40',
                        )}
                      >
                        {msg.role === 'user' ? (
                          <p>{msg.text}</p>
                        ) : (
                          <FormattedMarkdown content={msg.text} />
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={dot}
                            className="block h-2 w-2 rounded-full bg-muted-foreground/50"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: dot * 0.15,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t px-4 py-3 bg-card">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question..."
                  disabled={loading}
                  className="flex-1 rounded-full border-muted-foreground/20 bg-muted/50 px-4 text-sm"
                />
                <Button
                  size="icon"
                  disabled={loading || !input.trim()}
                  onClick={() => handleSend()}
                  className={cn(
                    'h-10 w-10 shrink-0 rounded-full',
                    'bg-gradient-to-r from-primary to-blue-700',
                    'hover:shadow-lg hover:shadow-primary/25',
                    'transition-all active:scale-95',
                  )}
                >
                  <Send className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all',
          'bg-gradient-to-r from-primary to-blue-700 text-white',
          'hover:shadow-primary/30 hover:shadow-2xl',
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}
