// frontend/components/sections/FAQ.tsx
'use client'
import { useState } from 'react'

const faqs = [
  {
    q: '¿Necesito tener WhatsApp Business?',
    a: 'Sí, necesitas un número de WhatsApp Business activo. Es gratuito y lo configuras directamente con Meta. Cliente Fiel te orienta en el proceso.',
  },
  {
    q: '¿Mis clientes necesitan instalar algo?',
    a: 'No. Tus clientes usan el WhatsApp que ya tienen instalado en su teléfono. No hay apps adicionales.',
  },
  {
    q: '¿Cómo se conecta mi WhatsApp Business?',
    a: 'En tu dashboard hay un botón "Conectar con Meta". Haces clic, autorizas con tu cuenta Meta y listo — menos de 2 minutos.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí, sin penalizaciones. Cancelas desde tu panel de facturación y no se te cobra el siguiente período.',
  },
  {
    q: '¿Para qué tipos de negocio sirve?',
    a: 'Peluquerías, spas, consultorios, restaurantes, talleres — cualquier negocio que atienda clientes con citas o reservas.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="max-w-3xl mx-auto px-4 py-20">
      <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Preguntas frecuentes</h2>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full text-left px-6 py-4 font-medium text-slate-900 flex justify-between items-center hover:bg-slate-50 transition-colors"
            >
              {faq.q}
              <span className="text-slate-400">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <div className="px-6 pb-4 text-slate-600 text-sm leading-relaxed">{faq.a}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
