import { Router } from "express";
import {
    getMoodById,
    getMoods,
    getMoodSongs,
} from "../controllers/mood.controller.js";

export const moodRouter = Router();

moodRouter.get("/", getMoods);
moodRouter.get("/:id/songs", getMoodSongs);
moodRouter.get("/:id", getMoodById);
