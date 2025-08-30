import { type RequestHandler } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import logger from "../utils/loggerUtils.js";

export const supportedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const supportedDocTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // docx
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const supportedMusicTypes = [
  "audio/mpeg", // mp3
  "audio/mp3", // mp3
  "audio/wav", // wav (optional)
  "audio/ogg" // ogg (optional)
];

export const supportedVideoTypes = [
  "video/mp4", // mp4
  "video/webm", // webm (optional)
  "video/ogg" // ogv (optional)
];
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
  if (
    !supportedImageTypes.includes(file.mimetype) &&
    !supportedDocTypes.includes(file.mimetype) &&
    !supportedMusicTypes.includes(file.mimetype) &&
    !supportedVideoTypes.includes(file.mimetype)
  ) {
    const errorMsg = `Unsupported file type: ${file.mimetype}. Allowed types: ${[...supportedImageTypes, ...supportedDocTypes, ...supportedMusicTypes, ...supportedVideoTypes].join(", ")}`;
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
  const uploader = upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "overviewImages", maxCount: 5 },
    { name: "images", maxCount: 5 },
    { name: "document", maxCount: 1 },
    { name: "music", maxCount: 3 },
    { name: "video", maxCount: 2 }
  ]);

  await uploader(req, res, (err: unknown) => {
    if (err) {
      logger.error("Multer upload error:", err);
      return res.status(400).json({ error: (err as Error).message });
    }
    logger.info(`Uploaded files: ${JSON.stringify(req.files, null, 2)}`);
    next();
  });
};

export default fileUploader;
