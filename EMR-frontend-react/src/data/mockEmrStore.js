// Central Shared EMR Store with PostgreSQL Live Sync & LocalStorage Fallback
import { emrApi } from '../services/emrApi.js';

const INITIAL_PATIENTS = [
  { id: 'PAT-1001', name: 'John Anderson', age: 41, gender: 'Male', phone: '+1 555-0192', bloodGroup: 'O+', allergies: 'Penicillin, Peanuts', chronicConditions: 'Stage 1 Hypertension, Mild Asthma' },
  { id: 'PAT-1002', name: 'Maria Garcia', age: 34, gender: 'Female', phone: '+1 555-0284', bloodGroup: 'A+', allergies: 'Sulfa antibiotics', chronicConditions: 'Type 2 Diabetes Mellitus' },
  { id: 'PAT-1003', name: 'Robert Kim', age: 57, gender: 'Male', phone: '+1 555-0371', bloodGroup: 'B+', allergies: 'None reported', chronicConditions: 'Hyperlipidemia' },
];

const INITIAL_CONSULTATIONS = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    doctorName: 'Dr. Sarah Chen',
    doctorDesignation: 'Senior Consultant Cardiologist',
    date: '2026-08-10',
    diagnosis: 'Stage 1 Essential Hypertension with sinus rhythm',
    recommendedTests: ['Complete Blood Count (CBC)', 'Lipid Panel', 'Resting ECG'],
    medicines: [
      { name: 'Lisinopril', dosage: '10mg once daily in morning', duration: '30 Days' },
      { name: 'Amlodipine', dosage: '5mg once daily', duration: '30 Days' }
    ],
    notes: 'Patient presented with mild morning headaches and recorded BP 142/92 mmHg over 3 consecutive clinic visits. Denies chest pain, palpitation, or dyspnea. Advised DASH diet, sodium restriction < 2g/day, and routine aerobic exercise. Follow-up in 4 weeks.'
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    doctorName: 'Dr. Michael Chang',
    doctorDesignation: 'Consultant Pulmonologist',
    date: '2026-07-18',
    diagnosis: 'Mild Seasonal Allergic Asthma exacerbation',
    recommendedTests: ['Chest X-Ray', 'Total Serum IgE'],
    medicines: [
      { name: 'Salbutamol (Ventolin) Inhaler', dosage: '2 puffs as needed for wheeze', duration: 'As needed' }
    ],
    notes: 'Occasional nocturnal dry cough following high pollen exposure. Spirometry showed FEV1 84% predicted, fully responsive to bronchodilators. Avoid known triggers.'
  }
];

const INITIAL_LAB_REPORTS = [
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    testTitle: 'Complete Blood Count (CBC)',
    category: 'Haematology',
    orderedDoctor: 'Dr. Sarah Chen',
    date: '2026-08-11',
    status: 'Completed',
    fileName: 'CBC_Report_PAT1001.pdf',
    resultsSummary: 'WBC: 6.8 x10^3/uL (Normal), RBC: 4.9 x10^6/uL, Hemoglobin: 14.8 g/dL, Platelets: 240 x10^3/uL.'
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    testTitle: 'Fasting Lipid Profile',
    category: 'Biochemistry',
    orderedDoctor: 'Dr. Sarah Chen',
    date: '2026-08-11',
    status: 'Completed',
    fileName: 'Lipid_Profile_PAT1001.pdf',
    resultsSummary: 'Total Cholesterol: 185 mg/dL (Normal < 200), HDL: 48 mg/dL, LDL: 112 mg/dL, Triglycerides: 125 mg/dL.'
  },
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    testTitle: 'Resting 12-Lead Electrocardiogram (ECG)',
    category: 'Cardiology',
    orderedDoctor: 'Dr. Sarah Chen',
    date: '2026-08-15',
    status: 'Pending',
    fileName: 'ECG_Order_PAT1001.pdf',
    resultsSummary: 'Specimen collected; awaiting cardiologist interpretation signature.'
  }
];

const INITIAL_PRESCRIPTIONS = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    medication: 'Lisinopril 10mg',
    unitPrice: '$12.50',
    dosage: 'Take 1 tablet by mouth daily in the morning with water',
    duration: '30 Days',
    startDate: '2026-08-10',
    endDate: '2026-09-09',
    prescribedDoctor: 'Dr. Sarah Chen',
    status: 'Active'
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    medication: 'Amlodipine 5mg',
    unitPrice: '$10.00',
    dosage: 'Take 1 tablet daily with or without food',
    duration: '30 Days',
    startDate: '2026-08-10',
    endDate: '2026-09-09',
    prescribedDoctor: 'Dr. Sarah Chen',
    status: 'Active'
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    medication: 'Amoxicillin 500mg',
    unitPrice: '$15.00',
    dosage: 'Take 1 capsule every 8 hours for 7 days',
    duration: '7 Days',
    startDate: '2026-06-01',
    endDate: '2026-06-08',
    prescribedDoctor: 'Dr. Michael Chang',
    status: 'Completed'
  }
];

