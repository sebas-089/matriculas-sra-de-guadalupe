import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AdminClaims = {
  id: number;
  correo: string;
  rol: string;
};

export type AuthenticatedRequest = Request & { admin?: AdminClaims };

const jwtSecret = () => process.env.JWT_SECRET ?? process.env.SESSION_SECRET;

export function signAdminToken(claims: AdminClaims): string {
  const secret = jwtSecret();
  if (!secret) {
    throw new Error("JWT_SECRET or SESSION_SECRET must be configured");
  }
  return jwt.sign(claims, secret, { expiresIn: "8h" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const secret = jwtSecret();

  if (!token || !secret) {
    res.status(401).json({ error: "Sesión administrativa requerida" });
    return;
  }

  try {
    const claims = jwt.verify(token, secret) as AdminClaims;
    (req as AuthenticatedRequest).admin = claims;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}