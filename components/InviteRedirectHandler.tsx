'use client'

import { useEffect } from 'react'

export function InviteRedirectHandler() {
  useEffect(() => {
    // Read the invite redirect cookie and store in sessionStorage
    const cookies = document.cookie
    const cookieMatch = cookies.match(/x-invite-redirect=([^;]+)/)

    if (cookieMatch) {
      const redirectUrl = decodeURIComponent(cookieMatch[1])
      sessionStorage.setItem('inviteRedirect', redirectUrl)

      // Clear the cookie by setting max-age to 0
      document.cookie = 'x-invite-redirect=; path=/; max-age=0'
    }
  }, [])

  return null
}
