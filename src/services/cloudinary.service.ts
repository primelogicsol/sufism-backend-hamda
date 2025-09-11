/* eslint-disable camelcase */
import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs";
import reshttp from "reshttp";
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_NAME } from "../configs/config.js";
import logger from "../utils/loggerUtils.js";
cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath: string, fileName: string, format: string) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "raw",
      filename_override: fileName,
      folder: "sufism",
      format: format
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error: unknown) {
    fs.unlinkSync(localFilePath);
    if (error instanceof Error) throw { status: 500, message: error.message };
    else {
      logger.info(`Error while uploading files`, error);
      throw (reshttp.internalServerErrorCode, `Error while uploading files:: ${error as string}`);
    }
  }
};
const deleteFromCloudinary = async (publicId: string) => {
  try {
    if (!publicId) {
      logger.warn("File not found on file storage");
      throw (reshttp.notFoundCode, reshttp.notFoundMessage);
    }
    return (await cloudinary.uploader.destroy(publicId, { resource_type: "raw" })) as { result: string };
  } catch (error: unknown) {
    if (error instanceof Error) throw { status: 500, message: error.message };
    else throw (reshttp.internalServerErrorCode, `Error while uploading files:: ${error as string}`);
  }
};
export { deleteFromCloudinary, uploadOnCloudinary };
