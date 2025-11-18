import React from 'react'
import { Navigate } from 'react-router-dom'

export default function RequireAuth({ children, role }){
  const token = localStorage.getItem('mv_token')
  const userRole = localStorage.getItem('mv_role')
  if(!token) return <Navigate to="/login" replace />
  if(role && userRole !== role) return <div className="p-8">Unauthorized — wrong role</div>
  return children
}
