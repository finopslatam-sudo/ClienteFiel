'use client'
import { useQuery } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { fetchConversationByCustomer } from '@/lib/conversations'
import { ConversationThread } from './ConversationThread'

export function ConversationSheet({
  customerId,
  customerName,
  phoneNumber,
  open,
  onOpenChange,
}: {
  customerId: string | null
  customerName: string | null
  phoneNumber: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation-by-customer', customerId],
    queryFn: () => fetchConversationByCustomer(customerId as string),
    enabled: Boolean(customerId) && open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col"
        style={{
          background: 'rgba(2, 11, 20, 0.98)',
          borderLeft: '1px solid rgba(6, 182, 212, 0.15)',
          color: '#f1f5f9',
        }}
      >
        <SheetHeader>
          <SheetTitle style={{ color: '#f1f5f9' }}>
            {customerName ?? 'Cliente'}
          </SheetTitle>
          <p className="text-xs" style={{ color: '#475569' }}>{phoneNumber}</p>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#475569' }}>
            Cargando...
          </div>
        ) : (
          <ConversationThread conversationId={conversation?.id ?? null} isOpen={open} />
        )}
      </SheetContent>
    </Sheet>
  )
}
