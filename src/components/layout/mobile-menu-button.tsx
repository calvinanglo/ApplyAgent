'use client'

import { Menu } from 'lucide-react'

export function MobileMenuButton() {
  return (
    <button
      onClick={() => {
        // Dispatch custom event to open sidebar
        window.dispatchEvent(new CustomEvent('toggle-sidebar'))
      }}
      className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 md:hidden"
    >
      <Menu className="size-5" />
    </button>
  )
}
