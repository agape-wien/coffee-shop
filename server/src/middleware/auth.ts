import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' })
    return
  }
  const token = header.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ error: 'Server misconfigured', code: 'CONFIG_ERROR' })
    return
  }
  try {
    jwt.verify(token, secret)
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' })
  }
}
