// Role-based notification engine for Medix / HealthBridge EMR

export function getRoleNotifications(user = {}) {
  const role = (user.role || 'Patient').trim();
  const userName = user.fullName || user.name || 'User';
  const patientCode = user.patientCode || '';
  const storageKey = `emr_notifs_${user.id || role}_${patientCode || 'default'}`;

  // Check if saved state exists in localStorage
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Generate fresh role-based notifications
  let notifs = [];

  switch (role) {
    case 'Doctor':
      notifs = [
        {
          id: 'd-queue',
          role: 'Doctor',
          title: 'Clinical Consultation Queue',
          message: 'Outpatient consultation sessions are active. Review pending patient history before starting sessions.',
          time: '10 mins ago',
          unread: true,
          category: 'Consultations',
          priority: 'High',
          badgeColor: '#ef4444',
          link: '/emr/staff'
        },
        {
          id: 'd-emr',
          role: 'Doctor',
          title: 'Patient Medical Charts Updated',
          message: 'New patient profiles registered. Emergency allergies and chronic conditions are flagged automatically.',
          time: '1 hour ago',
          unread: true,
          category: 'EMR Records',
          priority: 'Normal',
          badgeColor: '#095e51',
          link: '/emr/staff'
        },
        {
          id: 'd-lab',
          role: 'Doctor',
          title: 'Lab Diagnostics Awaiting Review',
          message: 'Verified pathology results (Complete Blood Count, Lipid Panel) are ready for physician evaluation.',
          time: '3 hours ago',
          unread: false,
          category: 'Diagnostics',
          priority: 'Normal',
          badgeColor: '#3b82f6',
          link: '/emr/staff'
        },
        {
          id: 'd-safety',
          role: 'Doctor',
          title: 'Prescription Safety Engine Active',
          message: 'Drug interaction check and patient allergy alerts are active across all electronic prescriptions.',
          time: 'Today',
          unread: false,
          category: 'Clinical Safety',
          priority: 'Low',
          badgeColor: '#10b981',
          link: '/emr/staff'
        }
      ];
      break;

    case 'Pharmacist':
      notifs = [
        {
          id: 'rx-queue',
          role: 'Pharmacist',
          title: 'New Prescriptions for Dispensing',
          message: 'Physician prescriptions submitted from outpatient clinics are queued for dispensing.',
          time: '5 mins ago',
          unread: true,
          category: 'Prescriptions',
          priority: 'High',
          badgeColor: '#ef4444',
          link: '/pharmacy/dashboard'
        },
        {
          id: 'rx-allergy',
          role: 'Pharmacist',
          title: 'Allergy Verification Guard',
          message: 'Cross-check patient allergies before dispensing penicillin, sulfa, or NSAID medications.',
          time: '45 mins ago',
          unread: true,
          category: 'Safety',
          priority: 'High',
          badgeColor: '#f97316',
          link: '/emr/staff'
        },
        {
          id: 'rx-inv',
          role: 'Pharmacist',
          title: 'Pharmacy Formulary Synchronized',
          message: 'Medicine inventory counts automatically updated on order fulfillment.',
          time: '2 hours ago',
          unread: false,
          category: 'Inventory',
          priority: 'Normal',
          badgeColor: '#095e51',
          link: '/pharmacy/medicines'
        },
        {
          id: 'rx-dispense',
          role: 'Pharmacist',
          title: 'Dispensing Audit Log',
          message: 'Medication lot numbers and batch expirations recorded for regulatory compliance.',
          time: 'Yesterday',
          unread: false,
          category: 'Compliance',
          priority: 'Low',
          badgeColor: '#64748b',
          link: '/pharmacy/orders'
        }
      ];
      break;

    case 'Laboratory':
      notifs = [
        {
          id: 'lab-req',
          role: 'Laboratory',
          title: 'New Diagnostic Work Orders',
          message: 'Doctor-ordered lab investigations (Hematology, Biochemistry) waiting for specimen intake.',
          time: '8 mins ago',
          unread: true,
          category: 'Work Orders',
          priority: 'High',
          badgeColor: '#ef4444',
          link: '/lab/staff/dashboard'
        },
        {
          id: 'lab-specimen',
          role: 'Laboratory',
          title: 'Specimen Verification Required',
          message: 'Specimen barcoding and tube validation checklist pending for morning collection batch.',
          time: '1 hour ago',
          unread: true,
          category: 'Specimens',
          priority: 'Normal',
          badgeColor: '#f97316',
          link: '/lab/staff/dashboard'
        },
        {
          id: 'lab-upload',
          role: 'Laboratory',
          title: 'Patient Result Notification',
          message: 'Uploaded diagnostic reports automatically notify patients and update their Health Passport.',
          time: '3 hours ago',
          unread: false,
          category: 'Reports',
          priority: 'Normal',
          badgeColor: '#095e51',
          link: '/lab/staff/upload'
        },
        {
          id: 'lab-qc',
          role: 'Laboratory',
          title: 'Daily Calibration Check Passed',
          message: 'Biochemical auto-analyzer calibrated with zero baseline drift.',
          time: 'Today',
          unread: false,
          category: 'Quality Control',
          priority: 'Low',
          badgeColor: '#10b981',
          link: '/lab/staff/dashboard'
        }
      ];
      break;

    case 'Admin':
      notifs = [
        {
          id: 'adm-db',
          role: 'Admin',
          title: 'PostgreSQL Database Live Sync',
          message: 'EMR Patients, Consultations, and Lab reports synchronized with zero replication lag.',
          time: 'Just now',
          unread: true,
          category: 'System Health',
          priority: 'High',
          badgeColor: '#10b981',
          link: '/admin/dashboard'
        },
        {
          id: 'adm-sec',
          role: 'Admin',
          title: 'Role-Based Access Enforcement',
          message: 'JWT authentication active across Patient, Doctor, Pharmacist, and Laboratory roles.',
          time: '30 mins ago',
          unread: true,
          category: 'Security',
          priority: 'Normal',
          badgeColor: '#095e51',
          link: '/admin/users'
        },
        {
          id: 'adm-audit',
          role: 'Admin',
          title: 'Clinical Audit Trail Active',
          message: 'Patient medical chart accesses and prescription updates logged with UTC timestamps.',
          time: '2 hours ago',
          unread: false,
          category: 'Audit Logs',
          priority: 'Normal',
          badgeColor: '#3b82f6',
          link: '/emr/staff'
        },
        {
          id: 'adm-backup',
          role: 'Admin',
          title: 'Automated Clinical Snapshot Ready',
          message: 'Encrypted daily backup verified for disaster recovery and HIPAA compliance.',
          time: 'Today',
          unread: false,
          category: 'Backup',
          priority: 'Low',
          badgeColor: '#64748b',
          link: '/admin/dashboard'
        }
      ];
      break;

    case 'Patient':
    default:
      notifs = [
        {
          id: 'p-profile',
          role: 'Patient',
          title: 'Complete Your Health Passport',
          message: 'Your medical details (Date of Birth, Blood Group, Emergency Contact) are editable in your Health Passport.',
          time: 'Action Required',
          unread: true,
          category: 'Profile',
          priority: 'High',
          badgeColor: '#f97316',
          link: '/emr/profile'
        },
        {
          id: 'p-safety',
          role: 'Patient',
          title: 'Clinical Allergy Safety Active',
          message: 'Your health records are actively screened. Any prescribed medications will be cross-checked against your recorded allergies.',
          time: '20 mins ago',
          unread: true,
          category: 'Safety',
          priority: 'Normal',
          badgeColor: '#095e51',
          link: '/emr/profile'
        },
        {
          id: 'p-id',
          role: 'Patient',
          title: `EMR Account ID: ${patientCode || 'PAT-100X'}`,
          message: `Welcome, ${userName}! Your digital health records are initialized and securely isolated to your account.`,
          time: 'Today',
          unread: false,
          category: 'Account',
          priority: 'Normal',
          badgeColor: '#3b82f6',
          link: '/emr/overview'
        },
        {
          id: 'p-channeling',
          role: 'Patient',
          title: 'Doctor Channeling & Sessions',
          message: 'Book appointments with specialist doctors and review appointment history in Channeling History.',
          time: '1 day ago',
          unread: false,
          category: 'Appointments',
          priority: 'Normal',
          badgeColor: '#8b5cf6',
          link: '/emr/channeling-history'
        },
        {
          id: 'p-security',
          role: 'Patient',
          title: 'Secure Account Session',
          message: `Signed in to HealthBridge EMR via secure session for ${user.email || 'patient account'}.`,
          time: '2 days ago',
          unread: false,
          category: 'Security',
          priority: 'Low',
          badgeColor: '#64748b',
          link: '/emr/profile'
        }
      ];
      break;
  }

  // Save initial list
  try {
    localStorage.setItem(storageKey, JSON.stringify(notifs));
  } catch {}

  return notifs;
}

export function markNotificationAsRead(user = {}, notifId) {
  const role = (user.role || 'Patient').trim();
  const patientCode = user.patientCode || '';
  const storageKey = `emr_notifs_${user.id || role}_${patientCode || 'default'}`;
  try {
    const list = getRoleNotifications(user);
    const updated = list.map(n => n.id === notifId ? { ...n, unread: false } : n);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function markAllNotificationsAsRead(user = {}) {
  const role = (user.role || 'Patient').trim();
  const patientCode = user.patientCode || '';
  const storageKey = `emr_notifs_${user.id || role}_${patientCode || 'default'}`;
  try {
    const list = getRoleNotifications(user);
    const updated = list.map(n => ({ ...n, unread: false }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
