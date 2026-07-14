'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  fetchMessages,
  sendMessage,
  markConversationRead,
  type ConversationMessage,
} from '@/lib/conversations'

const statusTicks: Record<string, string> = {
  pending: '🕓',
  sent: '✓',
  delivered: '✓✓',
  read: '✓✓',
  failed: '⚠️',
}

function Bubble({ message }: { message: ConversationMessage }) {
  const isOutbound = message.direction === 'outbound'
  return (
    <div className="flex" style={{ justifyContent: isOutbound ? 'flex-end' : 'flex-start' }}>
      <div
        className="max-w-[75%] rounded-2xl px-3 py-2 text-sm"
        style={{
          background: isOutbound ? 'rgba(6,182,212,0.15)' : 'rgba(148,163,184,0.08)',
          border: isOutbound ? '1px solid rgba(6,182,212,0.25)' : '1px solid rgba(148,163,184,0.12)',
          color: '#f1f5f9',
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap' }}>{message.body ?? '[mensaje sin texto]'}</div>
        <div
          className="flex items-center gap-1 mt-1 text-[10px]"
          style={{ color: '#64748b', justifyContent: isOutbound ? 'flex-end' : 'flex-start' }}
        >
          {format(new Date(message.created_at), 'HH:mm', { locale: es })}
          {isOutbound && <span style={{ color: message.status === 'failed' ? '#ef4444' : '#64748b' }}>{statusTicks[message.status]}</span>}
        </div>
      </div>
    </div>
  )
}

export function ConversationThread({
  conversationId,
  isOpen,
}: {
  conversationId: string | null
  isOpen: boolean
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const [sendError, setSendError] = useState('')
  const [sending, setSending] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => fetchMessages(conversationId as string),
    enabled: Boolean(conversationId) && isOpen,
    refetchInterval: isOpen ? 4000 : false,
  })

  useEffect(() => {
    if (conversationId && isOpen) {
      markConversationRead(conversationId).catch(() => {})
    }
  }, [conversationId, isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  async function handleSend() {
    if (!conversationId || !draft.trim() || sending) return
    setSending(true)
    setSendError('')
    try {
      await sendMessage(conversationId, draft.trim())
      setDraft('')
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] })
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSendError(
        detail === 'outside_24h_window'
          ? 'Ventana de 24h cerrada — solo se pueden enviar plantillas aprobadas.'
          : 'No se pudo enviar el mensaje.'
      )
    } finally {
      setSending(false)
    }
  }

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#475569' }}>
        Este cliente aún no tiene conversación de WhatsApp.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-1">
        {isLoading ? (
          <div className="text-sm" style={{ color: '#475569' }}>Cargando conversación...</div>
        ) : !data?.messages.length ? (
          <div className="text-sm" style={{ color: '#475569' }}>Sin mensajes todavía.</div>
        ) : (
          data.messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {data && !data.within_24h_window && (
        <div
          className="text-xs px-3 py-2 rounded-lg mb-2"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          Ventana de 24h cerrada — solo se pueden enviar plantillas aprobadas, no texto libre.
        </div>
      )}

      {sendError && (
        <div className="text-xs px-3 py-2 rounded-lg mb-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          {sendError}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={!data?.within_24h_window || sending}
          placeholder={data?.within_24h_window ? 'Escribe un mensaje...' : 'Ventana de 24h cerrada'}
          className="flex-1 rounded-lg text-sm px-3 py-2"
          style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(6,182,212,0.15)',
            color: '#f1f5f9',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!data?.within_24h_window || sending || !draft.trim()}
          className="rounded-lg text-sm px-4 py-2 font-medium"
          style={{
            background: 'rgba(6,182,212,0.15)',
            color: '#06b6d4',
            border: '1px solid rgba(6,182,212,0.25)',
            opacity: !data?.within_24h_window || sending || !draft.trim() ? 0.5 : 1,
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
