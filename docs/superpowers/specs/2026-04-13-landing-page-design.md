# Landing Page — Diseño (Enfoque C: Extensión estratégica)

**Fecha:** 2026-04-13  
**Producto:** Cliente Fiel — SaaS de reservas y fidelización por WhatsApp  
**Mercado objetivo:** Pequeños negocios chilenos que atienden con cita (peluquerías, spas, consultorios, etc.)  
**Objetivo:** Aumentar conversión a registro mediante mejor copy, nuevas secciones de prueba social y flujo de persuasión más completo.

---

## 1. Estructura de la página

Orden final de secciones:

```
1. Hero              (modificar copy + stats)
2. HowItWorks        (NUEVA)
3. Features          (modificar título + copy)
4. ForBusinesses     (NUEVA)
5. SocialProof       (NUEVA)
6. Pricing           (modificar — comparativa + garantía)
7. FAQ               (modificar — 2 preguntas nuevas)
8. FinalCTA          (NUEVA)
```

---

## 2. Hero — modificaciones

**Archivo:** `frontend/components/sections/Hero.tsx`

**Badge:**
> "🟢 Más de 50 negocios chilenos ya usan Cliente Fiel"

**H1:**
> "Reservas automáticas por WhatsApp.\nMenos ausencias. Más clientes que vuelven."

**Subtítulo:**
> "Conectas tu WhatsApp Business una vez. Tus clientes reservan con un mensaje, reciben recordatorios automáticos y vuelven solos — sin apps, sin formularios."

**Stats:**
| Métrica | Texto |
|---------|-------|
| `-60%` | Ausencias |
| `3x` | ROI promedio |
| `5 min` | Configuración |

**CTAs:** sin cambios (`Prueba gratis 14 días →` + `Ver planes`).

---

## 3. HowItWorks — nueva sección

**Archivo:** `frontend/components/sections/HowItWorks.tsx`  
**Posición:** entre Hero y Features

**Título:** "Funciona en 3 pasos simples"

**Pasos (horizontal desktop / vertical mobile, conectados con flecha →):**

| # | Icono | Título | Descripción |
|---|-------|--------|-------------|
| 1 | 📱 | Conectas tu WhatsApp Business | "Autoriza con tu cuenta Meta en menos de 2 minutos. Sin código, sin técnico." |
| 2 | 💬 | Tus clientes reservan con un mensaje | "Envían un mensaje a tu número. El bot guía la conversación con botones — ellos ya saben usar WhatsApp." |
| 3 | ⚡ | El sistema trabaja por ti | "Confirmación inmediata, recordatorio 24h antes y 1h antes. Después de la visita, mensaje de recompra automático." |

**Diseño:** tarjetas glass con número en círculo cyan, flecha `→` entre tarjetas (oculta en mobile). Misma paleta dark/cyan.

---

## 4. Features — modificaciones

**Archivo:** `frontend/components/sections/Features.tsx`

**Título:** "Todo lo que necesitas para retener clientes"  
**Subtítulo:** "Una herramienta, cuatro resultados concretos."

Las 4 tarjetas de features se mantienen sin cambios de copy.

---

## 5. ForBusinesses — nueva sección

**Archivo:** `frontend/components/sections/ForBusinesses.tsx`  
**Posición:** entre Features y SocialProof

**Título:** "Para negocios que atienden con cita"

**Grid 2×3 (o 3×2 en desktop):**
- 💇 Peluquerías y barberías
- 💆 Spas y centros de estética
- 🦷 Consultorios y clínicas
- 🏋️ Gimnasios y entrenadores
- 🍽️ Restaurantes y cafeterías
- 🔧 Talleres y servicios técnicos

**Texto bajo el grid:**
> "Si atiendes con hora, Cliente Fiel reduce tus ausencias y hace que tus clientes vuelvan solos."

**CTA:** "Prueba 14 días gratis →" → `/registro`

---

## 6. SocialProof — nueva sección

**Archivo:** `frontend/components/sections/SocialProof.tsx`  
**Posición:** entre ForBusinesses y Pricing

**Título:** "Lo que dicen nuestros clientes"

**3 testimonios (placeholders — reemplazar con reales cuando estén disponibles):**

```
"Antes me olvidaba de recordar a los clientes y tenía 3-4 ausencias a la semana. Ahora casi cero."
— María, Peluquería · Santiago

"Mis clientes reservan a las 11pm cuando yo ya dormí. Al otro día llegan con su confirmación en WhatsApp."
— Roberto, Barbería · Valparaíso

"Lo configuré en una tarde. La semana siguiente ya estaba mandando recordatorios solo."
— Daniela, Spa · Concepción
```

**Diseño:** tarjetas glass con comilla decorativa `"` en cyan, nombre + tipo + ciudad en texto secundario.

> **Nota:** Los testimonios son placeholders. Reemplazar con nombres y textos reales de clientes antes de lanzar campaña de marketing.

---

## 7. Pricing — modificaciones

**Archivo:** `frontend/components/sections/Pricing.tsx`

**Agregar encima de las tarjetas (1 línea):**
> "Una secretaria cuesta $400.000/mes. Cliente Fiel desde $3.000."

**Agregar badge de garantía debajo de las tarjetas:**
> "🔒 14 días gratis · Sin tarjeta · Cancela cuando quieras · Soporte por WhatsApp"

Las tarjetas de planes no cambian.

---

## 8. FAQ — modificaciones

**Archivo:** `frontend/components/sections/FAQ.tsx`

**Agregar 2 preguntas al final del array `faqs`:**

```
¿Es seguro conectar mi WhatsApp Business?
→ "Sí. Tus credenciales se guardan cifradas y solo se usan para enviar mensajes en tu nombre.
   Nunca compartimos tu número con otros negocios ni con terceros."

¿Cuánto cuesta realmente? ¿Hay costos ocultos?
→ "Solo pagas el plan mensual. Sin costo de instalación, sin comisiones por reserva,
   sin cobros por mensaje. Lo que ves en los planes es lo que pagas."
```

---

## 9. FinalCTA — nueva sección

**Archivo:** `frontend/components/sections/FinalCTA.tsx`  
**Posición:** última sección

**Título:** "¿Listo para dejar de perder horas en WhatsApp?"

**Subtítulo:**
> "Configura en 5 minutos. Los primeros 14 días son gratis, sin tarjeta."

**CTAs:**
- Principal: "Crear mi cuenta gratis →" → `/registro`
- Secundario: "Ver planes" → `/#precios`

**Diseño:** fondo con radial glow cyan (igual al Hero) para hacer bookend visual con el inicio de la página.

---

## 10. Archivo orquestador

**Archivo:** `frontend/app/(marketing)/page.tsx`

Importar y renderizar todas las secciones en el nuevo orden. Actualizar `jsonLd` para reflejar precios en CLP correctos (ya están bien).

---

## 11. Criterios de éxito

- Todas las secciones nuevas usan la misma paleta dark/cyan (`#020b14`, `#06b6d4`, glass-card).
- Sin `any` en TypeScript, componentes completamente tipados.
- Todas las secciones usan `whileInView` de framer-motion (no `animate` global que dispara en carga).
- Los placeholders de testimonios están comentados en el código para fácil reemplazo.
- No se rompen las secciones existentes (Pricing, FAQ) al modificarlas.
