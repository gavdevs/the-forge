import { router, publicProcedure } from '../../../trpc';
import { z } from 'zod';

export const emailRouter = router({
  send: publicProcedure
    .input(z.object({ to: z.string().email(), subject: z.string(), body: z.string() }))
    .mutation(async ({ input }): Promise<{ id: string }> => {
      // TODO: implement with Resend
      return { id: '' };
    }),
});
