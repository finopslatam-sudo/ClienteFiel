// frontend/app/(admin)/admin/login/page.tsx
import { redirect } from 'next/navigation'

export default function AdminLoginRedirect() {
  redirect('/login')
}
