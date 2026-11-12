import { api } from "./client";
import type { Identity, Role } from "@/types";

// GET /api/me and PUT /api/users/{id}/roles (AuthController, ADMINISTRATOR only).
export const getMe = () => api.get<Identity>("/me");

export const setUserRoles = (userId: string, roles: Role[]) =>
  api.put<void>(`/users/${userId}/roles`, { roles });
