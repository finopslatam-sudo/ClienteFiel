# Futuristic Frontend Design — Cyber Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform all frontend pages (landing, auth, dashboard) to a dark Cyber Grid aesthetic with Framer Motion animations, without touching any business logic, API calls, or authentication.

**Architecture:** Design tokens in `globals.css`; reusable Framer Motion variants in `lib/motion.ts`; CountUp hook in `hooks/useCountUp.ts`; each page/component gets visual-only updates. Dashboard uses clean dark (`#030d1a`) without grid — landing/auth get full Cyber Grid.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v3 (darkMode: class), Framer Motion v12, TypeScript strict, `@/*` alias maps to `frontend/`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/app/globals.css` | Modify | Dark CSS variables, Cyber Grid class, glassmorphism, button/input dark utilities |
| `frontend/app/layout.tsx` | Modify | Add `dark` class to `<html>` to activate Tailwind dark mode |
| `frontend/lib/motion.ts` | Create | Framer Motion variants: `fadeInUp`, `staggerContainer`, `cardHover`, `scrollReveal` |
| `frontend/hooks/useCountUp.ts` | Create | Scroll-triggered numeric counter hook |
| `frontend/app/(marketing)/layout.tsx` | Modify | Dark glassmorphism navbar, dark footer |
| `frontend/components/sections/Hero.tsx` | Modify | Cyber Grid bg, glow headline, CountUp stats, stagger animations |
| `frontend/components/sections/Features.tsx` | Modify | Glassmorphism cards, stagger on viewport, scale hover |
| `frontend/components/sections/Pricing.tsx` | Modify | Dark glassmorphism cards, cyan highlighted plan |
| `frontend/components/sections/FAQ.tsx` | Modify | Dark accordion, AnimatePresence expand/collapse, cyan icon |
| `frontend/app/(auth)/layout.tsx` | Modify | Full-screen Cyber Grid, desktop split grid (left brand / right form) |
| `frontend/app/(auth)/login/page.tsx` | Modify | Dark glass form panel, dark inputs, cyan submit, fadeInUp |
| `frontend/app/(auth)/registro/page.tsx` | Modify | Same dark treatment as login |
| `frontend/app/(dashboard)/layout.tsx` | Modify | Dark `#030d1a` background (no grid) |
| `frontend/components/dashboard/Sidebar.tsx` | Modify | Dark sidebar, cyan active state with border-left |
| `frontend/app/(dashboard)/agenda/page.tsx` | Modify | Glassmorphism booking cards, neon status colors, stagger animation |

---

## Task 1: Design tokens and shared utilities

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/layout.tsx`
- Create: `frontend/lib/motion.ts`
- Create: `frontend/hooks/useCountUp.ts`

- [ ] **Step 1: Replace `frontend/app/globals.css`**

Replace the entire file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
  .dark body,
  .dark {
    background-color: #020b14;
    color: #f1f5f9;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  /* Cyber Grid — 28px grid with subtle cyan lines */
  .cyber-grid {
    background-image:
      linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  /* Glassmorphism card base */
  .glass-card {
    background: rgba(6, 182, 212, 0.04);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(6, 182, 212, 0.12);
    border-radius: 16px;
  }

  /* Glass card hover — border/shadow only; scale is handled by Framer Motion */
  .glass-card-hover {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .glass-card-hover:hover {
    border-color: rgba(6, 182, 212, 0.35);
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.1);
  }

  /* Cyan primary button */
  .btn-cyan {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #06b6d4;
    color: #020b14;
    font-weight: 700;
    transition: box-shadow 0.2s ease;
  }
  .btn-cyan:hover {
    box-shadow: 0 0 24px rgba(6, 182, 212, 0.5);
  }
  .btn-cyan:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Ghost button with cyan border */
  .btn-ghost-cyan {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(6, 182, 212, 0.06);
    border: 1px solid rgba(6, 182, 212, 0.2);
    color: #f1f5f9;
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .btn-ghost-cyan:hover {
    background: rgba(6, 182, 212, 0.1);
    border-color: rgba(6, 182, 212, 0.4);
  }

  /* Cyan text with glow */
  .text-glow-cyan {
    color: #06b6d4;
    text-shadow: 0 0 30px rgba(6, 182, 212, 0.6);
  }

  /* Dark input field */
  .input-dark {
    background: rgba(6, 182, 212, 0.05);
    border: 1px solid rgba(6, 182, 212, 0.15);
    color: #f1f5f9;
    border-radius: 8px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .input-dark::placeholder {
    color: #475569;
  }
  .input-dark:focus {
    outline: none;
    border-color: #06b6d4;
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
  }
}
```

