import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  getAllAppointments, updateAppointmentStatus, deleteAppointment, getAppointmentStats
} from '../../../api/doctorApi';
import logoImage from '../../../assets/mediz.png';
import {
  Stethoscope, Calendar, Clock, MapPin, User, Search,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, QrCode,
  Filter, ArrowLeft, Trash2, Phone, Mail, X, Activity, DollarSign
} from 'lucide-react';

const DoctorAppointmentsAdmin = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedQrApt, setSelectedQrApt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aptRes, statsRes] = await Promise.all([
        getAllAppointments({ search, status: statusFilter }),
        getAppointmentStats()
      ]);
      if (Array.isArray(aptRes.data)) setAppointments(aptRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load appointments admin data', err);
      showToast('Error loading appointments data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleStatusChange = async (id, newStatus) => {
    setActionLoading(true);
    try {
      await updateAppointmentStatus(id, newStatus);
      showToast(`Appointment status updated to ${newStatus}`, 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to update status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this appointment?')) return;
    setActionLoading(true);
    try {
      await deleteAppointment(id);
      showToast('Appointment deleted', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to delete appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F7F6', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'error' ? '#EF4444' : '#00897B',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: '700',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
        }}>
          {toast.message}
        </div>
      )}

      {/* Top Navigation Bar */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E0E6ED',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/pharmacist/medicines')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #CFD8DC',
              backgroundColor: '#FFFFFF',
              color: '#37474F',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <img src={logoImage} alt="Logo" style={{ height: '36px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Doctor Channeling Operations Desk
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#78909C' }}>
              Real-time queues, desk check-in verification, and appointment management
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #CFD8DC',
              backgroundColor: '#FFFFFF',
              color: '#00796B',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <div style={{ fontSize: '12px', color: '#455A64' }}>
            Logged in: <strong>{user?.fullName || user?.email}</strong>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Stats KPIs */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            {[
              { label: 'TOTAL BOOKINGS', value: stats.totalAppointments, icon: <Calendar size={18} color="#00796B" />, bg: '#E0F2F1' },
              { label: "TODAY'S QUEUE", value: stats.todayQueueCount, icon: <Activity size={18} color="#0284C7" />, bg: '#E0F2FE' },
              { label: 'CONFIRMED', value: stats.confirmedCount, icon: <CheckCircle2 size={18} color="#15803D" />, bg: '#DCFCE7' },
              { label: 'COMPLETED', value: stats.completedCount, icon: <CheckCircle2 size={18} color="#6B7280" />, bg: '#F3F4F6' },
              { label: 'REVENUE', value: `LKR ${stats.totalRevenue.toLocaleString()}`, icon: <DollarSign size={18} color="#B45309" />, bg: '#FEF3C7' }
            ].map((kpi, idx) => (
              <div key={idx} style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                padding: '14px 18px',
                border: '1px solid #E0E0E0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: kpi.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {kpi.icon}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#78909C' }}>{kpi.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#1A2B32' }}>{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search & Filter Controls */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #E0E0E0',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="#90A4AE" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search by patient, doctor, NIC, or ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  border: '1px solid #CFD8DC',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#00796B',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Search
            </button>
          </form>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} color="#607D8B" />
            <span style={{ fontSize: '12px', color: '#546E7A', fontWeight: '600' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CFD8DC',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="NoShow">No Show</option>
              <option value="PendingPayment">Pending Payment</option>
            </select>
          </div>
        </div>

        {/* Appointments Table */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E0E0E0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Queue #</th>
                <th style={{ padding: '12px 16px' }}>Ref / Date</th>
                <th style={{ padding: '12px 16px' }}>Doctor & Department</th>
                <th style={{ padding: '12px 16px' }}>Patient Details</th>
                <th style={{ padding: '12px 16px' }}>Payment</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#78909C' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                    Loading operations queue...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#78909C' }}>
                    No appointments matching the specified filter.
                  </td>
                </tr>
              ) : (
                appointments.map(apt => {
                  const isConfirmed = apt.status === 'Confirmed';
                  const isInProgress = apt.status === 'InProgress';
                  const isCompleted = apt.status === 'Completed';
                  const isCancelled = apt.status === 'Cancelled' || apt.status === 'NoShow';

                  const badgeBg = isConfirmed ? '#DCFCE7' : isInProgress ? '#FFEDD5' : isCompleted ? '#E0F2FE' : '#FEE2E2';
                  const badgeColor = isConfirmed ? '#15803D' : isInProgress ? '#C2410C' : isCompleted ? '#0369A1' : '#B91C1C';

                  return (
                    <tr key={apt.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          backgroundColor: '#E0F2F1',
                          color: '#004D40',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '12px'
                        }}>
                          #{String(apt.queueNumber).padStart(2, '0')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#1E293B' }}>{apt.appointmentNumber}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{apt.appointmentDate} at {apt.timeSlot}</div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#004D40' }}>{apt.doctorName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{apt.specialization} ({apt.hospitalBranch})</div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#1E293B' }}>{apt.patientName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          NIC: {apt.patientNic} | {apt.patientPhone}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#004D40' }}>LKR {apt.totalAmount.toLocaleString()}</div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: apt.paymentStatus === 'Paid' ? '#DCFCE7' : '#FEF3C7',
                          color: apt.paymentStatus === 'Paid' ? '#15803D' : '#B45309'
                        }}>
                          {apt.paymentStatus} ({apt.paymentMethod})
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          {apt.status}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* QR Code Action */}
                          <button
                            onClick={() => setSelectedQrApt(apt)}
                            title="Verify Check-in QR"
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              border: '1px solid #CFD8DC',
                              backgroundColor: '#FFFFFF',
                              cursor: 'pointer',
                              color: '#00796B'
                            }}
                          >
                            <QrCode size={14} />
                          </button>

                          {/* Quick Status Workflow Action */}
                          {isConfirmed && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'InProgress')}
                              disabled={actionLoading}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#0284C7',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Check In
                            </button>
                          )}

                          {isInProgress && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'Completed')}
                              disabled={actionLoading}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#15803D',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Complete
                            </button>
                          )}

                          {!isCompleted && !isCancelled && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'NoShow')}
                              disabled={actionLoading}
                              title="Mark No Show"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #FCA5A5',
                                backgroundColor: '#FEF2F2',
                                color: '#B91C1C',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              No-Show
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(apt.id)}
                            disabled={actionLoading}
                            title="Delete"
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Desk QR Verification Modal */}
      {selectedQrApt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedQrApt(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={20} color="#78909C" />
            </button>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Channeling Desk QR Verify
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#78909C' }}>
              Ref: {selectedQrApt.appointmentNumber} • Queue #{String(selectedQrApt.queueNumber).padStart(2, '0')}
            </p>

            <div style={{
              display: 'inline-block',
              padding: '10px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #ECEFF1',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              marginBottom: '16px'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedQrApt.qrCodeText || `MEDIX:${selectedQrApt.appointmentNumber}`)}`}
                alt="Appointment QR"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#37474F', marginBottom: '16px' }}>
              Patient: <strong>{selectedQrApt.patientName}</strong> (NIC: {selectedQrApt.patientNic})<br />
              Doctor: {selectedQrApt.doctorName} ({selectedQrApt.specialization})
            </div>

            <button
              onClick={() => setSelectedQrApt(null)}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#00796B',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointmentsAdmin;
