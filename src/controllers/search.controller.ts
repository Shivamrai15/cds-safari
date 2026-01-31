import type { Request, Response } from "express";
import { db } from "../lib/db.js";
import { qdrant } from "../lib/qdrant.js";
import type { Album, Artist } from "../../generated/prisma/index.js";
import { generateEmbeddings } from "../lib/embedding.js";

export async function search(req: Request, res: Response) {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        data: { query: "Query parameter is required" },
      });
    }

    const queryVector = await generateEmbeddings(query);
    const searchPromise = ["album", "song", "artist"].map((collection) =>
      qdrant.search(collection, {
        vector: queryVector,
        score_threshold: 0.5,
        limit: 5,
      }),
    );
    const [albumData, songData, artistData] = await Promise.all(searchPromise);

    const ids =
      songData
        ?.map((v_data) => v_data.payload?.id as string)
        .filter((id) => id !== undefined) || [];

    const songs = await db.song.findMany({
      where: {
        id: {
          in: ids,
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

    songs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

    const albums = albumData?.map((album) => album.payload as Album);
    const artists = artistData?.map((artist) => artist.payload as Artist);

    let topResult;

    if (
      albumData?.length === 0 &&
      songData?.length === 0 &&
      artistData?.length === 0
    ) {
      topResult = null;
    }

    const albumScore =
      (albumData?.length ?? 0) > 0
        ? (albumData?.[0]?.score ?? -Infinity)
        : -Infinity;
    const songScore =
      (songData?.length ?? 0) > 0
        ? (songData?.[0]?.score ?? -Infinity)
        : -Infinity;
    const artistScore =
      (artistData?.length ?? 0) > 0
        ? (artistData?.[0]?.score ?? -Infinity)
        : -Infinity;

    if (
      albumScore >= songScore &&
      albumScore >= artistScore &&
      albumData?.[0]
    ) {
      topResult = albumData[0].payload as Album;
    } else if (
      songScore >= albumScore &&
      songScore >= artistScore &&
      songs[0]
    ) {
      topResult = songs[0];
    } else if (artistData?.[0]) {
      topResult = artistData[0].payload as Artist;
    }

    return res.json({
      status: true,
      message: "Search results",
      data: {
        query,
        topResult,
        albums,
        songs,
        artists,
      },
    });
  } catch (error) {
    console.error("GET SEARCH API ERROR", error);
    res
      .status(500)
      .json({ status: false, message: "Internal Server Error", data: {} });
  }
}

export async function searchAlbums(req: Request, res: Response) {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        data: { query: "Query parameter is required" },
      });
    }

    const vectoryQuery = await generateEmbeddings(query);

    const data = await qdrant.search("album", {
      vector: vectoryQuery,
      score_threshold: 0.6,
    });

    return res.json({
      status: true,
      message: "Search results",
      data: {
        query,
        albums: data.map((item) => item.payload),
      },
    });
  } catch (error) {
    console.error("GET SEARCH ALBUMS API ERROR", error);
    res
      .status(500)
      .json({ status: false, message: "Internal Server Error", data: {} });
  }
}

export async function searchSongs(req: Request, res: Response) {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        data: { query: "Query parameter is required" },
      });
    }

    const queryVector = await generateEmbeddings(query);
    const data = await qdrant.search("song", {
      vector: queryVector,
      score_threshold: 0.5,
    });

    const ids = data
      .map((v_data) => v_data.payload?.id as string)
      .filter((id) => id !== undefined);
    const songs = await db.song.findMany({
      where: {
        id: {
          in: ids,
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

    songs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    return res.json({
      status: true,
      message: "Search results",
      data: {
        query,
        songs,
      },
    });
  } catch (error) {
    console.error("GET SEARCH SONGS API ERROR", error);
    res
      .status(500)
      .json({ status: false, message: "Internal Server Error", data: {} });
  }
}

export async function searchArtists(req: Request, res: Response) {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        data: { query: "Query parameter is required" },
      });
    }

    const queryVector = await generateEmbeddings(query);
    const data = await qdrant.search("artist", {
      vector: queryVector,
      score_threshold: 0.5,
    });

    return res.json({
      status: true,
      message: "Search results",
      data: {
        query,
        artists: data.map((item) => item.payload),
      },
    });
  } catch (error) {
    console.error("GET SEARCH ARTISTS API ERROR", error);
    res
      .status(500)
      .json({ status: false, message: "Internal Server Error", data: {} });
  }
}
