import { createClient } from 'redis';

export const redis = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD || '',
    socket: {
        host: process.env.REDIS_URL || 'localhost',
        port: 16296
    }
});

redis.on("connect", () => console.log("Redis Client Connected"));
redis.on("error", (err) => console.error("Redis Client Error", err));

export async function connectRedis() {
    try {
        await redis.connect();
        console.log("Redis connection established");
    } catch (error) {
        console.error("Failed to connect to Redis:", error);
        throw error;
    }
}

export async function disconnectRedis() {
    try {
        await redis.quit();
        console.log("Redis connection closed");
    } catch (error) {
        console.error("Error disconnecting from Redis:", error);
    }
}