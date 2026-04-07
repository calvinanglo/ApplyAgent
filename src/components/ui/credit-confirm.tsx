'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface CreditConfirmButtonProps {
  credits: number
  label: string
  loadingLabel: string
  disabled?: boolean
  onConfirm: () => Promise<void>
  className?: string
  icon?: React.ReactNode
}

export function CreditConfirmButton({
  credits,
  label,
  loadingLabel,
  disabled,
  onConfirm,
  className,
  icon,
}: CreditConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    try {
      await onConfirm()
      // Refresh server components (topbar credit badge) after spending credits
      router.refresh()
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  function handleCancel() {
    setConfirming(false)
  }

  if (loading) {
    return (
      <Button disabled className={className}>
        <Loader2 className="size-4 animate-spin" />
        {loadingLabel}
      </Button>
    )
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
          Use <strong>{credits}</strong> credit{credits !== 1 ? 's' : ''}?
        </span>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={handleClick} className={className}>
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button onClick={handleClick} disabled={disabled} className={className}>
      {icon}
      {label}
    </Button>
  )
}
