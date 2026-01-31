import type { Request, Response } from "express";
import { db } from "../../lib/db.js";
import type { Album, Artist } from "../../../generated/prisma/index.js";
import type { RawAlbum, RawArtist, RawSong } from "../../types.js";

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

    const albumSearchPipeline = [
      {
        $search: {
          index: "default",
          text: {
            query,
            path: "name",
            fuzzy: { maxEdits: 2 },
          },
        },
      },
      {
        $addFields: {
          score: { $meta: "searchScore" },
        },
      },
      {
        $limit: 5,
      },
    ];

    const artistSearchPipeline = [
      {
        $search: {
          index: "default",
          text: {
            query,
            path: "name",
            fuzzy: { maxEdits: 2 },
          },
        },
      },
      {
        $addFields: {
          score: { $meta: "searchScore" },
        },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          thumbnail: 0,
          about: 0,
          songIds: 0,
          followerIds: 0,
        },
      },
    ];

    const songSearchPipeline = [
      {
        $search: {
          index: "default",
          text: {
            query,
            path: "name",
            fuzzy: { maxEdits: 2 },
          },
        },
      },
      {
        $addFields: {
          score: { $meta: "searchScore" },
        },
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "Album",
          localField: "albumId",
          foreignField: "_id",
          as: "album",
        },
      },
      {
        $unwind: "$album",
      },
      {
        $lookup: {
          from: "Artist",
          localField: "artistIds",
          foreignField: "_id",
          as: "artists",
        },
      },
      {
        $project: {
          "artists.thumbnail": 0,
          "artists.about": 0,
          "artists.songIds": 0,
          "artists.followerIds": 0,
        },
      },
    ];

    const [rawAlbums, rawSongs, rawArtists] = await Promise.all([
      db.album.aggregateRaw({
        pipeline: albumSearchPipeline,
      }) as unknown as (RawAlbum & { score: number })[],
      db.song.aggregateRaw({
        pipeline: songSearchPipeline,
      }) as unknown as (RawSong & { score: number })[],
      db.artist.aggregateRaw({
        pipeline: artistSearchPipeline,
      }) as unknown as (RawArtist & { score: number })[],
    ]);

    const albums: Album[] = rawAlbums.map((album) => ({
      id: album._id.$oid,
      name: album.name,
      image: album.image,
      color: album.color,
      release: new Date(album.release.$date),
      labelId: album.labelId?.$oid ?? null,
    }));

    const artists: Artist[] = rawArtists.map((artist) => ({
      id: artist._id.$oid,
      name: artist.name,
      image: artist.image,
      thumbnail: null,
      about: "",
      songIds: [],
      followerIds: [],
    }));

    const songs = rawSongs.map((song) => ({
      id: song._id.$oid,
      name: song.name,
      image: song.image,
      url: song.url,
      duration: song.duration,
      albumId: song.albumId.$oid,
      artistIds: song.artistIds.map((id) => id.$oid),
      album: {
        id: song.album._id.$oid,
        name: song.album.name,
        image: song.album.image,
        color: song.album.color,
        release: new Date(song.album.release.$date),
        labelId: song.album.labelId?.$oid ?? null,
      },
      artists: song.artists.map((artist) => ({
        id: artist._id.$oid,
        name: artist.name,
        image: artist.image,
      })),
    }));

    let topResult: Album | Artist | (typeof songs)[0] | null = null;

    if (
      rawAlbums.length === 0 &&
      rawSongs.length === 0 &&
      rawArtists.length === 0
    ) {
      topResult = null;
    } else {
      const albumScore =
        rawAlbums.length > 0 ? (rawAlbums[0]?.score ?? -Infinity) : -Infinity;
      const songScore =
        rawSongs.length > 0 ? (rawSongs[0]?.score ?? -Infinity) : -Infinity;
      const artistScore =
        rawArtists.length > 0 ? (rawArtists[0]?.score ?? -Infinity) : -Infinity;

      if (albumScore >= songScore && albumScore >= artistScore) {
        topResult = albums[0] ?? null;
      } else if (songScore >= albumScore && songScore >= artistScore) {
        topResult = songs[0] ?? null;
      } else {
        topResult = artists[0] ?? null;
      }
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

    const result = (await db.album.aggregateRaw({
      pipeline: [
        {
          $search: {
            index: "default",
            text: {
              query,
              path: "name",
              fuzzy: { maxEdits: 2 },
            },
          },
        },
        {
          $addFields: {
            score: { $meta: "searchScore" },
          },
        },
        {
          $setWindowFields: {
            output: {
              maxScore: { $max: "$score" },
            },
          },
        },
        {
          $match: {
            $expr: {
              $gte: ["$score", { $multiply: ["$maxScore", 0.5] }],
            },
          },
        },
        {
          $limit: 20,
        },
        {
          $project: {
            score: 0,
            maxScore: 0,
          },
        },
      ],
    })) as unknown as RawAlbum[];

    const albums: Album[] = result.map((album) => ({
      id: album._id.$oid,
      name: album.name,
      image: album.image,
      color: album.color,
      release: new Date(album.release.$date),
      labelId: album.labelId?.$oid ?? null,
    }));

    return res.json({
      status: true,
      message: "Search results",
      data: {
        query,
        albums,
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

    const result = (await db.song.aggregateRaw({
      pipeline: [
        {
          $search: {
            index: "default",
            text: {
              query,
              path: "name",
              fuzzy: { maxEdits: 2 },
            },
          },
        },
        {
          $addFields: {
            score: { $meta: "searchScore" },
          },
        },
        {
          $setWindowFields: {
            output: {
              maxScore: { $max: "$score" },
            },
          },
        },
        {
          $match: {
            $expr: {
              $gte: ["$score", { $multiply: ["$maxScore", 0.5] }],
            },
          },
        },
        {
          $limit: 20,
        },
        {
          $lookup: {
            from: "Album",
            localField: "albumId",
            foreignField: "_id",
            as: "album",
          },
        },
        {
          $unwind: "$album",
        },
        {
          $lookup: {
            from: "Artist",
            localField: "artistIds",
            foreignField: "_id",
            as: "artists",
          },
        },
        {
          $project: {
            score: 0,
            maxScore: 0,
            "artists.thumbnail": 0,
            "artists.about": 0,
            "artists.songIds": 0,
            "artists.followerIds": 0,
          },
        },
      ],
    })) as unknown as RawSong[];

    const songs = result.map((song) => ({
      id: song._id.$oid,
      name: song.name,
      image: song.image,
      url: song.url,
      duration: song.duration,
      albumId: song.albumId.$oid,
      artistIds: song.artistIds.map((id) => id.$oid),
      album: {
        id: song.album._id.$oid,
        name: song.album.name,
        image: song.album.image,
        color: song.album.color,
        release: new Date(song.album.release.$date),
        labelId: song.album.labelId?.$oid ?? null,
      },
      artists: song.artists.map((artist) => ({
        id: artist._id.$oid,
        name: artist.name,
        image: artist.image,
      })),
    }));

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

    const result = (await db.artist.aggregateRaw({
      pipeline: [
        {
          $search: {
            index: "default",
            text: {
              query,
              path: "name",
              fuzzy: { maxEdits: 2 },
            },
          },
        },
        {
          $addFields: {
            score: { $meta: "searchScore" },
          },
        },
        {
          $setWindowFields: {
            output: {
              maxScore: { $max: "$score" },
            },
          },
        },
        {
          $match: {
            $expr: {
              $gte: ["$score", { $multiply: ["$maxScore", 0.75] }],
            },
          },
        },
        {
          $limit: 20,
        },
        {
          $project: {
            score: 0,
            maxScore: 0,
          },
        },
      ],
    })) as unknown as RawArtist[];

    const artists: { id: string; name: string; image: string }[] = result.map(
      (artist) => ({
        id: artist._id.$oid,
        name: artist.name,
        image: artist.image,
      }),
    );

    return res.json({
      status: true,
      message: "Search results",
      data: {
        query,
        artists: artists,
      },
    });
  } catch (error) {
    console.error("GET SEARCH ARTISTS API ERROR", error);
    res
      .status(500)
      .json({ status: false, message: "Internal Server Error", data: {} });
  }
}
