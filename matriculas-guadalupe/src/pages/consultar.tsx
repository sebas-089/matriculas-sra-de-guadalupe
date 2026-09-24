import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, FileSearch, HelpCircle, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import { getConsultMatriculaQueryKey, useConsultMatricula } from '@/lib/api';
import { BrandMark } from '@/components/brand';
import { useSettings } from '@/components/settings-provider';
import { StatusPill } from '@/components/status-pill';

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function formatDate(date?: string | null) {
  if (!date) return 'Aún no registrado';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(date));
}

export default function Consultar() {
  const search = useSearch();
  const { settings } = useSettings();
  const queryRef = new URLSearchParams(search).get('ref') ?? '';
  const [input, setInput] = useState(queryRef);
  const [submitted, setSubmitted] = useState(queryRef);
  const query = useConsultMatricula(submitted, { query: { enabled: Boolean(submitted), queryKey: getConsultMatriculaQueryKey(submitted) } });
  const record = query.data?.matricula;

  useEffect(() => {
    if (queryRef) { setInput(queryRef); setSubmitted(queryRef); }
  }, [queryRef]);

  return (
    <div className="grain min-h-[100dvh]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <BrandMark />
        <Link href="/" className="focus-ring inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[hsl(var(--muted-foreground))] transition-ui hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" data-testid="link-back-home"><ArrowLeft size={16} /> Volver al inicio</Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pt-20">
        <div className="max-w-2xl animate-rise-in">
          <span className="label-caps text-[hsl(var(--primary))]">Consulta pública</span>
          <h1 className="mt-4 font-display text-5xl leading-[.98] tracking-[-.04em] sm:text-6xl">¿Cómo va tu matrícula?</h1>
          <p className="mt-6 text-lg leading-8 text-[hsl(var(--muted-foreground))]">Consulta el estado del pago con la referencia que recibiste o con el documento del estudiante o acudiente.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); setSubmitted(input.trim()); }} className="mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row" data-testid="form-consult-payment">
          <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={19} /><input required value={input} onChange={(event) => setInput(event.target.value)} className="focus-ring glass-control h-14 w-full rounded-xl border pl-12 pr-4 font-data text-sm outline-none transition-ui focus:border-[hsl(var(--primary))] focus:shadow-[0_0_0_3px_hsl(var(--primary)/.12)]" placeholder="Ej. CENSG-2026-00482 o 1029384756" data-testid="input-payment-lookup" /></div>
          <button type="submit" disabled={query.isFetching} className="focus-ring inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-ui hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-search-payment">{query.isFetching ? <LoaderCircle className="animate-spin" size={18} /> : <Search size={18} />} Consultar</button>
        </form>
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]"><ShieldCheck size={15} className="text-[hsl(var(--primary))]" /> Tu documento solo se utiliza para encontrar tu solicitud.</div>

        {query.isFetching && <div className="glass-panel mt-12 grid gap-4 p-6"><div className="skeleton h-5 w-32 rounded" /><div className="skeleton h-10 w-64 rounded" /><div className="skeleton h-20 w-full rounded" /></div>}
        {query.isError && !query.isFetching && <div className="mt-12 rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.06)] p-7" data-testid="alert-consult-error"><div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]"><FileSearch size={20} /></div><div><h2 className="font-display text-2xl">No encontramos esa solicitud</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">Revisa que la referencia o el documento estén escritos exactamente como aparecen en tu comprobante. Si el problema continúa, escríbenos.</p><button onClick={() => setInput('')} className="focus-ring mt-5 rounded-full border border-[hsl(var(--destructive)/.35)] px-4 py-2 text-sm font-bold text-[hsl(var(--destructive))] transition-ui hover:bg-[hsl(var(--destructive)/.08)]" data-testid="button-retry-lookup">Intentar de nuevo</button></div></div></div>}
        {record && !query.isFetching && (
          <section className="glass-panel mt-12 animate-rise-in" data-testid="card-payment-result">
            <div className="flex flex-col gap-5 border-b p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8"><div><p className="label-caps text-[hsl(var(--primary))]">Solicitud encontrada</p><h2 className="mt-3 font-display text-3xl sm:text-4xl">{record.nombre_estudiante}</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Referencia <span className="font-data font-semibold text-[hsl(var(--foreground))]">{record.referencia_pago}</span></p></div><StatusPill status={record.estado_pago} /></div>
            <div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
              <div><p className="label-caps text-[hsl(var(--muted-foreground))]">Grado</p><p className="mt-2 font-bold">{record.grado}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Año lectivo {record.anio_lectivo}</p></div>
              <div><p className="label-caps text-[hsl(var(--muted-foreground))]">Valor</p><p className="mt-2 font-data text-lg font-semibold">{COP.format(record.monto_total)}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{record.metodo_pago || 'Método por confirmar'}</p></div>
              <div><p className="label-caps text-[hsl(var(--muted-foreground))]">Fecha de pago</p><p className="mt-2 font-bold">{formatDate(record.fecha_pago)}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Creada {formatDate(record.fecha_creacion)}</p></div>
            </div>
            <div className="mx-6 mb-6 flex gap-3 rounded-xl bg-[hsl(var(--muted)/.6)] p-4 text-sm leading-6 sm:mx-8 sm:mb-8"><CheckCircle2 className="mt-1 shrink-0 text-[hsl(var(--primary))]" size={18} /><p>{record.estado_pago === 'APROBADO' ? 'El pago está confirmado. El equipo de admisiones continuará con los siguientes pasos.' : record.estado_pago === 'REVISION_MANUAL' ? 'Nuestro equipo está validando el soporte de pago. Te avisaremos cuando finalice la revisión.' : record.estado_pago === 'RECHAZADO' ? 'El pago no pudo ser confirmado. Comunícate con admisiones para recibir orientación.' : 'La solicitud está registrada. Completa el pago con la referencia indicada y vuelve a consultar aquí.'}</p></div>
          </section>
        )}
        {!submitted && !query.isFetching && <div className="mt-16 grid gap-5 border-t pt-10 sm:grid-cols-3"><div><CalendarDays className="text-[hsl(var(--primary))]" size={22} /><h3 className="mt-4 font-bold">Consulta cuando quieras</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Tu referencia permanece activa durante todo el proceso.</p></div><div><FileSearch className="text-[hsl(var(--primary))]" size={22} /><h3 className="mt-4 font-bold">Dos formas de buscar</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Usa referencia de pago o documento de identidad.</p></div><div><HelpCircle className="text-[hsl(var(--primary))]" size={22} /><h3 className="mt-4 font-bold">¿Necesitas ayuda?</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Escríbenos a {settings.email} o al {settings.phone}.</p></div></div>}
        <div className="mt-14"><Link href="/" className="focus-ring inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))] transition-ui hover:gap-3" data-testid="link-start-from-lookup">Iniciar una nueva matrícula <ArrowRight size={16} /></Link></div>
      </main>
    </div>
  );
}