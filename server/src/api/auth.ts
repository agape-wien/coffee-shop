import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const router = Router()

const LoginSchema = z.object({
  password: z.string().min(1),
})

router.post('/login', (req, res) => {
  const result = LoginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: 'Invalid body', code: 'VALIDATION_ERROR' })
    return
  }
  if (result.data.password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Invalid password', code: 'INVALID_PASSWORD' })
    return
  }
  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ error: 'Server misconfigured', code: 'CONFIG_ERROR' })
    return
  }
  const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: '24h' })
  res.json({ data: { token } })
})

export default router
