import { Router } from "express";
import { getAIShuffledSongs, getSongById, getTrending, getRelatedSongs, getSongsByIds } from "../controllers/song.controller.js";
import { cache } from "../middlewares/cache.middleware.js";

export const songRouter = Router();

songRouter.get("/trending", cache(600), getTrending);
songRouter.post("/ai-shuffled", getAIShuffledSongs);
songRouter.post("/batch", getSongsByIds);
songRouter.get("/:id/related", getRelatedSongs);
songRouter.get("/:id", getSongById);
