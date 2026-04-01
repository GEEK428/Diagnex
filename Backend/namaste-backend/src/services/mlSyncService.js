const logger = require("../config/logger");
const { trainConcepts } = require("./mlService");

function syncToMLInBackground(concepts) {
  if (!Array.isArray(concepts) || concepts.length === 0) return;

  trainConcepts(concepts, 30000)
    .then((result) => {
      logger.info(`ML synced with ${concepts.length} concept(s)`, { result });
    })
    .catch((error) => {
      logger.warn(`ML sync failed silently: ${error.message}`);
    });
}

module.exports = { syncToMLInBackground };
