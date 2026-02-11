import winston from 'winston'

const shouldUseColors =
  process.env.NODE_ENV === 'development' &&
  process.stdout.isTTY &&
  !process.env.CI

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'crm' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        ...(shouldUseColors ? [winston.format.colorize()] : []),
        winston.format.simple(),
      ),
    }),
  ],
})

export default logger
