import type { Request, Response } from "express";
import type { Album, Prisma, Song } from "../../generated/prisma/index.js";
import { db } from "../lib/db.js";

const BATCH = 20;

export async function getDiscography(req: Request, res: Response) {
    try {
        const artistId = req.params.id;
        const { cursor } = req.query;
        if (!artistId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        let albums: (Album & {
            songs: (Song & { artists: { id: string; name: string }[] })[];
        })[] = [];

        if (cursor) {
            albums = await db.album.findMany({
                where: {
                    songs: {
                        some: {
                            artistIds: {
                                has: artistId as string,
                            },
                        },
                    },
                },
                include: {
                    songs: {
                        include: {
                            artists: {
                                select: {
                                    id: true,
                                    name: true,
                                    image: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    release: "desc",
                },
                take: BATCH,
                skip: 1,
                cursor: {
                    id: cursor as string,
                },
            });
        } else {
            albums = await db.album.findMany({
                where: {
                    songs: {
                        some: {
                            artistIds: {
                                has: artistId as string,
                            },
                        },
                    },
                },
                include: {
                    songs: {
                        include: {
                            artists: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    release: "desc",
                },
                take: BATCH,
            });
        }

        let nextCursor = null;

        if (albums.length === BATCH) {
            nextCursor = albums[BATCH - 1]?.id;
        }

        return res.status(200).json({
            items: albums,
            nextCursor,
        });
    } catch (error) {
        console.error("GET DISCOGRAPHY ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getArtistSongs(req: Request, res: Response) {
    try {
        const artistId = req.params.id;
        if (!artistId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

        let cursorSong: Pick<Song, "id" | "name"> | null = null;
        if (cursor) {
            cursorSong = await db.song.findFirst({
                where: {
                    id: cursor,
                    artistIds: {
                        has: artistId as string,
                    },
                },
                select: {
                    id: true,
                    name: true,
                },
            });

            if (!cursorSong) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid cursor",
                    data: {},
                });
            }
        }

        const where: Prisma.SongWhereInput = {
            artistIds: {
                has: artistId as string,
            },
        };

        if (cursorSong) {
            where.OR = [
                {
                    name: {
                        gt: cursorSong.name,
                    },
                },
                {
                    name: cursorSong.name,
                    id: {
                        gt: cursorSong.id,
                    },
                },
            ];
        }

        const songs: (Song & {
            artists: { id: string; name: string; image: string }[];
            album: Album;
        })[] = await db.song.findMany({
            where,
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
            take: BATCH,
            orderBy: [{ name: "asc" }, { id: "asc" }],
        });

        let nextCursor = null;

        if (songs.length === BATCH) {
            nextCursor = songs[BATCH - 1]?.id;
        }

        return res.status(200).json({
            items: songs,
            nextCursor,
        });
    } catch (error) {
        console.error("GET ARTIST SONGS ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getArtistById(req: Request, res: Response) {
    try {
        const artistId = req.params.id;
        if (!artistId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        const artist = await db.artist.findUnique({
            where: {
                id: artistId,
            },
            select: {
                id: true,
                name: true,
                thumbnail: true,
                image: true,
                about: true,
                songs: {
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
                    take: 5,
                },
                _count: {
                    select: {
                        followers: true,
                    },
                },
            },
        });

        return res.status(200).json({
            status: true,
            message: "Artist retrieved successfully",
            data: artist,
        });
    } catch (error) {
        console.error("GET ARTIST BY ID ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export const getArtistProfile = async (req: Request, res: Response) => {
    try {
        const artistId = req.params.id;
        if (!artistId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        const artist = await db.artist.findUnique({
            where: {
                id: artistId,
            },
            select: {
                id: true,
                name: true,
                image: true,
                _count: {
                    select: {
                        followers: true,
                        songs: true,
                    },
                },
            },
        });

        return res.status(200).json({
            status: true,
            message: "Artist retrieved successfully",
            data: artist,
        });
    } catch (error) {
        console.error("GET ARTIST PROFILE ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
};
