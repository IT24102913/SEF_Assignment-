const API_BASE = 'http://localhost:5238/api/emr';

export const emrApi = {
  // ── Patients ──────────────────────────────────────────────────────────────
  async getPatients(search = '') {
    const url = search ? `${API_BASE}/patients?search=${encodeURIComponent(search)}` : `${API_BASE}/patients`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch patients: ${res.statusText}`);
    return await res.json();
  },

  async getPatient(idOrCode) {
    const res = await fetch(`${API_BASE}/patients/${encodeURIComponent(idOrCode)}`);
    if (!res.ok) throw new Error(`Failed to fetch patient: ${res.statusText}`);
    return await res.json();
  },

  async createPatient(patientData) {
    const res = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData)
    });
    if (!res.ok) throw new Error(`Failed to create patient: ${res.statusText}`);
    return await res.json();
  },

  // ── Consultation Notes ───────────────────────────────────────────────────
  async getConsultations(patientCode = '') {
    const url = patientCode ? `${API_BASE}/consultations?patientCode=${encodeURIComponent(patientCode)}` : `${API_BASE}/consultations`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch consultations: ${res.statusText}`);
    return await res.json();
  },

  async createConsultation(noteData) {
    const res = await fetch(`${API_BASE}/consultations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
    if (!res.ok) throw new Error(`Failed to save consultation: ${res.statusText}`);
    return await res.json();
  },

  async deleteConsultation(id) {
    const res = await fetch(`${API_BASE}/consultations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete consultation: ${res.statusText}`);
    return true;
  },

  // ── Lab Reports ──────────────────────────────────────────────────────────
  async getLabReports(patientCode = '') {
    const url = patientCode ? `${API_BASE}/lab-reports?patientCode=${encodeURIComponent(patientCode)}` : `${API_BASE}/lab-reports`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch lab reports: ${res.statusText}`);
    return await res.json();
  },

  async createLabReport(reportData) {
    const res = await fetch(`${API_BASE}/lab-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    if (!res.ok) throw new Error(`Failed to save lab report: ${res.statusText}`);
    return await res.json();
  },

  async updateLabReportStatus(id, status, resultsSummary = '') {
    const res = await fetch(`${API_BASE}/lab-reports/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, resultsSummary })
    });
    if (!res.ok) throw new Error(`Failed to update lab report: ${res.statusText}`);
    return await res.json();
  },

  async deleteLabReport(id) {
    const res = await fetch(`${API_BASE}/lab-reports/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete lab report: ${res.statusText}`);
    return true;
  },

  // ── Prescriptions ────────────────────────────────────────────────────────
  async getPrescriptions(patientCode = '') {
    const url = patientCode ? `${API_BASE}/prescriptions?patientCode=${encodeURIComponent(patientCode)}` : `${API_BASE}/prescriptions`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch prescriptions: ${res.statusText}`);
    return await res.json();
  },

  async createPrescription(rxData) {
    const res = await fetch(`${API_BASE}/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rxData)
    });
    if (!res.ok) throw new Error(`Failed to save prescription: ${res.statusText}`);
    return await res.json();
  },

  async updatePrescriptionStatus(id, status) {
    const res = await fetch(`${API_BASE}/prescriptions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to update prescription status: ${res.statusText}`);
    return await res.json();
  },

  async deletePrescription(id) {
    const res = await fetch(`${API_BASE}/prescriptions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete prescription: ${res.statusText}`);
    return true;
  },

  // ── Business-Specific: Clinical Summary ──────────────────────────────────
  async getClinicalSummary(patientCodeOrId) {
    const res = await fetch(`${API_BASE}/patients/${encodeURIComponent(patientCodeOrId)}/clinical-summary`);
    if (!res.ok) throw new Error(`Failed to generate clinical summary: ${res.statusText}`);
    return await res.json();
  }
};
