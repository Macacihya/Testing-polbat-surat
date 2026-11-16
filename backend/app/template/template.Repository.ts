import prisma from "../../lib/prisma";
import { TemplateSchema } from "./template.Schema";
import { DocxTemplateService } from "../../utils/docxtemplater";

class TemplateRepository {
  async Fetch({
    page = 1,
    page_size = 10,
    search = "",
    type,
    is_active,
  }: {
    page?: number;
    page_size?: number;
    search?: string;
    type?: string;
    is_active?: boolean;
  }) {
    const skip = (Number(page) - 1) * Number(page_size);
    const take = Number(page_size);

    const where: any = {
      is_deleted: false,
      ...(type ? { type } : {}),
      ...(typeof is_active === "boolean" ? { is_active } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total_items] = await Promise.all([
      prisma.tbm_template.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      prisma.tbm_template.count({ where }),
    ]);

    return {
      rows,
      pagination: {
        page: Number(page),
        page_size: Number(page_size),
        total_items,
        total_pages: Math.max(1, Math.ceil(total_items / take)),
      },
    };
  }

  async GetById(id: string) {
    const template = await prisma.tbm_template.findFirst({
      where: {
        OR: [{ id }, { code: id }],
        is_deleted: false,
      },
    });

    if (!template) {
      throw new Error("Template tidak ditemukan.");
    }

    return template;
  }

  async Create(data: TemplateSchema) {
    const existing = await prisma.tbm_template.findFirst({
      where: { code: data.code, is_deleted: false },
    });

    if (existing) {
      throw new Error(`Template dengan kode "${data.code}" sudah ada.`);
    }

    return await prisma.tbm_template.create({
      data: {
        code: data.code,
        title: data.title,
        type: data.type || "SURAT_KEPUTUSAN",
        description: data.description,
        filepath: data.filepath || "templates/submission-approved-template.docx",
        schema_fields: data.schema_fields || [],
        is_active: data.is_active ?? true,
      },
    });
  }

  async Update(id: string, data: Partial<TemplateSchema>) {
    await this.GetById(id);

    return await prisma.tbm_template.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.title && { title: data.title }),
        ...(data.type && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.filepath && { filepath: data.filepath }),
        ...(data.schema_fields !== undefined && { schema_fields: data.schema_fields }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
      },
    });
  }

  async Delete(id: string) {
    await this.GetById(id);

    return await prisma.tbm_template.update({
      where: { id },
      data: { is_deleted: true },
    });
  }

  scanVariablesFromFile(fileBuffer: Buffer) {
    return DocxTemplateService.scanTags(fileBuffer);
  }
}

export default new TemplateRepository();
