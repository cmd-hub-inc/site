import { PrismaClient } from '@prisma/client'
;(async () => {
  const p = new PrismaClient()
  try {
    const rows = await p.$queryRaw`SELECT * FROM "Favourite"`
    console.log('favourites:', rows)
  } catch (e) {
    console.error('err', e)
  } finally {
    await p.$disconnect()
  }
})()
