// frontend/lib/conversations.ts
import api from '@/lib/api'

export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'received' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ConversationMessage {
  id: string
  direction: MessageDirection
  body: string | null
  status: MessageStatus
  meta_message_id: string | null
  created_at: string
}

export interface MessageListResponse {
  messages: ConversationMessage[]
  total: number
  within_24h_window: boolean
}

export interface ConversationSummary {
  id: string
  customer_id: string | null
  customer_name: string | null
  phone_number: string
  last_message_preview: string | null
  last_message_at: string | null
  last_inbound_at: string | null
  unread_count: number
  within_24h_window: boolean
}

export async function fetchConversationByCustomer(
  customerId: string
): Promise<ConversationSummary | undefined> {
  const { data } = await api.get<{ conversations: ConversationSummary[]; total: number }>(
    '/api/v1/conversations',
    { params: { limit: 200 } }
  )
  return data.conversations.find((c) => c.customer_id === customerId)
}

export async function fetchMessages(conversationId: string): Promise<MessageListResponse> {
  const { data } = await api.get<MessageListResponse>(
    `/api/v1/conversations/${conversationId}/messages`,
    { params: { limit: 200 } }
  )
  return data
}

export async function sendMessage(conversationId: string, body: string): Promise<ConversationMessage> {
  const { data } = await api.post<ConversationMessage>(
    `/api/v1/conversations/${conversationId}/messages`,
    { body }
  )
  return data
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await api.post(`/api/v1/conversations/${conversationId}/read`)
}
