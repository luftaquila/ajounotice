import winston from 'winston'

const logger = new winston.createLogger({
    transports: [
      new winston.transports.File({
        level: 'info',
        filename: '.log',
        maxsize: 10485760, //10MB
        showLevel: true,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json()
        )
      })
    ],
    exitOnError: false,
  });

export default logger