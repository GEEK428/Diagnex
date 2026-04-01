const cron = require("node-cron");
const prisma = require("../config/prisma");
const logger = require("../config/logger");
const env = require("../config/env");

function startConceptArchiveJob() {
  // Daily at 1:30 AM
  cron.schedule("30 1 * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - env.conceptArchiveDays * 24 * 60 * 60 * 1000);
      const result = await prisma.concept.updateMany({
        where: {
          lifecycleStatus: "INACTIVE",
          deactivatedAt: { lte: cutoff }
        },
        data: {
          lifecycleStatus: "ARCHIVED",
          archivedAt: new Date(),
          isActive: false
        }
      });

      if ((result?.count || 0) > 0) {
        logger.info(`Archived ${result.count} concept(s) after inactivity window`);
      }
    } catch (error) {
      logger.error(`Concept archival job failed: ${error.message}`);
    }
  });
}

module.exports = { startConceptArchiveJob };
