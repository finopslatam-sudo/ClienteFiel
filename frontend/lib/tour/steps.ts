// frontend/lib/tour/steps.ts
import type { Config, DriveStep } from 'driver.js'

export interface RouteTour {
  route: string
  storageKey: string
  steps: DriveStep[]
}

export const routeTours: RouteTour[] = [
  {
    route: '/dashboard',
    storageKey: 'tour_seen_dashboard',
    steps: [
      {
        element: '#tour-dashboard-metrics',
        popover: {
          title: 'Tu resumen del negocio',
          description: 'Aquí ves de un vistazo cómo va tu negocio: reservas, clientes activos y mensajes enviados este mes.',
          side: 'bottom',
        },
      },
    ],
  },
  {
    route: '/whatsapp',
    storageKey: 'tour_seen_whatsapp',
    steps: [
      {
        element: '#tour-whatsapp-connect',
        popover: {
          title: 'Conecta tu WhatsApp',
          description: 'Conecta tu número de WhatsApp Business para empezar a recibir y responder mensajes automáticamente.',
          side: 'bottom',
        },
      },
    ],
  },
  {
    route: '/agenda',
    storageKey: 'tour_seen_agenda',
    steps: [
      {
        element: '#tour-agenda-calendar',
        popover: {
          title: 'Tu agenda',
          description: 'Gestiona tus citas del día. Tus clientes pueden reservar directo desde WhatsApp.',
          side: 'bottom',
        },
      },
    ],
  },
  {
    route: '/clientes',
    storageKey: 'tour_seen_clientes',
    steps: [
      {
        element: '#tour-clientes-table',
        popover: {
          title: 'Tu base de clientes',
          description: 'Toda tu base de clientes en un solo lugar. Toca a un cliente para ver y responder su conversación de WhatsApp.',
          side: 'top',
        },
      },
    ],
  },
  {
    route: '/automatizaciones',
    storageKey: 'tour_seen_automatizaciones',
    steps: [
      {
        element: '#tour-automatizaciones-list',
        popover: {
          title: 'Automatizaciones',
          description: 'Configura recordatorios y campañas automáticas para que tus clientes vuelvan.',
          side: 'bottom',
        },
      },
    ],
  },
  {
    route: '/configuracion',
    storageKey: 'tour_seen_configuracion',
    steps: [
      {
        element: '#tour-configuracion-form',
        popover: {
          title: 'Configuración',
          description: 'Ajusta los datos de tu negocio, horarios y servicios.',
          side: 'bottom',
        },
      },
    ],
  },
  {
    route: '/cuenta',
    storageKey: 'tour_seen_cuenta',
    steps: [
      {
        element: '#tour-cuenta-profile',
        popover: {
          title: 'Tu cuenta',
          description: 'Administra tu perfil y las personas con acceso a tu cuenta.',
          side: 'bottom',
        },
      },
    ],
  },
  {
    route: '/suscripcion',
    storageKey: 'tour_seen_suscripcion',
    steps: [
      {
        element: '#tour-suscripcion-plan',
        popover: {
          title: 'Tu suscripción',
          description: 'Revisa tu plan actual y el historial de pagos.',
          side: 'bottom',
        },
      },
    ],
  },
]

export const driverConfig: Config = {
  animate: true,
  showProgress: false,
  allowClose: true,
  overlayColor: '#020b14',
  popoverClass: 'cf-tour-popover',
  nextBtnText: 'Siguiente',
  prevBtnText: 'Atrás',
  doneBtnText: 'Listo',
}
