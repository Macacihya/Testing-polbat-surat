import { Request, Response } from "express";
import { ErrorResponse, Ok } from "../../utils/api-response";
import templateRepository from "./template.Repository";
import { TemplateSchema } from "./template.Schema";

class TemplateController {
  async Get(req: Request, res: Response) {
    try {
      const { page, page_size, search, type, is_active } = req.query;
      const data = await templateRepository.Fetch({
        page: page ? Number(page) : undefined,
        page_size: page_size ? Number(page_size) : undefined,
        search: search ? String(search) : undefined,
        type: type ? String(type) : undefined,
        is_active:
          is_active !== undefined
            ? is_active === "true" || is_active === "1"
            : undefined,
      });

      return Ok({
        res,
        data: data.rows,
        pagination: data.pagination,
      });
    } catch (error) {
      return ErrorResponse({ res, error });
    }
  }

  async GetById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await templateRepository.GetById(id);
      return Ok({ res, data });
    } catch (error) {
      return ErrorResponse({ res, error });
    }
  }

  async Create(req: Request, res: Response) {
    try {
      let schema_fields = req.body.schema_fields;
      if (typeof schema_fields === "string") {
        try {
          schema_fields = JSON.parse(schema_fields);
        } catch {}
      }

      const file = req.file;
      const filepath = file ? file.filename : req.body.filepath;

      const payload = TemplateSchema.parse({
        ...req.body,
        schema_fields: schema_fields || [],
        filepath,
      });

      const data = await templateRepository.Create(payload);
      return Ok({ res, message: "Template berhasil ditambahkan.", data });
    } catch (error) {
      return ErrorResponse({ res, error });
    }
  }

  async Update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      let schema_fields = req.body.schema_fields;
      if (typeof schema_fields === "string") {
        try {
          schema_fields = JSON.parse(schema_fields);
        } catch {}
      }

      const file = req.file;
      const filepath = file ? file.filename : req.body.filepath;

      const data = await templateRepository.Update(id, {
        ...req.body,
        ...(schema_fields !== undefined && { schema_fields }),
        ...(filepath && { filepath }),
      });

      return Ok({ res, message: "Template berhasil diperbarui.", data });
    } catch (error) {
      return ErrorResponse({ res, error });
    }
  }

  async Delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await templateRepository.Delete(id);
      return Ok({ res, message: "Template berhasil dihapus." });
    } catch (error) {
      return ErrorResponse({ res, error });
    }
  }

  async ScanVariables(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        throw new Error("Berkas .docx wajib diunggah untuk pemindaian variabel.");
      }

      const tags = templateRepository.scanVariablesFromFile(file.buffer);
      return Ok({
        res,
        data: {
          tags,
          count: tags.length,
          suggested_schema: tags.map((tag) => ({
            key: tag,
            label: tag
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
            type:
              tag.includes("tanggal") || tag.includes("date")
                ? "date"
                : tag.includes("tahun") || tag.includes("jumlah") || tag.includes("nominal")
                ? "number"
                : "text",
            required: true,
          })),
        },
      });
    } catch (error) {
      return ErrorResponse({ res, error });
    }
  }
}

export default new TemplateController();
