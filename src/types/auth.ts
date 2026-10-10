export interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: "user" | "admin";
  avatarUrl?: string;
  preferredGenres: string[];
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  username: string;
  role: "user" | "admin";
  expiresAt: number; // Unix timestamp in seconds
}
