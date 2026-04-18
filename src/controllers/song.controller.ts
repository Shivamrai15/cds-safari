import type { Request, Response } from "express";
import type { Album, Song } from "../../generated/prisma/index.js";
import { db } from "../lib/db.js";
import { qdrant } from "../lib/qdrant.js";
import { AIShuffleSchema } from "../schemas/ai-shuffle.schema.js";

const BATCH = 10;

export async function getTrending(req: Request, res: Response) {
    try {
        const { cursor } = req.query;

        let songs: (Song & { album: Album })[] = [];

        if (cursor) {
            songs = await db.song.findMany({
                where: {
                    view: {
                        some: {},
                    },
                },
                include: {
                    album: true,
                },
                orderBy: [
                    {
                        view: {
                            _count: "desc",
                        },
                    },
                    {
                        name: "asc",
                    },
                ],
                skip: 1,
                cursor: {
                    id: cursor as string,
                },
                take: BATCH,
            });
        } else {
            songs = await db.song.findMany({
                where: {
                    view: {
                        some: {},
                    },
                },
                include: {
                    album: true,
                },
                orderBy: [
                    {
                        view: {
                            _count: "desc",
                        },
                    },
                    {
                        name: "asc",
                    },
                ],
                take: BATCH,
            });
        }

        let nextCursor = null;

        if (songs.length === BATCH) {
            nextCursor = songs[BATCH - 1]?.id;
        }

        return res.status(200).json({
            items: songs,
            nextCursor,
        });
    } catch (error) {
        console.error("GET TRENDING ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getSongById(req: Request, res: Response) {
    try {
        const songId = req.params.id;
        if (!songId) {
            return res
                .status(400)
                .json({ status: false, message: "Bad Request", data: {} });
        }

        const song = await db.song.findUnique({
            where: {
                id: songId,
            },
            include: {
                album: true,
                artists: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                _count: {
                    select: {
                        view: true,
                    },
                },
            },
        });

        if (!song) {
            return res
                .status(404)
                .json({ status: false, message: "Song Not Found", data: {} });
        }

        return res
            .status(200)
            .json({ status: true, message: "Success", data: song });
    } catch (error) {
        console.error("GET SONG BY ID ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getRelatedSongs(req: Request, res: Response) {
    try {
        const songId = req.params.id;
        if (!songId) {
            return res
                .status(400)
                .json({ status: false, message: "Bad Request", data: {} });
        }

        const songEmbedding = await db.embedding.findUnique({
            where: {
                songId: songId,
            },
        });

        if (!songEmbedding) {
            return res
                .status(404)
                .json({ status: false, message: "Embedding Not Found", data: {} });
        }

        const similarSongs = await qdrant.search("songMetaData", {
            vector: songEmbedding.vector,
            filter: {
                must_not: [
                    {
                        key: "songId",
                        match: { value: songEmbedding.songId },
                    },
                ],
            },
            limit: 10,
        });

        const songIds = similarSongs.map(
            (song) => song?.payload?.songId
        ) as string[];
        const songs = await db.song.findMany({
            where: {
                id: {
                    in: songIds,
                },
            },
            include: {
                album: true,
                artists: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        songs.sort((a, b) => songIds.indexOf(a.id) - songIds.indexOf(b.id));
        return res
            .status(200)
            .json({ status: true, message: "Success", data: songs });
    } catch (error) {
        console.error("GET RELATED SONGS ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getAIShuffledSongs(req: Request, res: Response) {
    try {
        const validatedData = await AIShuffleSchema.safeParseAsync(req.body);

        if (!validatedData.success) {
            return res
                .status(400)
                .json({ status: false, message: "Bad Request", data: {} });
        }

        const { not, limit, recommendationId } = validatedData.data;
        const embeddings = await db.embedding.findUnique({
            where: {
                songId: recommendationId,
            },
        });

        if (!embeddings) {
            return res
                .status(404)
                .json({
                    status: false,
                    message: "No embeddings found for this recommendation",
                    data: {},
                });
        }

        const recommendations = await qdrant.search("songMetaData", {
            vector: embeddings.vector,
            filter: {
                must: [
                    {
                        key: "songId",
                        match: {
                            except: not,
                        },
                    },
                ],
            },
            limit: limit,
            with_payload: true,
        });

        const songIds: string[] = recommendations
            .map((item) => item.payload?.songId)
            .filter((id): id is string => !!id);
        if (songIds.length === 0) {
            return res
                .status(404)
                .json({ status: false, message: "No recommendations found", data: [] });
        }

        const songs = await db.song.findMany({
            where: {
                id: {
                    in: songIds,
                },
            },
            include: {
                album: true,
            },
        });

        songs.sort((a, b) => songIds.indexOf(a.id) - songIds.indexOf(b.id));
        return res
            .status(200)
            .json({ status: true, message: "Success", data: songs });
    } catch (error) {
        console.error("GET AI SHUFFLED SONGS ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}
