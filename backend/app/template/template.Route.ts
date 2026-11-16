import { Router } from "express";
import multer from "multer";
import { UploadDocument } from "../../utils/multer";
import templateController from "./template.Controller";

const memoryUpload = multer({ storage: multer.memoryStorage() });

const TemplateRoute = Router()
  .get("/", templateController.Get)
  .get("/:id", templateController.GetById)
  .post("/scan-variables", memoryUpload.single("file"), templateController.ScanVariables)
  .post("/", UploadDocument.single("file"), templateController.Create)
  .put("/:id", UploadDocument.single("file"), templateController.Update)
  .delete("/:id", templateController.Delete);

export default TemplateRoute;
