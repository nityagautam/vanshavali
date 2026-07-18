import { z } from 'zod';

export const personSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  gender: z.enum(['male', 'female']),
  born: z.string().nullable().optional(),
  died: z.string().nullable().optional(),
  alive: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  motherId: z.string().nullable().optional(),
  spouseIds: z.array(z.string()).optional(),
  // Real data has these as explicit null (not just omitted) for unset values —
  // nullable() is required, not just optional(), or merging existing records
  // into an edit payload fails validation.
  occupation: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  photo: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});
