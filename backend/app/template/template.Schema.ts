import { z } from "zod";

export const TemplateSchema = z.object({
  code: z.string().min(1, "Kode template wajib diisi"),
  title: z.string().min(1, "Judul template wajib diisi"),
  type: z.string().default("SURAT_KEPUTUSAN"),
  description: z.string().optional().nullable(),
  filepath: z.string().optional(),
  schema_fields: z.any().default([]),
  is_active: z.coerce.boolean().default(true),
});

export type TemplateSchema = z.infer<typeof TemplateSchema>;
