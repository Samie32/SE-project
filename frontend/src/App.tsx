import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DoctorLayout } from './layouts/DoctorLayout.tsx';
import { DoctorSchedulePage } from './features/doctor/DoctorSchedulePage.tsx';
import { DoctorAppointmentsPage } from './features/doctor/DoctorAppointmentsPage.tsx';
import { DoctorQueuePage } from './features/doctor/DoctorQueuePage.tsx';
import { DoctorConsultationPage } from './features/doctor/DoctorConsultationPage.tsx';
import { DoctorTelehealthPage } from './features/doctor/DoctorTelehealthPage.tsx';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/doctor/schedule" replace />} />
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<Navigate to="/doctor/schedule" replace />} />
          <Route path="schedule" element={<DoctorSchedulePage />} />
          <Route path="appointments" element={<DoctorAppointmentsPage />} />
          <Route path="queue" element={<DoctorQueuePage />} />
          <Route path="consultation" element={<DoctorConsultationPage />} />
          <Route path="telehealth" element={<DoctorTelehealthPage />} />
        </Route>
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/doctor/schedule" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