- [ ] **Step 2: Add `dark` class to `<html>` in `frontend/app/layout.tsx`**

Change line 23 from:
```tsx
<html lang="es">
```
To:
```tsx
<html lang="es" className="dark">
```

- [ ] **Step 3: Create `frontend/lib/motion.ts`**

```ts
import { type Variants } from 'framer-motion'

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

export const cardHover: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
}

export const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}
```

- [ ] **Step 4: Create `frontend/hooks/useCountUp.ts`**

```ts
'use client'
import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

export function useCountUp(end: number, duration = 2) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView) return
    let startTime: number | null = null
    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      setValue(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(animate)
    }
    const id = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(id)
  }, [isInView, end, duration])

  return { ref, value }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run from `frontend/` directory:
```bash
npx tsc --noEmit
```
Expected: zero errors. If you see "Cannot find module 'framer-motion'" ensure `node_modules` is installed (`npm install`).

- [ ] **Step 6: Commit**

```bash
git add frontend/app/globals.css frontend/app/layout.tsx frontend/lib/motion.ts frontend/hooks/useCountUp.ts
git commit -m "feat: add dark design tokens, Cyber Grid utilities, motion variants, and useCountUp hook"
```

---

## Task 2: Marketing Navbar and Footer

**Files:**
- Modify: `frontend/app/(marketing)/layout.tsx`

- [ ] **Step 1: Replace `frontend/app/(marketing)/layout.tsx`**

```tsx
// frontend/app/(marketing)/layout.tsx
import Link from 'next/link'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          background: 'rgba(2, 11, 20, 0.85)',
          borderBottom: '1px solid rgba(6, 182, 212, 0.08)',
        }}
      >
        <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl" style={{ color: '#f1f5f9' }}>
            Cliente Fiel
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/precios"
              className="text-sm transition-colors"
              style={{ color: '#94a3b8' }}
            >
              Precios
            </Link>
            <Link
              href="/login"
              className="text-sm transition-colors"
              style={{ color: '#94a3b8' }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="btn-ghost-cyan px-4 py-2 rounded-lg text-sm font-medium"
            >
              Prueba gratis
            </Link>
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer
        className="py-12 mt-20"
        style={{
          background: '#020b14',
          borderTop: '1px solid rgba(6, 182, 212, 0.08)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p className="font-semibold mb-2" style={{ color: '#f1f5f9' }}>Cliente Fiel</p>
          <p style={{ color: '#475569' }}>Automatiza tu WhatsApp Business. Sin apps, sin complicaciones.</p>
          <p className="mt-4" style={{ color: '#475569' }}>© 2026 Cliente Fiel. Chile.</p>
        </div>
      </footer>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(marketing)/layout.tsx"
git commit -m "feat: dark glassmorphism navbar and footer"
```

---

## Task 3: Hero section

**Files:**
- Modify: `frontend/components/sections/Hero.tsx`

- [ ] **Step 1: Replace `frontend/components/sections/Hero.tsx`**

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
              ✅ Tus clientes ya tienen WhatsApp — úsalo
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-5xl md:text-6xl font-bold leading-tight mb-6"
            style={{ color: '#f1f5f9' }}
          >
            Reservas y recordatorios{' '}
            <span className="text-glow-cyan">automáticos</span>
            <br />
            por WhatsApp
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-xl max-w-2xl mx-auto mb-10"
            style={{ color: '#94a3b8' }}
          >
            Cliente Fiel automatiza tu WhatsApp Business. Tus clientes reservan, reciben
            recordatorios y vuelven solos — sin apps que instalar, sin formularios complicados.
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
            <StatItem end={60} prefix="-" suffix="%" label="Menos ausencias" />
          </motion.div>
          <motion.div
            variants={fadeInUp}
            style={{
              borderLeft: '1px solid rgba(6,182,212,0.15)',
              borderRight: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <StatItem end={2} suffix="x" label="Más retorno" />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <StatItem end={5} suffix=" min" label="Para configurar" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/Hero.tsx
git commit -m "feat: Hero section with Cyber Grid background, glow headline, and CountUp stats"
```

---

## Task 4: Features section

**Files:**
- Modify: `frontend/components/sections/Features.tsx`

- [ ] **Step 1: Replace `frontend/components/sections/Features.tsx`**

```tsx
// frontend/components/sections/Features.tsx
'use client'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const features = [
  {
    icon: '📅',
    title: 'Reservas por WhatsApp',
    description:
      'Tus clientes reservan enviando un mensaje. El sistema guía la conversación con botones — sin que el cliente instale nada.',
  },
  {
    icon: '⏰',
    title: 'Recordatorios automáticos',
    description:
      'Confirmación inmediata, recordatorio 24h antes y 1h antes. Reduce ausencias hasta un 60% sin trabajo manual.',
  },
  {
    icon: '🔄',
    title: 'Clientes que vuelven solos',
    description:
      'Mensaje de recompra post-visita y campañas automáticas de "te extrañamos". Tus clientes regresan 2x más.',
  },
  {
    icon: '📊',
    title: 'Panel de control',
    description:
      'Agenda semanal, historial de clientes, métricas de retorno. Todo desde un dashboard limpio y fácil de usar.',
  },
]

export function Features() {
  return (
    <section className="relative w-full overflow-hidden" style={{ background: '#020b14' }}>
      <div className="absolute inset-0 cyber-grid pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>
            ¿Cómo funciona?
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-3 text-lg" style={{ color: '#94a3b8' }}>
            Conectas tu WhatsApp Business en 5 minutos. El resto funciona solo.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-8"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
              className="glass-card glass-card-hover p-6"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#f1f5f9' }}>{f.title}</h3>
              <p style={{ color: '#94a3b8' }}>{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/Features.tsx
git commit -m "feat: Features section with glassmorphism cards and stagger viewport animation"
```

---

## Task 5: Pricing section

**Files:**
- Modify: `frontend/components/sections/Pricing.tsx`

- [ ] **Step 1: Replace `frontend/components/sections/Pricing.tsx`**

```tsx
// frontend/components/sections/Pricing.tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const plans = [
  {
    name: 'Básico',
    price: '$29',
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
    price: '$59',
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
    price: '$99',
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
          className="text-center mb-12"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>
            Planes simples, sin sorpresas
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-3 text-lg" style={{ color: '#94a3b8' }}>
            14 días gratis · Sin tarjeta · Cancela cuando quieras
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
                {plan.price}
                <span className="text-base font-normal" style={{ color: '#94a3b8' }}> USD/mes</span>
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
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/Pricing.tsx
git commit -m "feat: Pricing section with dark glassmorphism cards and cyan highlighted plan"
```

---

## Task 6: FAQ section

**Files:**
- Modify: `frontend/components/sections/FAQ.tsx`

- [ ] **Step 1: Replace `frontend/components/sections/FAQ.tsx`**

```tsx
// frontend/components/sections/FAQ.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/motion'

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
    <section className="w-full" style={{ background: '#020b14' }}>
      <div className="max-w-3xl mx-auto px-4 py-20">
        <motion.h2
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-10"
          style={{ color: '#f1f5f9' }}
        >
          Preguntas frecuentes
        </motion.h2>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-3"
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-2 py-4 font-medium flex justify-between items-center transition-colors"
                style={{ color: '#f1f5f9' }}
              >
                {faq.q}
                <span className="text-glow-cyan ml-4 text-lg font-light flex-shrink-0">
                  {open === i ? '−' : '+'}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="px-2 pb-4 text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/sections/FAQ.tsx
git commit -m "feat: FAQ section with dark accordion and AnimatePresence expand/collapse"
```

---

## Task 7: Auth layout

**Files:**
- Modify: `frontend/app/(auth)/layout.tsx`

- [ ] **Step 1: Replace `frontend/app/(auth)/layout.tsx`**

```tsx
// frontend/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const brandFeatures = [
    { icon: '📅', text: 'Reservas automáticas por WhatsApp' },
    { icon: '⏰', text: 'Recordatorios 24h y 1h antes' },
    { icon: '🔄', text: 'Clientes que vuelven solos' },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#020b14' }}>
      {/* Cyber Grid */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative min-h-screen grid md:grid-cols-2">
        {/* Left panel — brand, hidden on mobile */}
        <div className="hidden md:flex flex-col items-center justify-center px-12 py-20">
          <div className="max-w-sm text-center">
            <div className="text-3xl font-bold mb-3" style={{ color: '#f1f5f9' }}>
              Cliente Fiel
            </div>
            <p className="mb-10" style={{ color: '#94a3b8' }}>
              Automatiza tu WhatsApp Business. Tus clientes reservan solos.
            </p>
            <div className="space-y-3">
              {brandFeatures.map((item) => (
                <div
                  key={item.text}
                  className="glass-card flex items-center gap-3 px-4 py-3 text-sm text-left"
                  style={{ color: '#94a3b8' }}
                >
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex items-center justify-center px-4 py-12 md:px-12">
          <div className="w-full max-w-md">
            {/* Mobile logo — only shown when left panel is hidden */}
            <div className="md:hidden text-center mb-8">
              <span className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Cliente Fiel</span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(auth)/layout.tsx"
git commit -m "feat: auth layout with Cyber Grid background and desktop split panel"
```

---

## Task 8: Login page

**Files:**
- Modify: `frontend/app/(auth)/login/page.tsx`

- [ ] **Step 1: Replace `frontend/app/(auth)/login/page.tsx`**

Keep all form logic identical. Only visual classes change.

```tsx
// frontend/app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { login } from '@/lib/auth'
import { fadeInUp } from '@/lib/motion'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      await login(data)
      router.push('/agenda')
    } catch {
      setError('Email o contraseña incorrectos')
    }
  }

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="glass-card p-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
        Iniciar sesión
      </h1>
      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>Bienvenido de vuelta</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="tu@negocio.cl"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.email && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Contraseña
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.password && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-cyan w-full py-3 rounded-lg text-sm"
        >
          {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#94a3b8' }}>
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="font-medium hover:underline" style={{ color: '#06b6d4' }}>
          Prueba gratis 14 días
        </Link>
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(auth)/login/page.tsx"
git commit -m "feat: login page dark glass form with cyan focus inputs"
```

---

## Task 9: Registro page

**Files:**
- Modify: `frontend/app/(auth)/registro/page.tsx`

- [ ] **Step 1: Replace `frontend/app/(auth)/registro/page.tsx`**

Keep all form logic identical. Only visual classes change.

```tsx
// frontend/app/(auth)/registro/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { register as registerUser } from '@/lib/auth'
import { fadeInUp } from '@/lib/motion'

const schema = z.object({
  business_name: z.string().min(2, 'Nombre del negocio requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      await registerUser(data)
      router.push('/onboarding')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Error al crear la cuenta. Intenta nuevamente.')
    }
  }

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="glass-card p-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
        Crear tu cuenta gratis
      </h1>
      <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>14 días gratis · Sin tarjeta de crédito</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Nombre del negocio
          </label>
          <input
            {...register('business_name')}
            placeholder="Peluquería Style"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.business_name && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.business_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="tu@negocio.cl"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.email && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
            Contraseña
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="Mínimo 8 caracteres"
            className="input-dark w-full px-3 py-2 text-sm"
          />
          {errors.password && (
            <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-cyan w-full py-3 rounded-lg text-sm"
        >
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
        </button>

        <p className="text-center text-xs" style={{ color: '#475569' }}>
          Sin tarjeta hasta el día 14 · Cancela cuando quieras
        </p>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#94a3b8' }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium hover:underline" style={{ color: '#06b6d4' }}>
          Iniciar sesión
        </Link>
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(auth)/registro/page.tsx"
git commit -m "feat: registro page dark glass form matching login style"
```

---

## Task 10: Dashboard layout and Sidebar

**Files:**
- Modify: `frontend/app/(dashboard)/layout.tsx`
- Modify: `frontend/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Replace `frontend/app/(dashboard)/layout.tsx`**

```tsx
// frontend/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/dashboard/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#030d1a' }}>
      <Sidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Replace `frontend/components/dashboard/Sidebar.tsx`**

```tsx
// frontend/components/dashboard/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'

const navItems = [
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/configuracion', label: 'Configuración', icon: '⚙️' },
  { href: '/whatsapp', label: 'WhatsApp', icon: '💬' },
  { href: '/logs', label: 'Logs', icon: '📋' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 flex flex-col h-screen sticky top-0"
      style={{
        background: 'rgba(2, 11, 20, 0.98)',
        borderRight: '1px solid rgba(6, 182, 212, 0.08)',
      }}
    >
      <div
        className="p-6"
        style={{ borderBottom: '1px solid rgba(6, 182, 212, 0.08)' }}
      >
        <span className="font-bold text-lg" style={{ color: '#f1f5f9' }}>Cliente Fiel</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                isActive
                  ? {
                      background: 'rgba(6, 182, 212, 0.1)',
                      borderLeft: '2px solid #06b6d4',
                      color: '#06b6d4',
                      paddingLeft: '10px',
                    }
                  : { color: '#94a3b8' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)'
                  e.currentTarget.style.color = '#f1f5f9'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid rgba(6, 182, 212, 0.08)' }}>
        <button
          onClick={() => logout()}
          className="w-full text-left text-sm px-3 py-2 rounded-lg transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#94a3b8'
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#475569'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add "frontend/app/(dashboard)/layout.tsx" frontend/components/dashboard/Sidebar.tsx
git commit -m "feat: dark dashboard layout and sidebar with cyan active state"
```

---

## Task 11: Agenda page

**Files:**
- Modify: `frontend/app/(dashboard)/agenda/page.tsx`

- [ ] **Step 1: Replace `frontend/app/(dashboard)/agenda/page.tsx`**

Keep all booking logic (hooks, mutations, date formatting) identical. Only visual classes change.

```tsx
// frontend/app/(dashboard)/agenda/page.tsx
'use client'
import { useState } from 'react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useBookings, useCancelBooking, useCompleteBooking } from '@/lib/hooks/useBookings'
import { formatWeekRange, nextWeek, prevWeek } from '@/lib/utils/dates'
import { staggerContainer, fadeInUp } from '@/lib/motion'

const statusStyle: Record<string, string> = {
  confirmed: '#10b981',
  canceled: '#ef4444',
  completed: '#94a3b8',
  pending: '#f59e0b',
}

export default function AgendaPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const dateFrom = startOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const dateTo = endOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString()
  const { data, isLoading } = useBookings(dateFrom, dateTo)
  const cancelBooking = useCancelBooking()
  const completeBooking = useCompleteBooking()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Agenda</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentWeek(prevWeek(currentWeek))}
            className="px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              border: '1px solid rgba(6,182,212,0.15)',
              color: '#94a3b8',
              background: 'transparent',
            }}
          >
            ← Anterior
          </button>
          <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
            {formatWeekRange(currentWeek)}
          </span>
          <button
            onClick={() => setCurrentWeek(nextWeek(currentWeek))}
            className="px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              border: '1px solid rgba(6,182,212,0.15)',
              color: '#94a3b8',
              background: 'transparent',
            }}
          >
            Siguiente →
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm" style={{ color: '#94a3b8' }}>Cargando reservas...</div>
      ) : data?.bookings.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4">📅</div>
          <p style={{ color: '#94a3b8' }}>No hay reservas esta semana.</p>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {data?.bookings.map((booking) => (
            <motion.div
              key={booking.id}
              variants={fadeInUp}
              className="glass-card glass-card-hover p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium" style={{ color: '#f1f5f9' }}>
                  {format(new Date(booking.scheduled_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                </div>
                <div className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
                  ID: {booking.id.slice(0, 8)}... ·{' '}
                  <span
                    className="font-medium"
                    style={{ color: statusStyle[booking.status] ?? '#94a3b8' }}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>
              {booking.status === 'confirmed' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => completeBooking.mutate(booking.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      color: '#10b981',
                    }}
                  >
                    Completar
                  </button>
                  <button
                    onClick={() => cancelBooking.mutate(booking.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "frontend/app/(dashboard)/agenda/page.tsx"
git commit -m "feat: agenda page with glassmorphism booking cards and neon status colors"
```

---

## Task 12: Final verification and build

**Files:** none (verification only)

- [ ] **Step 1: Run ESLint**

```bash
cd frontend && npm run lint
```
Expected: no errors. If you see `no-unused-vars` for `cardHover` in `lib/motion.ts`, it's exported for future use — add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above it or simply leave it (exported symbols aren't flagged as unused).

- [ ] **Step 2: Run TypeScript full check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Run production build**

```bash
cd frontend && npm run build
```
Expected: build completes successfully with no errors. Warnings about image optimization or metadata are acceptable.

- [ ] **Step 4: Visual smoke-check checklist**

Start dev server (`npm run dev` from `frontend/`) and verify in browser:
- [ ] Landing page background is `#020b14` (very dark navy)
- [ ] Cyan grid lines visible on landing Hero and Features sections
- [ ] Hero h1 has "automáticos" in cyan with visible glow
- [ ] Stats (−60%, 2x, 5 min) animate up from 0 on page load
- [ ] Feature cards have subtle glow border on hover
- [ ] Auth pages show split layout on desktop (brand left, form right)
- [ ] Login/registro inputs glow cyan on focus
- [ ] Dashboard sidebar is dark with cyan active item indicator
- [ ] Booking cards in agenda use glassmorphism style

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: verify build passes — futuristic Cyber Grid design complete"
```
