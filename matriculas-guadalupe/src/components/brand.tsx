import { Link } from 'wouter';
import { ArrowUpRight, Cross, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';

/**
 * Divide el nombre institucional en el nombre distintivo y el tipo de
 * institución para el encabezado (ej. "Centro Educativo" + "Nuestra Señora de Guadalupe").
 */
export function splitBrandName(name: string): { title: string; subtitle: string } {
  const clean = (name || '').trim();
  if (!clean) return { title: 'Guadalupe', subtitle: 'Centro Educativo' };

  const prefixes = [
    'Centro Educativo',
    'Institución Educativa',
    'Instituto',
    'Colegio',
    'Liceo',
    'Escuela',
    'Jardín Infantil',
  ];

  for (const prefix of prefixes) {
    if (clean.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) {
      return { title: clean.slice(prefix.length).trim() || clean, subtitle: prefix };
    }
  }

  return { title: clean, subtitle: 'Institución educativa' };
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { settings } = useSettings();
  const { title, subtitle } = splitBrandName(settings.school_name);

  return (
    <Link href="/" className="focus-ring group inline-flex items-center gap-3" data-testid="link-brand-home">
      {settings.logo_url ? (
        <img
          src={settings.logo_url}
          alt={settings.school_name}
          className="size-10 shrink-0 rounded-full border border-[hsl(var(--border))] bg-white object-contain shadow-[4px_4px_0_hsl(var(--primary))] transition-ui group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          data-testid="img-brand-logo"
        />
      ) : (
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] shadow-[4px_4px_0_hsl(var(--primary))] transition-ui group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <Cross size={18} strokeWidth={2.5} />
          <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[hsl(var(--primary))]" />
        </span>
      )}
      {!compact && (
        <span className="leading-none">
          <span className="block max-w-[13rem] truncate font-display text-lg font-semibold tracking-tight">{title}</span>
          <span className="label-caps text-[hsl(var(--muted-foreground))]">{subtitle}</span>
        </span>
      )}
    </Link>
  );
}

export function SecureNote({ children }: { children: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
      <ShieldCheck size={15} className="text-[hsl(var(--primary))]" />
      <span>{children}</span>
      <ArrowUpRight size={13} />
    </div>
  );
}

export function BrandWatermark() {
  const { settings } = useSettings();

  if (settings.logo_url) {
    return (
      <img
        src={settings.logo_url}
        alt=""
        aria-hidden="true"
        className="max-h-[26rem] w-auto max-w-[70vw] object-contain"
      />
    );
  }

  return (
    <div className="institutional-watermark-mark" aria-hidden="true">
      <Cross strokeWidth={1.5} />
    </div>
  );
}
