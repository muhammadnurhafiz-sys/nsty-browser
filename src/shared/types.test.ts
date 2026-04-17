import { describe, it, expect } from 'vitest'
import type { UserProfile, } from './types'

describe('shared types', () => {
  it('UserProfile interface accepts valid profile', () => {
    const profile: UserProfile = {
      id: 'hafiz',
      name: 'Hafiz',
      email: 'hafiz@nsty.dev',
      avatarUrl: null,
      provider: 'local',
    }
    expect(profile.provider).toBe('local')
  })

  it('UserProfile accepts google provider', () => {
    const profile: UserProfile = {
      id: 'google-123',
      name: 'Hafiz',
      email: 'hafiz@gmail.com',
      avatarUrl: 'https://lh3.googleusercontent.com/photo',
      provider: 'google',
    }
    expect(profile.provider).toBe('google')
    expect(profile.avatarUrl).toBeTruthy()
  })
})
