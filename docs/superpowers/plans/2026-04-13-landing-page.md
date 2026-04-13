# Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the marketing landing page with 4 new sections (HowItWorks, ForBusinesses, SocialProof, FinalCTA) and improve copy on 4 existing sections (Hero, Features, Pricing, FAQ) to increase conversion.

**Architecture:** All changes are pure frontend — no backend, no API calls. Each section is a self-contained React component in `frontend/components/sections/`. The page orchestrator (`app/(marketing)/page.tsx`) imports them in order. All components use framer-motion with `whileInView` to avoid triggering animations on page load.

**Tech Stack:** Next.js 14 App Router, TypeScript (strict), framer-motion, Tailwind CSS, dark/cyan design system (`glass-card`, `btn-cyan`, `btn-ghost-cyan`, `text-glow-cyan` CSS classes already defined globally).

---

## File Map

**New files to create:**
- `frontend/components/sections/HowItWorks.tsx` — 3-step visual flow
- `frontend/components/sections/ForBusinesses.tsx` — target industry grid
- `frontend/components/sections/SocialProof.tsx` — 3 testimonial cards
- `frontend/components/sections/FinalCTA.tsx` — closing CTA with radial glow

**Files to modify:**
- `frontend/components/sections/Hero.tsx` — badge, H1, subtitle, one stat
- `frontend/components/sections/Features.tsx` — title and subtitle only
- `frontend/components/sections/Pricing.tsx` — add comparison line + guarantee badge
- `frontend/components/sections/FAQ.tsx` — add 2 new FAQ items
- `frontend/app/(marketing)/page.tsx` — import and render new sections in order

---

## Task 1: Modify Hero copy

**Files:**
- Modify: `frontend/components/sections/Hero.tsx`

- [ ] **Step 1: Update badge, H1, subtitle, and stat**

Replace the contents of `frontend/components/sections/Hero.tsx` with:

```tsx
// frontend/components/sections/Hero.tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { fadeInUp, staggerContainer } from '@/lib/motion'
import { useCountUp } from '@/hooks/useCountUp'

interface StatItemProps {
  end: number
  suffix: string
  prefix?: string
  label: string
}

function StatItem({ end, suffix, prefix = '', label }: StatItemProps) {
  const { ref, value } = useCountUp(end)
  return (
    <div ref={ref} className="text-center px-4 py-2">
      <div className="text-3xl font-bold text-glow-cyan">
        {prefix}{value}{suffix}
      </div>
      <div className="text-sm mt-1" style={{ color: '#94a3b8' }}>{label}</div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#020b14' }}>
      {/* Cyber Grid */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />
      {/* Radial glow top-center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeInUp}>
            <span
              className="inline-block text-sm font-medium px-4 py-1.5 rounded-full mb-6"
              style={{
                background: 'rgba(6,182,212,0.08)',
                border: '1px solid rgba(6,182,212,0.25)',
                color: '#67e8f9',
              }}
            >
              🟢 Más de 50 negocios chilenos ya usan Cliente Fiel
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-5xl md:text-6xl font-bold leading-tight mb-6"
            style={{ color: '#f1f5f9' }}
          >
            Reservas automáticas por WhatsApp.{' '}
            <span className="text-glow-cyan">Menos ausencias.</span>
            <br />
            Más clientes que vuelven.
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-xl max-w-2xl mx-auto mb-10"
            style={{ color: '#94a3b8' }}
          >
            Conectas tu WhatsApp Business una vez. Tus clientes reservan con un mensaje,
            reciben recordatorios automáticos y vuelven solos — sin apps, sin formularios.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro" className="btn-cyan px-8 py-4 rounded-xl text-lg">
              Prueba gratis 14 días →
            </Link>
            <Link href="/precios" className="btn-ghost-cyan px-8 py-4 rounded-xl text-lg font-semibold">
              Ver planes
            </Link>
          </motion.div>

          <motion.p variants={fadeInUp} className="text-sm mt-4" style={{ color: '#475569' }}>
            Sin tarjeta hasta el día 14 · Cancela cuando quieras · Configura en 5 minutos
          </motion.p>
        </motion.div>

        {/* Stats with CountUp */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mt-16 grid grid-cols-3 max-w-lg mx-auto"
          style={{ borderTop: '1px solid rgba(6,182,212,0.1)', paddingTop: '2rem' }}
        >
          <motion.div variants={fadeInUp}>
            <StatItem end={60} prefix="-" suffix="%" label="Ausencias" />
          </motion.div>
          <motion.div
            variants={fadeInUp}
            style={{
              borderLeft: '1px solid rgba(6,182,212,0.15)',
              borderRight: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <StatItem end={3} suffix="x" label="ROI promedio" />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <StatItem end={5} suffix=" min" label="Configuración" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/Hero.tsx
git commit -m "feat(landing): update Hero copy and stats"
```

