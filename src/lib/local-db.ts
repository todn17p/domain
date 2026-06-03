import { cookies } from "next/headers";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Artwork, Gallery, ThemeRoom } from "./types";

type LocalUser = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
};

type LocalDb = {
  users: LocalUser[];
  galleries: Gallery[];
  theme_rooms: ThemeRoom[];
  artworks: Artwork[];
};

const SESSION_COOKIE = "portfolio-gallery-local-user";
const dbPath = path.join(process.cwd(), ".data", "local-db.json");

const emptyDb: LocalDb = {
  users: [],
  galleries: [],
  theme_rooms: [],
  artworks: [],
};

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function codeFor(username: string) {
  const clean = username.replace(/[^a-z0-9]/gi, "").slice(0, 7).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${clean || "ART"}-${suffix}`;
}

export async function readLocalDb(): Promise<LocalDb> {
  try {
    return JSON.parse(await readFile(dbPath, "utf-8")) as LocalDb;
  } catch {
    return { ...emptyDb };
  }
}

async function writeLocalDb(db: LocalDb) {
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2));
}

export async function createLocalUser(username: string, password: string) {
  const db = await readLocalDb();
  const normalized = username.trim();

  if (!normalized || !password) {
    throw new Error("아이디와 패스워드를 입력해주세요.");
  }

  if (db.users.some((user) => user.username === normalized)) {
    throw new Error("이미 등록된 아이디입니다.");
  }

  const now = new Date().toISOString();
  const user: LocalUser = {
    id: crypto.randomUUID(),
    username: normalized,
    password_hash: await hashPassword(password),
    created_at: now,
  };
  const gallery: Gallery = {
    id: crypto.randomUUID(),
    user_id: user.id,
    name: `${normalized} Gallery`,
    description: "이미지와 영상 작업물을 전시하는 개인 미술관입니다.",
    gallery_code: codeFor(normalized),
    created_at: now,
    updated_at: now,
  };

  db.users.push(user);
  db.galleries.push(gallery);
  await writeLocalDb(db);
  await setLocalSession(user.id);

  return user;
}

export async function signInLocalUser(username: string, password: string) {
  const db = await readLocalDb();
  const user = db.users.find((item) => item.username === username.trim());

  if (!user || user.password_hash !== (await hashPassword(password))) {
    throw new Error("아이디 또는 패스워드가 맞지 않습니다.");
  }

  await setLocalSession(user.id);
  return user;
}

export async function setLocalSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearLocalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentLocalUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const db = await readLocalDb();
  return db.users.find((user) => user.id === userId) ?? null;
}

export async function getLocalDashboard(userId: string) {
  const db = await readLocalDb();
  const gallery = db.galleries.find((item) => item.user_id === userId);
  if (!gallery) return null;

  return {
    gallery,
    rooms: db.theme_rooms.filter((room) => room.gallery_id === gallery.id),
    artworks: db.artworks
      .filter((artwork) => artwork.gallery_id === gallery.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8),
  };
}

export async function updateLocalGallery(
  userId: string,
  name: string,
  description: string,
) {
  const db = await readLocalDb();
  const gallery = db.galleries.find((item) => item.user_id === userId);
  if (!gallery) throw new Error("미술관을 찾을 수 없습니다.");

  gallery.name = name;
  gallery.description = description;
  gallery.updated_at = new Date().toISOString();
  await writeLocalDb(db);
}

export async function createLocalThemeRoom(
  userId: string,
  title: string,
  description: string,
) {
  const db = await readLocalDb();
  const gallery = db.galleries.find((item) => item.user_id === userId);
  if (!gallery) throw new Error("미술관을 찾을 수 없습니다.");

  const now = new Date().toISOString();
  db.theme_rooms.push({
    id: crypto.randomUUID(),
    gallery_id: gallery.id,
    user_id: userId,
    title,
    description,
    created_at: now,
    updated_at: now,
  });
  await writeLocalDb(db);
}

export async function deleteLocalThemeRoom(userId: string, roomId: string) {
  const db = await readLocalDb();
  db.theme_rooms = db.theme_rooms.filter(
    (room) => !(room.id === roomId && room.user_id === userId),
  );
  db.artworks = db.artworks.filter(
    (artwork) => !(artwork.theme_room_id === roomId && artwork.user_id === userId),
  );
  await writeLocalDb(db);
}

export async function getLocalRoom(userId: string, roomId: string) {
  const db = await readLocalDb();
  const room = db.theme_rooms.find(
    (item) => item.id === roomId && item.user_id === userId,
  );
  if (!room) return null;

  return {
    room,
    artworks: db.artworks
      .filter((artwork) => artwork.theme_room_id === room.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

export async function createLocalArtwork(
  userId: string,
  artwork: Omit<Artwork, "id" | "user_id" | "created_at" | "updated_at">,
) {
  const db = await readLocalDb();
  const now = new Date().toISOString();
  db.artworks.push({
    ...artwork,
    id: crypto.randomUUID(),
    user_id: userId,
    created_at: now,
    updated_at: now,
  });
  await writeLocalDb(db);
}

export async function deleteLocalArtwork(userId: string, artworkId: string) {
  const db = await readLocalDb();
  db.artworks = db.artworks.filter(
    (artwork) => !(artwork.id === artworkId && artwork.user_id === userId),
  );
  await writeLocalDb(db);
}

export async function getLocalVisit(code: string, roomId?: string) {
  const db = await readLocalDb();
  const gallery = db.galleries.find(
    (item) => item.gallery_code.toUpperCase() === code.toUpperCase(),
  );
  if (!gallery) return null;

  const rooms = db.theme_rooms.filter((room) => room.gallery_id === gallery.id);
  const activeRoom = roomId ?? rooms[0]?.id;

  return {
    gallery,
    rooms,
    activeRoom,
    artworks: activeRoom
      ? db.artworks.filter(
          (artwork) =>
            artwork.gallery_id === gallery.id && artwork.theme_room_id === activeRoom,
        )
      : [],
  };
}

export async function listLocalUsers() {
  const db = await readLocalDb();
  return db.users.map((user) => ({
    id: user.id,
    email: user.username,
    created_at: user.created_at,
  }));
}

export async function deleteLocalUser(userId: string) {
  const db = await readLocalDb();
  db.users = db.users.filter((user) => user.id !== userId);
  db.galleries = db.galleries.filter((gallery) => gallery.user_id !== userId);
  db.theme_rooms = db.theme_rooms.filter((room) => room.user_id !== userId);
  db.artworks = db.artworks.filter((artwork) => artwork.user_id !== userId);
  await writeLocalDb(db);
}
