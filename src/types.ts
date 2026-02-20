export interface AppRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_url: string;
  apk_url: string;
  screenshots: string[];
  rating: number;
  downloads: number;
  developer: string;
  version: string;
  size: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'published' | 'rejected';
}

export interface AppVersion {
  id: string;
  app_id: string;
  version: string;
  release_notes: string;
  apk_url: string;
  created_at: string;
}

export interface Review {
  id: string;
  app_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}
