---
name: saas-frontend
description: >
  Diseña e implementa interfaces frontend de nivel producción para SaaS modernos usando Next.js + React,
  con SEO técnico avanzado para posicionamiento #1 en Google.
  USAR ESTA SKILL siempre que el usuario pida: landing pages SaaS, dashboards, hero sections,
  pricing pages, animaciones Framer Motion, glassmorphism, video hero interactivo, tabs animados,
  feature cards, o cualquier UI orientada a conversión para tech/SaaS. También usar cuando el usuario
  mencione: "SEO", "posicionamiento en Google", "metadata", "structured data", "schema.org", "sitemap",
  "Core Web Vitals", "OpenGraph", "rich snippets", "ranking orgánico", "indexación", "landing",
  "SaaS", "FinOps", "startup", o animaciones avanzadas en React/Next.js.
  Produce código limpio, modular y production-ready con Framer Motion, Tailwind CSS, Next.js
  App Router best practices, y SEO técnico completo (metadata dinámica, JSON-LD, sitemap, og:image).
---

# SaaS Frontend — Skill de Alto Impacto

Skill especializada en crear interfaces frontend para SaaS modernos: visualmente memorables, orientadas a conversión, con animaciones fluidas y performance como prioridad.

> **Leer siempre** la referencia de componentes antes de generar código: `references/components.md`
> **Para sistemas de animación avanzados**: `references/animations.md`

---

## 1. Filosofía de Diseño

Antes de escribir una sola línea de código, definir:

1. **El dolor del usuario** → el hook emocional del headline
2. **La acción deseada** → qué CTA debe dominar la pantalla
3. **La jerarquía visual** → qué ve el usuario en los primeros 3 segundos
4. **La emoción** → confianza, urgencia, alivio, ambición

**Principio rector**: cada elemento en pantalla debe tener un propósito. Si no convierte, no educa, o no genera confianza → eliminarlo.

---

## 2. Sistema Visual Obligatorio

### Paleta de Color

```css
/* Modo oscuro como base (dark-first) */
--bg-primary: #0a0a0f;          /* negro profundo */
--bg-secondary: #0f0f1a;        /* azul muy oscuro */
--bg-card: rgba(255,255,255,0.04); /* glassmorphism base */

/* Primario: Tech Blue-Purple */
--primary-500: #6366f1;          /* indigo */
--primary-600: #4f46e5;
--primary-glow: rgba(99,102,241,0.3);

/* Secundario: Finance Green */
--secondary-500: #10b981;        /* emerald */
--secondary-glow: rgba(16,185,129,0.25);

/* Acento */
--accent-purple: #a855f7;
--accent-cyan: #06b6d4;

/* Texto */
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-muted: #475569;
```

### Tipografía

```css
/* Geist o Inter como base (Google Fonts fallback: Plus Jakarta Sans) */
font-family: 'Geist', 'Inter', 'Plus Jakarta Sans', system-ui, sans-serif;

/* Jerarquía */
--h1: clamp(2.5rem, 6vw, 5rem);   /* impacto máximo */
--h2: clamp(1.8rem, 4vw, 3rem);   /* sección estructural */  
--h3: clamp(1.2rem, 2vw, 1.5rem); /* card titles */
--body: 1rem;
--small: 0.875rem;
```

### Glassmorphism

```css
.glass-card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}
```

---

## 3. Animaciones con Framer Motion

**Regla fundamental**: usar `transform` y `opacity` únicamente. Nunca animar `width`, `height`, `top`, `left` directamente (rompen el GPU pipeline).

### Variantes Estándar

```typescript
// Entrada fade + slide (el más usado)
export const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

// Stagger para listas de cards
export const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

// Hover en cards
export const cardHover = {
  rest: { scale: 1, boxShadow: "0 0 0 rgba(99,102,241,0)" },
  hover: { 
    scale: 1.02, 
    boxShadow: "0 0 40px rgba(99,102,241,0.25)",
    transition: { duration: 0.3, ease: "easeOut" }
  }
}

// Scroll reveal
export const scrollReveal = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
}
```

### Uso con `useInView`

```typescript
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

function AnimatedSection({ children }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={scrollReveal}
    >
      {children}
    </motion.div>
  )
}
```

### Duraciones

| Tipo | Duración | Ease |
|------|----------|------|
| Micro (hover) | 0.15–0.25s | easeOut |
| Transición UI | 0.3–0.4s | easeInOut |
| Entrada sección | 0.5–0.6s | custom cubic |
| Hero principal | 0.7–0.9s | easeOut |

---

## 4. Video Hero Interactivo

El patrón más diferenciador: imagen estática → video al interactuar.

