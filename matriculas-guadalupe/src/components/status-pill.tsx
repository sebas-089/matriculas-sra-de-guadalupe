import { Check, Clock3, Eye, X } from 'lucide-react';
import type { PaymentStatus } from '@/lib/api';

const config: Record<PaymentStatus, { label: string; icon: typeof Check; className: string }> = {
  PENDIENTE: { label: 'Pendiente', icon: Clock3, className: 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--foreground))] border-[hsl(var(--accent)/.5)]' },
  APROBADO: { label: 'Aprobado', icon: Check, className: 'bg-[hsl(152_48%_88%)] text-[hsl(155_45%_25%)] border-[hsl(152_35%_72%)]' },
  RECHAZADO: { label: 'Rechazado', icon: X, className: 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/.25)]' },
  REVISION_MANUAL: { label: 'Revisión manual', icon: Eye, className: 'bg-[hsl(202_48%_91%)] text-[hsl(204_55%_32%)] border-[hsl(202_40%_75%)]' },
};

export function StatusPill({ status }: { status: PaymentStatus }) {
  const item = config[status] ?? config.PENDIENTE;
  const Icon = item.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${item.className}`} data-testid={`status-payment-${status}`}>
      <Icon size={13} strokeWidth={2.5} />
      {item.label}
    </span>
  );
}