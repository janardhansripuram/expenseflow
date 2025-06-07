import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-spending.ts';
import '@/ai/flows/categorize-expense.ts';
import '@/ai/flows/extract-expense-from-receipt.ts';
