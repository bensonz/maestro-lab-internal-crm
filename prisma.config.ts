import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

const directUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
    ...(directUrl ? { directUrl } : {}),
  },
  migrations: {
    path: 'prisma/migrations',
  },
})
