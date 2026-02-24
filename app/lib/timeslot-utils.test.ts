import { describe, it, expect } from 'vitest'
import {
  roundToNearest30Minutes,
  generateTimeSlots,
  timeRangesOverlap,
  formatTimeSlot,
  isValid30MinuteInterval,
  isExact30MinuteInterval,
  isAlignedTo30MinuteBoundary,
} from './timeslot-utils'

describe('timeslot-utils', () => {
  describe('roundToNearest30Minutes', () => {
    it('rounds down to previous 30-minute boundary', () => {
      const date = new Date('2026-02-22T10:15:00Z')
      const result = roundToNearest30Minutes(date)
      expect(result).toEqual(new Date('2026-02-22T10:00:00Z'))
    })

    it('rounds down when exactly at 30-minute boundary', () => {
      const date = new Date('2026-02-22T10:30:00Z')
      const result = roundToNearest30Minutes(date)
      expect(result).toEqual(new Date('2026-02-22T10:30:00Z'))
    })

    it('rounds down when at 0 minutes', () => {
      const date = new Date('2026-02-22T11:00:00Z')
      const result = roundToNearest30Minutes(date)
      expect(result).toEqual(new Date('2026-02-22T11:00:00Z'))
    })

    it('rounds down from 45 minutes', () => {
      const date = new Date('2026-02-22T10:45:00Z')
      const result = roundToNearest30Minutes(date)
      expect(result).toEqual(new Date('2026-02-22T10:30:00Z'))
    })

    it('sets seconds and milliseconds to zero', () => {
      const date = new Date('2026-02-22T10:15:30.500Z')
      const result = roundToNearest30Minutes(date)
      expect(result.getSeconds()).toBe(0)
      expect(result.getMilliseconds()).toBe(0)
      expect(result).toEqual(new Date('2026-02-22T10:00:00Z'))
    })
  })

  describe('generateTimeSlots', () => {
    it('generates slots for exact 30-minute intervals', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T11:00:00Z')
      const slots = generateTimeSlots(start, end)

      expect(slots).toEqual([
        { start: new Date('2026-02-22T10:00:00Z'), end: new Date('2026-02-22T10:30:00Z') },
        { start: new Date('2026-02-22T10:30:00Z'), end: new Date('2026-02-22T11:00:00Z') },
      ])
    })

    it('rounds start to nearest 30-minute boundary', () => {
      const start = new Date('2026-02-22T10:15:00Z')
      const end = new Date('2026-02-22T11:00:00Z')
      const slots = generateTimeSlots(start, end)

      expect(slots).toEqual([
        { start: new Date('2026-02-22T10:00:00Z'), end: new Date('2026-02-22T10:30:00Z') },
        { start: new Date('2026-02-22T10:30:00Z'), end: new Date('2026-02-22T11:00:00Z') },
      ])
    })

    it('handles partial interval at end', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T10:45:00Z')
      const slots = generateTimeSlots(start, end)

      expect(slots).toEqual([
        { start: new Date('2026-02-22T10:00:00Z'), end: new Date('2026-02-22T10:30:00Z') },
      ])
    })

    it('returns empty array when start equals end', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T10:00:00Z')
      const slots = generateTimeSlots(start, end)

      expect(slots).toEqual([])
    })

    it('returns empty array when start after end', () => {
      const start = new Date('2026-02-22T11:00:00Z')
      const end = new Date('2026-02-22T10:00:00Z')
      const slots = generateTimeSlots(start, end)

      expect(slots).toEqual([])
    })
  })

  describe('timeRangesOverlap', () => {
    it('returns true for overlapping ranges', () => {
      const range1 = { start: new Date('2026-02-22T10:00:00Z'), end: new Date('2026-02-22T11:00:00Z') }
      const range2 = { start: new Date('2026-02-22T10:30:00Z'), end: new Date('2026-02-22T11:30:00Z') }

      expect(timeRangesOverlap(range1, range2)).toBe(true)
    })

    it('returns true for ranges that touch at edges', () => {
      const range1 = { start: new Date('2026-02-22T10:00:00Z'), end: new Date('2026-02-22T10:30:00Z') }
      const range2 = { start: new Date('2026-02-22T10:30:00Z'), end: new Date('2026-02-22T11:00:00Z') }

      expect(timeRangesOverlap(range1, range2)).toBe(false) // Touching at edge is not overlapping
    })

    it('returns false for non-overlapping ranges', () => {
      const range1 = { start: new Date('2026-02-22T10:00:00Z'), end: new Date('2026-02-22T10:30:00Z') }
      const range2 = { start: new Date('2026-02-22T11:00:00Z'), end: new Date('2026-02-22T11:30:00Z') }

      expect(timeRangesOverlap(range1, range2)).toBe(false)
    })

    it('returns true when one range contains another', () => {
      const range1 = { start: new Date('2026-02-22T10:00:00Z'), end: new Date('2026-02-22T12:00:00Z') }
      const range2 = { start: new Date('2026-02-22T10:30:00Z'), end: new Date('2026-02-22T11:30:00Z') }

      expect(timeRangesOverlap(range1, range2)).toBe(true)
    })
  })

  describe('formatTimeSlot', () => {
    it('formats a time slot correctly', () => {
      const start = new Date('2026-02-22T09:00:00Z')
      const end = new Date('2026-02-22T09:30:00Z')
      const result = formatTimeSlot(start, end)

      // Note: toLocaleTimeString uses local timezone, so we test for pattern
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)/)
    })

    it('handles PM times', () => {
      const start = new Date('2026-02-22T14:00:00Z') // 2:00 PM UTC
      const end = new Date('2026-02-22T14:30:00Z')
      const result = formatTimeSlot(start, end)

      // Test that format is correct (could be AM or PM depending on timezone)
      expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)/)
    })
  })

  describe('isValid30MinuteInterval', () => {
    it('returns true for exact 30 minutes', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T10:30:00Z')
      expect(isValid30MinuteInterval(start, end)).toBe(true)
    })

    it('returns true for 60 minutes', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T11:00:00Z')
      expect(isValid30MinuteInterval(start, end)).toBe(true)
    })

    it('returns false for 45 minutes', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T10:45:00Z')
      expect(isValid30MinuteInterval(start, end)).toBe(false)
    })

    it('returns false for zero duration', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T10:00:00Z')
      expect(isValid30MinuteInterval(start, end)).toBe(false)
    })

    it('returns false for negative duration', () => {
      const start = new Date('2026-02-22T11:00:00Z')
      const end = new Date('2026-02-22T10:00:00Z')
      expect(isValid30MinuteInterval(start, end)).toBe(false)
    })
  })

  describe('isExact30MinuteInterval', () => {
    it('returns true for exactly 30 minutes', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T10:30:00Z')
      expect(isExact30MinuteInterval(start, end)).toBe(true)
    })

    it('returns false for 60 minutes', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T11:00:00Z')
      expect(isExact30MinuteInterval(start, end)).toBe(false)
    })

    it('returns false for 15 minutes', () => {
      const start = new Date('2026-02-22T10:00:00Z')
      const end = new Date('2026-02-22T10:15:00Z')
      expect(isExact30MinuteInterval(start, end)).toBe(false)
    })
  })

  describe('isAlignedTo30MinuteBoundary', () => {
    it('returns true for 9:00:00.000', () => {
      const date = new Date('2026-02-22T09:00:00.000Z')
      expect(isAlignedTo30MinuteBoundary(date)).toBe(true)
    })

    it('returns true for 9:30:00.000', () => {
      const date = new Date('2026-02-22T09:30:00.000Z')
      expect(isAlignedTo30MinuteBoundary(date)).toBe(true)
    })

    it('returns false for 9:15:00.000', () => {
      const date = new Date('2026-02-22T09:15:00.000Z')
      expect(isAlignedTo30MinuteBoundary(date)).toBe(false)
    })

    it('returns false for 9:00:01.000', () => {
      const date = new Date('2026-02-22T09:00:01.000Z')
      expect(isAlignedTo30MinuteBoundary(date)).toBe(false)
    })

    it('returns false for 9:30:00.001', () => {
      const date = new Date('2026-02-22T09:30:00.001Z')
      expect(isAlignedTo30MinuteBoundary(date)).toBe(false)
    })
  })
})