---

## Task 2: Create HowItWorks section

**Files:**
- Create: `frontend/components/sections/HowItWorks.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/components/sections/HowItWorks.tsx`:

```tsx
// frontend/components/sections/HowItWorks.tsx
'use client'
import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const steps = [
  {
    number: '1',
    icon: '📱',
    title: 'Conectas tu WhatsApp Business',
    description:
      'Autoriza con tu cuenta Meta en menos de 2 minutos. Sin código, sin técnico.',
  },
  {
    number: '2',
    icon: '💬',
    title: 'Tus clientes reservan con un mensaje',
    description:
      'Envían un mensaje a tu número. El bot guía la conversación con botones — ellos ya saben usar WhatsApp.',
  },
  {
    number: '3',
    icon: '⚡',
    title: 'El sistema trabaja por ti',
    description:
      'Confirmación inmediata, recordatorio 24h antes y 1h antes. Después de la visita, mensaje de recompra automático.',
  },
]

export function HowItWorks() {
  return (
    <section className="w-full" style={{ background: '#030d1a' }}>
      <div className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold"
            style={{ color: '#f1f5f9' }}
          >
            Funciona en 3 pasos simples
          </motion.h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-stretch gap-4"
        >
          {steps.map((step, i) => (
            <Fragment key={step.number}>
              <motion.div
                variants={fadeInUp}
                className="glass-card p-6 flex-1 flex flex-col items-center text-center"
              >
                <div
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mb-4 flex-shrink-0"
                  style={{
                    background: 'rgba(6,182,212,0.15)',
                    border: '1px solid rgba(6,182,212,0.3)',
                    color: '#06b6d4',
                  }}
                >
                  {step.number}
                </div>
                <div className="text-3xl mb-3">{step.icon}</div>
                <h3 className="font-semibold mb-2" style={{ color: '#f1f5f9' }}>
                  {step.title}
                </h3>
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  {step.description}
                </p>
              </motion.div>

              {i < steps.length - 1 && (
                <div
                  className="hidden md:flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ color: 'rgba(6,182,212,0.4)' }}
                >
                  →
                </div>
              )}
            </Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/HowItWorks.tsx
git commit -m "feat(landing): add HowItWorks section"
```

---

## Task 3: Modify Features copy

**Files:**
- Modify: `frontend/components/sections/Features.tsx`

- [ ] **Step 1: Update title and subtitle only**

In `frontend/components/sections/Features.tsx`, replace the two lines inside the `<motion.div className="text-center mb-12">` block:

```tsx
// Change this:
<motion.h2 variants={fadeInUp} className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>
  ¿Cómo funciona?
</motion.h2>
<motion.p variants={fadeInUp} className="mt-3 text-lg" style={{ color: '#94a3b8' }}>
  Conectas tu WhatsApp Business en 5 minutos. El resto funciona solo.
</motion.p>

// To this:
<motion.h2 variants={fadeInUp} className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>
  Todo lo que necesitas para retener clientes
</motion.h2>
<motion.p variants={fadeInUp} className="mt-3 text-lg" style={{ color: '#94a3b8' }}>
  Una herramienta, cuatro resultados concretos.
</motion.p>
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/Features.tsx
git commit -m "feat(landing): update Features section title and subtitle"
```

---

## Task 4: Create ForBusinesses section

**Files:**
- Create: `frontend/components/sections/ForBusinesses.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/components/sections/ForBusinesses.tsx`:

