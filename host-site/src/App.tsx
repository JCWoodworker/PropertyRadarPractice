import { useMemo, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import type { ThemeOptions } from '@parceliq/embed-sdk'
import { PageHeader, Switch, Toaster, toast } from '@parceliq/ui'

import { AddLeadDialog } from './components/AddLeadDialog'
import { LeadDetailSheet } from './components/LeadDetailSheet'
import { LeadsTable } from './components/LeadsTable'
import type { RpcLogEntry } from './components/ParcelIQEmbed'
import { RpcEventLog } from './components/RpcEventLog'
import { useAddLead, useDeleteLead, useFlagLead, useLeads } from './hooks/use-leads'
import type { Lead } from './lib/leads-store'

const MAX_LOG_ENTRIES = 60

function App() {
  const { leads, isLoading, isEmpty, isError, error, refetch } = useLeads()
  const addMutation = useAddLead()
  const deleteMutation = useDeleteLead()
  const flagMutation = useFlagLead()

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [logEntries, setLogEntries] = useState<RpcLogEntry[]>([])

  // Memoized so the object identity is stable across renders that don't
  // change `isDark` — ParcelIQEmbed's setTheme effect depends on this
  // reference, and a fresh object every render would re-trigger it forever.
  const theme: ThemeOptions = useMemo(() => ({ mode: isDark ? 'dark' : 'light' }), [isDark])

  function handleLog(entry: RpcLogEntry) {
    setLogEntries((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES))
  }

  function handleFlagged(address: string, reason: string) {
    flagMutation.mutate({ address, reason })
    toast.warning('Property flagged as distressed', { description: `${address} — ${reason}` })
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id)
    setSelectedLead((current) => (current?.id === id ? null : current))
  }

  return (
    <div className={isDark ? 'dark' : undefined}>
      <div className="min-h-screen bg-background p-6 text-foreground">
        <PageHeader
          title="RoofingFlow CRM"
          description="Leads for roofing & home-services contractors — with a live ParcelIQ property widget embedded per lead."
          actions={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sun className="size-4" aria-hidden="true" />
                <Switch checked={isDark} onCheckedChange={setIsDark} aria-label="Toggle dark mode" />
                <Moon className="size-4" aria-hidden="true" />
              </div>
              <AddLeadDialog onAdd={(input) => addMutation.mutate(input)} isSubmitting={addMutation.isPending} />
            </div>
          }
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-border">
            <LeadsTable
              leads={leads}
              isLoading={isLoading}
              isEmpty={isEmpty}
              isError={isError}
              error={error}
              onRetry={refetch}
              onSelect={setSelectedLead}
              onDelete={handleDelete}
              selectedLeadId={selectedLead?.id}
            />
          </div>

          <RpcEventLog entries={logEntries} />
        </div>

        <LeadDetailSheet
          lead={selectedLead}
          theme={theme}
          onOpenChange={(open) => !open && setSelectedLead(null)}
          onDelete={handleDelete}
          onFlagged={handleFlagged}
          onLog={handleLog}
        />

        <Toaster />
      </div>
    </div>
  )
}

export default App
