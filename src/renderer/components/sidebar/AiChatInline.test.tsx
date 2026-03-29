import { describe, it, expect } from 'vitest'
import { AiChatInline } from './AiChatInline'

describe('AiChatInline', () => {
  it('should export AiChatInline component', () => {
    expect(typeof AiChatInline).toBe('function')
  })
})
