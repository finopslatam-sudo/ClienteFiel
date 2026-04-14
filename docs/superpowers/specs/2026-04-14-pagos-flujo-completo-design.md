# Pagos — Completar Flujo de Suscripción

## Goal

Conectar el flujo end-to-end desde que un usuario selecciona un plan en la landing page hasta que activa su suscripción en MercadoPago, y mejorar la visibilidad del estado de trial en el dashboard.

## Architecture

El backend (MercadoPago Preapproval API, webhooks IPN, `BillingService`) está completamente implementado. Este spec cubre únicamente cambios de frontend:

1. **Preservar el plan seleccionado** desde la landing → registro → onboarding → suscripción
2. **Mostrar `trial_ends_at`** en la página de suscripción
3. **Banner de activación** en el dashboard para tenants en trial

No se modifica ningún archivo de backend.

## Tech Stack

- Next.js 14 App Router, TypeScript, `localStorage` para persistir plan entre rutas
- Páginas existentes: `/registro`, `/onboarding`, `/suscripcion`, `/dashboard`

---

## Sección 1 — Preservar plan seleccionado desde landing

**Flujo actual:**
```
Landing /pricing → /registro?plan=basic → /onboarding → /dashboard
                                ↑ el plan se pierde aquí
```

**Flujo nuevo:**
```
Landing /pricing → /registro?plan=basic
  → registro lee ?plan=basic → guarda en localStorage("pending_plan")
  → /onboarding → /suscripcion?plan=basic (redirect al completar onboarding si hay pending_plan)
  → /dashboard (si ya está suscrito o decide más tarde)
```

**Implementación:**
- `registro/page.tsx`: al cargar, si `?plan` existe en URL, guardarlo en `localStorage.setItem('pending_plan', plan)`
- `onboarding/page.tsx` (o su step final): al completar, si `localStorage.getItem('pending_plan')` existe, redirigir a `/suscripcion?plan=<value>` y limpiar el key
- `suscripcion/page.tsx`: al cargar, si `?plan` está en URL, hacer scroll/highlight automático al plan correspondiente y resaltar su botón

**Nota de seguridad:** `localStorage` se usa solo para UX (pre-selección de plan), no para datos sensibles. El usuario puede cambiar de plan en la página de suscripción libremente.

---

## Sección 2 — Mostrar fecha de fin de trial

La API ya retorna `trial_ends_at` en `GET /api/v1/billing/subscription`. Actualmente no se muestra en la UI.

**Cambio en `suscripcion/page.tsx`:**
- Actualizar `SubscriptionStatus` interface para incluir `trial_ends_at: string | null`
- En el banner de estado actual, si `status === 'trial'` y `trial_ends_at` existe, mostrar:

```
Tu prueba gratis termina el 28 de abril de 2026
```

Formato: `format(parseISO(trial_ends_at), "d 'de' MMMM 'de' yyyy", { locale: es })`

---

## Sección 3 — Banner de activación en el dashboard

En `app/(dashboard)/dashboard/page.tsx`, si el tenant está en `trial`, mostrar un banner discreto en la parte superior:

```
┌─────────────────────────────────────────────────────────────┐
│ ⏳ Tu prueba gratis termina el 28 de abril · Activa tu plan │
│                                              [Ver planes →] │
└─────────────────────────────────────────────────────────────┘
```

- Color de fondo: `rgba(245,158,11,0.08)`, borde `rgba(245,158,11,0.2)` (amber suave)
- Solo visible cuando `status === 'trial'`
- Link "Ver planes" → `/suscripcion`
- El banner se puede cerrar (X) y queda oculto hasta recargar la página (sin persistir cierre)

**Fuente de datos:** La página de dashboard ya tiene acceso al contexto del tenant. Se hace un fetch a `GET /api/v1/billing/subscription` desde el componente del banner para obtener estado y `trial_ends_at`.

---

## Sección 4 — Resaltado de plan pre-seleccionado

En `suscripcion/page.tsx`, si llega `?plan=basic` en la URL (ya sea desde landing o desde el banner):
- Al montar el componente, hacer scroll suave hasta la tarjeta del plan correspondiente
- Añadir un anillo de resaltado temporal (2s) al plan: `box-shadow: 0 0 0 2px #06b6d4`

---

## Files

- **Modify:** `frontend/app/(auth)/registro/page.tsx` — leer `?plan` y guardar en localStorage
- **Modify:** `frontend/app/onboarding/page.tsx` — al completar onboarding, redirigir con plan si existe
- **Modify:** `frontend/app/(dashboard)/suscripcion/page.tsx` — mostrar `trial_ends_at`, resaltar plan pre-seleccionado
- **Modify:** `frontend/app/(dashboard)/dashboard/page.tsx` — agregar `TrialBanner` component
- **Create:** `frontend/components/billing/TrialBanner.tsx` — banner reutilizable de activación

---

## Testing manual

1. Ir a landing → clic "Empezar con Medio" → verificar `localStorage.pending_plan = 'medium'`
2. Completar registro → completar onboarding → verificar redirect a `/suscripcion?plan=medium`
3. En `/suscripcion`, verificar que el plan Medio está resaltado y visible
4. En `/dashboard`, con tenant en trial, verificar banner con fecha correcta
5. Clic "Ver planes" desde el banner → `/suscripcion`
6. Cerrar banner (X) → desaparece hasta recargar

---

## Out of scope

- PayPal: no se implementa en este sprint (solo MercadoPago)
- Webpay / Transbank: no se implementa en este sprint
- Cambio de plan (upgrade/downgrade): no se implementa en este sprint
