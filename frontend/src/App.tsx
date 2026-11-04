import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { CallbackPage } from './pages/CallbackPage';
import { PrivateRoute } from './pages/PrivateRoute';
import { PatientLayout } from './layouts/PatientLayout';
import { PatientHomePage } from './pages/PatientHomePage';
import { BookingPage } from './pages/BookingPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { PatientRecordsPage } from './pages/PatientRecordsPage';
import { TelehealthPage } from './pages/TelehealthPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback" element={<CallbackPage />} />

        {/* Cổng Bệnh nhân (được bảo vệ) */}
        <Route
          path="/patient"
          element={
            <PrivateRoute>
              <PatientLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<PatientHomePage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="records" element={<PatientRecordsPage />} />
          <Route path="telehealth" element={<TelehealthPage />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
