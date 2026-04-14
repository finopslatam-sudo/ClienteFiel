# Agenda — Vista de Calendario Mensual

## Goal

Reemplazar la vista de lista semanal de la pestaña "Reservas" por un calendario mensual interactivo que muestre las reservas como chips en cada día del mes.

## Architecture

La página `app/(dashboard)/agenda/page.tsx` es la única que se modifica. Se extrae un nuevo componente `MonthlyCalendar` en `components/agenda/MonthlyCalendar.tsx`. El hook `useBookings` ya existe y soporta filtrar por rango de fechas — se reutiliza pasando el primer y último día del mes visible. El modal `NewBookingModal` y el tab `WeeklySchedule` (disponibilidad) no cambian.

## Tech Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS, framer-motion
- `date-fns` (ya instalado): `startOfMonth`, `endOfMonth`, `eachDayOfMonth`, `isSameDay`, `isSameMonth`, `startOfWeek`, `endOfWeek`, `format`
- `useBookings` hook existente (sin modificar)

---

## Sección 1 — Navegación mensual

El header del calendario muestra:
```
← Anterior   Abril 2026   Siguiente →
```

Estado: `currentMonth: Date` inicializado a `new Date()`. Botones llaman `startOfMonth(addMonths(currentMonth, ±1))`.

El rango de query al hook es:
```ts
dateFrom = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString()
dateTo = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString()
```
(incluir días de semanas parciales del mes anterior/siguiente que aparezcan en la grilla)

---

## Sección 2 — Grid del calendario

**Estructura:** 7 columnas (Lun – Dom), cabecera con iniciales del día.

```
Lun  Mar  Mié  Jue  Vie  Sáb  Dom
 30   31    1    2    3    4    5
  6    7    8    9   10   11   12
 ...
```

Cada celda `DayCell`:
- Número del día arriba a la derecha
- Días fuera del mes actual: texto `#475569` (gris apagado), fondo levemente diferente
- Día hoy: número con fondo cyan `rgba(6,182,212,0.2)`, borde `rgba(6,182,212,0.4)`
- Reservas del día: máximo 3 chips visibles + badge `+N` si hay más

**Chip de reserva:**
```
09:30 María (color según status)
```
- `confirmed` → `#06b6d4` (cyan)
- `pending`   → `#f59e0b` (amber)
- `completed` → `#475569` (gris)
- `canceled`  → no mostrar

---

## Sección 3 — Panel de detalle del día

Al hacer clic en cualquier celda se abre un panel lateral derecho (`DayDetailPanel`):
- Título: "Lunes 14 de abril"
- Lista completa de reservas del día con `BookingCard` (mismo componente que el list view actual, reutilizado)
- Botón "Nueva reserva para este día" — abre `NewBookingModal` con la fecha pre-seleccionada
- Cerrar: clic en X o fuera del panel

El panel es un `div` absoluto/fixed sobre el contenido, no un modal completo. En mobile ocupa el 100% del ancho.

---

## Sección 4 — Comportamiento vacío y loading

- Loading: skeleton de grilla (divs con `animate-pulse`)
- Sin reservas en el mes: la grilla se muestra igual, celdas vacías; el panel de detalle muestra "Sin reservas este día"

---

## Sección 5 — Mobile

- La grilla se muestra igual en mobile (7 cols, fuente más pequeña)
- Los chips se reducen a solo el color (dot de 6px) si el espacio es insuficiente
- El panel de detalle ocupa 100vw en mobile

---

## Sección 6 — Sin cambios

- Pestaña "Disponibilidad" (`WeeklySchedule`) — sin tocar
- `NewBookingModal` — sin tocar
- `useBookings` hook — sin tocar
- `BookingCard` component — se extrae del archivo de agenda para reutilizarlo en el panel

---

## Files

- **Modify:** `frontend/app/(dashboard)/agenda/page.tsx` — cambiar estado `currentWeek` → `currentMonth`, adaptar query range, renderizar `MonthlyCalendar` en lugar de la lista
- **Create:** `frontend/components/agenda/MonthlyCalendar.tsx` — grid mensual + `DayCell` + `DayDetailPanel`
- **Extract:** `BookingCard` se mueve a `frontend/components/agenda/BookingCard.tsx` para reutilizarlo

---

## Testing manual

1. Navegar a `/dashboard/agenda`
2. Verificar grid mensual del mes actual
3. Navegar a mes anterior y siguiente
4. Crear una reserva — debe aparecer como chip en la celda correcta
5. Clic en celda con reservas — panel de detalle muestra reservas con acciones
6. Completar y cancelar reservas desde el panel
7. En mobile: verificar grilla y panel expandido
