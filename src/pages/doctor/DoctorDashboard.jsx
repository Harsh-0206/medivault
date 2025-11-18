import React, { useState, useEffect } from 'react'
import api from '../../api/axiosClient'

export default function DoctorDashboard(){
  const [pending, setPending] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  useEffect(()=>{ api.get('/doctor/pending').then(r=>setPending(r.data)).catch(()=>{}) }, [])

  async function doSearch(){
    const r = await api.get(`/patients/search?q=${encodeURIComponent(search)}`)
    setResults(r.data)
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold">Doctor Dashboard</h1>
      <div className="mt-6 bg-white p-4 rounded shadow">
        <h3 className="font-semibold">Search Patient by DHI / Name</h3>
        <div className="flex gap-2 mt-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="DHI or name" className="flex-1 p-2 border rounded" />
          <button onClick={doSearch} className="px-3 py-1 bg-[#7A1F2B] text-white rounded">Search</button>
        </div>
        <div className="mt-4">
          {results.map(p => (
            <div key={p.patientId} className="p-2 border rounded my-2 flex justify-between items-center">
              <div>
                <div className="font-semibold">{p.firstName} {p.lastName}</div>
                <div className="text-sm text-slate-600">DHI: {p.dhi}</div>
              </div>
              <div>
                <a href={`/patient/profile/${p.patientId}`} className="px-3 py-1 border rounded">Open</a>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 bg-white p-4 rounded shadow">
        <h3 className="font-semibold">Your Verification Status</h3>
        <p className="text-sm text-slate-600">Pending approvals shown on admin console.</p>
      </div>
    </div>
  )
}
