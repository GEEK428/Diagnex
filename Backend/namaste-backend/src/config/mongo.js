const mongoose = require("mongoose");
const env = require("./env");
const logger = require("./logger");

async function connectMongo() {
  await mongoose.connect(env.mongodbUri);
  logger.info("MongoDB connected");
}

module.exports = { connectMongo };
