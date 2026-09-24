const API_BASE = 'http://localhost:5126/api/emr';

// Helper: get auth token from storage
function getToken() {
  try {
    const raw = localStorage.getItem('hb_token') || sessionStorage.getItem('token') || localStorage.getItem('token') || '';
    return raw;
  } catch { return ''; }
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const emrApi = {
  // ── My Patient (logged-in user's own record) ───────────────────────────────
  async getMyPatient() {
    const res = await fetch(`${API_BASE}/patients/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch your patient profile: ${res.statusText}`);
    return await res.json();
  },

  // ── My Notifications (100% User-Specific from Database) ───────────────────
  async getMyNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.statusText}`);
    return await res.json();
  },

  // ── Patients ──────────────────────────────────────────────────────────────
  async getPatients(search = '') {
    const url = search ? `${API_BASE}/patients?search=${encodeURIComponent(search)}` : `${API_BASE}/patients`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch patients: ${res.statusText}`);
    return await res.json();
  },

  async getPatient(idOrCode) {
    const res = await fetch(`${API_BASE}/patients/${encodeURIComponent(idOrCode)}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch patient: ${res.statusText}`);
    return await res.json();
  },

  async createPatient(patientData) {
    const res = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(patientData)
    });
    if (!res.ok) throw new Error(`Failed to create patient: ${res.statusText}`);
    return await res.json();
  },

  async updatePatientByCode(patientCode, data) {
    const res = await fetch(`${API_BASE}/patients/code/${encodeURIComponent(patientCode)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update patient: ${res.statusText}`);
    return await res.json();
  },

  // ── Consultation Notes ───────────────────────────────────────────────────
  async getConsultations(patientCode = '', search = '', doctorName = '') {
    const params = new URLSearchParams();
    if (patientCode) params.append('patientCode', patientCode);
    if (search) params.append('search', search);
    if (doctorName && doctorName !== 'ALL') params.append('doctorName', doctorName);
    const qs = params.toString();
    const url = qs ? `${API_BASE}/consultations?${qs}` : `${API_BASE}/consultations`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch consultations: ${res.statusText}`);
    return await res.json();
  },

  async createConsultation(noteData) {
    const res = await fetch(`${API_BASE}/consultations`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(noteData)
    });
    if (!res.ok) throw new Error(`Failed to save consultation: ${res.statusText}`);
    return await res.json();
  },

  async deleteConsultation(id) {
    const res = await fetch(`${API_BASE}/consultations/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to delete consultation: ${res.statusText}`);
    return true;
  },

  // ── Lab Reports ──────────────────────────────────────────────────────────
  async getLabReports(patientCode = '', search = '', category = '', status = '') {
    const params = new URLSearchParams();
    if (patientCode) params.append('patientCode', patientCode);
    if (search) params.append('search', search);
    if (category && category !== 'ALL') params.append('category', category);
    if (status && status !== 'ALL') params.append('status', status);
    const qs = params.toString();
    const url = qs ? `${API_BASE}/lab-reports?${qs}` : `${API_BASE}/lab-reports`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch lab reports: ${res.statusText}`);
    return await res.json();
  },

  async createLabReport(reportData) {
    const res = await fetch(`${API_BASE}/lab-reports`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(reportData)
    });
    if (!res.ok) throw new Error(`Failed to save lab report: ${res.statusText}`);
    return await res.json();
  },

  async updateLabReportStatus(id, status, resultsSummary = '') {
    const res = await fetch(`${API_BASE}/lab-reports/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, resultsSummary })
    });
    if (!res.ok) throw new Error(`Failed to update lab report: ${res.statusText}`);
    return await res.json();
  },

  async deleteLabReport(id) {
    const res = await fetch(`${API_BASE}/lab-reports/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to delete lab report: ${res.statusText}`);
    return true;
  },

  // ── Prescriptions ────────────────────────────────────────────────────────
  async getPrescriptions(patientCode = '', search = '', status = '', doctorName = '') {
    const params = new URLSearchParams();
    if (patientCode) params.append('patientCode', patientCode);
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    if (doctorName && doctorName !== 'ALL') params.append('doctorName', doctorName);
    const qs = params.toString();
    const url = qs ? `${API_BASE}/prescriptions?${qs}` : `${API_BASE}/prescriptions`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch prescriptions: ${res.statusText}`);
    return await res.json();
  },

  async createPrescription(rxData) {
    const res = await fetch(`${API_BASE}/prescriptions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(rxData)
    });
    if (!res.ok) throw new Error(`Failed to save prescription: ${res.statusText}`);
    return await res.json();
  },

  async createPrescriptionsBatch(batchData) {
    const res = await fetch(`${API_BASE}/prescriptions/batch`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(batchData)
    });
    if (!res.ok) throw new Error(`Failed to save batch prescriptions: ${res.statusText}`);
    return await res.json();
  },

  async updatePrescriptionStatus(id, status) {
    const res = await fetch(`${API_BASE}/prescriptions/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to update prescription status: ${res.statusText}`);
    return await res.json();
  },

  async deletePrescription(id) {
    const res = await fetch(`${API_BASE}/prescriptions/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to delete prescription: ${res.statusText}`);
    return true;
  },

  // ── Channeling Appointments ───────────────────────────────────────────────
  async getChannelingAppointments(patientCode = '') {
    const url = patientCode ? `${API_BASE}/channeling-appointments?patientCode=${encodeURIComponent(patientCode)}` : `${API_BASE}/channeling-appointments`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch appointments: ${res.statusText}`);
    return await res.json();
  },

  // ── Business-Specific: Clinical Summary ──────────────────────────────────
  async getClinicalSummary(patientCodeOrId) {
    const res = await fetch(`${API_BASE}/patients/${encodeURIComponent(patientCodeOrId)}/clinical-summary`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Failed to generate clinical summary: ${res.statusText}`);
    return await res.json();
  }
};
