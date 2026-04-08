# Design: Cuenta page + BillingProfile + Registration fields

**Date:** 2026-04-08
**Status:** Approved

---

## Overview

Three related features delivered together:
1. Registration form collects name, last name, and company name
2. After every Mercado Pago payment, a modal asks the user for their document preference (boleta or factura) and collects billing data — stored in a new `BillingProfile` model
3. A new `/cuenta` page shows account data and billing profile, both editable

---

## Data Model Changes

### `User` model — add two fields
- `first_name: str` — required
- `last_name: str` — required

### `Tenant` model — no changes
The existing `name` field holds the company/business name.

### New model: `BillingProfile`

Table: `billing_profiles`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → tenants | unique per tenant |
| `document_type` | enum `boleta` / `factura` | |
| `person_first_name` | str | required |
| `person_last_name` | str | required |
| `person_rut` | str | required |
| `person_email` | str | required |
| `company_name` | str \| null | required if factura |
| `company_razon_social` | str \| null | required if factura |
| `company_rut` | str \| null | required if factura |
| `company_giro` | str \| null | required if factura |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### Alembic migration
One migration adds `first_name`/`last_name` to `users` and creates the `billing_profiles` table.

---

## Backend

### Updated endpoint: `POST /api/v1/auth/register`
- Accept three new required fields: `first_name`, `last_name`, `company_name`
- `company_name` sets `Tenant.name` at registration
- `first_name` and `last_name` set on the `User` record

### New endpoints: `/api/v1/account/`

**`GET /api/v1/account/me`**
- Auth required
- Returns: `first_name`, `last_name`, `email`, `company_name` (from tenant)

**`PUT /api/v1/account/me`**
- Auth required
- Accepts: `first_name`, `last_name`, `company_name`
- Updates User and Tenant records
- All fields required

### New endpoints: `/api/v1/billing/profile`

**`GET /api/v1/billing/profile`**
- Auth required
- Returns BillingProfile for current tenant, or `null` if not yet set

**`PUT /api/v1/billing/profile`**
- Auth required
- Upsert: creates or updates BillingProfile for current tenant
- All personal fields required
- Company fields required when `document_type = factura`
- Logic lives in `BillingService._upsert_billing_profile()`

### Email (deferred)
- Boleta flow: send payment receipt to user's registered email — **deferred until SMTP is configured**
- Factura flow: admin manually issues invoice using stored company data — **deferred**

---

## Frontend

### Registration form (`/registro` or equivalent)
Add three required fields before the submit button:
- **Nombre** (`first_name`)
- **Apellido** (`last_name`)
- **Nombre de empresa** (`company_name`)

Email and password fields remain unchanged. Login continues to use email only.

### `DocumentPreferenceModal` component

Triggered automatically when the URL contains `?subscribed=true` on `/suscripcion`.

Behavior:
- Cannot be dismissed without completing the form (all fields required)
- Pre-fills with existing BillingProfile data if available (user confirming/updating on renewal)
- Step 1: radio — **Boleta** / **Factura**
- Step 2: always shows personal fields (Nombre, Apellido, RUT, Email)
- If Factura: additionally shows company fields (Nombre empresa, Razón Social, RUT, Giro)
- On submit: `PUT /api/v1/billing/profile` → close modal, strip `?subscribed=true` from URL via `router.replace`

`back_url` in `handleSubscribe` changes from `/dashboard?subscribed=true` to `/suscripcion?subscribed=true`.

### `/cuenta` page (`frontend/app/(dashboard)/cuenta/page.tsx`)

Two sections:

**Section 1 — Datos de la cuenta**
- Displays: Nombre, Apellido, Nombre empresa, Email (read-only)
- "Editar datos" button → inline edit mode for all fields except Email
- On save: `PUT /api/v1/account/me`

**Section 2 — Datos de facturación**
- Displays current BillingProfile (type + fields)
- "Editar" button → inline edit mode (same form as the modal)
- On save: `PUT /api/v1/billing/profile`
- If no profile yet: placeholder message "Completa tus datos de facturación luego de tu primer pago"

### Sidebar
Add to `navItems` in `Sidebar.tsx`:
```ts
{ href: '/cuenta', label: 'Cuenta', icon: '👤' }
```
Position: between Configuración and WhatsApp.

---

## Error Handling

- Backend validates all required fields, returns 422 with field-level errors
- Frontend shows inline field errors from the API response
- Modal does not close on API error — shows error message inline

---

## Testing

- Unit: `BillingService._upsert_billing_profile()` — create, update, required field enforcement
- Unit: `GET /account/me` and `PUT /account/me`
- Integration: `PUT /billing/profile` with boleta and factura payloads
- Integration: registration with new fields populates User and Tenant correctly
- Frontend: modal appears on `?subscribed=true`, does not appear without param, pre-fills on second visit
