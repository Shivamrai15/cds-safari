import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) throw new Error("No token provided");
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        if (!decoded) throw new Error("Invalid token");
        next();
    } catch (error) {
        // console.error("AUTH MIDDLEWARE ERROR:", error);
        return res.status(401).json({
            status: false,
            message: "Unauthorized access",
            data: {},
        });
    }
}
