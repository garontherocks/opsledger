import {z} from 'zod';
export const QualityFeedback=z.strictObject({token:z.string().min(10).max(2000),decision:z.enum(['accepted','edited','rejected']),reason:z.enum(['helpful','factual-error','citation-error','missing-context','other'])});
