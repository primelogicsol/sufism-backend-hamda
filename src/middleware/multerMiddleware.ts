import { type RequestHandler } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
export const supportedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const uploadDir = path.resolve(__dirname, "../../public/uploads/productImages");

// Create directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Creates all parent folders too
}

const storage = multer.diskStorage({
  destination: (_a, _, cb) => {
    cb(null, uploadDir);
  },
  filename: (_, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname); // .jpg, .png, etc.
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (_: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!supportedImageTypes.includes(file.mimetype)) {
    return cb(new Error(`Unsupported image type: ${file.mimetype}. Allowed types: ${supportedImageTypes.join(", ")}`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, //10Mb
    files: 5
  },
  fileFilter
});
const fileUploader: RequestHandler = upload.array("images", 5);
export default fileUploader;
