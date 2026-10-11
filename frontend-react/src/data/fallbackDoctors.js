import docImg from '../assets/doctor.jpg';
import doc1Img from '../assets/doctor1.jpg';
import doc2Img from '../assets/doctor2.jpg';
import doc7Img from '../assets/doctor7.jpg';

export const FALLBACK_DOCTORS = [
  {
    id: 1,
    fullName: 'Dr. Anjali Perera',
    specialization: 'Cardiology',
    qualifications: 'MD, FRCP - Cardiologist',
    hospital: 'Health Bridge Hospital - Colombo',
    hospitalBranch: 'Health Bridge Hospital - Colombo',
    roomNumber: 'Suite 201, 2nd Floor',
    consultationFee: 2500.00,
    availableDays: 'Mon, Tue, Wed, Thu, Fri',
    availableTime: '08:00 AM - 04:00 PM',
    imageUrl: docImg,
    phoneNumber: '+94 76 447 7999',
    rating: 4.9,
    reviewCount: 142,
    experienceYears: 15,
    isVerifiedConsultant: true,
    bio: 'Specializing in interventional cardiology, coronary artery disease, and heart failure management.',
    email: 'doctor@gmail.com',
    isAvailable: true,
    availableToday: true,
    availableTomorrow: true,
    slotsLeft: 22
  },
  {
    id: 2,
    fullName: 'Dr. M.T.D Lakshan',
    specialization: 'ENT',
    qualifications: 'MBBS, MS (ENT), FRCS - Consultant ENT Surgeon',
    hospital: 'Health Bridge Hospital - Colombo',
    hospitalBranch: 'Health Bridge Hospital - Colombo',
    roomNumber: 'Suite 104, 1st Floor',
    consultationFee: 2500.00,
    availableDays: 'Mon, Tue, Wed, Thu, Fri',
    availableTime: '08:00 AM - 04:00 PM',
    imageUrl: doc1Img,
    phoneNumber: '+94 76 447 7888',
    rating: 4.9,
    reviewCount: 120,
    experienceYears: 18,
    isVerifiedConsultant: true,
    bio: 'Specialist in Ear, Nose & Throat disorders, endoscopic sinus surgery, and Head & Neck surgery.',
    email: 'lakshan.ent@healthbridge.com',
    isAvailable: true,
    availableToday: true,
    availableTomorrow: true,
    slotsLeft: 18
  },
  {
    id: 3,
    fullName: 'Dr. Malya Gunasekara',
    specialization: 'General Medicine',
    qualifications: 'MBBS, MD, MRCP - Consultant Physician & Gastroenterologist',
    hospital: 'Health Bridge Hospital - Colombo',
    hospitalBranch: 'Health Bridge Hospital - Colombo',
    roomNumber: 'Suite 108, 1st Floor',
    consultationFee: 3200.00,
    availableDays: 'Mon, Tue, Wed, Thu, Fri',
    availableTime: '08:00 AM - 04:00 PM',
    imageUrl: doc2Img,
    phoneNumber: '+94 76 447 7999',
    rating: 4.8,
    reviewCount: 95,
    experienceYears: 22,
    isVerifiedConsultant: true,
    bio: 'Expertise in adult internal medicine, lifestyle illnesses, and digestive wellness.',
    email: 'malya.physician@healthbridge.com',
    isAvailable: true,
    availableToday: true,
    availableTomorrow: true,
    slotsLeft: 20
  },
  {
    id: 4,
    fullName: 'Dr. Pumsith Gunawardena',
    specialization: 'Neurology',
    qualifications: 'MBBS, MD (Neuro), FCPS - Consultant Neurosurgeon',
    hospital: 'Health Bridge Hospital - Kandy',
    hospitalBranch: 'Health Bridge Hospital - Kandy',
    roomNumber: 'Suite 305, 3rd Floor',
    consultationFee: 4000.00,
    availableDays: 'Mon, Tue, Wed, Thu, Fri',
    availableTime: '08:00 AM - 04:00 PM',
    imageUrl: doc7Img,
    phoneNumber: '+94 81 223 4567',
    rating: 4.7,
    reviewCount: 78,
    experienceYears: 15,
    isVerifiedConsultant: true,
    bio: 'Brain & spinal cord surgery, stroke rehabilitation, and minimally invasive neurological interventions.',
    email: 'pumsith.neuro@healthbridge.com',
    isAvailable: true,
    availableToday: true,
    availableTomorrow: true,
    slotsLeft: 14
  },
  {
    id: 5,
    fullName: 'Dr. Rohan Wickramasinghe',
    specialization: 'Orthopaedics',
    qualifications: 'MBBS, MS (Ortho), FRCS - Orthopaedic Surgeon',
    hospital: 'Health Bridge Hospital - Colombo',
    hospitalBranch: 'Health Bridge Hospital - Colombo',
    roomNumber: 'Suite 204, 2nd Floor',
    consultationFee: 3500.00,
    availableDays: 'Mon, Tue, Wed, Thu, Fri',
    availableTime: '09:00 AM - 04:00 PM',
    imageUrl: docImg,
    phoneNumber: '+94 76 447 7999',
    rating: 4.9,
    reviewCount: 110,
    experienceYears: 20,
    isVerifiedConsultant: true,
    bio: 'Specializing in joint replacement, sports injury reconstruction, and spine surgery.',
    email: 'rohan.ortho@healthbridge.com',
    isAvailable: true,
    availableToday: true,
    availableTomorrow: true,
    slotsLeft: 16
  },
  {
    id: 6,
    fullName: 'Dr. Malith Silva',
    specialization: 'Paediatrics',
    qualifications: 'MBBS, DCH, MD (Paediatrics) - Consultant Paediatrician',
    hospital: 'Health Bridge Hospital - Kandy',
    hospitalBranch: 'Health Bridge Hospital - Kandy',
    roomNumber: 'Suite 102, 1st Floor',
    consultationFee: 2800.00,
    availableDays: 'Mon, Tue, Wed, Thu, Fri',
    availableTime: '08:00 AM - 03:00 PM',
    imageUrl: doc2Img,
    phoneNumber: '+94 81 223 4568',
    rating: 4.8,
    reviewCount: 88,
    experienceYears: 10,
    isVerifiedConsultant: true,
    bio: 'Dedicated paediatric care, newborn health assessment, immunization, and adolescent growth.',
    email: 'malith.paed@healthbridge.com',
    isAvailable: true,
    availableToday: true,
    availableTomorrow: true,
    slotsLeft: 19
  },
  {
    id: 7,
    fullName: 'Dr. Nilmini Senanayake',
    specialization: 'Gynaecology',
    qualifications: 'MBBS, MS (Obs & Gynae), FRCOG - Consultant Obstetrician & Gynaecologist',
    hospital: 'Health Bridge Hospital - Kandy',
    hospitalBranch: 'Health Bridge Hospital - Kandy',
    roomNumber: 'Suite 206, 2nd Floor',
    consultationFee: 3600.00,
    availableDays: 'Mon, Tue, Wed, Thu, Fri',
    availableTime: '08:30 AM - 04:00 PM',
    imageUrl: doc1Img,
    phoneNumber: '+94 81 223 4569',
    rating: 4.9,
    reviewCount: 135,
    experienceYears: 17,
    isVerifiedConsultant: true,
    bio: 'Comprehensive maternal and foetal health, laparoscopic gynaecological procedures, and fertility counsel.',
    email: 'nilmini.gynae@healthbridge.com',
    isAvailable: true,
    availableToday: true,
    availableTomorrow: true,
    slotsLeft: 21
  },
  {
    id: 8,
    fullName: 'Dr. Rashmi Fernando',
    specialization: 'Dermatology',
    qualifications: 'MBBS, MD (Dermatology) - Consultant Dermatologist',
    hospital: 'Health Bridge Hospital - Colombo',
    hospitalBranch: 'Health Bridge Hospital - Colombo',
    roomNumber: 'Suite 112, 1st Floor',
    consultationFee: 3000.00,
    availableDays: 'Mon, Tue, Wed, Thu, Fri',
    availableTime: '09:00 AM - 04:00 PM',
    imageUrl: doc7Img,
    phoneNumber: '+94 76 447 7999',
    rating: 4.8,
    reviewCount: 92,
    experienceYears: 14,
    isVerifiedConsultant: true,
    bio: 'Advanced clinical dermatology, allergy testing, acne and eczema management, and aesthetic therapies.',
    email: 'rashmi.derma@healthbridge.com',
    isAvailable: true,
    availableToday: true,
    availableTomorrow: true,
    slotsLeft: 17
  }
];


