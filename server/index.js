import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()
const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.get('/api/commands', async (req, res) => {
  const cmds = await prisma.command.findMany({ include: { author: true } })
  res.json(cmds)
})

app.get('/api/commands/:id', async (req, res) => {
  const { id } = req.params
  const cmd = await prisma.command.findUnique({ where: { id }, include: { author: true } })
  if (!cmd) return res.status(404).json({ error: 'Not found' })
  res.json(cmd)
})

app.post('/api/commands', async (req, res) => {
  try {
    const data = req.body
    // For simplicity, require authorId in request. In future add auth.
    const cmd = await prisma.command.create({ data })
    res.status(201).json(cmd)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
