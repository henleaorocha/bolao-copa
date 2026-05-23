'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CallbackRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if there's a stored invite redirect URL
    const inviteRedirect = sessionStorage.getItem('inviteRedirect')

    if (inviteRedirect) {
      // Clear the stored URL and redirect
      sessionStorage.removeItem('inviteRedirect')
      router.push(inviteRedirect)
    } else {
      // No invite redirect, go to dashboard
      router.push('/dashboard')
    }
  }, [router])

  // Show a loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    </div>
  )
}
