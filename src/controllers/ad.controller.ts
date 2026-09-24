import type { Request, Response } from "express";
import { db } from "../lib/db.js";

export async function getAds(req: Request, res: Response) {
    try {
        const ads = await db.ad.findMany({
            select: {
                id: true,
                name: true,
                color: true,
                image: true,
                url: true,
                duration: true,
            },
        });

        return res.status(200).json({
            status: true,
            message: "Ads fetched successfully",
            data: ads,
        });
    } catch (error) {
        console.error("GET ADS API ERROR:", error);
        res.status(500).json({
            status: false,
            message: "Internal Server Error",
            data: [],
        });
    }
}