export const parseDoctorAvailableDays = (daysStr) => {
  if (!daysStr) return [1, 2, 3, 4, 5];
  const str = daysStr.toLowerCase();
  const set = new Set();
  if (str.includes('mon - fri') || str.includes('mon-fri') || str.includes('weekdays')) {
    [1, 2, 3, 4, 5].forEach(d => set.add(d));
  }
  if (str.includes('all') || str.includes('daily') || str.includes('everyday')) {
    [0, 1, 2, 3, 4, 5, 6].forEach(d => set.add(d));
  }
  if (str.includes('weekend')) {
    set.add(0); set.add(6);
  }
  if (str.includes('sun')) set.add(0);
  if (str.includes('mon')) set.add(1);
  if (str.includes('tue')) set.add(2);
  if (str.includes('wed')) set.add(3);
  if (str.includes('thu')) set.add(4);
  if (str.includes('fri')) set.add(5);
  if (str.includes('sat')) set.add(6);

  return set.size > 0 ? Array.from(set) : [1, 3, 5];
};

export const parseDoctorSessionTypes = (timeStr, isGenMed = false) => {
  if (!timeStr) {
    return isGenMed ? ['Morning', 'Evening', 'Night'] : ['Morning', 'Evening'];
  }
  const str = timeStr.toLowerCase();
  const types = [];
  if (str.includes('morning') || str.includes('am') || str.includes('08:') || str.includes('09:') || str.includes('10:') || str.includes('11:') || str.includes('12:')) {
    types.push('Morning');
  }
  if (str.includes('evening') || str.includes('pm') || str.includes('16:') || str.includes('17:') || str.includes('04:') || str.includes('05:') || str.includes('06:') || str.includes('07:')) {
    types.push('Evening');
  }
  if ((str.includes('night') || str.includes('20:') || str.includes('21:') || str.includes('22:') || str.includes('10:30')) && isGenMed) {
    types.push('Night');
  }
  return types.length > 0 ? types : ['Morning', 'Evening'];
};

