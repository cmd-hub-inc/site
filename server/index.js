import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()
const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 4000
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Start Discord OAuth: redirect user to Discord's authorize URL
app.get('/api/auth/discord', (req, res) => {
  const redirectUri = encodeURIComponent(`${process.env.BASE_URL || `http://localhost:${PORT}`}/api/auth/discord/callback`)
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify`
  res.redirect(url)
})

// OAuth callback: exchange code for token, fetch user, upsert in DB, redirect to client
app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const { code } = req.query
    if (!code) return res.status(400).send('Missing code')

    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: `${process.env.BASE_URL || `http://localhost:${PORT}`}/api/auth/discord/callback`,
      }),
    })

    if (!tokenResp.ok) {
      const txt = await tokenResp.text()
      console.error('Token exchange failed', txt)
      return res.status(500).send('Token exchange failed')
    }

    const tokenData = await tokenResp.json()
    const accessToken = tokenData.access_token

    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!userResp.ok) {
      const txt = await userResp.text()
      console.error('Fetching user failed', txt)
      return res.status(500).send('Failed to fetch user')
    }

    const discordUser = await userResp.json()
    const discordId = discordUser.id
    const username = `${discordUser.username}#${discordUser.discriminator}`

    // Upsert user in DB using discord id as primary key
    const user = await prisma.user.upsert({
      where: { id: discordId },
      create: { id: discordId, username },
      update: { username },
    })

    // Redirect back to client with user info in query (simple flow for demo)
    const redirectTo = `${CLIENT_URL}/?userId=${encodeURIComponent(user.id)}&username=${encodeURIComponent(user.username)}`
    res.redirect(redirectTo)
  } catch (err) {
    console.error(err)
    res.status(500).send('OAuth error')
  }
})

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
