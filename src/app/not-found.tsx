import Link from 'next/link'
import Image from 'next/image'
import { buttonVariants } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        <Image src="/logo.svg" alt="ApplyAgent" width={150} height={48} className="mx-auto mb-4" />
        <FileQuestion className="size-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className={cn(buttonVariants())}>Go to Dashboard</Link>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>Home</Link>
        </div>
      </div>
    </div>
  )
}
