// ============================================================
// PROJECT MEJAI — Vision Handler (Pillar 5)
// Processes images (receipts, food) using DeepSeek Vision.
// ============================================================

import { chat } from '../services/deepseek';
import { buildSystemPrompt } from '../services/promptBuilder';
import { MejaiContext, HandlerResult } from '../types';
import { handleExpenseLog } from './expense';
import { handleNutritionLog } from './nutrition';
import { getMessageContent } from '../services/line';

export async function handleVision(
  messageId: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  try {
    // 1. Fetch image from LINE
    const imageBuffer = await getMessageContent(messageId);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    // 2. Classify image intent (is it a receipt or food?)
    const classifyPrompt = [
      {
        role: 'system' as const,
        content: `Analyze this image and determine if it's a receipt (expense) or food (nutrition).
Respond ONLY in JSON format:
{
  "type": "<receipt|food|unknown>",
  "confidence": <number 0-1>
}`,
      },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'What is this image?' },
          { type: 'image_url' as const, image_url: { url: base64Image } },
        ],
      },
    ];

    const rawClassify = await chat(classifyPrompt, {
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const classification = JSON.parse(rawClassify);

    if (classification.type === 'receipt') {
      // 3a. Extract receipt details
      const extractPrompt = [
        {
          role: 'system' as const,
          content: `Extract expense details from this receipt.
Respond ONLY in JSON format:
{
  "amount": <total amount number>,
  "merchant": "<merchant name>",
  "category": "<food|transport|shopping|entertainment|health|bills|education|uncategorized>"
}`,
        },
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'Extract receipt details.' },
            { type: 'image_url' as const, image_url: { url: base64Image } },
          ],
        },
      ];

      const rawExtract = await chat(extractPrompt, {
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });
      
      const extracted = JSON.parse(rawExtract);
      const expenseMessage = `บันทึกรายจ่าย ${extracted.amount} บาท ร้าน ${extracted.merchant || 'ไม่ระบุ'} หมวด ${extracted.category}`;
      
      // Pass the generated text to the existing expense handler
      return await handleExpenseLog(expenseMessage, ctx);

    } else if (classification.type === 'food') {
      // 3b. Extract food details
      const extractPrompt = [
        {
          role: 'system' as const,
          content: `Identify the food in this image and describe it briefly in Thai for nutrition tracking.`,
        },
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: 'What food is this?' },
            { type: 'image_url' as const, image_url: { url: base64Image } },
          ],
        },
      ];

      const description = await chat(extractPrompt, { temperature: 0.3, max_tokens: 100 });
      const nutritionMessage = `ฉันกิน ${description}`;
      
      // Pass to existing nutrition handler
      return await handleNutritionLog(nutritionMessage, ctx);
      
    } else {
      // 3c. Unknown image type
      const replyPrompt = [
        {
          role: 'system' as const,
          content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ผู้ใช้ส่งรูปมาให้แต่เค้าดูไม่ออกว่าเป็นใบเสร็จหรือของกิน ถามผู้ใช้อย่างน่ารักว่ามันคืออะไร`,
        },
        { role: 'user' as const, content: 'นี่รูปอะไร' },
      ];
      const reply = await chat(replyPrompt, { temperature: 0.8, max_tokens: 256 });
      return { reply_text: reply };
    }
  } catch (error) {
    console.error('❌ Vision processing failed:', error);
    return { reply_text: 'งื้ออออ เค้าดูรูปนี้ไม่ชัดเลยอะค่ะ ลองส่งมาใหม่ได้ไหมคะ? 🥺' };
  }
}
