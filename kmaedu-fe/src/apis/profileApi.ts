import { api } from "./api";

// ==================== Types ====================

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string | null;
  bio: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
}

// ==================== API Functions ====================

/**
 * Get current user profile - uses backend cache
 */
export async function getProfileApi(): Promise<UserProfile> {
  const response = await api.get("/profile");
  return response.data;
}

/**
 * Update user profile - invalidates cache
 */
export async function updateProfileApi(
  data: UpdateProfileData
): Promise<UserProfile> {
  const response = await api.put("/profile", data);
  return response.data;
}
