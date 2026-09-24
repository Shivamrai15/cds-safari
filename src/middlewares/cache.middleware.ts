import type { NextFunction, Request, Response } from "express";
import { redis } from "../lib/redis.js";

export function cache(ttlSeconds = 60) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!redis.isReady) {
            return next();
        }

        const key = `cache:${req.originalUrl}`;

        try {
            const cachedData = await redis.get(key);

            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }

            const originalJson = res.json.bind(res);

            res.json = (body: any): Response => {
                if (res.statusCode === 200) {
                    redis
                        .setEx(key, ttlSeconds, JSON.stringify(body))
                        .catch((err) => console.error("Redis setEx error:", err));
                }

                return originalJson(body);
            };

            next();
        } catch (error) {
            console.error("Cache Middleware Error:", error);
            next();
        }
    };
}
