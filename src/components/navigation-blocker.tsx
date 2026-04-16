'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface NavigationBlockerContextType {
  isBlocked: boolean
  setBlocked: (blocked: boolean) => void
  confirmNavigation: () => boolean
}

const NavigationBlockerContext = createContext<NavigationBlockerContextType>({
  isBlocked: false,
  setBlocked: () => {},
  confirmNavigation: () => true,
})

export function NavigationBlockerProvider({ children }: { children: ReactNode }) {
  const [isBlocked, setBlocked] = useState(false)

  const confirmNavigation = useCallback(() => {
    if (!isBlocked) return true
    return window.confirm('You have unsaved changes that will be lost. Save your profile before leaving, or click OK to discard changes.')
  }, [isBlocked])

  return (
    <NavigationBlockerContext.Provider value={{ isBlocked, setBlocked, confirmNavigation }}>
      {children}
    </NavigationBlockerContext.Provider>
  )
}

export function useNavigationBlocker() {
  return useContext(NavigationBlockerContext)
}
