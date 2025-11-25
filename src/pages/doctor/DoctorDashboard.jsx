import PrescriptionForm from "/src/pages/doctor/PrescriptionForm.jsx"; // adjust path
import React, { useEffect, useState } from "react";
function PatientSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const token = localStorage.getItem("mv_token");

  async function search() {
    const res = await fetch(`http://localhost:4000/doctor/search?query=${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setResults(data.patients);
  }

  return (
    <div className="mt-10 p-5 bg-white rounded-xl shadow">
      <h2 className="text-xl font-semibold">Search Patients</h2>

      <div className="flex gap-3 mt-3">
        <input 
          className="border p-2 rounded w-full"
          placeholder="Enter Patient ID / Name / Phone"
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
        />
        <button 
          onClick={search}
          className="px-4 py-2 bg-sky-600 text-white rounded"
        >
          Search
        </button>
      </div>

      <div className="mt-4">
        {results.map((p)=>(
          <div key={p.id} className="border-b p-2">
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm">{p.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const [data, setData] = useState(null);
  const token = localStorage.getItem("mv_token");

  async function load() {
    const res = await fetch("http://localhost:4000/doctor/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await res.json();
    setData(d);
  }

  useEffect(() => { load(); }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-6">

      <h1 className="text-3xl font-bold text-sky-600">Doctor Dashboard</h1>
      {/* ADD PATIENT SEARCH HERE */}
      <PatientSearch />
      <PrescriptionForm onCreated={(prescription) => {
  // optional: refresh dashboard after creation
  load(); // if your component has load() to fetch dashboard
}} />
      {/* Stats */}
      
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="p-5 bg-white rounded-xl shadow">
          <h2 className="text-xl font-semibold">Today’s Appointments</h2>
          <p className="text-3xl font-bold text-sky-600">
            {data.todayAppointments.length}
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl shadow">
          <h2 className="text-xl font-semibold">Total Patients</h2>
          <p className="text-3xl font-bold text-sky-600">
            {data.totalPatients}
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl shadow">
          <h2 className="text-xl font-semibold">Recent Prescriptions</h2>
          <p className="text-3xl font-bold text-sky-600">
            {data.recentPrescriptions.length}
          </p>
        </div>
      </div>

      {/* Today's appointments */}
      <h2 className="text-2xl font-bold mt-10">Today's Appointments</h2>
      <div className="mt-4 bg-white p-4 rounded-xl shadow">
        {data.todayAppointments.length === 0 ? (
          <p>No appointments today.</p>
        ) : (
          data.todayAppointments.map((a) => (
            <div key={a.id} className="p-3 border-b">
              <p className="font-medium">{a.patient_name}</p>
              <p className="text-sm text-gray-600">{a.appointment_time}</p>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
