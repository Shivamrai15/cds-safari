import type { Request, Response } from "express";
import { db } from "../lib/db.js";
import type { Album, GenreSong, Song } from "../../generated/prisma/index.js";

const BATCH = 10;

export async function getGenres(req: Request, res: Response) {
    try {
        const genres = await db.genre.findMany({
            include: {
                video: true,
            },
        });

        res.status(200).json({
            status: true,
            message: "Genres fetched successfully",
            data: genres,
        });
    } catch (error) {
        console.error("GET GENRES API ERROR", error);
        res.status(500).json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getGenreSongs(req: Request, res: Response) {
    try {
        const genreId = req.params.id;
        if (!genreId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        const { cursor } = req.query;

        let songs: (Song & {
            artists: { id: string; name: string }[];
            album: Album;
        })[] = [];

        let genreSongs: GenreSong[] = [];

        if (cursor) {
            genreSongs = await db.genreSong.findMany({
                where: {
                    genreId,
                },
                take: BATCH,
                skip: 1,
                cursor: {
                    id: cursor as string,
                },
            });

            const genreSongIds = genreSongs.map((item) => item.songId);

            songs = await db.song.findMany({
                where: {
                    id: {
                        in: genreSongIds,
                    },
                },
                include: {
                    artists: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    album: true,
                },
            });

            songs.sort(
                (a, b) => genreSongIds.indexOf(a.id) - genreSongIds.indexOf(b.id)
            );
        } else {
            genreSongs = await db.genreSong.findMany({
                where: {
                    genreId,
                },
                take: BATCH,
            });

            const genreSongIds = genreSongs.map((item) => item.songId);

            songs = await db.song.findMany({
                where: {
                    id: {
                        in: genreSongIds,
                    },
                },
                include: {
                    artists: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    album: true,
                },
            });

            songs.sort(
                (a, b) => genreSongIds.indexOf(a.id) - genreSongIds.indexOf(b.id)
            );
        }

        let nextCursor = null;

        if (genreSongs.length === BATCH) {
            nextCursor = genreSongs[BATCH - 1]?.id;
        }

        return res.status(200).json({
            items: songs,
            nextCursor,
        });
    } catch (error) {
        console.error("GET GENRE SONGS API ERROR", error);
        res.status(500).json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getGenreById(req: Request, res: Response) {
    try {
        const genreId = req.params.id;
        if (!genreId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        const genre = await db.genre.findUnique({
            where: {
                id: genreId,
            },
            select: {
                id: true,
                _count: {
                    select: {
                        songs: true,
                    },
                },
                color: true,
                name: true,
                image: true,
            },
        });

        if (!genre) {
            return res.status(404).json({
                status: false,
                message: "Genre not found",
                data: {},
            });
        }

        return res.status(200).json({
            status: true,
            message: "Genre fetched successfully",
            data: genre,
        });
    } catch (error) {
        console.error("GET GENRE BY ID API ERROR", error);
        res.status(500).json({ status: false, message: "Internal Server Error", data: {} });
    }
}
