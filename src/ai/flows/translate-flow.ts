
'use server';
/**
 * @fileOverview An AI flow for translating text.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranslateTextSchema = z.object({
  text: z.string(),
  targetLang: z.string(),
  sourceLang: z.string().optional(),
});

export async function translateText(text: string, targetLang: string, sourceLang?: string): Promise<string> {
  const llmResponse = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: `Translate the following text from ${sourceLang || 'English'} to ${targetLang}: "${text}"
    
    IMPORTANT: Provide only the translated text as a raw string, with no extra formatting, explanations, or quotation marks.`,
  });

  return llmResponse.text.trim();
}
