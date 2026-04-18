import { z } from 'zod';

export const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