```typescript
'use client'
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export function VideoHero({ 
  imageSrc, 
  videoSrc, 
  trigger = 'hover' // 'hover' | 'scroll' | 'click'
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleActivate = useCallback(() => {
    setIsPlaying(true)
    videoRef.current?.play()
  }, [])

  const handleDeactivate = useCallback(() => {
    if (trigger === 'hover') {
      setIsPlaying(false)
      videoRef.current?.pause()
    }
  }, [trigger])

  return (
    <div 
      className="relative overflow-hidden rounded-2xl cursor-pointer"
      style={{ aspectRatio: '16/9' }}
      onMouseEnter={trigger === 'hover' ? handleActivate : undefined}
      onMouseLeave={trigger === 'hover' ? handleDeactivate : undefined}
      onClick={trigger === 'click' ? handleActivate : undefined}
    >
      {/* Imagen estática */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            key="image"
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              clipPath: 'inset(0 100% 0 0)',
              transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] }
            }}
          >
            <Image src={imageSrc} fill alt="Preview" className="object-cover" />
            {/* Overlay con indicador */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm 
                           flex items-center justify-center border border-white/30"
              >
                <span className="text-white text-2xl ml-1">▶</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video */}
      <motion.video
        ref={videoRef}
        src={videoSrc}
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ 
          clipPath: isPlaying ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' 
        }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      />
    </div>
  )
}
```

---

## 5. Componentes Obligatorios

Ver `references/components.md` para implementaciones completas de:
- **HeroSection** — headline + CTA + video interactivo
- **FeatureCards** — grid con hover animations + glow
- **DashboardPreview** — mock SaaS con animaciones internas
- **AnimatedTabs** — tabs con transición fluida de contenido
- **PricingSection** — tabla de precios con toggle anual/mensual
- **MetricsBanner** — números animados con CountUp

---

## 6. Hooks Imprescindibles

```typescript
// Hook para animar números (métricas)
import { useEffect, useState } from 'react'

export function useCountUp(end: number, duration = 2000, startOnMount = true) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    if (!startOnMount) return
    let start = 0
    const step = end / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [end, duration, startOnMount])
  
  return count
}

// Hook para detectar scroll position
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    const updateProgress = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      setProgress(scrollTop / (scrollHeight - clientHeight))
    }
    window.addEventListener('scroll', updateProgress, { passive: true })
    return () => window.removeEventListener('scroll', updateProgress)
  }, [])
  
  return progress
}
```

---

## 7. Estructura de Proyecto Next.js

```
/app
  layout.tsx          ← providers, fonts, metadata BASE
  page.tsx            ← orquesta secciones + metadata home
  sitemap.ts          ← sitemap dinámico (SEO)
  robots.ts           ← crawl control (SEO)
  globals.css         ← variables CSS, reset, font-display: swap
  /og
    route.tsx         ← OG images dinámicas (SEO)
  /blog/[slug]
    page.tsx          ← generateMetadata + Article schema
/components
  /ui                 ← primitivos (Button, Badge, Card)
  /sections           ← HeroSection, Features, Pricing, FaqSection...
  /animations         ← variantes Framer, wrappers animados
  /seo                ← JsonLd, Breadcrumbs, FaqSection
/lib
  /hooks              ← useCountUp, useScrollProgress, useInView
  /utils              ← cn(), formatters
/public
  /videos             ← hero videos (webm + mp4)
  /images             ← optimizadas para next/image
```

---

## 8. Performance — Reglas No Negociables

```typescript
// ✅ Correcto: lazy load de secciones below-the-fold
import dynamic from 'next/dynamic'
const DashboardPreview = dynamic(() => import('./DashboardPreview'), {
  loading: () => <DashboardSkeleton />,
  ssr: false // si usa browser APIs
})

// ✅ Correcto: next/image siempre
import Image from 'next/image'
<Image 
  src="/hero.jpg" 
  width={1200} height={675} 
  priority  // solo para above-the-fold
  alt="Dashboard de FinOps"
/>

// ✅ Correcto: animaciones en GPU
// Solo animar: transform, opacity, filter
// ❌ NUNCA animar: width, height, top, left, margin, padding

// ✅ Correcto: video optimizado
<video autoPlay muted loop playsInline preload="none">
  <source src="/hero.webm" type="video/webm" />
  <source src="/hero.mp4" type="video/mp4" />
</video>
```

### Checklist de Performance

- [ ] `next/image` para todas las imágenes
- [ ] `priority` solo en hero image (above-the-fold)
- [ ] Videos: webm + mp4, `preload="none"` para below-the-fold
- [ ] `dynamic()` para componentes pesados (charts, editors)
- [ ] Animaciones solo con `transform` y `opacity`
- [ ] `will-change: transform` en elementos animados frecuentemente
- [ ] `Suspense` boundaries alrededor de secciones async

---

## 9. Seguridad Frontend

