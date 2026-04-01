# Diseño Visual Futurista — Cyber Grid

**Fecha:** 2026-04-01
**Estado:** Aprobado por el usuario
**Scope:** Todas las páginas del frontend (landing, auth, dashboard)

---

## 1. Decisión de diseño

**Estética elegida: Cyber Grid** — Fondo oscuro azul marino `#020b14` con líneas de cuadrícula neón cyan `rgba(6,182,212,0.05)` sobre grid de 28px. Sensación tech/futurista. Acento principal: cyan `#06b6d4`.

**Approach C:**
- Landing + Auth: Cyber Grid completo con glow y animaciones de impacto
- Dashboard: Dark limpio `#030d1a` sin grid (evita distracciones en productividad) con sidebar dark y tarjetas glassmorphism
- Framer Motion en todo el frontend: fadeInUp, stagger, CountUp, hover glow

---

## 2. Sistema de diseño (tokens)

### Colores (CSS variables en `globals.css`)
```css
--bg: #020b14;
--bg-surface: #030d1a;
--bg-glass: rgba(6, 182, 212, 0.04);
--border-glass: rgba(6, 182, 212, 0.12);
--cyan: #06b6d4;
--cyan-glow: rgba(6, 182, 212, 0.3);
--indigo: #6366f1;
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-muted: #475569;
--grid-line: rgba(6, 182, 212, 0.05);
--grid-size: 28px;
```

### Glassmorphism (componente base)
```css
background: rgba(6, 182, 212, 0.04);
backdrop-filter: blur(12px);
border: 1px solid rgba(6, 182, 212, 0.12);
border-radius: 16px;
```

### Cyber Grid background (reutilizable)
```css
background-image:
  linear-gradient(var(--grid-line) 1px, transparent 1px),
  linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
background-size: var(--grid-size) var(--grid-size);
```

---

## 3. Framer Motion — variantes globales

Definidas una vez en `frontend/lib/motion.ts` y reutilizadas en toda la app:

```ts
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}

export const cardHover = {
  rest: { scale: 1, borderColor: 'rgba(6,182,212,0.12)' },
  hover: { scale: 1.02, borderColor: 'rgba(6,182,212,0.4)',
           boxShadow: '0 0 20px rgba(6,182,212,0.15)',
           transition: { duration: 0.2 } }
}

export const scrollReveal = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}
```

**Regla de performance:** Solo animar `transform` y `opacity`. Nunca `width`, `height`, `top`, `left`.

### Hook `useCountUp`
```ts
// frontend/hooks/useCountUp.ts
export function useCountUp(end: number, duration = 2): number
```
Usado en Hero stats: "1,200+ negocios", "98% satisfacción", "4.2M mensajes".

---

## 4. Zona ① — Landing page

### Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `frontend/app/globals.css` | Agregar dark CSS variables + Cyber Grid + glow utility classes |
| `frontend/app/layout.tsx` | Agregar `dark` class en `<html>` |
| `frontend/app/(marketing)/layout.tsx` | Navbar: dark glassmorphism; Footer: dark |
| `frontend/components/sections/Hero.tsx` | Reescribir completamente con Cyber Grid + Framer Motion + CountUp |
| `frontend/components/sections/Features.tsx` | Cards glassmorphism + stagger + hover glow |
| `frontend/components/sections/Pricing.tsx` | Cards dark + escala en hover + acento cyan |
| `frontend/components/sections/FAQ.tsx` | Dark accordion con border cyan |

### Hero
- Background: `#020b14` + Cyber Grid CSS + radial glow `rgba(6,182,212,0.15)` top-center
- Badge: glassmorphism con texto cyan
- H1: texto blanco con span cyan + `text-shadow: 0 0 30px rgba(6,182,212,0.6)`
- CTA primario: `background: #06b6d4; color: #020b14` — efecto `box-shadow` hover
- CTA secundario: border glass translúcido
- Stats: 3 métricas con `useCountUp` + separadores verticales

### Features
- Section bg: `#020b14` + Cyber Grid
- 3 cards glassmorphism en grid responsive
- Íconos: `color: #06b6d4`
- Animación: `staggerContainer` con `useInView({ once: true })`
- Hover: `cardHover` variant con glow

### Pricing
- Section bg: `#030d1a` (sin grid, contraste con Hero/Features)
- Cards glassmorphism; plan "Medio" destacado con border cyan más opaco
- Toggle mensual/anual con animación `layoutId`
- Hover: escala 1.02 + glow sutil

### FAQ
- Dark accordion; border-bottom `rgba(6,182,212,0.1)` entre items
- Icono `+/-` en cyan
- Respuestas: `AnimatePresence` para expand/collapse

### Navbar (marketing)
- `bg: rgba(2,11,20,0.85)` + `backdrop-filter: blur(16px)` + `border-bottom: 1px solid rgba(6,182,212,0.08)`
- Logo blanco; links `#94a3b8` → hover `#06b6d4`
- CTA: border cyan glass → hover fill cyan

