import type { Request, Response } from "express";
import { db } from "../lib/db.js";

export async function getAlbumById(req: Request, res: Response) {
    try {
        const albumId = req.params.id;
        if (!albumId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        const album = await db.album.findUnique({
            where: {
                id: albumId as string,
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
                        album: true,
                    },
                },
                label: true,
            },
        });

        return res.status(200).json({
            status: true,
            message: "Album fetched successfully",
            data: album,
        });
    } catch (error) {
        console.error("GET ALBUM BY ID ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getRecommendedAlbums(req: Request, res: Response) {
    try {
        const albums = await db.album.findMany({
            take: 15,
        });

        return res.status(200).json({
            status: true,
            message: "Recommended albums fetched successfully",
            data: albums,
        });
    } catch (error) {
        console.error("GET RECOMMENDED ALBUMS ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getSimilarAlbums(req: Request, res: Response) {
    try {
        const { albumId, artistId } = req.query;

        if (!albumId || !artistId) {
            return res.status(400).json({
                status: false,
                message: "Bad Request",
                data: {},
            });
        }

        const albums = await db.album.findMany({
            where: {
                songs: {
                    some: {
                        artistIds: {
                            has: artistId as string,
                        },
                    },
                },
                id: {
                    not: albumId as string,
                },
            },
            orderBy: {
                release: "desc",
            },
            take: 10,
        });

        return res.status(200).json({
            status: true,
            message: "Similar albums fetched successfully",
            data: albums,
        });
    } catch (error) {
        console.error("GET SIMILAR ALBUMS ERROR:", error);
        res
            .status(500)
            .json({ status: false, message: "Internal Server Error", data: {} });
    }
}

export async function getNewReleases(req: Request, res: Response) {
    try {
        const albums = await db.album.findMany({
            take: 15,
            orderBy: {
                release: "desc",
            },
        });
        return res.json({
            status: true,
            message: "New releases fetched successfully",
            data: albums,
        });
    } catch (error) {
        console.error("GET NEW RELEASES ERROR:", error);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error",
            data: {},
        });
    }
}