```typescript
// ✅ Variables de entorno: NEXT_PUBLIC_ solo para datos no sensibles
const apiUrl = process.env.NEXT_PUBLIC_API_URL  // OK: URL pública

// ❌ NUNCA exponer en cliente
const secret = process.env.SECRET_KEY  // Solo en Server Components/API Routes

// ✅ Sanitizar inputs de usuario
import DOMPurify from 'isomorphic-dompurify'
const cleanHtml = DOMPurify.sanitize(userInput)

// ✅ Headers de seguridad en next.config.js
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
]
```

---

## 10. Accesibilidad Mínima

```typescript
// aria-labels en iconos sin texto
<button aria-label="Cerrar menú">✕</button>

// Reducir movimiento si el usuario lo prefiere
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// En Framer Motion
<motion.div
  animate={prefersReducedMotion ? {} : { y: [0, -10, 0] }}
/>

// Contraste: texto secundario mínimo 4.5:1 sobre fondo
// --text-secondary: #94a3b8 sobre #0a0a0f = ratio 7.2:1 ✅
```

---

## 11. Hooks de Conversión — Ejemplos por Vertical

### FinOps / Cloud Costs
> "Controla tus costos en AWS antes de que ellos te controlen a ti"
> "El 34% de tu gasto en cloud se puede eliminar esta semana"

### DevOps / Platform
> "De 47 alertas al día a 3. El mismo equipo, en 30 días"

### Analytics / Data
> "Tus decisiones son tan buenas como tus datos. ¿Los estás viendo en tiempo real?"

### HR / People Ops
> "El talento se va antes de que sepas que está insatisfecho"

**Estructura del hook:**
1. Dato/estadística impactante (dolor cuantificado)
2. Solución implícita (sin jerga técnica)
3. CTA de baja fricción ("Ver demo en vivo", "Calcular mi ahorro")

---

## Flujo de Trabajo al Recibir un Request

1. **Identificar vertical** → qué industria/producto SaaS
2. **Leer** `references/components.md` → elegir qué componentes aplican
3. **Definir el hook** → el headline que ancla todo
4. **Seleccionar paleta** → dark con indigo/emerald como base, ajustar si hay brand
5. **Generar código** → modular, un componente por archivo
6. **Aplicar SEO** → `generateMetadata`, canonical, JSON-LD schema apropiado, OG image
7. **Verificar checklists** de performance, SEO y accesibilidad antes de entregar

---

---

## 12. SEO Técnico para Posicionamiento #1

Leer `references/seo.md` para implementación completa. Resumen de prioridades:

### Implementación inmediata (cada proyecto)

```typescript
// 1. Metadata dinámica en app/layout.tsx
export const metadata: Metadata = {
  title: { default: 'Tu Producto — Propuesta de Valor', template: '%s | Tu Producto' },
  description: 'Descripción de 150-160 chars con keyword principal y CTA suave.',
  metadataBase: new URL('https://tudominio.com'),
  robots: { index: true, follow: true },
  alternates: { canonical: '/' }
}

// 2. generateMetadata en cada page.tsx dinámica
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: `${page.title}`,
    alternates: { canonical: `/${params.slug}` }
    // ... openGraph, twitter
  }
}
```

### Los 5 archivos SEO obligatorios

| Archivo | Ubicación | Propósito |
|---------|-----------|-----------|
| `sitemap.ts` | `app/sitemap.ts` | Indexación completa |
| `robots.ts` | `app/robots.ts` | Crawl control |
| `JsonLd.tsx` | `components/seo/` | Structured data |
| `og/route.tsx` | `app/og/route.tsx` | OG images dinámicas |
| `Breadcrumbs.tsx` | `components/seo/` | Rich snippets nav |

### Schema obligatorios por tipo de página

| Página | Schema |
|--------|--------|
| Home | `SoftwareApplication` + `Organization` + `WebSite` |
| Landing / Features | `FAQPage` + `BreadcrumbList` |
| Blog post | `Article` + `BreadcrumbList` |
| Pricing | `SoftwareApplication` con `Offer` |

### Core Web Vitals — los 3 números que Google mide

- **LCP < 2.5s** → `priority` en hero image, preload de fuentes
- **CLS < 0.1** → siempre `width` + `height` en `<Image>`, skeleton loaders con tamaño reservado
- **INP < 200ms** → `startTransition` para updates no urgentes, memoización, virtualización

> 📁 **Referencias completas:**
> - `references/seo.md` — Implementación detallada: metadata, schemas, sitemap, robots, i18n, blog SEO, checklist
> - `references/components.md` — HeroSection, FeatureCards, DashboardPreview, AnimatedTabs, FaqSection
> - `references/animations.md` — Librería de variantes Framer Motion avanzadas