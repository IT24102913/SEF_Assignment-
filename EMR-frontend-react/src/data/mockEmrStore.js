// Central Shared EMR Store with LocalStorage Persistence & Event Listeners

const INITIAL_PATIENTS = [
  { id: 'PAT-1001', name: 'John Anderson', age: 34, gender: 'Male', phone: '+1 555-0192', bloodGroup: 'O+' },
  { id: 'PAT-1002', name: 'Emily Watson', age: 28, gender: 'Female', phone: '+1 555-0184', bloodGroup: 'A+' },
  { id: 'PAT-1003', name: 'David Miller', age: 45, gender: 'Male', phone: '+1 555-0147', bloodGroup: 'B-' },
  { id: 'PAT-1004', name: 'Sophia Chen', age: 52, gender: 'Female', phone: '+1 555-0133', bloodGroup: 'AB+' },
  { id: 'PAT-1005', name: 'Marcus Vance', age: 23, gender: 'Male', phone: '+1 555-0168', bloodGroup: 'O-' },
];

const INITIAL_CONSULTATIONS = [
  {
    id: 'CN-1024',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    doctorName: 'Dr. Sarah Jenkins',
    doctorDesignation: 'Senior Cardiologist (MD)',
    date: '2026-08-10',
    diagnosis: 'Mild hypertension & seasonal fatigue',
    recommendedTests: ['Complete Blood Count (CBC)', 'Lipid Profile Panel'],
    medicines: [
      { name: 'Amoxicillin 500mg', dosage: 'Take 1 capsule every 8 hours with meals', duration: '7 Days' },
      { name: 'Cetirizine 10mg', dosage: 'Take 1 tablet daily at night', duration: '14 Days' }
    ],
    notes: 'Patient reports occasional headache and tiredness. Blood pressure recorded at 135/85 mmHg. Recommended low-sodium diet and 30-min daily walks.'
  },
  {
    id: 'CN-1011',
    patientId: 'PAT-1002',
    patientName: 'Emily Watson',
    doctorName: 'Dr. Michael Chang',
    doctorDesignation: 'General Practitioner',
    date: '2026-07-22',
    diagnosis: 'Acute Rhinitis',
    recommendedTests: ['Allergy Panel'],
    medicines: [
      { name: 'Loratadine 10mg', dosage: '1 tablet once daily', duration: '10 Days' }
    ],
    notes: 'Prescribed antihistamines. Advised avoidance of known pollen allergens.'
  }
];

const INITIAL_LAB_REPORTS = [
  {
    id: 'LAB-8042',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    testTitle: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    orderedDoctor: 'Dr. Sarah Jenkins',
    date: '2026-08-05',
    status: 'Completed',
    fileName: 'CBC_Report_JohnAnderson.pdf',
    addedBy: 'LAB-202 (Lab Tech)'
  },
  {
    id: 'LAB-7910',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    testTitle: 'Lipid Profile Panel',
    category: 'Biochemistry',
    orderedDoctor: 'Dr. Sarah Jenkins',
    date: '2026-08-12',
    status: 'Pending',
    fileName: 'Pending_Lipid_Panel.pdf',
    addedBy: 'LAB-202 (Lab Tech)'
  }
];

const INITIAL_PRESCRIPTIONS = [
  {
    id: 'RX-9912',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    medication: 'Amoxicillin 500mg',
    unitPrice: '$15.00',
    dosage: 'Take 1 capsule every 8 hours with meals',
    duration: '7 Days',
    startDate: '2026-08-10',
    endDate: '2026-08-17',
    prescribedDoctor: 'Dr. Sarah Jenkins',
    status: 'Active',
    addedBy: 'PHARM-303 (Pharmacist)'
  },
  {
    id: 'RX-9850',
    patientId: 'PAT-1001',
    patientName: 'John Anderson',
    medication: 'Cetirizine 10mg',
    unitPrice: '$8.50',
    dosage: 'Take 1 tablet daily at night',
    duration: '14 Days',
    startDate: '2026-07-20',
    endDate: '2026-08-03',
    prescribedDoctor: 'Dr. Michael Chang',
    status: 'Completed',
    addedBy: 'PHARM-303 (Pharmacist)'
  }
];

class EmrStore {
  constructor() {
    this.listeners = [];
    this.loadData();
  }

  loadData() {
    this.patients = JSON.parse(localStorage.getItem('emr_patients')) || INITIAL_PATIENTS;
    this.consultations = JSON.parse(localStorage.getItem('emr_consultations')) || INITIAL_CONSULTATIONS;
    this.labReports = JSON.parse(localStorage.getItem('emr_labReports')) || INITIAL_LAB_REPORTS;
    this.prescriptions = JSON.parse(localStorage.getItem('emr_prescriptions')) || INITIAL_PRESCRIPTIONS;
    this.checkPrescriptionStatuses();
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
    this.listeners.forEach(listener => listener());
  }

  // Check if prescription duration has ended to automatically flip status from Active to Completed
  checkPrescriptionStatuses() {
    const today = new Date().toISOString().split('T')[0];
    let updated = false;
    this.prescriptions.forEach(rx => {
      if (rx.endDate && rx.endDate < today && rx.status === 'Active') {
        rx.status = 'Completed';
        updated = true;
      }
    });
    if (updated) this.saveData();
  }

  // --- Patients API ---
  getPatients() { return this.patients; }
  addPatient(patient) {
    this.patients.unshift(patient);
    this.saveData();
  }
  updatePatient(id, updatedData) {
    this.patients = this.patients.map(p => p.id === id ? { ...p, ...updatedData } : p);
    this.saveData();
  }
  deletePatient(id) {
    this.patients = this.patients.filter(p => p.id !== id);
    this.saveData();
  }

  // --- Consultation Notes API (Consultant / Admin) ---
  getConsultations(patientId = null) {
    if (!patientId) return this.consultations;
    return this.consultations.filter(c => c.patientId === patientId);
  }
  addConsultation(note) {
    this.consultations.unshift(note);
    this.saveData();
  }
  updateConsultation(id, updatedData) {
    this.consultations = this.consultations.map(c => c.id === id ? { ...c, ...updatedData } : c);
    this.saveData();
  }
  deleteConsultation(id) {
    this.consultations = this.consultations.filter(c => c.id !== id);
    this.saveData();
  }

  // --- Lab Reports API (Laboratorian / Admin) ---
  getLabReports(patientId = null) {
    if (!patientId) return this.labReports;
    return this.labReports.filter(l => l.patientId === patientId);
  }
  addLabReport(report) {
    this.labReports.unshift(report);
    this.saveData();
  }
  updateLabReport(id, updatedData) {
    this.labReports = this.labReports.map(l => l.id === id ? { ...l, ...updatedData } : l);
    this.saveData();
  }
  deleteLabReport(id) {
    this.labReports = this.labReports.filter(l => l.id !== id);
    this.saveData();
  }

  // --- Pharmacy Prescriptions API (Pharmacist / Admin) ---
  getPrescriptions(patientId = null) {
    if (!patientId) return this.prescriptions;
    return this.prescriptions.filter(p => p.patientId === patientId);
  }
  addPrescription(rx) {
    this.prescriptions.unshift(rx);
    this.saveData();
  }
  updatePrescription(id, updatedData) {
    this.prescriptions = this.prescriptions.map(p => p.id === id ? { ...p, ...updatedData } : p);
    this.saveData();
  }
  deletePrescription(id) {
    this.prescriptions = this.prescriptions.filter(p => p.id !== id);
    this.saveData();
  }
}

export const emrStore = new EmrStore();
