'use server';

/**
 * @fileOverview Implements the suggestPMUN flow, which suggests possible PMUN codes based on the issue description.
 *
 * @fileOverview This file defines the suggestPMUN flow, its input and output schemas, and the corresponding wrapper function.
 *  - suggestPMUN - A function that suggests possible PMUN codes based on the issue description.
 *  - SuggestPMUNInput - The input type for the suggestPMUN function.
 *  - SuggestPMUNOutput - The return type for the suggestPMUN function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPMUNInputSchema = z.object({
  issue: z.string().describe('The issue encountered.'),
  description: z.string().describe('A detailed description of the issue.'),
});
export type SuggestPMUNInput = z.infer<typeof SuggestPMUNInputSchema>;

const SuggestPMUNOutputSchema = z.object({
  suggestedPMUNs: z
    .array(z.string())
    .describe('An array of suggested PMUN codes based on the issue and description.'),
});
export type SuggestPMUNOutput = z.infer<typeof SuggestPMUNOutputSchema>;

export async function suggestPMUN(input: SuggestPMUNInput): Promise<SuggestPMUNOutput> {
  return suggestPMUNFlow(input);
}

const suggestPMUNPrompt = ai.definePrompt({
  name: 'suggestPMUNPrompt',
  input: {schema: SuggestPMUNInputSchema},
  output: {schema: SuggestPMUNOutputSchema},
  prompt: `Given the following issue and its description, suggest up to 3 possible PMUN codes.
Issue: {{{issue}}}
Description: {{{description}}}

Respond with only an array of PMUN codes.`, // Removed 'only' restriction.
});

const suggestPMUNFlow = ai.defineFlow(
  {
    name: 'suggestPMUNFlow',
    inputSchema: SuggestPMUNInputSchema,
    outputSchema: SuggestPMUNOutputSchema,
  },
  async input => {
    const {output} = await suggestPMUNPrompt(input);
    return output!;
  }
);
