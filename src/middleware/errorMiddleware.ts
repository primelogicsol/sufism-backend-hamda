import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { NextFunction, Request, Response } from "express";

interface CustomError extends Error {
  status?: number;
  success?: boolean;
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error: CustomError = new Error(`Route not found: ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

// Fixed error handler with proper signature
export const errorHandler = (
  error: CustomError,
  _req: Request,
  res: Response,
  next: NextFunction // Add this parameter
) => {
  // Critical: Check if headers already sent
  if (res.headersSent) {
    console.error("HEADERS ALREADY SENT - Skipping error handler");
    return next(error); // Delegate to Express default handler
  }

  const status = error.status || 500;
  let message = "Internal server error";

  if (error instanceof PrismaClientKnownRequestError) {
    message = "Database operation failed";
    console.error("Prisma Error:", error.message);
  } else if (status !== 500) {
    message = error.message;
  }

  // Security: Prevent detailed errors in production
  const isProduction = process.env.NODE_ENV === "production";
  const response = {
    success: false,
    statusCode: status,
    message: message + "!",
    data: null,
    ...(!isProduction && {
      stack: error.stack,
      fullError: JSON.stringify(error)
    })
  };

  res.status(status).json(response);
};
