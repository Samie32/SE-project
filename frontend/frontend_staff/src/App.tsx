import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { StaffLayout } from "@/layouts/StaffLayout";
import { CallbackPage, LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/ForbiddenPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DoctorsPage } from "@/pages/DoctorsPage";
import { SpecialtiesPage } from "@/pages/SpecialtiesPage";
import { PermissionsPage } from "@/pages/PermissionsPage";
import { ReceptionPage } from "@/pages/ReceptionPage";
import { QueuePage } from "@/pages/QueuePage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { AuditPage } from "@/pages/AuditPage";
import type { Permission } from "@/auth/permissions";
import type { ReactNode } from "react";

const guard = (permission: Permission, page: ReactNode) => (
  <ProtectedRoute permission={permission}>{page}</ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        element={
          <ProtectedRoute>
            <StaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={guard("dashboard.view", <DashboardPage />)} />
        <Route path="doctors" element={guard("doctors.manage", <DoctorsPage />)} />
        <Route path="specialties" element={guard("specialties.manage", <SpecialtiesPage />)} />
        <Route path="permissions" element={guard("permissions.manage", <PermissionsPage />)} />
        <Route path="reception" element={guard("checkin.perform", <ReceptionPage />)} />
        <Route path="queue" element={guard("queue.manage", <QueuePage />)} />
        <Route path="notifications" element={guard("notifications.view", <NotificationsPage />)} />
        <Route path="audit" element={guard("audit.view", <AuditPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
