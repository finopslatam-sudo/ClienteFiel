// frontend/components/whatsapp/EmbeddedSignupButton.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'

interface Props {
  onSuccess: (phoneNumber: string) => void
  onError: (error: string) => void
}

declare global {
  interface Window {
    FB: {
      init: (params: { appId?: string; cookie?: boolean; xfbml?: boolean; version?: string }) => void
      login: (callback: (response: { authResponse?: { code: string } }) => void, params: object) => void
    }
  }
}

export function EmbeddedSignupButton({ onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false)
  const [fbLoaded, setFbLoaded] = useState(false)
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null)

  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      setFbLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/es_ES/sdk.js'
    script.async = true
    script.defer = true
    script.onload = () => {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v19.0',
      })
      setFbLoaded(true)
    }
    document.body.appendChild(script)

    // Cleanup: remove any pending message listener on unmount
    return () => {
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current)
        messageListenerRef.current = null
      }
    }
  }, [])

  const handleClick = () => {
    if (!fbLoaded || loading) return
    setLoading(true)

    window.FB.login(
      async (response) => {
        if (!response.authResponse) {
          setLoading(false)
          onError('Autorización cancelada por el usuario.')
          return
        }

        const { code } = response.authResponse

        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== 'https://www.facebook.com') return
          const data = typeof event.data === 'string'
            ? (JSON.parse(event.data) as { type?: string; event?: string; data?: { phone_number_id?: string; waba_id?: string } })
            : (event.data as { type?: string; event?: string; data?: { phone_number_id?: string; waba_id?: string } })
          if (data.type === 'WA_EMBEDDED_SIGNUP' && data.event === 'FINISH') {
            window.removeEventListener('message', handleMessage)
            messageListenerRef.current = null  // clear ref on successful completion
            try {
              const { data: conn } = await api.post<{ phone_number: string }>('/api/v1/whatsapp/connect', {
                code,
                phone_number_id: data.data?.phone_number_id,
                waba_id: data.data?.waba_id,
              })
              onSuccess(conn.phone_number)
            } catch {
              onError('Error al conectar WhatsApp. Intenta nuevamente.')
            } finally {
              setLoading(false)
            }
          }
        }

        messageListenerRef.current = handleMessage  // store ref
        window.addEventListener('message', handleMessage)
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_SIGNUP_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      }
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={!fbLoaded || loading}
      className="flex items-center gap-3 bg-[#25d366] text-white px-6 py-4 rounded-xl font-semibold text-base hover:bg-[#20bb5a] disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <>
          <span className="animate-spin">⏳</span>
          Conectando...
        </>
      ) : (
        <>
          <span className="text-xl">💬</span>
          Conectar con Meta
        </>
      )}
    </button>
  )
}
