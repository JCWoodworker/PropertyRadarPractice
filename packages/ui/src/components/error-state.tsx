import { AlertTriangle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

/** Shared error treatment with an optional retry action, wired to a hook's `refetch`. */
export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <span>{message}</span>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
