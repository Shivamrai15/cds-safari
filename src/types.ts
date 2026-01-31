// Raw MongoDB response types for Atlas Search
export type RawAlbum = {
    _id: { $oid: string };
    name: string;
    image: string;
    color: string;
    release: { $date: string };
    labelId?: { $oid: string };
};

export type RawArtist = {
    _id: { $oid: string };
    name: string;
    image: string;
};

export type RawSong = {
    _id: { $oid: string };
    name: string;
    image: string;
    url: string;
    duration: number;
    albumId: { $oid: string };
    artistIds: { $oid: string }[];
    album: RawAlbum;
    artists: RawArtist[];
};