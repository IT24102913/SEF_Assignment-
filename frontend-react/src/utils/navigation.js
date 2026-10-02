/**
 * Dynamic dashboard path resolver based on user authentication and role.
 */

export const getDashboardPath = (userOrRole) => {
  let role = '';
  if (typeof userOrRole === 'string') {
    role = userOrRole;
  } else if (userOrRole && typeof userOrRole === 'object') {
    role = userOrRole.role || '';
  }

  if (!role) {
    try {
      const stored = sessionStorage.getItem('user') || localStorage.getItem('hb_user') || localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        role = parsed?.role || '';
      }
    } catch {
      // fallback
    }
  }

  if (!role) return '/login';

  const normalized = role.toLowerCase().trim();
  switch (normalized) {
    case 'admin':
      return '/admin/dashboard';
    case 'patient':
      return '/patient/dashboard';
    case 'doctor':
      return '/doctor/dashboard';
    case 'pharmacist':
    case 'pharmacy':
      return '/pharmacist/dashboard';
    case 'laboratory':
    case 'lab':
      return '/laboratory/dashboard';
    case 'staff':
      return '/staff/dashboard';
    default:
      return `/${normalized}/dashboard`;
  }
};
