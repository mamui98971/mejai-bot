// ============================================================
// PROJECT MEJAI — DeepSeek API Client
// Uses OpenAI-compatible SDK since DeepSeek follows the same API spec.
// ============================================================

import OpenAI from 'openai';
import { env } from '../config/env';
import { DeepSeekMessage, Intent, IntentResult } from '../types';

// DeepSeek uses OpenAI-compatible API
const client = new OpenAI({
  apiKey: env.DEEPSEEK_API_KEY,
  baseURL: env.DEEPSEEK_BASE_URL,
});

/**
 * Send a chat completion request to DeepSeek.
 * Used for roleplay, intent classification, and data extraction.
 */
export async function chat(
  messages: DeepSeekMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: 'json_object' | 'text' };
  }
): Promise<string> {
  const response = await client.chat.completions.create({
    model: env.DEEPSEEK_CHAT_MODEL,
    messages: messages as any,
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.max_tokens ?? 1024,
    ...(options?.response_format && { response_format: options.response_format }),
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Classify user intent via AI.
 * Only called when regex pre-filter doesn't match.
 */
export async function classifyIntent(
  userMessage: string,
  recentContext: string
): Promise<IntentResult> {
  const classificationPrompt: DeepSeekMessage[] = [
    {
      role: 'system',
      content: `You are an intent classifier for a Thai LINE chatbot. Classify the user's message into ONE of these intents:

- horoscope: User asks about fortune, luck, horoscope, ดวง, โชคชะตา
- schedule_create: User wants to create/set a reminder, meeting, appointment, นัด, ตาราง
- schedule_list: User wants to see their schedule/agenda
- expense_log: User mentions spending money, paying, buying (จ่าย, ซื้อ, บาท)
- expense_summary: User wants expense report/summary
- nutrition_log: User mentions eating food, drinking, meals (กิน, ทาน, อาหาร)
- nutrition_summary: User wants nutrition/diet summary
- status_check: User asks about relationship status or profile
- reset_persona: User wants to reset, delete memory, or change character
- roleplay: General conversation, emotional chat, flirting, casual talk

Respond in JSON format: {"intent": "<intent_name>", "confidence": <0.0-1.0>}
If unsure, default to "roleplay" with low confidence.`,
    },
    {
      role: 'user',
      content: `Recent context:\n${recentContext}\n\nCurrent message: ${userMessage}`,
    },
  ];

  try {
    const response = await chat(classificationPrompt, {
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response);
    return {
      intent: (parsed.intent as Intent) || Intent.ROLEPLAY,
      confidence: parsed.confidence ?? 0.5,
    };
  } catch {
    // If classification fails, default to roleplay
    return { intent: Intent.ROLEPLAY, confidence: 0.3 };
  }
}

/**
 * Process an image through DeepSeek Vision.
 * Used for receipt OCR and food recognition.
 */
export async function vision(
  imageUrl: string,
  prompt: string
): Promise<string> {
  const messages: DeepSeekMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ];

  const response = await client.chat.completions.create({
    model: env.DEEPSEEK_VISION_MODEL,
    messages: messages as any,
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content || '';
}
