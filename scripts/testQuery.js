import { PrismaClient } from '@prisma/client'
;(async () => {
  const prisma = new PrismaClient()
  try {
    const rows = await prisma.$queryRaw`SELECT "commandId" FROM "Favourite" WHERE "userId" = '123456789'`
    console.log('rows:', rows)
  } catch (e) {
    console.error('error', e)
  } finally {
    await prisma.$disconnect()
  }
})()
