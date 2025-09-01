
'use server';
/**
 * @fileOverview An AI flow for generating data reports from natural language.
 *
 * - generateReport - A function that takes a natural language query and returns a structured report.
 * - GenerateReportOutput - The return type for the generateReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getProductsData, getSalesData } from '../tools/reporting-tools';
import dbConnect from '@/lib/dbConnect';
import AiSetting from '@/models/AiSetting';
import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateReportOutputSchema = z.object({
  title: z.string().describe('A descriptive title for the generated report.'),
  summary: z.string().describe('A concise, one or two-paragraph natural language summary of the key findings in the report.'),
  headers: z.array(z.string()).describe('An array of strings representing the column headers for the report data.'),
  rows: z.array(z.array(z.union([z.string(), z.number()]))).describe('An array of arrays, where each inner array represents a row of data corresponding to the headers. Values can be strings or numbers.'),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

async function getAiClient() {
  await dbConnect();
  const settings = await AiSetting.findOne({}).select('+geminiApiKey');
  const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  return genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-2.0-flash',
  });
}

export async function generateReport(query: string): Promise<GenerateReportOutput> {
  return generateReportFlow(query);
}

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: z.string(),
    outputSchema: GenerateReportOutputSchema,
  },
  async (query) => {
    const dynamicAi = await getAiClient();
    const llmResponse = await dynamicAi.generate({
      prompt: query,
      model: 'googleai/gemini-2.0-flash',
      tools: [getSalesData, getProductsData],
      system: `You are an expert data analyst for a Point of Sale system. Your task is to respond to user queries by generating a data report.
        
        1.  **Analyze the Query**: Understand the user's request to determine what data is needed. Note that today's date is ${new Date().toDateString()}. If the user asks for data from "this month" or "last month", calculate the appropriate date range.
        2.  **Fetch Data**: Use the available tools (getSalesData, getProductsData) to retrieve the necessary information. You may need to call tools multiple times.
        3.  **Synthesize Report**: Process the fetched data and generate a comprehensive report.
        
        **Output Format**:
        Your final response MUST be a single JSON object that strictly adheres to the provided output schema. Do not add any explanatory text, markdown, or any other content outside of this JSON object.
        
        The JSON object must contain the following fields:
        -   \`title\`: A clear, descriptive title for the report.
        -   \`summary\`: A concise, one or two-paragraph natural language summary of the key findings.
        -   \`headers\`: An array of strings for the data table's column headers.
        -   \`rows\`: An array of arrays, where each inner array is a row of data (strings or numbers) corresponding to the headers.
        `,
      output: {
        schema: GenerateReportOutputSchema,
      },
    });

    return llmResponse.output!;
  }
);
