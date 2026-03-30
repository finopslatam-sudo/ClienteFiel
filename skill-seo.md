# SEO Optimizer Skill — Cliente Fiel

## 🎯 OBJETIVO

Optimizar contenido web para posicionar **Cliente Fiel** en los primeros resultados de Google para búsquedas de gestión de reservas, automatización WhatsApp y fidelización de clientes para PYMEs en Latinoamérica.

---

## 🧠 PRINCIPIOS SEO (OBLIGATORIOS)

1. Responder intención de búsqueda (Search Intent)
2. Priorizar contenido útil y accionable
3. Usar lenguaje directo para dueños de negocio (no técnicos)
4. Evitar relleno (no keyword stuffing)
5. Optimizar para humanos primero, luego Google

---

## 🔑 KEYWORD STRATEGY

### 🔥 Keywords de marca + producto
- cliente fiel whatsapp
- cliente fiel reservas
- software fidelización clientes whatsapp

### 🔥 Keywords de intención comercial alta
- reservas por whatsapp para negocios
- sistema de reservas sin app
- recordatorios automáticos whatsapp clientes
- fidelización de clientes whatsapp business
- agenda online para pequeñas empresas

### 🔹 Keywords secundarias
- gestión de citas por whatsapp
- confirmación de reservas automática
- recordatorio de cita whatsapp
- automatizar agenda negocio
- retener clientes con whatsapp

### 🔹 Long-tail (MUY importantes)
- cómo enviar recordatorios automáticos de citas por whatsapp
- sistema de reservas para peluquería sin app
- cómo reducir las ausencias de clientes con whatsapp
- cómo hacer que los clientes vuelvan a mi negocio
- programa de puntos para clientes pequeños negocios
- cómo fidelizar clientes con whatsapp business

### 🌎 Variantes geográficas (Latam priority)
- reservas por whatsapp chile
- fidelización de clientes colombia
- agenda online argentina
- sistema de citas mexico
- whatsapp business para negocios peru

---

## 🧱 ESTRUCTURA DE CONTENIDO (OBLIGATORIA)

```
# H1 (keyword principal + propuesta de valor)

Primer párrafo:
- incluir keyword principal
- nombrar el dolor del negocio concreto
- mencionar WhatsApp y la solución
- CTA suave

## H2 (el problema: clientes que no vuelven / ausencias)
## H2 (cómo funciona Cliente Fiel)
## H2 (beneficios concretos con números)
## H2 (para qué tipos de negocio sirve)
## H2 (preguntas frecuentes — FAQ schema)
## H2 (CTA final)
```

---

## ✍️ REGLAS DE REDACCIÓN

- Párrafos cortos (2–4 líneas)
- Listas de beneficios concretos
- Lenguaje directo: hablarle al dueño de negocio, no al equipo técnico
- Ejemplos de industrias reales: peluquerías, spas, consultorios, restaurantes, talleres
- Usar números y datos: "Reduce ausencias hasta un 60%", "Tus clientes vuelven 2x más"

---

## 🔍 OPTIMIZACIÓN ON-PAGE

### Title (máx 60 caracteres)
Ejemplos:
- "Cliente Fiel — Reservas y Fidelización por WhatsApp"
- "Recordatorios Automáticos por WhatsApp | Cliente Fiel"
- "Sistema de Reservas para Negocios — Sin Apps"

### Meta Description (máx 155 caracteres)
Ejemplo:
"Automatiza tus reservas, recordatorios y fidelización de clientes por WhatsApp. Sin apps, sin complicaciones. Prueba Cliente Fiel gratis 14 días."

### URL
```
/reservas-por-whatsapp
/recordatorios-automaticos-whatsapp
/fidelizacion-clientes-whatsapp
/agenda-online-negocios
/precios
/blog/como-reducir-ausencias-whatsapp
```

---

## 🔗 ENLACES

### Internos (OBLIGATORIO)
- Landing → Pricing
- Blog → Registro / Demo
- Features → caso de uso específico por industria
- FAQ → guía de onboarding

### Externos (editorial, confianza)
- Documentación WhatsApp Business (Meta)
- Estadísticas de retención de clientes (fuentes verificadas)
- Casos de uso por industria

---

## 📊 CONTENIDO QUE RANKEA (BLOG)

