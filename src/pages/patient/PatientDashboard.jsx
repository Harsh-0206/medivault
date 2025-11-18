import React, { useEffect, useState } from 'react'
import api from '../../api/axiosClient'
import { Link } from 'react-router-dom'

export default function PatientDashboard(){
  const [reports, setReports] = useState([])
  useEffect(()=>{ api.get('/patient/reports').then(r=>setReports(r.data)).catch(()=>{}) }, [])
  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold">Patient Dashboard</h1>
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold">Upload Report</h3>
          <ReportUpload onUploaded={r=>setReports(prev => [r, ...prev])} />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold">My Reports</h3>
          <div className="mt-3 space-y-2">
            {reports.length===0 && <div className="text-sm text-slate-600">No reports yet.</div>}
            {reports.map(r => (
              <div key={r._id} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="font-semibold">{r.title || 'Report'}</div>
                  <div className="text-sm text-slate-500">{new Date(r.uploadedAt).toLocaleString()}</div>
                </div>
                <div>
                  <a href={r.fileUrl} target="_blank" rel="noreferrer" className="px-3 py-1 border rounded">View</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportUpload({ onUploaded }){
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  async function submit(e){
    e.preventDefault()
    const fd = new FormData(); fd.append('file', file); fd.append('title', title)
    const res = await api.post('/patient/reports/upload', fd, { headers:{'Content-Type':'multipart/form-data'} })
    onUploaded(res.data)
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Report title" className="w-full p-2 border rounded" />
      <input type="file" onChange={e=>setFile(e.target.files[0])} className="w-full" />
      <button disabled={!file} className="px-3 py-1 bg-[#7A1F2B] text-white rounded">Upload</button>
    </form>
  )
}

