'use server';

/**
 * @fileOverview Summarizes user spending habits over a specific period using GenAI.
 *
 * - summarizeSpending - A function that handles the summarization of spending habits.
 * - SummarizeSpendingInput - The input type for the summarizeSpending function.
 * - SummarizeSpendingOutput - The return type for the summarizeSpending function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeSpendingInputSchema = z.object({
  spendingData: z
    .string()
    .describe('The user spending data, including categories and amounts.'),
  period: z.string().describe('The time period for the spending summary.'),
});
export type SummarizeSpendingInput = z.infer<typeof SummarizeSpendingInputSchema>;

const SummarizeSpendingOutputSchema = z.object({
  summary: z.string().describe('A summary of the user spending habits.'),
  keySpendingAreas: z.string().describe('Key areas where the user is spending the most money.'),
  potentialSavings: z
    .string()
    .describe('Suggestions for potential savings based on spending habits.'),
});
export type SummarizeSpendingOutput = z.infer<typeof SummarizeSpendingOutputSchema>;

export async function summarizeSpending(input: SummarizeSpendingInput): Promise<SummarizeSpendingOutput> {
  return summarizeSpendingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeSpendingPrompt',
  input: {schema: SummarizeSpendingInputSchema},
  output: {schema: SummarizeSpendingOutputSchema},
  prompt: `You are a personal finance advisor. Please analyze the following spending data for the period of {{{period}}} and provide a summary of spending habits, key spending areas, and potential savings suggestions.\n\nSpending Data: {{{spendingData}}}`,
});

const summarizeSpendingFlow = ai.defineFlow(
  {
    name: 'summarizeSpendingFlow',
    inputSchema: SummarizeSpendingInputSchema,
    outputSchema: SummarizeSpendingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
