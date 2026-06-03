export type MediaType = "image" | "video";

export type Gallery = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  gallery_code: string;
  created_at: string;
  updated_at: string | null;
};

export type ThemeRoom = {
  id: string;
  gallery_id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
};

export type Artwork = {
  id: string;
  theme_room_id: string;
  gallery_id: string;
  user_id: string;
  title: string;
  description: string | null;
  media_type: MediaType;
  media_url: string;
  tools: string | null;
  year: string | null;
  created_at: string;
  updated_at: string | null;
};
