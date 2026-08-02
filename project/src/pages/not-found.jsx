import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <FileQuestion className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-xl font-semibold mt-2">Page Not Found</h2>
        <p className="text-sm text-muted-foreground mt-2">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link to="/dashboard">
            <Button>
              <Home className="h-4 w-4" /> Go to Dashboard
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