```tsx
// frontend/components/sections/ForBusinesses.tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const businesses = [
  { icon: '💇', label: 'Peluquerías y barberías' },
  { icon: '💆', label: 'Spas y centros de estética' },
  { icon: '🦷', label: 'Consultorios y clínicas' },
  { icon: '🏋️', label: 'Gimnasios y entrenadores' },
  { icon: '🍽️', label: 'Restaurantes y cafeterías' },
  { icon: '🔧', label: 'Talleres y servicios técnicos' },
]

export function ForBusinesses() {
  return (
    <section className="w-full" style={{ background: '#020b14' }}>
      <div className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold mb-10"
            style={{ color: '#f1f5f9' }}
          >
            Para negocios que atienden con cita
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10"
          >
            {businesses.map((b) => (
              <motion.div
                key={b.label}
                variants={fadeInUp}
                className="glass-card p-4 flex items-center gap-3"
              >
                <span className="text-2xl flex-shrink-0">{b.icon}</span>
                <span className="text-sm font-medium text-left" style={{ color: '#94a3b8' }}>
                  {b.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            variants={fadeInUp}
            className="text-lg mb-8"
            style={{ color: '#94a3b8' }}
          >
            Si atiendes con hora, Cliente Fiel reduce tus ausencias y hace que tus clientes vuelvan solos.
          </motion.p>

          <motion.div variants={fadeInUp}>
            <Link href="/registro" className="btn-cyan px-8 py-3 rounded-xl font-semibold">
              Prueba 14 días gratis →
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/ForBusinesses.tsx
git commit -m "feat(landing): add ForBusinesses section"
```

---

## Task 5: Create SocialProof section

**Files:**
- Create: `frontend/components/sections/SocialProof.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/components/sections/SocialProof.tsx`:

```tsx
// frontend/components/sections/SocialProof.tsx
'use client'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'

// TODO: Replace with real customer testimonials before marketing launch
const testimonials = [
  {
    quote:
      'Antes me olvidaba de recordar a los clientes y tenía 3-4 ausencias a la semana. Ahora casi cero.',
    name: 'María',
    business: 'Peluquería',
    city: 'Santiago',
  },
  {
    quote:
      'Mis clientes reservan a las 11pm cuando yo ya dormí. Al otro día llegan con su confirmación en WhatsApp.',
    name: 'Roberto',
    business: 'Barbería',
    city: 'Valparaíso',
  },
  {
    quote:
      'Lo configuré en una tarde. La semana siguiente ya estaba mandando recordatorios solo.',
    name: 'Daniela',
    business: 'Spa',
    city: 'Concepción',
  },
]

export function SocialProof() {
  return (
    <section className="w-full" style={{ background: '#030d1a' }}>
      <div className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold"
            style={{ color: '#f1f5f9' }}
          >
            Lo que dicen nuestros clientes
          </motion.h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeInUp}
              className="glass-card p-6 flex flex-col"
            >
              <span
                className="text-4xl font-serif leading-none mb-4"
                style={{ color: '#06b6d4' }}
              >
                "
              </span>
              <p
                className="text-sm leading-relaxed flex-1 mb-4"
                style={{ color: '#94a3b8' }}
              >
                {t.quote}
              </p>
              <div>
                <div className="font-medium text-sm" style={{ color: '#f1f5f9' }}>
                  {t.name}
                </div>
                <div className="text-xs" style={{ color: '#475569' }}>
                  {t.business} · {t.city}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/SocialProof.tsx
git commit -m "feat(landing): add SocialProof section with placeholder testimonials"
```

---

## Task 6: Modify Pricing section

**Files:**
- Modify: `frontend/components/sections/Pricing.tsx`

- [ ] **Step 1: Add comparison line and guarantee badge**

In `frontend/components/sections/Pricing.tsx`:

After the closing `</motion.div>` of the title block (after the subtitle `<motion.p>`), add a comparison line. Then after the closing `</motion.div>` of the plans grid, add the guarantee badge.

The full updated file:

