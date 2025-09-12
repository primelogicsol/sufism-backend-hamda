/* eslint-disable camelcase */
import { v2 as cloudinary } from "cloudinary";
import { type RequestHandler } from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import logger from "../utils/loggerUtils.js";

// --- Cloudinary Config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// --- Supported MIME types ---
export const supportedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const supportedDocTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
export const supportedMusicTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];
export const supportedVideoTypes = ["video/mp4", "video/webm", "video/ogg"];

// --- Cloudinary Storage ---
const storage = new CloudinaryStorage({
  cloudinary,
  params: (_req, file) => {
    // choose folder based on mimetype
    let folder = "uploads/others";
    if (supportedImageTypes.includes(file.mimetype)) folder = "uploads/images";
    else if (supportedDocTypes.includes(file.mimetype)) folder = "uploads/docs";
    else if (supportedMusicTypes.includes(file.mimetype)) folder = "uploads/music";
    else if (supportedVideoTypes.includes(file.mimetype)) folder = "uploads/videos";

    return {
      folder,
      // keep original extension (jpg, png, etc.)
      format: undefined,
      // unique public_id
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`
    };
  }
});

// --- File Filter ---
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (
    !supportedImageTypes.includes(file.mimetype) &&
    !supportedDocTypes.includes(file.mimetype) &&
    !supportedMusicTypes.includes(file.mimetype) &&
    !supportedVideoTypes.includes(file.mimetype)
  ) {
    const errorMsg = `Unsupported file type: ${file.mimetype}`;
    logger.warn(errorMsg);
    return cb(new Error(errorMsg));
  }
  logger.debug(`File accepted: ${file.originalname} (${file.mimetype})`);
  cb(null, true);
};

// --- Multer Instance ---
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB per file, max 5 files per field
  fileFilter
});

// --- Middleware ---
const fileUploader: RequestHandler = async (req, res, next) => {
  const uploader = upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "overviewImages", maxCount: 5 },
    { name: "images", maxCount: 5 },
    { name: "document", maxCount: 1 },
    { name: "music", maxCount: 3 },
    { name: "video", maxCount: 2 }
  ]);

  await uploader(req, res, (err?) => {
    if (err) {
      logger.error("Multer upload error:", err);
      return res.status(400).json({ error: (err as Error).message });
    }
    logger.info(`Uploaded files: ${JSON.stringify(req.files, null, 2)}`);
    next();
  });
};

export default fileUploader;
