import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** Thin wrapper so app code never imports `sonner` directly — keeps the toast implementation swappable behind @parceliq/ui. */
export function Toaster(props: ToasterProps) {
  return <Sonner richColors closeButton position="bottom-right" {...props} />
}

export { toast } from 'sonner'