```tsx
// frontend/components/sections/Pricing.tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const plans = [
  {
    name: 'Básico',
    priceCLP: '$3.000',
    priceUSD: 'USD 3',
    subtitle: 'Agenda Automatizada',
    features: [
      'Reservas vía WhatsApp',
      'Configuración de horarios',
      'Confirmación automática inmediata',
      'Recordatorios: confirmación + 24h + 1h',
    ],
    cta: 'Empezar con Básico',
    href: '/registro?plan=basic',
    highlighted: false,
  },
  {
    name: 'Medio',
    priceCLP: '$40.000',
    priceUSD: 'USD 42',
    subtitle: 'Recompra Inteligente',
    features: [
      'Todo el Plan Básico',
      'Recordatorios personalizados por servicio',
      'Configuración de recurrencia por cliente',
      'Mensaje automático de recompra post-visita',
    ],
    cta: 'Empezar con Medio',
    href: '/registro?plan=medium',
    highlighted: true,
  },
  {
    name: 'Premium',
    priceCLP: '$60.000',
    priceUSD: 'USD 62',
    subtitle: 'Fidelización + Retención',
    features: [
      'Todo el Plan Medio',
      'Sistema de puntos y recompensas',
      'Segmentación de clientes y VIP',
      'Campañas automáticas ("Te extrañamos")',
      'Métricas: retorno, recurrencia, LTV',
    ],
    cta: 'Empezar con Premium',
    href: '/registro?plan=premium',
    highlighted: false,
  },
]

export function Pricing() {
  return (
    <section id="precios" className="w-full" style={{ background: '#030d1a' }}>
      <div className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>
            Planes simples, sin sorpresas
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-3 text-lg" style={{ color: '#94a3b8' }}>
            14 días gratis · Suscripción mensual con tarjeta · Cancela cuando quieras
          </motion.p>
          <motion.p
            variants={fadeInUp}
            className="mt-4 text-sm font-medium"
            style={{ color: '#64748b' }}
          >
            Una secretaria cuesta $400.000/mes. Cliente Fiel desde $3.000.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
              className="glass-card glass-card-hover p-8 flex flex-col"
              style={
                plan.highlighted
                  ? {
                      border: '1px solid rgba(6,182,212,0.4)',
                      boxShadow: '0 0 30px rgba(6,182,212,0.08)',
                    }
                  : undefined
              }
            >
              {plan.highlighted && (
                <span
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 self-start"
                  style={{ background: '#06b6d4', color: '#020b14' }}
                >
                  MÁS POPULAR
                </span>
              )}
              <div className="text-4xl font-bold" style={{ color: '#f1f5f9' }}>
                {plan.priceCLP}
                <span className="text-base font-normal" style={{ color: '#94a3b8' }}> CLP/mes</span>
              </div>
              <div className="text-sm mt-0.5" style={{ color: '#64748b' }}>
                {plan.priceUSD}/mes
              </div>
              <div className="font-semibold mt-1" style={{ color: '#f1f5f9' }}>{plan.name}</div>
              <div className="text-sm mb-6" style={{ color: '#94a3b8' }}>{plan.subtitle}</div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#94a3b8' }}>
                    <span style={{ color: '#10b981', marginTop: '2px' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`block text-center py-3 rounded-xl font-semibold text-sm ${
                  plan.highlighted ? 'btn-cyan' : 'btn-ghost-cyan'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center text-sm mt-8"
          style={{ color: '#475569' }}
        >
          🔒 14 días gratis · Sin tarjeta · Cancela cuando quieras · Soporte por WhatsApp
        </motion.p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/Pricing.tsx
git commit -m "feat(landing): add comparison line and guarantee badge to Pricing"
```

---

## Task 7: Modify FAQ — add 2 new items

**Files:**
- Modify: `frontend/components/sections/FAQ.tsx`

- [ ] **Step 1: Add 2 new FAQ items to the array**

In `frontend/components/sections/FAQ.tsx`, the `faqs` array currently ends after the 5th item. Add the two new items at the end of the array:

```tsx
// Change the faqs array — add these two items after the last existing item:
  {
    q: '¿Es seguro conectar mi WhatsApp Business?',
    a: 'Sí. Tus credenciales se guardan cifradas y solo se usan para enviar mensajes en tu nombre. Nunca compartimos tu número con otros negocios ni con terceros.',
  },
  {
    q: '¿Cuánto cuesta realmente? ¿Hay costos ocultos?',
    a: 'Solo pagas el plan mensual. Sin costo de instalación, sin comisiones por reserva, sin cobros por mensaje. Lo que ves en los planes es lo que pagas.',
  },
```

The complete updated `faqs` array:

```tsx
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
  {
    q: '¿Es seguro conectar mi WhatsApp Business?',
    a: 'Sí. Tus credenciales se guardan cifradas y solo se usan para enviar mensajes en tu nombre. Nunca compartimos tu número con otros negocios ni con terceros.',
  },
  {
    q: '¿Cuánto cuesta realmente? ¿Hay costos ocultos?',
    a: 'Solo pagas el plan mensual. Sin costo de instalación, sin comisiones por reserva, sin cobros por mensaje. Lo que ves en los planes es lo que pagas.',
  },
]
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/FAQ.tsx
git commit -m "feat(landing): add security and pricing FAQ items"
```

---

## Task 8: Create FinalCTA section

**Files:**
- Create: `frontend/components/sections/FinalCTA.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/components/sections/FinalCTA.tsx`:

```tsx
// frontend/components/sections/FinalCTA.tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { staggerContainer, fadeInUp } from '@/lib/motion'

