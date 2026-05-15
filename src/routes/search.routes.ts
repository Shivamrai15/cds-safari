import { Router } from "express";
import { search, searchAlbums, searchArtists, searchSongs } from "../controllers/v3/search.controller.js";

export const searchRouter = Router();

searchRouter.get("/", search);
searchRouter.get("/albums", searchAlbums);
searchRouter.get("/songs", searchSongs);
searchRouter.get("/artists", searchArtists);