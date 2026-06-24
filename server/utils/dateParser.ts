// ============================================================
// PROJECT MEJAI — Thai Date Parser Utility
// Converts Thai relative date expressions to ISO 8601.
// ============================================================

/**
 * Thai day-of-week names mapped to JS day numbers (0=Sunday)
 */
const THAI_DAYS: Record<string, number> = {
  'อาทิตย์': 0,
  'จันทร์': 1,
  'อังคาร': 2,
  'พุธ': 3,
  'พฤหัสบดี': 4,
  'พฤหัส': 4,
  'ศุกร์': 5,
  'เสาร์': 6,
};

/**
 * Thai relative date keywords
 */
const RELATIVE_DATES: Record<string, number> = {
  'วันนี้': 0,
  'วันนี': 0,
  'พรุ่งนี้': 1,
  'พรุ่งนี': 1,
  'มะรืนนี้': 2,
  'มะรืน': 2,
  'เมื่อวาน': 0, // yesterday
  'เมื่อวานนี้': 0,
};

/**
 * Parse Thai time expressions.
 * Handles: "10 โมง", "2 ทุ่ม", "14:30", "บ่าย 3 โมง", "เที่ยงคืน"
 */
export function parseThaiTime(text: string): { hours: number; minutes: number } | null {
  // Pattern: HH:MM or H:MM
  const colonMatch = text.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    return { hours: parseInt(colonMatch[1]), minutes: parseInt(colonMatch[2]) };
  }

  // Pattern: X โมง (Thai "mong" = o'clock)
  const mongMatch = text.match(/(\d{1,2})\s*โมง/);
  if (mongMatch) {
    let hours = parseInt(mongMatch[1]);
    // Thai time context: บ่าย = afternoon
    if (text.includes('บ่าย') && hours < 12) hours += 12;
    if (text.includes('เช้า') && hours === 12) hours = 0;
    return { hours, minutes: 0 };
  }

  // Pattern: X ทุ่ม (Thai "tum" = PM hours)
  const tumMatch = text.match(/(\d{1,2})\s*ทุ่ม/);
  if (tumMatch) {
    const val = parseInt(tumMatch[1]);
    // 1 ทุ่ม = 19:00, 2 ทุ่ม = 20:00, etc.
    return { hours: 18 + val, minutes: 0 };
  }

  // Pattern: เที่ยง / เที่ยงคืน = midnight
  if (text.includes('เที่ยงคืน')) {
    return { hours: 0, minutes: 0 };
  }

  return null;
}

/**
 * Parse a Thai relative date expression into a Date object.
 * @param text - The Thai text containing date/time info
 * @param referenceDate - The reference "now" date (server time)
 */
export function parseThaiDate(
  text: string,
  referenceDate: Date = new Date()
): Date | null {
  const result = new Date(referenceDate);

  // Check relative dates first
  for (const [keyword, daysOffset] of Object.entries(RELATIVE_DATES)) {
    if (text.includes(keyword)) {
      // Special case: เมื่อวาน = yesterday
      if (keyword === 'เมื่อวาน' || keyword === 'เมื่อวานนี้') {
        result.setDate(result.getDate() - 1);
      } else {
        result.setDate(result.getDate() + daysOffset);
      }

      // Try to extract time
      const time = parseThaiTime(text);
      if (time) {
        result.setHours(time.hours, time.minutes, 0, 0);
      }
      return result;
    }
  }

  // Check day-of-week: "วันศุกร์", "วันจันทร์หน้า"
  for (const [dayName, dayNum] of Object.entries(THAI_DAYS)) {
    if (text.includes(dayName)) {
      const currentDay = result.getDay();
      let daysUntil = dayNum - currentDay;
      if (daysUntil <= 0) daysUntil += 7; // Always go forward
      // "หน้า" or "ถัดไป" = next week
      if (text.includes('หน้า') || text.includes('ถัดไป')) {
        if (daysUntil <= 0) daysUntil += 7;
      }
      result.setDate(result.getDate() + daysUntil);

      const time = parseThaiTime(text);
      if (time) {
        result.setHours(time.hours, time.minutes, 0, 0);
      }
      return result;
    }
  }

  // Check "อาทิตย์หน้า" = next week
  if (text.includes('อาทิตย์หน้า')) {
    result.setDate(result.getDate() + 7);
    const time = parseThaiTime(text);
    if (time) {
      result.setHours(time.hours, time.minutes, 0, 0);
    }
    return result;
  }

  // Fallback: try to parse time only (assume today)
  const time = parseThaiTime(text);
  if (time) {
    result.setHours(time.hours, time.minutes, 0, 0);
    return result;
  }

  return null;
}

/**
 * Format a Date to a Thai-friendly string.
 */
export function formatThaiDate(date: Date): string {
  // Fix timezone bug: convert to +07:00 manually to avoid server local time issues
  const bkkDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  
  const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];

  const dayName = thaiDays[bkkDate.getUTCDay()];
  const day = bkkDate.getUTCDate();
  const month = thaiMonths[bkkDate.getUTCMonth()];
  const hours = bkkDate.getUTCHours().toString().padStart(2, '0');
  const minutes = bkkDate.getUTCMinutes().toString().padStart(2, '0');

  return `วัน${dayName}ที่ ${day} ${month} เวลา ${hours}:${minutes} น.`;
}