### Footer
- `bg: #020b14` + `border-top: 1px solid rgba(6,182,212,0.08)`
- Texto `#475569`; links hover cyan

---

## 5. Zona ② — Auth pages

### Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `frontend/app/(auth)/layout.tsx` | Full-screen Cyber Grid background |
| `frontend/app/(auth)/login/page.tsx` | Split layout: panel izquierdo brand + panel derecho form dark |
| `frontend/app/(auth)/registro/page.tsx` | Mismo tratamiento que login |

### Layout auth
- `min-h-screen` con Cyber Grid completo + radial glow top-center
- `display: grid; grid-template-columns: 1fr 1fr` en desktop; columna única en mobile

### Panel izquierdo (brand)
- No visible en mobile
- Logo + tagline centrado
- Decoración: íconos de feature con glassmorphism cards pequeñas

### Panel derecho (form)
- `background: rgba(6,182,212,0.03)` + `backdrop-filter: blur(20px)` + border glass
- Animación: `fadeInUp` con `motion.div`
- Inputs: `bg: rgba(6,182,212,0.05)`, `border: 1px solid rgba(6,182,212,0.15)`, `color: #f1f5f9`
- Focus: `border-color: #06b6d4`, `box-shadow: 0 0 0 3px rgba(6,182,212,0.15)`
- Submit: `bg: #06b6d4; color: #020b14; font-weight: 700`
- Spinner de carga: bordes cyan

---

## 6. Zona ③ — Dashboard

### Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `frontend/app/(dashboard)/layout.tsx` | `bg: #030d1a` (sin Cyber Grid — productividad) |
| `frontend/components/dashboard/Sidebar.tsx` | Dark sidebar con active state cyan |
| `frontend/app/(dashboard)/agenda/page.tsx` | Booking cards glassmorphism + neon status |

### Dashboard layout
- `bg: #030d1a` — más claro que el landing, sin grid de líneas (menos distracción)
- Topbar opcional: `bg: rgba(3,13,26,0.95)` + blur

### Sidebar
- `background: rgba(2,11,20,0.98)` + `border-right: 1px solid rgba(6,182,212,0.08)`
- Logo: blanco
- Items inactivos: texto `#94a3b8`, hover `bg: rgba(6,182,212,0.05)`
- Item activo: `bg: rgba(6,182,212,0.1)`, `border-left: 2px solid #06b6d4`, texto `#06b6d4`
- Íconos: `color: inherit`

### Agenda / booking cards
- Cards: glassmorphism `rgba(6,182,212,0.04)` + border glass
- Status colors:
  - Confirmado: `color: #10b981` (emerald)
  - Pendiente: `color: #f59e0b` (amber)
  - Cancelado: `color: #ef4444` (red)
- Animación: `fadeInUp` stagger al cargar lista

### Otras páginas dashboard (clientes, whatsapp, configuracion, logs)
- Aplicar mismo glassmorphism pattern para todas las cards/tablas
- Headers de sección: texto `#f1f5f9` + subtext `#94a3b8`
- Tablas: `border-bottom: 1px solid rgba(6,182,212,0.06)` entre filas

---

## 7. Nuevos archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `frontend/lib/motion.ts` | Variantes de Framer Motion reutilizables |
| `frontend/hooks/useCountUp.ts` | Hook para métricas animadas en Hero |

---

## 8. Dependencias

| Paquete | Estado | Uso |
|---------|--------|-----|
| `framer-motion` | Ya instalado | Animaciones |
| `tailwindcss` | Ya instalado | Utilidades |

No se requieren nuevas dependencias npm.

---

## 9. Restricciones y reglas

1. **Performance:** Solo `transform` + `opacity` en animaciones. Nunca layout-triggering props.
2. **`useInView({ once: true })`** — las animaciones de scroll no se repiten al volver.
3. **Accesibilidad:** `prefers-reduced-motion` debe respetarse (`motion.div` de Framer lo maneja automáticamente).
4. **TypeScript strict:** Sin `any`. Props tipadas con interfaces.
5. **No romper funcionalidad existente:** Solo cambios visuales — sin tocar lógica de negocio, autenticación, ni llamadas API.
6. **Separación de concerns:** CSS variables en `globals.css`, variantes de motion en `lib/motion.ts`, hooks en `hooks/`.
7. **Mobile-first:** Todos los cambios son responsive. El layout split de auth colapsa a columna única en mobile.

---

## 10. Criterios de éxito

- [ ] Landing page carga con fondo `#020b14` + Cyber Grid visible
- [ ] Hero H1 tiene glow cyan en el span de "WhatsApp"
- [ ] Stats del Hero animan con CountUp al hacer scroll
- [ ] Feature cards hacen stagger al entrar en viewport
- [ ] Auth pages tienen layout split funcional en desktop
- [ ] Inputs del form de auth tienen focus state cyan
- [ ] Sidebar del dashboard tiene active state cyan
- [ ] Booking cards del dashboard tienen status colors neon
- [ ] `npm run build` y `npx tsc --noEmit` pasan sin errores
- [ ] No hay regresiones en funcionalidad (login, registro, booking actions)
