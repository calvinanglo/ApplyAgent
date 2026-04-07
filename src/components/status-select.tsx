'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

const STATUSES = ['Evaluated', 'Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Accepted'] as const
const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Evaluated: 'secondary',
  Applied: 'default',
  Interview: 'default',
  Offer: 'default',
  Rejected: 'destructive',
  Withdrawn: 'outline',
  Accepted: 'default',
}

export function StatusSelect({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const router = useRouter()

  async function handleChange(newStatus: string) {
    setStatus(newStatus)
    setOpen(false)
    await fetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    router.refresh()
  }

  return (
    <div className="relative" onClick={(e) => e.preventDefault()}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }}>
        <Badge variant={statusColors[status] || 'secondary'} className="cursor-pointer hover:opacity-80">
          {status}
        </Badge>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 rounded-md border bg-background shadow-lg py-1 min-w-[140px]">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); handleChange(s) }}
                className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${s === status ? 'font-medium bg-muted/50' : ''}`}
              >
                <Badge variant={statusColors[s]} className="text-xs">{s}</Badge>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
