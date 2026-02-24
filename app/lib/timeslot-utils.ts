/**
 * Utility functions for working with 30-minute time slots
 */

/**
 * Rounds a date to the nearest 30-minute interval (floor)
 * @param date The date to round
 * @returns Date rounded down to the nearest 30-minute mark
 */
export function roundToNearest30Minutes(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 30;
  rounded.setMinutes(minutes - remainder);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return rounded;
}

/**
 * Generates a sequence of 30-minute time slots between start and end dates
 * @param start Start date (inclusive)
 * @param end End date (exclusive)
 * @returns Array of { start: Date, end: Date } objects for each 30-minute interval
 */
export function generateTimeSlots(start: Date, end: Date): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];
  const current = new Date(start);
  current.setSeconds(0);
  current.setMilliseconds(0);

  // Round to nearest 30-minute interval (floor)
  const minutes = current.getMinutes();
  const remainder = minutes % 30;
  current.setMinutes(minutes - remainder);

  while (current < end) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    if (slotEnd > end) break;

    slots.push({ start: slotStart, end: slotEnd });
    current.setMinutes(current.getMinutes() + 30);
  }

  return slots;
}

/**
 * Checks if two time ranges overlap
 * @param range1 { start: Date, end: Date }
 * @param range2 { start: Date, end: Date }
 * @returns true if ranges overlap
 */
export function timeRangesOverlap(
  range1: { start: Date; end: Date },
  range2: { start: Date; end: Date }
): boolean {
  return range1.start < range2.end && range2.start < range1.end;
}

/**
 * Formats a time slot for display (e.g., "9:00 AM - 9:30 AM")
 */
export function formatTimeSlot(start: Date, end: Date): string {
  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${startTime} - ${endTime}`;
}

/**
 * Validates that a time range is a multiple of 30 minutes
 */
export function isValid30MinuteInterval(start: Date, end: Date): boolean {
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  return durationMinutes > 0 && durationMinutes % 30 === 0;
}

/**
 * Validates that a time range is exactly 30 minutes
 */
export function isExact30MinuteInterval(start: Date, end: Date): boolean {
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  return durationMinutes === 30;
}

/**
 * Validates that a date is aligned to 30-minute boundaries (e.g., 9:00, 9:30)
 */
export function isAlignedTo30MinuteBoundary(date: Date): boolean {
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  return minutes % 30 === 0 && seconds === 0 && milliseconds === 0;
}