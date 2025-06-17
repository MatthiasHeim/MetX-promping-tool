import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('bg-red-500', 'text-white')
    expect(result).toBe('bg-red-500 text-white')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const isHidden = false
    const result = cn(
      'base-class',
      isActive && 'conditional-class',
      isHidden && 'hidden-class'
    )
    expect(result).toBe('base-class conditional-class')
  })

  it('should handle tailwind merge conflicts', () => {
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toBe('bg-blue-500')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })
})
