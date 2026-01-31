import { Router } from "express";
import { search, searchAlbums, searchArtists, searchSongs } from "../../controllers/v3/search.controller.js";

export const searchRouterV3 = Router();

searchRouterV3.get("/", search);
searchRouterV3.get("/albums", searchAlbums);
searchRouterV3.get("/songs", searchSongs);
searchRouterV3.get("/artists", searchArtists);