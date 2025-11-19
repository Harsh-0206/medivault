import React, { useState, useEffect } from 'react';
import { User, FileText, Calendar, Activity, Heart, Pill, Download, Upload, Plus, X, Edit2, Save, AlertCircle } from 'lucide-react';

// API client configuration
const API_BASE = 'http://localhost:4000';

const api = {
  get: async (endpoint, token) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  
  post: async (endpoint, data, token) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  
  put: async (endpoint, data, token) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  
  delete: async (endpoint, token) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  
  uploadFile: async (endpoint, formData, token) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }
};

function PatientDashboard() {
  // Get token from localStorage (set during login)
const [token, setToken] = useState(localStorage.getItem('mv_token') || '');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for all data
  const [patientData, setPatientData] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [vitalSigns, setVitalSigns] = useState([]);
  const [dashboardOverview, setDashboardOverview] = useState(null);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', type: '', file: null });

  // Load initial data
  useEffect(() => {
    if (token) {
      loadAllData();
    } else {
      window.location.href = '/login';
    }
  }, [token]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [profile, records, apts, presc, vitals, overview] = await Promise.all([
        api.get('/patient/profile', token),
        api.get('/patient/medical-records', token),
        api.get('/patient/appointments', token),
        api.get('/patient/prescriptions', token),
        api.get('/patient/vital-signs', token),
        api.get('/patient/dashboard', token)
      ]);
      
      setPatientData(profile.patient);
      setEditedProfile(profile.patient);
      setMedicalRecords(records.records || []);
      setAppointments(apts.appointments || []);
      setPrescriptions(presc.prescriptions || []);
      setVitalSigns(vitals.vitals || []);
      setDashboardOverview(overview);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
      if (err.message.includes('401') || err.message.includes('403')) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileEdit = async () => {
    if (isEditingProfile) {
      try {
        await api.put('/patient/profile', {
          name: editedProfile.name,
          dateOfBirth: editedProfile.date_of_birth,
          bloodGroup: editedProfile.blood_group,
          phone: editedProfile.phone,
          address: editedProfile.address,
          emergencyContact: editedProfile.emergency_contact
        }, token);
        
        setPatientData(editedProfile);
        alert('Profile updated successfully!');
      } catch (err) {
        console.error('Error updating profile:', err);
        alert('Failed to update profile');
      }
    }
    setIsEditingProfile(!isEditingProfile);
  };

  const handleProfileChange = (e) => {
    setEditedProfile({ ...editedProfile, [e.target.name]: e.target.value });
  };

  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.type || !uploadForm.file) {
      alert('Please fill all fields');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('type', uploadForm.type);
      formData.append('file', uploadForm.file);
      formData.append('recordDate', new Date().toISOString().split('T')[0]);
      
      await api.uploadFile('/patient/medical-records', formData, token);
      
      // Reload medical records
      const records = await api.get('/patient/medical-records', token);
      setMedicalRecords(records.records || []);
      
      setShowUploadModal(false);
      setUploadForm({ title: '', type: '', file: null });
      alert('Record uploaded successfully!');
    } catch (err) {
      console.error('Error uploading record:', err);
      alert('Failed to upload record');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mv_token');
    localStorage.removeItem('mv_role');
    window.location.href = '/login';

  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e0f2ff] via-[#f8fcff] to-[#e6f8ff] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e0f2ff] via-[#f8fcff] to-[#e6f8ff] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Error</h2>
          <p className="text-slate-600 text-center mb-4">{error}</p>
          <button
            onClick={loadAllData}
            className="w-full py-3 bg-sky-500 text-white rounded-lg font-semibold hover:bg-sky-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!patientData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f2ff] via-[#f8fcff] to-[#e6f8ff]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-cyan-500 text-transparent bg-clip-text">
                  MediVault
                </h1>
                <p className="text-xs text-slate-600">Patient Portal</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {patientData.name}!</h2>
          <p className="text-sky-100">Your health dashboard is up to date</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/70 backdrop-blur rounded-xl p-2 mb-8 flex space-x-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'records', label: 'Medical Records', icon: FileText },
            { id: 'appointments', label: 'Appointments', icon: Calendar },
            { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
            { id: 'vitals', label: 'Vital Signs', icon: Heart }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-sky-500 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && dashboardOverview && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-sky-500" />
                  Upcoming Appointments
                </h3>
                {dashboardOverview.upcomingAppointments && dashboardOverview.upcomingAppointments.slice(0, 2).map(apt => (
                  <div key={apt.id} className="border-l-4 border-sky-500 pl-4 mb-4 last:mb-0">
                    <p className="font-semibold text-slate-800">{apt.doctor_name}</p>
                    <p className="text-sm text-slate-600">{apt.specialty}</p>
                    <p className="text-sm text-slate-500">{apt.appointment_date} at {apt.appointment_time}</p>
                  </div>
                ))}
                {(!dashboardOverview.upcomingAppointments || !dashboardOverview.upcomingAppointments.length) && (
                  <p className="text-slate-500">No upcoming appointments</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-rose-500" />
                  Latest Vitals
                </h3>
                {dashboardOverview.latestVitals ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-sky-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600">Blood Pressure</p>
                      <p className="text-lg font-bold text-slate-800">{dashboardOverview.latestVitals.blood_pressure}</p>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600">Heart Rate</p>
                      <p className="text-lg font-bold text-slate-800">{dashboardOverview.latestVitals.heart_rate} bpm</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600">Temperature</p>
                      <p className="text-lg font-bold text-slate-800">{dashboardOverview.latestVitals.temperature}°F</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600">Weight</p>
                      <p className="text-lg font-bold text-slate-800">{dashboardOverview.latestVitals.weight} kg</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">No vitals recorded</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                  <Pill className="w-5 h-5 mr-2 text-emerald-500" />
                  Active Prescriptions
                </h3>
                {dashboardOverview.activePrescriptions && dashboardOverview.activePrescriptions.map(rx => (
                  <div key={rx.id} className="bg-emerald-50 rounded-lg p-3 mb-3 last:mb-0">
                    <p className="font-semibold text-slate-800">{rx.medicine_name}</p>
                    <p className="text-sm text-slate-600">{rx.dosage}</p>
                  </div>
                ))}
                {(!dashboardOverview.activePrescriptions || !dashboardOverview.activePrescriptions.length) && (
                  <p className="text-slate-500">No active prescriptions</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-cyan-500" />
                  Recent Records
                </h3>
                {dashboardOverview.recentRecords && dashboardOverview.recentRecords.map(record => (
                  <div key={record.id} className="flex justify-between items-center mb-3 last:mb-0">
                    <div>
                      <p className="font-medium text-slate-800">{record.title}</p>
                      <p className="text-xs text-slate-500">{record.record_date}</p>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 cursor-pointer hover:text-sky-500" />
                  </div>
                ))}
                {(!dashboardOverview.recentRecords || !dashboardOverview.recentRecords.length) && (
                  <p className="text-slate-500">No records found</p>
                )}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Personal Information</h3>
                <button
                  onClick={handleProfileEdit}
                  className="flex items-center space-x-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition"
                >
                  {isEditingProfile ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  <span>{isEditingProfile ? 'Save' : 'Edit'}</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { key: 'name', label: 'Full Name' },
                  { key: 'email', label: 'Email', disabled: true },
                  { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
                  { key: 'blood_group', label: 'Blood Group' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'address', label: 'Address' },
                  { key: 'emergency_contact', label: 'Emergency Contact' }
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {field.label}
                    </label>
                    {isEditingProfile && !field.disabled ? (
                      <input
                        type={field.type || 'text'}
                        name={field.key}
                        value={editedProfile[field.key] || ''}
                        onChange={handleProfileChange}
                        className="w-full p-3 rounded-xl border border-slate-300 focus:border-sky-500 focus:outline-none"
                      />
                    ) : (
                      <p className="p-3 bg-slate-50 rounded-xl text-slate-800">
                        {patientData[field.key] || 'Not provided'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Records Tab */}
          {activeTab === 'records' && (
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Medical Records</h3>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Record</span>
                </button>
              </div>

              <div className="space-y-4">
                {medicalRecords.map(record => (
                  <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-sky-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-sky-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{record.title}</p>
                        <p className="text-sm text-slate-600">{record.type} • {record.doctor_name || 'Self Upload'}</p>
                        <p className="text-xs text-slate-500">{record.record_date}</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-slate-400 cursor-pointer hover:text-sky-500" />
                  </div>
                ))}
                {!medicalRecords.length && (
                  <p className="text-center text-slate-500 py-8">No medical records found</p>
                )}
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Appointments</h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition">
                  <Plus className="w-4 h-4" />
                  <span>Book Appointment</span>
                </button>
              </div>

              <div className="space-y-4">
                {appointments.map(apt => (
                  <div key={apt.id} className="border-l-4 border-sky-500 bg-sky-50 p-5 rounded-r-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-bold text-slate-800">{apt.doctor_name}</p>
                        <p className="text-slate-600">{apt.specialty}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                          <span>📅 {apt.appointment_date}</span>
                          <span>🕐 {apt.appointment_time}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
                {!appointments.length && (
                  <p className="text-center text-slate-500 py-8">No appointments found</p>
                )}
              </div>
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">Prescriptions</h3>
              <div className="space-y-4">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="bg-gradient-to-r from-emerald-50 to-cyan-50 p-5 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-lg font-bold text-slate-800">{rx.medicine_name}</p>
                        <p className="text-slate-700 mt-1">Dosage: {rx.dosage}</p>
                        <p className="text-slate-600 text-sm">Duration: {rx.duration}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                          <span>Prescribed by: {rx.doctor_name}</span>
                          <span>Date: {rx.prescribed_date}</span>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-slate-400 cursor-pointer hover:text-emerald-500" />
                    </div>
                  </div>
                ))}
                {!prescriptions.length && (
                  <p className="text-center text-slate-500 py-8">No prescriptions found</p>
                )}
              </div>
            </div>
          )}

          {/* Vitals Tab */}
          {activeTab === 'vitals' && (
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Vital Signs History</h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition">
                  <Plus className="w-4 h-4" />
                  <span>Add Entry</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Blood Pressure</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Heart Rate</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Temperature</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitalSigns.map((vital, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-800">{vital.recorded_date}</td>
                        <td className="px-4 py-3 text-slate-800">{vital.blood_pressure}</td>
                        <td className="px-4 py-3 text-slate-800">{vital.heart_rate} bpm</td>
                        <td className="px-4 py-3 text-slate-800">{vital.temperature}°F</td>
                        <td className="px-4 py-3 text-slate-800">{vital.weight} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!vitalSigns.length && (
                  <p className="text-center text-slate-500 py-8">No vital signs recorded</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Upload Medical Record</h3>
              <button onClick={() => setShowUploadModal(false)}>
                <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-sky-500 focus:outline-none"
                  placeholder="e.g., Blood Test Report"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-sky-500 focus:outline-none"
                >
                  <option value="">Select type</option>
                  <option value="Lab Report">Lab Report</option>
                  <option value="Imaging">Imaging</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  className="w-full p-3 rounded-xl border border-slate-300"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>

              <button
                onClick={handleUpload}
                className="w-full py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;