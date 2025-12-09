import { PrismaClient } from "../../generated/prisma/index.js";

export const db = new PrismaClient();

export async function connectDB(): Promise<void> {
    try {
        await db.$connect();
        console.log("Database connected successfully");
    } catch (error) {
        console.error("Failed to connect to database:", error);
        process.exit(1);
    }
}

export async function disconnectDB(): Promise<void> {
    try {
        await db.$disconnect();
        console.log("Database disconnected successfully");
    } catch (error) {
        console.error("Failed to disconnect from database:", error);
    }
}