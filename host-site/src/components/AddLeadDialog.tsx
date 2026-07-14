import { useState, type FormEvent, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Input, Label } from '@parceliq/ui'

import { AddressAutocomplete } from './AddressAutocomplete'
import type { LeadStage, NewLeadInput } from '../lib/leads-store'

const STAGES: LeadStage[] = ['Needs Estimate', 'Scheduled', 'Quoted', 'Won', 'Lost']

const EMPTY_FORM = {
  name: '',
  company: '',
  address: '',
  stage: 'Needs Estimate' as LeadStage,
  roofAgeYears: '',
  roofMaterial: '',
  lastInspection: '',
}

export interface AddLeadDialogProps {
  onAdd: (input: NewLeadInput) => void
  isSubmitting: boolean
}

export function AddLeadDialog({ onAdd, isSubmitting }: AddLeadDialogProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onAdd({
      name: form.name,
      company: form.company,
      address: form.address,
      stage: form.stage,
      roofAgeYears: Number(form.roofAgeYears) || 0,
      roofMaterial: form.roofMaterial || 'Unknown',
      lastInspection: form.lastInspection || new Date().toISOString().slice(0, 10),
    })
    setForm(EMPTY_FORM)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add lead
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Company">
            <Input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
          <Field label="Property address">
            <AddressAutocomplete
              required
              placeholder="e.g. 350 Fifth Avenue, New York, NY"
              value={form.address}
              onChange={(address) => setForm({ ...form, address })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Stage">
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-base shadow-sm sm:text-sm"
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as LeadStage })}
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Roof age (years)">
              <Input
                type="number"
                min={0}
                value={form.roofAgeYears}
                onChange={(e) => setForm({ ...form, roofAgeYears: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Roof material">
            <Input
              placeholder="e.g. Asphalt Shingle"
              value={form.roofMaterial}
              onChange={(e) => setForm({ ...form, roofMaterial: e.target.value })}
            />
          </Field>
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? 'Adding…' : 'Add lead'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
