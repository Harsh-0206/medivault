// import React, { useState } from 'react'
// import api from '../../api/axiosClient'
// import { useNavigate } from 'react-router-dom'

// export default function DoctorRegister(){
//   const [form, setForm] = useState({ name:'', email:'', password:'', regNumber:'', degree:'MBBS' })
//   const [file, setFile] = useState(null)
//   const nav = useNavigate()
//   async function submit(e){
//     e.preventDefault()
//     const fd = new FormData()
//     fd.append('name', form.name)
//     fd.append('email', form.email)
//     fd.append('password', form.password)
//     fd.append('regNumber', form.regNumber)
//     fd.append('degree', form.degree)
//     if(file) fd.append('document', file)
//     await api.post('/auth/register-doctor', fd, { headers: {'Content-Type':'multipart/form-data'} })
//     nav('/login')
//   }
//   return (
//     <div className="container mx-auto px-6 py-12 max-w-md">
//       <div className="bg-white p-6 rounded shadow">
//         <h2 className="text-xl font-semibold mb-4">Doctor Registration</h2>
//         <form onSubmit={submit} className="space-y-3">
//           <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full name" className="w-full p-2 border rounded" />
//           <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" className="w-full p-2 border rounded" />
//           <input value={form.password} onChange={e=>setForm({...form,password:e.target.value})} type="password" placeholder="Password" className="w-full p-2 border rounded" />
//           <input value={form.regNumber} onChange={e=>setForm({...form,regNumber:e.target.value})} placeholder="Medical Reg. Number" className="w-full p-2 border rounded" />
//           <select value={form.degree} onChange={e=>setForm({...form,degree:e.target.value})} className="w-full p-2 border rounded">
//             <option>MBBS</option>
//             <option>MD</option>
//             <option>MS</option>
//           </select>
//           <div>
//             <label className="text-sm">Upload registration proof (PDF/image)</label>
//             <input type="file" onChange={e=>setFile(e.target.files[0])} className="w-full mt-2" />
//           </div>
//           <div className="flex justify-between items-center">
//             <button className="px-4 py-2 bg-[#7A1F2B] text-white rounded">Submit</button>
//           </div>
//         </form>
//       </div>
//     </div>
//   )
// }