export const generateFallbackSessions = (doctorId, doctorObj = null) => {
  const sessions = [];
  const now = new Date();
  const doc = doctorObj || FALLBACK_DOCTORS.find(d => d.id === Number(doctorId));
  const isGenMed = ((doc?.specialization || '').toLowerCase().includes('general') || (doc?.specialization || '').toLowerCase().includes('physician'));
  const allowedDays = parseDoctorAvailableDays(doc?.availableDays);
  const allowedTypes = parseDoctorSessionTypes(doc?.availableTime, isGenMed);

  // Generate sessions for the next 14 days strictly matching doctor's roster
  for (let i = 0; i < 14; i++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + i);
    const dayOfWeek = targetDate.getDay();

    if (!allowedDays.includes(dayOfWeek)) continue;

    const dateStr = targetDate.toISOString().split('T')[0];

    // Morning Session: 08:30 AM (tokens #01 - #25)
    if (allowedTypes.includes('Morning')) {
      sessions.push({
        id: (Number(doctorId) || 1) * 1000 + i * 3 + 1,
        doctorId: Number(doctorId) || 1,
        sessionDate: dateStr,
        sessionTime: '08:30:00',
        sessionType: 'Morning',
        timeSlot: '08:30 AM',
        maxCapacity: 25,
        currentBookings: Math.min(8 + (i * 2), 22),
        availableSlots: Math.max(3, 25 - (8 + (i * 2))),
        isActive: true,
        isAvailable: true,
        isExpired: false
      });
    }

    // Evening Session: 04:30 PM (tokens #01 - #25)
    if (allowedTypes.includes('Evening')) {
      sessions.push({
        id: (Number(doctorId) || 1) * 1000 + i * 3 + 2,
        doctorId: Number(doctorId) || 1,
        sessionDate: dateStr,
        sessionTime: '16:30:00',
        sessionType: 'Evening',
        timeSlot: '04:30 PM',
        maxCapacity: 25,
        currentBookings: Math.min(5 + (i * 3), 20),
        availableSlots: Math.max(5, 25 - (5 + (i * 3))),
        isActive: true,
        isAvailable: true,
        isExpired: false
      });
    }

    // Night Clinic Session: 08:00 PM (tokens #01 - #15, General Medicine only)
    if (allowedTypes.includes('Night') && isGenMed) {
      sessions.push({
        id: (Number(doctorId) || 1) * 1000 + i * 3 + 3,
        doctorId: Number(doctorId) || 1,
        sessionDate: dateStr,
        sessionTime: '20:00:00',
        sessionType: 'Night',
        timeSlot: '08:00 PM',
        maxCapacity: 15,
        currentBookings: Math.min(3 + i, 12),
        availableSlots: Math.max(3, 15 - (3 + i)),
        isActive: true,
        isAvailable: true,
        isExpired: false
      });
    }
  }

  return sessions;
};

