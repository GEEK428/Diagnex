const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");
const prisma = require("./config/prisma");
const { connectMongo } = require("./config/mongo");
const { startMlDailySyncJob } = require("./jobs/mlSync.job");
const { startConceptArchiveJob } = require("./jobs/conceptArchive.job");

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info("PostgreSQL connected via Prisma");

    await connectMongo();
    startMlDailySyncJob();
    startConceptArchiveJob();

    app.listen(env.port, () => {
      logger.info(`NAMASTE backend listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    logger.error("Server bootstrap failed", { message: error.message, stack: error.stack });
    process.exit(1);
  }
}

bootstrap();
