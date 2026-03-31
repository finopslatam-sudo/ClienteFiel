// frontend/app/(dashboard)/whatsapp/page.tsx
'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { EmbeddedSignupButton } from '@/components/whatsapp/EmbeddedSignupButton'

interface WhatsappStatus {
  connected: boolean
  phone_number?: string
  verified_at?: string
}

export default function WhatsappPage() {
  const qc = useQueryClient()
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const { data } = await api.get<WhatsappStatus>('/api/v1/whatsapp/status')
      return data
    },
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
  }

  const handleDisconnect = async () => {
    await api.post('/api/v1/whatsapp/disconnect')
    qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">WhatsApp Business</h1>

      {isLoading ? (
        <div className="text-slate-500 text-sm">Cargando estado...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {data?.connected ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="font-semibold text-slate-900">Conectado</span>
              </div>
              <p className="text-slate-600 text-sm mb-1">
                Número: <span className="font-medium text-slate-900">{data.phone_number}</span>
              </p>
              {data.verified_at && (
                <p className="text-slate-400 text-xs mb-6">
                  Verificado: {new Date(data.verified_at).toLocaleDateString('es-CL')}
                </p>
              )}
              <div className="flex gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-2">¿Quieres cambiar el número?</p>
                  <EmbeddedSignupButton onSuccess={handleSuccess} onError={setError} />
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-sm text-red-600 hover:text-red-800 self-end mb-1"
                >
                  Desconectar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-slate-300 rounded-full" />
                <span className="font-semibold text-slate-500">Sin conectar</span>
              </div>
              <p className="text-slate-600 text-sm mb-6">
                Conecta tu WhatsApp Business para empezar a automatizar reservas y recordatorios.
              </p>
              <EmbeddedSignupButton onSuccess={handleSuccess} onError={setError} />
            </>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mt-4">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
