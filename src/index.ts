import express from "express";
import {
  albumRouter,
  artistRouter,
  genreRouter,
  moodRouter,
  searchRouter,
  songRouter,
} from "./routes/index.js";
import { connectRedis, disconnectRedis, redis } from "./lib/redis.js";
import { cache } from "./middlewares/cache.middleware.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { connectDB, disconnectDB } from "./lib/db.js";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no caching)
app.get("/api/v2/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "Catalog & Discovery Service",
    version: "1.0.0"
  });
});

app.use(authMiddleware);
app.use(cache);

app.use("/api/v2/album", albumRouter);
app.use("/api/v2/song", songRouter);
app.use("/api/v2/artist", artistRouter);
app.use("/api/v2/search", searchRouter);
app.use("/api/v2/genre", genreRouter);
app.use("/api/v2/mood", moodRouter);

async function startServer() {
    await connectDB();
    await connectRedis();
    
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

    const shutdown = async (signal: string) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server.close(async () => {
            await disconnectDB();
            await disconnectRedis();
            console.log("Server closed");
            process.exit(0);
        });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

export default app;
