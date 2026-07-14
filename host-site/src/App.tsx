import { useEffect, useMemo, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import type { ThemeOptions } from '@parceliq/embed-sdk'
import { PageHeader, Switch, Toaster, toast } from '@parceliq/ui'

import { AddLeadDialog } from './components/AddLeadDialog'
import { EventLogDrawer } from './components/EventLogDrawer'
import { LeadDetailSheet } from './components/LeadDetailSheet'
import { LeadsTable } from './components/LeadsTable'
import type { RpcLogEntry } from './components/ParcelIQEmbed'
import { useAddLead, useDeleteLead, useFlagLead, useLeads, useUpdateLeadStage } from './hooks/use-leads'
import type { Lead } from './lib/leads-store'

const MAX_LOG_ENTRIES = 60

function App() {
  const { leads, isLoading, isEmpty, isError, error, refetch } = useLeads()
  const addMutation = useAddLead()
  const deleteMutation = useDeleteLead()
  const flagMutation = useFlagLead()
  const updateStageMutation = useUpdateLeadStage()

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [logEntries, setLogEntries] = useState<RpcLogEntry[]>([])

  // Memoized so the object identity is stable across renders that don't
  // change `isDark` — ParcelIQEmbed's setTheme effect depends on this
  // reference, and a fresh object every render would re-trigger it forever.
  const theme: ThemeOptions = useMemo(() => ({ mode: isDark ? 'dark' : 'light' }), [isDark])

  // The `dark` class must live on <html>, not on a wrapper <div> in the
  // React tree: Radix's Sheet/Dialog/AlertDialog render their content
  // through a portal straight to `document.body` by default, which escapes
  // any wrapper div entirely. Since our theme colors are CSS variables
  // scoped by the `.dark` selector, portaled content only sees them if
  // `.dark` is on a real ancestor of `document.body` — i.e. `<html>`.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

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
    <div className="flex h-screen flex-col overflow-hidden bg-background p-6 text-foreground">
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

      {/* This is its own scroll container (not the page) specifically so
          leads stay reachable even while the EventLogDrawer below is open
          and overlaying the bottom of the viewport. */}
      <div className="mt-6 flex-1 overflow-y-auto rounded-lg border border-border">
        <LeadsTable
          leads={leads}
          isLoading={isLoading}
          isEmpty={isEmpty}
          isError={isError}
          error={error}
          onRetry={refetch}
          onSelect={setSelectedLead}
          onDelete={handleDelete}
          onStageChange={(id, stage) => updateStageMutation.mutate({ id, stage })}
          selectedLeadId={selectedLead?.id}
        />
      </div>

      <LeadDetailSheet
        lead={selectedLead}
        theme={theme}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onDelete={handleDelete}
        onFlagged={handleFlagged}
        onLog={handleLog}
      />

      {/* sonner's Toaster has its own theme system, independent of our
          `.dark` class — it defaults to the OS preference rather than this
          app's toggle unless told otherwise, so it's set explicitly here. */}
      <Toaster theme={isDark ? 'dark' : 'light'} />

      <EventLogDrawer entries={logEntries} />
    </div>
  )
}

export default App
