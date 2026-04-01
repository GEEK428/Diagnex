const cron = require("node-cron");
const prisma = require("../config/prisma");
const logger = require("../config/logger");
const { trainConcepts } = require("../services/mlService");

function startMlDailySyncJob() {
  cron.schedule("0 2 * * *", async () => {
    logger.info("Daily ML sync started");

    try {
      const concepts = await prisma.concept.findMany({
        where: { isActive: true },
        select: { code: true, displayName: true, description: true, tags: true }
      });

      await trainConcepts(concepts, 60000);
      logger.info(`Daily ML sync done - ${concepts.length} concept(s) synced`);
    } catch (error) {
      logger.error(`Daily ML sync failed: ${error.message}`);
    }
  });
}

module.exports = { startMlDailySyncJob };
