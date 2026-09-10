import axios from 'axios';

const BASE_URL = 'http://localhost:5126/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token from localStorage if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Doctor Search & Specialties ─────────────────────────────────────────────

export const getDoctors = (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.specialization && params.specialization !== 'ALL') query.append('specialization', params.specialization);
  if (params.hospital && params.hospital !== 'ALL') query.append('hospital', params.hospital);
  if (params.date) query.append('date', params.date);
  if (params.sortBy) query.append('sortBy', params.sortBy);

  return api.get(`/doctors?${query.toString()}`);
};

export const getSpecialties = () => api.get('/doctors/specialties');

export const getDoctorById = (id) => api.get(`/doctors/${id}`);

export const getDoctorSessions = (id, date = '') => {
  const query = date ? `?date=${date}` : '';
  return api.get(`/doctors/${id}/sessions${query}`);
};

// ─── Agentic AI Symptom Recommendation ───────────────────────────────────────

export const recommendSpecialty = (symptoms) =>
  api.post('/doctors/recommend-specialty', { symptoms });

// ─── Appointments Management ─────────────────────────────────────────────────

export const bookAppointment = (data) =>
  api.post('/doctorappointments/book', data);

export const payAppointment = (id, paymentData) =>
  api.post(`/doctorappointments/${id}/pay`, paymentData);

export const getMyAppointments = (params = {}) => {
  const query = new URLSearchParams();
  if (params.patientId) query.append('patientId', params.patientId);
  if (params.email) query.append('email', params.email);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);

  return api.get(`/doctorappointments/mine?${query.toString()}`);
};

export const getAllAppointments = (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.doctorId) query.append('doctorId', params.doctorId);

  return api.get(`/doctorappointments?${query.toString()}`);
};

export const getDoctorQueue = (doctorId, status = '') => {
  const query = status ? `?status=${status}` : '';
  return api.get(`/doctorappointments/doctor/${doctorId}${query}`);
};

export const updateAppointmentStatus = (id, status, notes = '') =>
  api.put(`/doctorappointments/${id}/status`, { status, notes });

export const rescheduleAppointment = (id, newSessionId) =>
  api.post(`/doctorappointments/${id}/reschedule`, { newSessionId });

export const cancelAppointment = (id) =>
  api.post(`/doctorappointments/${id}/cancel`);

export const getAppointmentStats = () =>
  api.get('/doctorappointments/stats');

export const deleteAppointment = (id) =>
  api.delete(`/doctorappointments/${id}`);

export default api;