class EmrStore {
  constructor() {
    this.listeners = [];
    this.isSyncing = false;
    this.loadData();
    this.syncFromBackend();
  }

  loadData() {
    this.patients = JSON.parse(localStorage.getItem('emr_patients')) || INITIAL_PATIENTS;
    this.consultations = JSON.parse(localStorage.getItem('emr_consultations')) || INITIAL_CONSULTATIONS;
    this.labReports = JSON.parse(localStorage.getItem('emr_labReports')) || INITIAL_LAB_REPORTS;
    this.prescriptions = JSON.parse(localStorage.getItem('emr_prescriptions')) || INITIAL_PRESCRIPTIONS;
  }

  saveData() {
    localStorage.setItem('emr_patients', JSON.stringify(this.patients));
    localStorage.setItem('emr_consultations', JSON.stringify(this.consultations));
    localStorage.setItem('emr_labReports', JSON.stringify(this.labReports));
    localStorage.setItem('emr_prescriptions', JSON.stringify(this.prescriptions));
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => {
      try { listener(); } catch (e) { console.error('[EmrStore] Listener error:', e); }
    });
  }

  // â”€â”€ Sync with Live PostgreSQL Backend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async syncFromBackend() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      // 1. Fetch Patients
      const apiPatients = await emrApi.getPatients();
      if (Array.isArray(apiPatients) && apiPatients.length > 0) {
        this.patients = apiPatients.map(p => ({
          id: p.patientCode,
          backendGuid: p.id,
          name: p.fullName,
          age: p.age,
          gender: p.gender,
          phone: p.contactPhone,
          bloodGroup: p.bloodGroup,
          allergies: p.allergies,
          chronicConditions: p.chronicConditions
        }));
      }

      // 2. Fetch Consultations
      const apiConsults = await emrApi.getConsultations();
      if (Array.isArray(apiConsults)) {
        this.consultations = apiConsults.map(c => {
          let meds = [];
          try {
            meds = typeof c.prescribedMedicines === 'string' ? JSON.parse(c.prescribedMedicines) : (c.prescribedMedicines || []);
          } catch (e) {
            meds = [];
          }
          let tests = [];
          if (Array.isArray(c.recommendedTests)) {
            tests = c.recommendedTests;
          } else if (typeof c.recommendedTests === 'string') {
            tests = c.recommendedTests.split(',').map(s => s.trim()).filter(Boolean);
          }

          return {
            id: c.id,
            patientId: c.patientCode,
            patientName: this.getPatientName(c.patientCode),
            doctorName: c.doctorName,
            doctorDesignation: c.doctorDesignation,
            date: c.consultationDate ? c.consultationDate.split('T')[0] : '',
            diagnosis: c.diagnosis,
            recommendedTests: tests,
            medicines: meds,
            notes: c.clinicalNotes
          };
        });
      }

      // 3. Fetch Lab Reports
      const apiLabs = await emrApi.getLabReports();
      if (Array.isArray(apiLabs)) {
        this.labReports = apiLabs.map(l => ({
          id: l.id,
          patientId: l.patientCode,
          patientName: this.getPatientName(l.patientCode),
          testTitle: l.testTitle,
          category: l.category,
          orderedDoctor: l.orderedDoctor,
          date: l.reportDate ? l.reportDate.split('T')[0] : '',
          status: l.status,
          fileName: l.fileName || 'Report.pdf',
          resultsSummary: l.resultsSummary
        }));
      }

      // 4. Fetch Prescriptions
      const apiRxs = await emrApi.getPrescriptions();
      if (Array.isArray(apiRxs)) {
        this.prescriptions = apiRxs.map(p => ({
          id: p.id,
          patientId: p.patientCode,
          patientName: this.getPatientName(p.patientCode),
          medication: p.medicationName,
          unitPrice: '$' + (p.unitPrice || 0).toFixed(2),
          dosage: p.dosage,
          duration: p.duration,
          startDate: p.startDate ? p.startDate.split('T')[0] : '',
          endDate: p.endDate ? p.endDate.split('T')[0] : '',
          prescribedDoctor: p.prescribedDoctor,
          status: p.status
        }));
      }

      this.saveData();
      console.log('[EmrStore] Successfully synced live data from PostgreSQL API');
    } catch (err) {
      console.warn('[EmrStore] Backend offline or unreachable, using local cache:', err.message);
    } finally {
      this.isSyncing = false;
    }
  }

  getPatientName(patientCode) {
    const p = this.patients.find(pt => pt.id === patientCode);
    return p ? p.name : patientCode;
  }

  // â”€â”€ Patients API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getPatients() { return this.patients; }

  async addPatient(patient) {
    this.patients.unshift(patient);
    this.saveData();
    try {
      await emrApi.createPatient({
        patientCode: patient.id,
        fullName: patient.name,
        dateOfBirth: new Date(Date.now() - (patient.age || 30) * 365.25 * 24 * 3600 * 1000).toISOString(),
        gender: patient.gender || 'Other',
        bloodGroup: patient.bloodGroup || 'Unknown',
        contactPhone: patient.phone || '',
        allergies: patient.allergies || '',
        chronicConditions: patient.chronicConditions || ''
      });
      this.syncFromBackend();
    } catch (e) {
      console.warn('[EmrStore] Error saving patient to API:', e);
    }
  }

  updatePatient(id, updatedData) {
    this.patients = this.patients.map(p => p.id === id ? { ...p, ...updatedData } : p);
    this.saveData();
  }

  deletePatient(id) {
    this.patients = this.patients.filter(p => p.id !== id);
    this.saveData();
  }

  // â”€â”€ Consultation Notes API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getConsultations(patientId = null) {
    if (!patientId) return this.consultations;
    return this.consultations.filter(c => c.patientId === patientId);
  }

  async addConsultation(note) {
    this.consultations.unshift(note);
    this.saveData();
    try {
      await emrApi.createConsultation({
        patientCode: note.patientId,
        doctorId: note.doctorId || 'DOC-101',
        doctorName: note.doctorName,
        doctorDesignation: note.doctorDesignation,
        diagnosis: note.diagnosis,
        recommendedTests: Array.isArray(note.recommendedTests) ? note.recommendedTests.join(', ') : (note.recommendedTests || ''),
        prescribedMedicines: JSON.stringify(note.medicines || []),
        clinicalNotes: note.notes || note.clinicalNotes || ''
      });
      this.syncFromBackend();
    } catch (e) {
      console.warn('[EmrStore] Error saving consultation to API:', e);
    }
  }

  updateConsultation(id, updatedData) {
    this.consultations = this.consultations.map(c => c.id === id ? { ...c, ...updatedData } : c);
    this.saveData();
  }

  async deleteConsultation(id) {
    this.consultations = this.consultations.filter(c => c.id !== id);
    this.saveData();
    try {
      await emrApi.deleteConsultation(id);
    } catch (e) {
      console.warn('[EmrStore] Error deleting consultation from API:', e);
    }
  }

  // â”€â”€ Lab Reports API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getLabReports(patientId = null) {
    if (!patientId) return this.labReports;
    return this.labReports.filter(l => l.patientId === patientId);
  }

  async addLabReport(report) {
    this.labReports.unshift(report);
    this.saveData();
    try {
      await emrApi.createLabReport({
        patientCode: report.patientId,
        testTitle: report.testTitle,
        category: report.category || 'General',
        orderedDoctor: report.orderedDoctor || 'Attending Physician',
        status: report.status || 'Pending',
        fileName: report.fileName || '',
        resultsSummary: report.resultsSummary || ''
      });
      this.syncFromBackend();
    } catch (e) {
      console.warn('[EmrStore] Error saving lab report to API:', e);
    }
  }

  async updateLabReport(id, updatedData) {
    this.labReports = this.labReports.map(l => l.id === id ? { ...l, ...updatedData } : l);
    this.saveData();
    if (updatedData.status) {
      try {
        await emrApi.updateLabReportStatus(id, updatedData.status, updatedData.resultsSummary || '');
      } catch (e) {
        console.warn('[EmrStore] Error updating lab status in API:', e);
      }
    }
  }

  async deleteLabReport(id) {
    this.labReports = this.labReports.filter(l => l.id !== id);
    this.saveData();
    try {
      await emrApi.deleteLabReport(id);
    } catch (e) {
      console.warn('[EmrStore] Error deleting lab report from API:', e);
    }
  }

  // â”€â”€ Pharmacy Prescriptions API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  getPrescriptions(patientId = null) {
    if (!patientId) return this.prescriptions;
    return this.prescriptions.filter(p => p.patientId === patientId);
  }

  async addPrescription(rx) {
    this.prescriptions.unshift(rx);
    this.saveData();
    try {
      const priceVal = parseFloat(String(rx.unitPrice || '0').replace('$', '')) || 0;
      await emrApi.createPrescription({
        patientCode: rx.patientId,
        medicationName: rx.medication,
        dosage: rx.dosage,
        duration: rx.duration || '7 Days',
        unitPrice: priceVal,
        prescribedDoctor: rx.prescribedDoctor || 'Attending Physician',
        status: rx.status || 'Active'
      });
      this.syncFromBackend();
    } catch (e) {
      console.warn('[EmrStore] Error saving prescription to API:', e);
    }
  }

  async updatePrescription(id, updatedData) {
    this.prescriptions = this.prescriptions.map(p => p.id === id ? { ...p, ...updatedData } : p);
    this.saveData();
    if (updatedData.status) {
      try {
        await emrApi.updatePrescriptionStatus(id, updatedData.status);
      } catch (e) {
        console.warn('[EmrStore] Error updating prescription in API:', e);
      }
    }
  }

  async deletePrescription(id) {
    this.prescriptions = this.prescriptions.filter(p => p.id !== id);
    this.saveData();
    try {
      await emrApi.deletePrescription(id);
    } catch (e) {
      console.warn('[EmrStore] Error deleting prescription from API:', e);
    }
  }
}

export const emrStore = new EmrStore();

