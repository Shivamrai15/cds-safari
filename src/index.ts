import express from "express";
import {
  albumRouter,
  artistRouter,
  genreRouter,
  moodRouter,
  searchRouter,
  songRouter,
} from "./routes/index.js";
import { redis } from "./lib/redis.js";
import { cache } from "./middlewares/cache.middleware.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";

const PORT = process.env.PORT || 3000;

await redis.connect();

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

app.listen(PORT, () => {
  console.log(`Backend Public Server is running on port ${PORT}`);
});
