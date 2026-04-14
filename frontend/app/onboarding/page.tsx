// frontend/app/onboarding/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmbeddedSignupButton } from '@/components/whatsapp/EmbeddedSignupButton'

const steps = ['Bienvenida', 'Conectar WhatsApp', 'Listo']

function getRedirectAfterOnboarding(): string {
  const pendingPlan = localStorage.getItem('pending_plan')
  if (pendingPlan) {
    localStorage.removeItem('pending_plan')
    return `/suscripcion?plan=${pendingPlan}`
  }
  return '/agenda'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [connectedPhone, setConnectedPhone] = useState('')
  const [error, setError] = useState('')

  const handleSuccess = (phone: string) => {
    setConnectedPhone(phone)
    setStep(2)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i <= step ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-12 ${i < step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Bienvenida */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">¡Bienvenido a Cliente Fiel!</h1>
            <p className="text-slate-600 mb-2">
              Para empezar, necesitas conectar tu <strong>WhatsApp Business</strong>.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Necesitas un número de WhatsApp Business activo. Si no tienes uno, puedes crearlo
              gratuitamente en{' '}
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
                Meta Business Manager
              </a>.
            </p>
            <button
              onClick={() => setStep(1)}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* Step 1: Conectar WhatsApp */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Conecta tu WhatsApp Business</h2>
            <p className="text-slate-600 mb-6">
              Haz clic en el botón y autoriza el acceso a tu WhatsApp Business con tu cuenta de Meta.
              El proceso toma menos de 2 minutos.
            </p>
            <ol className="space-y-2 text-sm text-slate-600 mb-8">
              <li className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                Haz clic en &quot;Conectar con Meta&quot;
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                Inicia sesión con tu cuenta de Facebook/Meta
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                Selecciona tu número de WhatsApp Business y autoriza
              </li>
            </ol>

            <div className="flex justify-center mb-4">
              <EmbeddedSignupButton onSuccess={handleSuccess} onError={setError} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
                {error}
              </div>
            )}

            <button
              onClick={() => router.push(getRedirectAfterOnboarding())}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-600 mt-4"
            >
              Omitir por ahora (puedes conectar después)
            </button>
          </div>
        )}

        {/* Step 2: Listo */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">¡WhatsApp conectado!</h2>
            <p className="text-slate-600 mb-2">
              Número conectado:{' '}
              <span className="font-semibold text-slate-900">{connectedPhone}</span>
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Tu WhatsApp Business está listo. Ahora puedes configurar tus servicios y empezar a
              recibir reservas.
            </p>
            <button
              onClick={() => router.push(getRedirectAfterOnboarding())}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Ir al dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
