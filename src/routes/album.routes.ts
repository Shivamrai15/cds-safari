import { Router } from "express";
import {
	getAlbumById,
	getNewReleases,
	getRecommendedAlbums,
	getSimilarAlbums,
} from "../controllers/album.controller.js";
import { cache } from "../middlewares/cache.middleware.js";

export const albumRouter = Router();

albumRouter.get("/similar", getSimilarAlbums);
albumRouter.get("/recommended", cache(600), getRecommendedAlbums);
albumRouter.get("/new", cache(600), getNewReleases);
albumRouter.get("/:id", getAlbumById);
