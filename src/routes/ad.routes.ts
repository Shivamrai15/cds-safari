import { Router } from "express";
import { getAds } from "../controllers/ad.controller.js";
import { cache } from "../middlewares/cache.middleware.js";

const ADS_CACHE_TTL_SECONDS = 48 * 60 * 60;

export const adRouter = Router();

adRouter.get("/", cache(ADS_CACHE_TTL_SECONDS), getAds);
