import axios from 'axios';

const BASE_URL = 'http://localhost:5126/api/lab';

const api = axios.create({ baseURL: BASE_URL });

// ─── Lab Tests ────────────────────────────────────────────────────────────────
export const getAllTests = (search = '', category = '', includeInactive = false) =>
  api.get(`/tests?search=${search}&category=${category}&includeInactive=${includeInactive}`);

export const getTestById = (id) => api.get(`/tests/${id}`);
export const getCategories = () => api.get('/tests/categories');
export const createTest = (data) => api.post('/tests', data);
export const updateTest = (id, data) => api.put(`/tests/${id}`, data);
export const deleteTest = (id) => api.delete(`/tests/${id}`);

// ─── Patient Bookings ─────────────────────────────────────────────────────────
export const getMyBookings = (patientId) => api.get(`/bookings/my?patientId=${patientId}`);
export const getBookingById = (id) => api.get(`/bookings/${id}`);
export const createBooking = (data) => api.post('/bookings', data);
export const cancelBooking = (id, patientId) => api.delete(`/bookings/${id}?patientId=${patientId}`);
export const getSlots = (date) => api.get(`/slots?date=${date}`);

// ─── Admin ────────────────────────────────────────────────────────────────────
export const getAllBookings = (status = '') => api.get(`/admin/bookings?status=${status}`);
export const getPendingBookings = () => api.get('/admin/bookings/pending');
export const approveBooking = (id, technicianId, notes) =>
  api.put(`/admin/bookings/${id}/approve?technicianId=${technicianId}`, { notes });
export const rejectBooking = (id, technicianId, reason) =>
  api.put(`/admin/bookings/${id}/reject?technicianId=${technicianId}`, { reason });
export const markCollected = (id, technicianId) =>
  api.put(`/admin/bookings/${id}/collected?technicianId=${technicianId}`);
export const updateBookingStatus = (id, status) =>
  api.put(`/admin/bookings/${id}/status?newStatus=${status}`);
export const uploadResult = (id, technicianId, resultFileUrl) =>
  api.post(`/admin/bookings/${id}/result?technicianId=${technicianId}`, { resultFileUrl });
export const getStats = () => api.get('/admin/stats');
export const deleteBookingAdmin = (id) => api.delete(`/admin/bookings/${id}`);

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post('http://localhost:5126/api/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
