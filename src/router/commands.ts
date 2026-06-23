// ============================================================
// PROJECT MEJAI — Command Pattern Registry
// Internal regex shortcuts that bypass AI for cost savings.
// Users DON'T need to know these exist — natural language works.
// These are just fast lanes for common exact-match queries.
// ============================================================

import { Intent } from '../types';

interface CommandPattern {
  pattern: RegExp;
  intent: Intent;
  description: string;
}

/**
 * Ordered list of regex patterns to check before hitting DeepSeek.
 * If any pattern matches, we skip AI intent classification entirely.
 */
export const COMMAND_PATTERNS: CommandPattern[] = [
  // --- Expense ---
  {
    pattern: /^\/?สรุปรายจ่าย$/i,
    intent: Intent.EXPENSE_SUMMARY,
    description: 'Expense summary shortcut',
  },
  {
    pattern: /^\/?รายจ่ายเดือนนี้$/i,
    intent: Intent.EXPENSE_SUMMARY,
    description: 'This month expenses shortcut',
  },

  // --- Schedule ---
  {
    pattern: /^[#\/]?ตารางงาน$/i,
    intent: Intent.SCHEDULE_LIST,
    description: 'Schedule list shortcut',
  },
  {
    pattern: /^[#\/]?นัดวันนี้$/i,
    intent: Intent.SCHEDULE_LIST,
    description: 'Today schedule shortcut',
  },

  // --- Horoscope ---
  {
    pattern: /^\/?ดูดวง$/i,
    intent: Intent.HOROSCOPE,
    description: 'Horoscope shortcut',
  },

  // --- Status ---
  {
    pattern: /^\/?สถานะ$/i,
    intent: Intent.STATUS_CHECK,
    description: 'Relationship status shortcut',
  },

  // --- Nutrition ---
  {
    pattern: /^\/?สรุปอาหาร$/i,
    intent: Intent.NUTRITION_SUMMARY,
    description: 'Nutrition summary shortcut',
  },
  {
    pattern: /^\/?สรุปแคลอรี่$/i,
    intent: Intent.NUTRITION_SUMMARY,
    description: 'Calorie summary shortcut',
  },

  // --- Reset Persona ---
  {
    pattern: /^\/?(รีเซ็?ตระบบ|รีเซ็?ต|ลบตัวละคร|เปลี่ยนตัวละคร|ล้างข้อมูล|reset)$/i,
    intent: Intent.RESET_PERSONA,
    description: 'Reset persona request shortcut',
  },
  {
    pattern: /^ยืนยันการลบตัวละคร$/i,
    intent: Intent.RESET_PERSONA_CONFIRM,
    description: 'Confirm reset persona',
  },
];

/**
 * Try to match a user message against registered command patterns.
 * Returns the matched intent or null if no pattern matches.
 */
export function matchCommand(message: string): Intent | null {
  const trimmed = message.trim();
  for (const cmd of COMMAND_PATTERNS) {
    if (cmd.pattern.test(trimmed)) {
      return cmd.intent;
    }
  }
  return null;
}
