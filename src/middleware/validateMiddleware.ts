import type { Request, Response, NextFunction } from "express";
import { type z, ZodError } from "zod";
import reshttp from "reshttp";

export function validateDataMiddleware(schema: z.AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Normalize common form-data quirks before validation
      // If a single tag was sent as a plain string, coerce to array
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, "tags")) {
        const tags = (req.body as Record<string, unknown>)["tags"];
        if (typeof tags === "string") {
          (req.body as Record<string, unknown>)["tags"] = [tags];
        }
      }
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue: issueParamType) => ({
          message: `${issue.message}`
        }));
        res.status(reshttp.badRequestCode).json({
          success: false,
          status: reshttp.badRequestCode,
          error: "Invalid data",
          details: errorMessages
        });
      } else {
        res.status(reshttp.internalServerErrorCode).json({
          success: false,
          status: reshttp.internalServerErrorCode,
          error: reshttp.internalServerErrorMessage
        });
      }
    }
  };
}

type issueParamType = {
  message: string;
};
