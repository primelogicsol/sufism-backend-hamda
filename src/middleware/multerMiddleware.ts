import { type RequestHandler } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import logger from "../utils/loggerUtils.js";

export const supportedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../public/uploads/productImages");

// Create directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`Upload directory created at: ${uploadDir}`);
} else {
  logger.info(`Upload directory exists: ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    logger.debug("Storing file in:", uploadDir);
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    try {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const fileName = `image-${uniqueSuffix}${ext}`;
      logger.debug(`Generated filename for upload: ${fileName}`);
      cb(null, fileName);
    } catch (err) {
      logger.error("Error generating filename:", err);
      cb(err as Error, "");
    }
  }
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!supportedImageTypes.includes(file.mimetype)) {
    const errorMsg = `Unsupported image type: ${file.mimetype}. Allowed types: ${supportedImageTypes.join(", ")}`;
    logger.warn(errorMsg);
    return cb(new Error(errorMsg));
  }
  logger.debug(`File accepted: ${file.originalname} (${file.mimetype})`);
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 5
  },
  fileFilter
});

// Middleware with error logging
const fileUploader: RequestHandler = async (req, res, next) => {
  await upload.array("images", 5)(req, res, (err: unknown) => {
    if (err) {
      logger.error("Multer upload error:", err);
      return res.status(400).json({ error: (err as Error).message });
    }
    logger.info(`Uploaded ${req.files ? (req.files as Express.Multer.File[]).length : 0} file(s) successfully.`);
    next();
  });
};

export default fileUploader;
