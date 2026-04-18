import type { Request, Response } from "express";
import type { Album, Mood, Song } from "../../generated/prisma/index.js";
import { db } from "../lib/db.js";

const BATCH = 10;
const MOODS_BATCH = 25;

export async function getMoodById(req: Request, res: Response) {
    try {
        const moodId = req.params.id;
        if (!moodId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        const mood = await db.mood.findUnique({
            where: {
                id: moodId,
            },
            select: {
                id: true,
                color: true,
                image: true,
                name: true,
                _count: {
                    select: {
                        metadata: true,
                    },
                },
            },
        });

        if (!mood) {
            return res.status(404).json({
                status: false,
                message: "Mood not found",
                data: {},
            });
        }

        return res.status(200).json({
            status: true,
            message: "Mood fetched successfully",
            data: mood,
        });
    } catch (error) {
        console.error("GET MOOD BY ID API ERROR:", error);
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            data: {},
        });
    }
}

export async function getMoods(req: Request, res: Response) {
    try {
        const { cursor } = req.query;
        let moods: {
            id: string;
            image: string | null;
            color: string | null;
            name: string;
        }[] = [];

        if (cursor) {
            moods = await db.mood.findMany({
                take: MOODS_BATCH,
                skip: 1,
                cursor: {
                    id: cursor as string,
                },
                orderBy: {
                    name: "desc",
                },
                select: {
                    id: true,
                    image: true,
                    color: true,
                    name: true,
                },
            });
        } else {
            moods = await db.mood.findMany({
                take: MOODS_BATCH,
                orderBy: {
                    name: "desc",
                },
                select: {
                    id: true,
                    image: true,
                    color: true,
                    name: true,
                },
            });
        }

        let nextCursor = null;

        if (moods.length === MOODS_BATCH) {
            nextCursor = moods[MOODS_BATCH - 1]?.id;
        }

        return res.status(200).json({
            items: moods,
            nextCursor,
        });
    } catch (error) {
        console.error("GET MOODS API ERROR:", error);
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            data: {},
        });
    }
}

export async function getMoodSongs(req: Request, res: Response) {
    try {
        const moodId = req.params.id;
        if (!moodId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        let songs: (Song & {
            album: Album;
            artists: { id: string; name: string; image: string }[];
        })[] = [];

        const { cursor } = req.query;

        if (cursor) {
            songs = await db.song.findMany({
                where: {
                    metadata: {
                        moodIds: {
                            has: moodId,
                        },
                    },
                },
                include: {
                    artists: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                    album: true,
                },
                orderBy: {
                    view: {
                        _count: "desc",
                    },
                },
                cursor: {
                    id: cursor as string,
                },
                take: BATCH,
                skip: 1,
            });
        } else {
            songs = await db.song.findMany({
                where: {
                    metadata: {
                        moodIds: {
                            has: moodId,
                        },
                    },
                },
                include: {
                    artists: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                    album: true,
                },
                orderBy: {
                    view: {
                        _count: "desc",
                    },
                },
                take: BATCH,
            });
        }

        let nextCursor = null;

        if (songs.length === BATCH) {
            nextCursor = songs[BATCH - 1]?.id;
        }

        return res.json({
            items: songs,
            nextCursor,
        });
    } catch (error) {
        console.error("GET MOOD SONGS API ERROR:", error);
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            data: {},
        });
    }
}
