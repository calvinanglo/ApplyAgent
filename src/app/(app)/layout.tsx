'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { NavigationBlockerProvider } from '@/components/navigation-blocker'

const HelpChat = dynamic(() => import('@/components/help-chat').then(m => m.HelpChat), { ssr: false })

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationBlockerProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
            <footer className="mt-12 border-t pt-6 pb-4 text-center text-xs text-muted-foreground">
              <span className="font-medium">ApplyAgent</span>
              {' · '}
              <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
              {' · '}
              <Link href="/terms" className="hover:underline">Terms of Service</Link>
              {' · '}
              <Link href="/contact" className="hover:underline">Contact</Link>
              {' · '}
              &copy; {new Date().getFullYear()} ApplyAgent. All rights reserved.
            </footer>
          </main>
        </div>
        <HelpChat />
      </div>
    </NavigationBlockerProvider>
  )
}
