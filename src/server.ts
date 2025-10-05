import "dotenv/config";
import { createServer } from "http";
import { connectDB } from "./configs/database.js";
import { app } from "./app.js";
import { NotificationService } from "./services/notification.service.js";
import logger from "./utils/loggerUtils.js";

const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
void NotificationService.initializeSocketIO(httpServer);

// Connect to database
await connectDB();

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Socket.IO server initialized`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  httpServer.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});
