
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
    .describe('The user spending data, including categories, descriptions, amounts with currency codes, and dates.'),
  period: z.string().describe('The time period for the spending summary.'),
});
export type SummarizeSpendingInput = z.infer<typeof SummarizeSpendingInputSchema>;

const SummarizeSpendingOutputSchema = z.object({
  summary: z.string().describe('A summary of the user spending habits. If multiple currencies are present, acknowledge this and be cautious about direct summations unless stating the limitation.'),
  keySpendingAreas: z.string().describe('Key areas where the user is spending the most money. If multiple currencies, specify amounts with their currencies or acknowledge aggregation limitations.'),
  potentialSavings: z
    .string()
    .describe('Suggestions for potential savings based on spending habits. Consider currency differences if applicable.'),
});
export type SummarizeSpendingOutput = z.infer<typeof SummarizeSpendingOutputSchema>;

export async function summarizeSpending(input: SummarizeSpendingInput): Promise<SummarizeSpendingOutput> {
  return summarizeSpendingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeSpendingPrompt',
  input: {schema: SummarizeSpendingInputSchema},
  output: {schema: SummarizeSpendingOutputSchema},
  prompt: `You are a personal finance advisor. Please analyze the following spending data for the period of {{{period}}}.

Spending Data:
{{{spendingData}}}

Provide:
1.  A summary of spending habits.
2.  Identify key spending areas.
3.  Offer potential savings suggestions.

IMPORTANT:
- The spending data includes amounts with currency codes (e.g., USD, EUR, INR).
- If you detect multiple currencies in the provided data:
    - Explicitly acknowledge this in your summary.
    - When discussing total spending or comparing amounts, be mindful of the different currencies. Avoid directly summing amounts from different currencies without stating that this is a limitation and not an accurate financial total.
    - If possible, list significant spending in its original currency or provide category totals per currency.
- Ensure your analysis is based only on the provided data for the specified period.`,
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