export function FinalCTA() {
  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#020b14' }}>
      {/* Radial glow bottom-center — bookend with Hero's top glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 110%, rgba(6,182,212,0.12) 0%, transparent 70%)',
        }}
      />
      <div className="relative max-w-3xl mx-auto px-4 py-24 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: '#f1f5f9' }}
          >
            ¿Listo para dejar de perder horas en WhatsApp?
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg mb-8"
            style={{ color: '#94a3b8' }}
          >
            Configura en 5 minutos. Los primeros 14 días son gratis, sin tarjeta.
          </motion.p>
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/registro" className="btn-cyan px-8 py-4 rounded-xl text-lg font-semibold">
              Crear mi cuenta gratis →
            </Link>
            <Link
              href="/#precios"
              className="btn-ghost-cyan px-8 py-4 rounded-xl text-lg font-semibold"
            >
              Ver planes
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/FinalCTA.tsx
git commit -m "feat(landing): add FinalCTA closing section"
```

---

## Task 9: Wire up page.tsx + final build

**Files:**
- Modify: `frontend/app/(marketing)/page.tsx`

- [ ] **Step 1: Update the page orchestrator**

Replace `frontend/app/(marketing)/page.tsx` with:

```tsx
// frontend/app/(marketing)/page.tsx
import Script from 'next/script'
import { Hero } from '@/components/sections/Hero'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Features } from '@/components/sections/Features'
import { ForBusinesses } from '@/components/sections/ForBusinesses'
import { SocialProof } from '@/components/sections/SocialProof'
import { Pricing } from '@/components/sections/Pricing'
import { FAQ } from '@/components/sections/FAQ'
import { FinalCTA } from '@/components/sections/FinalCTA'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cliente Fiel — Reservas y Fidelización por WhatsApp para tu Negocio',
  description:
    'Automatiza reservas, recordatorios y fidelización de clientes vía WhatsApp Business. Sin apps que instalar. Prueba 14 días gratis sin tarjeta.',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Cliente Fiel',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Sistema de reservas y fidelización vía WhatsApp para pequeños negocios. Sin apps, sin complicaciones.',
  offers: [
    { '@type': 'Offer', name: 'Plan Básico', price: '3000', priceCurrency: 'CLP' },
    { '@type': 'Offer', name: 'Plan Medio', price: '40000', priceCurrency: 'CLP' },
    { '@type': 'Offer', name: 'Plan Premium', price: '60000', priceCurrency: 'CLP' },
  ],
}

export default function HomePage() {
  return (
    <>
      <Script
        id="schema-org"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <HowItWorks />
      <Features />
      <ForBusinesses />
      <SocialProof />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Production build**

```bash
cd frontend && npm run build
```

Expected: `✓ Compiled successfully`. Zero TypeScript errors. Zero lint errors. Route `/ (marketing)` should appear in the build output.

- [ ] **Step 4: Visual check — start dev server**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000` and verify:
1. Hero shows updated badge "🟢 Más de 50 negocios..." and new H1
2. Below Hero: "Funciona en 3 pasos simples" with 3 connected cards and `→` arrows on desktop
3. Below HowItWorks: "Todo lo que necesitas para retener clientes" feature cards
4. Below Features: "Para negocios que atienden con cita" 2×3 grid
5. Below ForBusinesses: "Lo que dicen nuestros clientes" 3 testimonial cards
6. Below SocialProof: Pricing with comparison line and 🔒 badge at bottom
7. Below Pricing: FAQ with 7 items (2 new at end)
8. Bottom: "¿Listo para dejar de perder horas en WhatsApp?" with radial glow

- [ ] **Step 5: Commit and push**

```bash
git add "frontend/app/(marketing)/page.tsx"
git commit -m "feat(landing): wire up all new sections in page orchestrator"
git push origin main
```

Push triggers Vercel auto-deploy. Preview URL available in Vercel dashboard within ~2 minutes.