### Artículos prioritarios:
1. "Cómo enviar recordatorios automáticos de citas por WhatsApp (sin programar nada)"
2. "Reservas online para tu negocio sin que tus clientes instalen ninguna app"
3. "Por qué tus clientes no vuelven y cómo cambiarlo con WhatsApp"
4. "WhatsApp Business para peluquerías: reserva, confirma y fideliza en automático"
5. "Cómo crear un programa de puntos simple para tu negocio local"
6. "El sistema que hace que tus clientes vuelvan solos (caso real)"

### Estructura de cada artículo:
- Problema real (con datos si hay)
- Cómo funciona la solución (con pasos concretos)
- Ejemplo práctico de industria específica
- Resultado esperado (números cuando sea posible)
- CTA a registro / demo

---

## 🚀 CONVERSIÓN (MUY IMPORTANTE)

CTAs priorizados por página:
- **Landing:** "Prueba gratis 14 días — Sin tarjeta de crédito"
- **Pricing:** "Empezar con Plan Básico →"
- **Blog:** "Ver cómo funciona" / "Prueba gratis"
- **Features:** "Conecta tu WhatsApp Business hoy"

Microcopy de reducción de fricción:
- "Sin tarjeta hasta el día 14"
- "Configura en menos de 5 minutos"
- "Cancela cuando quieras"
- "Tu cliente ya tiene WhatsApp — úsalo"

---

## 📈 SEO TÉCNICO (CHECKLIST)

- [ ] HTTPS activo
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms
- [ ] Mobile friendly (mobile-first)
- [ ] `sitemap.ts` generado dinámicamente en Next.js
- [ ] `robots.ts` configurado
- [ ] Meta tags en todas las páginas
- [ ] Open Graph + Twitter Card configurados
- [ ] JSON-LD en todas las páginas clave
- [ ] Canonical URLs en páginas con contenido similar

---

## 🧩 SCHEMAS JSON-LD OBLIGATORIOS

| Página | Schema |
|--------|--------|
| Home | `SoftwareApplication` + `Organization` + `WebSite` |
| Pricing | `SoftwareApplication` con `Offer` por plan |
| Blog | `Article` + `BreadcrumbList` |
| FAQ | `FAQPage` |
| Features | `FAQPage` + `BreadcrumbList` |

### Ejemplo SoftwareApplication (home):
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Cliente Fiel",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "Sistema de reservas y fidelización vía WhatsApp para pequeños negocios. Sin apps, sin complicaciones.",
  "offers": [
    {
      "@type": "Offer",
      "name": "Plan Básico — Agenda Automatizada",
      "price": "29",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "billingDuration": "P1M"
      }
    },
    {
      "@type": "Offer",
      "name": "Plan Medio — Recompra Inteligente",
      "price": "59",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "billingDuration": "P1M"
      }
    },
    {
      "@type": "Offer",
      "name": "Plan Premium — Fidelización",
      "price": "99",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "billingDuration": "P1M"
      }
    }
  ]
}
```

---

## 🎯 POSICIONAMIENTO DE MARCA

### Cliente Fiel es:
> "La plataforma que hace que tus clientes vuelvan automáticamente vía WhatsApp."

### Diferenciadores clave en copy:
- "Tus clientes ya tienen WhatsApp — nosotros lo convertimos en tu herramienta de negocio"
- "Sin apps que instalar, sin formularios complicados"
- "Funciona mientras tú duermes"
- "Tus clientes vuelven solos, en automático"
- "En 5 minutos ya estás enviando recordatorios"

### Tono de comunicación:
- Directo y cercano (tuteo)
- Empático con el dueño de PYME
- Concreto (números, tiempos, resultados)
- Sin jerga técnica

---

## 📅 FRECUENCIA DE CONTENIDO

- Mínimo 2 artículos por mes
- 1 artículo tutorial (cómo hacer X con WhatsApp Business)
- 1 artículo de caso de uso (peluquería, spa, consultorio, restaurante, taller)

---

## 🎯 OBJETIVO FINAL

- Posicionar Cliente Fiel como líder en "reservas + fidelización + WhatsApp" en Latam
- Atraer tráfico orgánico de dueños de pequeños negocios con intención de compra
- Generar registros de trial gratuito (14 días)
- Convertir visitas orgánicas en suscriptores de pago
