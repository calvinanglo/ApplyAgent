'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Search,
  Briefcase,
  CreditCard,
  Settings,
  LogOut,
  FileDown,
  Inbox,
  Wrench,
  List,
  BookOpen,
  Menu,
  X,
  HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/evaluate', label: 'Evaluate', icon: Search },
  { href: '/applications', label: 'Applications', icon: Briefcase },
  { href: '/tools', label: 'Tools', icon: Wrench },
  { href: '/resume', label: 'Documents', icon: FileDown },
  { href: '/story-bank', label: 'Story Bank', icon: BookOpen },
  { href: '/scan', label: 'Scanner', icon: Inbox },
  { href: '/pipeline', label: 'Pipeline', icon: List },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Profile', icon: Settings },
  { href: '/instructions', label: 'How It Works', icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Listen for toggle event from topbar hamburger button
  useEffect(() => {
    function handleToggle() { setOpen(true) }
    window.addEventListener('toggle-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <Image src="/icon.svg" alt="" width={28} height={28} />
          <span className="text-lg font-bold">ApplyAgent</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="ml-auto md:hidden p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in drawer) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card shadow-xl transition-transform duration-200 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex">
        {sidebarContent}
      </aside>
    </>
  )
}
