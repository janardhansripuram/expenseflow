'use server';
/**
 * @fileOverview An AI agent to extract expense details from a receipt image.
 *
 * - extractExpenseFromReceipt - A function that handles the receipt data extraction process.
 * - ExtractExpenseInput - The input type for the extractExpenseFromReceipt function.
 * - ExtractExpenseOutput - The return type for the extractExpenseFromReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractExpenseInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractExpenseInput = z.infer<typeof ExtractExpenseInputSchema>;

const ExtractExpenseOutputSchema = z.object({
  merchantName: z.string().optional().describe('The name of the merchant or store.'),
  date: z.string().optional().describe('The date of the expense in YYYY-MM-DD format. If year is missing, assume current year.'),
  description: z.string().optional().describe('A brief description of the primary item(s) or service(s) purchased. If multiple items, list the most significant or a general summary like "Groceries".'),
  amount: z.number().optional().describe('The total amount of the expense. Extract the final total paid.'),
  category: z.string().optional().describe('A suggested category for the expense (e.g., Food, Groceries, Transportation, Utilities, Office Supplies). If not obvious, leave blank.'),
});
export type ExtractExpenseOutput = z.infer<typeof ExtractExpenseOutputSchema>;

export async function extractExpenseFromReceipt(input: ExtractExpenseInput): Promise<ExtractExpenseOutput> {
  return extractExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractExpensePrompt',
  input: {schema: ExtractExpenseInputSchema},
  output: {schema: ExtractExpenseOutputSchema},
  prompt: `You are an expert receipt reader. Analyze the provided receipt image and extract the following details:
- Merchant Name: The name of the store or vendor.
- Date: The date the transaction occurred. Format as YYYY-MM-DD. If the year is not explicitly mentioned, assume the current year.
- Description: A concise description of what was purchased. If there are multiple items, summarize (e.g., "Groceries", "Dinner").
- Amount: The final total amount paid. This should be a number.
- Category: Suggest a common expense category (e.g., Food, Groceries, Transportation, Office Supplies, Clothing, Entertainment, Health, Utilities, Travel, Other). If uncertain, leave it blank.

Prioritize accuracy. If a piece of information is not clearly visible or inferable, omit it.

Receipt Image:
{{media url=photoDataUri}}`,
});

const extractExpenseFlow = ai.defineFlow(
  {
    name: 'extractExpenseFlow',
    inputSchema: ExtractExpenseInputSchema,
    outputSchema: ExtractExpenseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
