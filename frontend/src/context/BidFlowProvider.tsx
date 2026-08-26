import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BidModal } from '@/components/bid/BidModal'
import { BidFlowContext } from './bid-flow-context'
import type { BidFlowApi, OpenBidOptions } from './bid-flow-context'
import { useAuth } from './auth-context'
import type { AuthApi } from './auth-context'
import { useToast } from './toast-context'

interface FlowState extends OpenBidOptions {
  open: boolean
  projectId: string | null
}

const CLOSED: FlowState = { open: false, projectId: null }

export function BidFlowProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [flow, setFlow] = useState<FlowState>(CLOSED)

  // Read through refs: the sign-in detour resumes this callback *after* the
  // session changes, and a captured `auth` would still say "signed out".
  const authRef = useRef<AuthApi>(auth)
  useEffect(() => {
    authRef.current = auth
  })

  const resumeRef = useRef<(options: OpenBidOptions) => void>(() => {})

  const openBid = useCallback(
    (options: OpenBidOptions = {}) => {
      const { status, session, openAuth } = authRef.current

      // Still resolving the session — don't flash a sign-in wall at someone who
      // is already signed in.
      if (status === 'loading') return

      if (status === 'anonymous') {
        openAuth('sign-in', () => resumeRef.current(options))
        return
      }

      const projectId = session?.projectId
      if (!projectId) {
        toast({
          tone: 'info',
          title: 'Add your project first',
          description: 'You need something on the board before you can bid on it.',
        })
        navigate('/submit')
        return
      }

      setFlow({ open: true, projectId, ...options })
    },
    [navigate, toast],
  )

  useEffect(() => {
    resumeRef.current = openBid
  }, [openBid])

  const closeBid = useCallback(() => setFlow(CLOSED), [])

  const api = useMemo<BidFlowApi>(
    () => ({ isOpen: flow.open, openBid, closeBid }),
    [flow.open, openBid, closeBid],
  )

  return (
    <BidFlowContext value={api}>
      {children}
      {flow.projectId && (
        <BidModal
          open={flow.open}
          onClose={closeBid}
          projectId={flow.projectId}
          beat={flow.beat}
          chasing={flow.chasing}
        />
      )}
    </BidFlowContext>
  )
}
