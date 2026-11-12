import type { ReactNode } from "react";
import { useStaffAuth } from "./AuthProvider";
import type { Permission } from "./permissions";

/** Renders children only when the signed-in roles grant the permission. UX only — backend enforces. */
export function PermissionGate({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can } = useStaffAuth();
  return <>{can(permission) ? children : fallback}</>;
}
