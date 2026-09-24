import * as z from 'zod';

export const SongBatchSchema = z.object({
    ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(50),
});
