import { Router } from "express";
import {
    getGenreById,
    getGenres,
    getGenreSongs,
} from "../controllers/genre.controller.js";

export const genreRouter = Router();

genreRouter.get("/", getGenres);
genreRouter.get("/:id/songs", getGenreSongs);
genreRouter.get("/:id", getGenreById);
