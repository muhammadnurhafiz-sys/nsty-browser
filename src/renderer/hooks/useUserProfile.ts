import { useState } from 'react'
import type { UserProfile } from '@shared/types'
import { createLogger } from '../utils/logger'

const log = createLogger('useUserProfile')

const DEFAULT_PROFILE: UserProfile = {
  id: 'hafiz',
  name: 'Hafiz',
  email: 'hafiz@nsty.dev',
  avatarUrl: null,
  provider: 'local',
}

export function useUserProfile() {
  const [profile] = useState<UserProfile>(DEFAULT_PROFILE)

  const signInWithGoogle = async () => {
    // TODO: Implement Google OAuth flow
    // 1. Open Google OAuth URL in a new BrowserWindow
    // 2. Listen for redirect with auth code
    // 3. Exchange code for tokens
    // 4. Fetch user profile from Google API
    // 5. Update profile state
    log.info('Google sign-in not yet implemented')
  }

  const signOut = () => {
    // TODO: Clear tokens, revert to default profile
    log.info('sign-out not yet implemented')
  }

  return { profile, signInWithGoogle, signOut }
}
