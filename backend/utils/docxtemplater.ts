import fs from "fs";
import path from "path";
import moment from "moment";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

class Service {
  async submissionApproved(data: {
    title: string;
    list_consider: { no: string; text: string }[];
    list_observe: { no: string; text: string }[];
    list_decide: { no: string; text: string }[];
    date: string;
  }) {
    try {
      const content_file = fs.readFileSync(
        path.resolve(
          "public",
          "templates",
          "submission-approved-template.docx"
        ),
        "binary"
      );

      const zip = new PizZip(content_file);

      const doc = new Docxtemplater(zip);

      doc.render({
        ...data,
      });

      // remove the symbol of title
      const formattedTitle = data.title.replace(/[^a-zA-Z0-9]/g, "");

      const fileName = `SK ${formattedTitle}.docx`;

      const buffer = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      fs.writeFileSync(path.resolve("public", fileName), buffer);

      return fileName;
    } catch (error) {
      console.log(error);
      throw new Error("Gagal membuat borang pengajuan surat");
    }
  }

  async renderTemplate({
    templatePath,
    title,
    values,
    pickup_plan,
  }: {
    templatePath: string;
    title: string;
    values?: any;
    pickup_plan?: any;
  }) {
    try {
      const fullPath = path.isAbsolute(templatePath)
        ? templatePath
        : path.resolve("public", templatePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Template file tidak ditemukan di: ${fullPath}`);
      }

      const content_file = fs.readFileSync(fullPath, "binary");
      const zip = new PizZip(content_file);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      const templateData = {
        title: (title || "").toUpperCase(),
        date: pickup_plan
          ? moment(pickup_plan).format("DD MMMM YYYY")
          : moment().format("DD MMMM YYYY"),
        ...(typeof values === "object" && values !== null ? values : {}),
      };

      doc.render(templateData);

      const formattedTitle = (title || "").replace(/[^a-zA-Z0-9]/g, "");
      const fileName = `SK ${formattedTitle || "DOKUMEN"}_${Date.now()}.docx`;

      const buffer = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      fs.writeFileSync(path.resolve("public", fileName), buffer);

      return fileName;
    } catch (error) {
      console.log(error);
      throw new Error("Gagal membuat dokumen dari template");
    }
  }

  scanTags(buffer: Buffer): string[] {
    try {
      const zip = new PizZip(buffer);
      const docXml = zip.file("word/document.xml")?.asText() || "";
      const matches = docXml.match(/\{[#/^]?([a-zA-Z0-9_]+)\}/g) || [];
      const cleanTags = Array.from(
        new Set(
          matches
            .map((m) => m.replace(/[\{\}#/^]/g, "").trim())
            .filter((t) => t && !["title", "date"].includes(t))
        )
      );
      return cleanTags;
    } catch (error) {
      console.log("Error scan tags:", error);
      return [];
    }
  }
}

export const DocxTemplateService = new Service();
