import { verify } from "jsonwebtoken";
import { JWT_SECRET } from "../configs/config.js";

export function verifyToken<T>(token: string, secret: string = JWT_SECRET): [Error | null, T | null] {
  try {
    const decoded = verify(token, secret) as T;
    return [null, decoded];
  } catch (error: unknown) {
    if (error instanceof Error) return [new Error(error.message || `Invalid Token::${error}`), null];
    else return [Error(`Internal server error while verifying token :: ${error as string}`), null];
  }
}
