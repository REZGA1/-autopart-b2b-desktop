import { z } from 'zod'

export const profileFormSchema = z.object({
  first_name: z.string().trim().min(2, 'At least 2 characters'),
  last_name: z.string().trim().min(2, 'At least 2 characters'),
  phone: z.string().trim().optional(),
  company_name: z.string().trim().optional(),
  address: z.string().trim().optional(),
  business_email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email address'),
  business_phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v === '' || v.length >= 6, 'At least 6 characters'),
  rc_number: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v === '' || v.length >= 3, 'At least 3 characters'),
  nif_number: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || v === '' || v.length >= 3, 'At least 3 characters'),
})
