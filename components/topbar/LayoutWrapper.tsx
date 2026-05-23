'use client'

import { usePathname } from 'next/navigation'
import { Topbar } from './Topbar'

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/join']

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  return (
    <>
      {!isPublicRoute && <Topbar />}
      {children}
    </>
  )
}
