import { Navigate, Route, Routes } from "react-router-dom";
import { Guard, HomeRedirect, NotFound } from "@/auth/Guard";
import { CallbackPage, LoginPage } from "@/auth/LoginPage";
import { AppShell } from "@/layouts/AppShell";
import { DirectoryProvider } from "@/core/directory";
import type { Permission } from "@/core/permissions";
import type { ReactNode } from "react";

import { PatientProvider } from "@/features/patient/PatientContext";
import { PatientDashboard } from "@/features/patient/Dashboard";
import { BookingPage } from "@/features/patient/Booking";
import { PatientAppointmentsPage } from "@/features/patient/Appointments";
import { PatientRecordsPage } from "@/features/patient/Records";
import { PatientTelehealthPage } from "@/features/patient/Telehealth";

import { DoctorProvider } from "@/features/doctor/DoctorContext";
import { DoctorHome } from "@/features/doctor/Home";
import { DoctorSchedulePage } from "@/features/doctor/Schedule";
import { DoctorAppointmentsPage } from "@/features/doctor/Appointments";
import { DoctorQueuePage } from "@/features/doctor/Queue";
import { DoctorConsultationPage } from "@/features/doctor/Consultation";
import { DoctorCallLayout } from "@/features/doctor/Telehealth";

import { StaffDashboard } from "@/features/staff/Dashboard";
import { ReceptionPage } from "@/features/staff/Reception";
import { StaffQueuePage } from "@/features/staff/Queue";
import { NotificationsPage } from "@/features/staff/Notifications";
import { AuditPage } from "@/features/staff/Audit";

import { SpecialtiesPage } from "@/features/admin/Specialties";
import { PermissionsPage } from "@/features/admin/Permissions";
import { SchedulesPage } from "@/features/admin/Schedules";
import { ClinicHoursPage } from "@/features/admin/ClinicHours";
import { PatientAccountsPage } from "@/features/admin/PatientAccounts";

import { AccountPage } from "@/features/account/Account";

const guard = (permission: Permission, page: ReactNode) => <Guard permission={permission}>{page}</Guard>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        element={
          <Guard>
            <DirectoryProvider>
              <AppShell />
            </DirectoryProvider>
          </Guard>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="settings" element={<Navigate to="/account?tab=settings" replace />} />

        {/* Bệnh nhân */}
        <Route path="patient" element={guard("patient.portal", <PatientProvider />)}>
          <Route index element={<PatientDashboard />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="appointments" element={<PatientAppointmentsPage />} />
          <Route path="records" element={<PatientRecordsPage />} />
          <Route path="telehealth" element={<PatientTelehealthPage />} />
        </Route>

        {/* Bác sĩ */}
        <Route path="doctor" element={guard("doctor.portal", <DoctorProvider />)}>
          <Route index element={<DoctorHome />} />
          <Route path="schedule" element={<DoctorSchedulePage />} />
          <Route path="appointments" element={<DoctorAppointmentsPage />} />
          <Route path="queue" element={<DoctorQueuePage />} />
          <Route element={<DoctorCallLayout />}>
            <Route path="consultation/:appointmentId?" element={<DoctorConsultationPage />} />
            <Route path="telehealth/:appointmentId?" element={null} />
          </Route>
        </Route>

        {/* Nhân viên: lễ tân / quản trị */}
        <Route path="staff" element={guard("dashboard.view", <StaffDashboard />)} />
        <Route path="staff/reception" element={guard("checkin.perform", <ReceptionPage />)} />
        <Route path="staff/queue" element={guard("queue.manage", <StaffQueuePage />)} />
        <Route path="staff/notifications" element={guard("notifications.view", <NotificationsPage />)} />

        {/* Quản trị */}
        <Route path="admin/doctors" element={<Navigate to="/admin/permissions?role=DOCTOR" replace />} />
        <Route path="admin/specialties" element={guard("specialties.manage", <SpecialtiesPage />)} />
        <Route path="admin/schedules" element={guard("schedules.manage", <SchedulesPage />)} />
        <Route path="admin/clinic-hours" element={guard("schedules.manage", <ClinicHoursPage />)} />
        <Route path="admin/permissions" element={guard("permissions.manage", <PermissionsPage />)} />
        <Route path="admin/patient-accounts" element={guard("patientAccounts.manage", <PatientAccountsPage />)} />

        {/* Kiểm toán */}
        <Route path="audit" element={guard("audit.view", <AuditPage />)} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
