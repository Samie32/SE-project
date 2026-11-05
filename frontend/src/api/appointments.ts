import { api } from './client';
import {
  Appointment,
  Slot,
  Specialty,
  Doctor,
  BookingPayload,
  ReschedulePayload,
  CancelPayload,
  UserProfile,
} from '../types';

export const getSpecialties = () => api.get<Specialty[]>('/specialties');

export const getDoctors = (specialtyId?: string) => {
  const q = specialtyId ? `?specialtyId=${specialtyId}` : '';
  return api.get<Doctor[]>(`/doctors${q}`);
};

export const getSlots = (params: {
  date: string;
  doctorId?: string;
  specialtyId?: string;
  mode?: 'IN_PERSON' | 'REMOTE';
}) => {
  const q = new URLSearchParams({ date: params.date });
  if (params.doctorId) q.set('doctorId', params.doctorId);
  if (params.specialtyId) q.set('specialtyId', params.specialtyId);
  if (params.mode) q.set('mode', params.mode);
  return api.get<Slot[]>(`/slots?${q.toString()}`);
};

export const getMyAppointments = (params?: { limit?: number; offset?: number }) => {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  const queryStr = q.toString() ? `?${q.toString()}` : '';
  return api.get<Appointment[]>(`/appointments${queryStr}`);
};

export const bookAppointment = (payload: BookingPayload, idempotencyKey: string) =>
  api.post<Appointment>('/appointments', payload, idempotencyKey);

export const rescheduleAppointment = (
  id: string,
  payload: ReschedulePayload,
  idempotencyKey: string
) => api.post<Appointment>(`/appointments/${id}/reschedule`, payload, idempotencyKey);

export const cancelAppointment = (
  id: string,
  payload: CancelPayload,
  idempotencyKey: string
) => api.post<Appointment>(`/appointments/${id}/cancel`, payload, idempotencyKey);

export const getMe = () => api.get<UserProfile>('/me');
