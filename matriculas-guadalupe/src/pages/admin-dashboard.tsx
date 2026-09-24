import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowDownToLine,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  HeartPulse,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Palette,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  getExportAdminMatriculasQueryKey,
  getGetDashboardStatsQueryKey,
  getGetMatriculaDetailQueryKey,
  getListAdminMatriculasQueryKey,
  useApproveMatriculaManual,
  useDeleteMatricula,
  useExportAdminMatriculas,
  useGetDashboardStats,
  useGetMatriculaDetail,
  useHealthCheck,
  useListAdminMatriculas,
  useReceivePaymentWebhook,
  type ExportAdminMatriculasParams,
  type ListAdminMatriculasParams,
  type Matricula,
  type MatriculaDetail,
  type PaymentMethod,
  type PaymentStatus,
} from '@/lib/api';
import { BrandMark } from '@/components/brand';
import { StatusPill } from '@/components/status-pill';
import InstitutionSettingsPanel from '@/components/institution-settings-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const statusOptions: { value: PaymentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'APROBADO', label: 'Aprobados' },
  { value: 'REVISION_MANUAL', label: 'Revisión manual' },
  { value: 'RECHAZADO', label: 'Rechazados' },
];

const estadoMatriculaLabels: Record<PaymentStatus, string> = {
  PENDIENTE: 'Pendiente de pago',
  APROBADO: 'Matrícula aprobada',
  REVISION_MANUAL: 'En revisión manual',
  RECHAZADO: 'Pago rechazado',
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  PSE: 'PSE (débito bancario)',
  TARJETA: 'Tarjeta',
  EFECTIVO: 'Efectivo',
  CONSIGNACION: 'Consignación',
  TRANSFERENCIA: 'Transferencia',
};

const documentTypeLabels: Record<string, string> = {
  RC: 'Registro civil',
  TI: 'Tarjeta de identidad',
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PEP: 'Permiso especial de permanencia',
  PAS: 'Pasaporte',
};

function initials(name: string) {
  return (name || 'SN')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function safeUser() {
  try {
    return JSON.parse(localStorage.getItem('guadalupe_user') || '{}') as { nombre?: string; correo?: string; rol?: string };
  } catch {
    return {};
  }
}

/** Muestra un guion cuando el valor viene vacío o nulo desde la base de datos. */
function dash(value?: string | null): string {
  return value && value.trim().length > 0 ? value : '—';
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return dash(value);
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** Fechas `YYYY-MM-DD` (tipo date de Postgres) sin desfase por zona horaria. */
function formatDateOnly(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return dash(value);
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(date);
}

function documentTypeLabel(value?: string | null): string {
  if (!value) return '—';
  return documentTypeLabels[value] ?? value;
}

/**
 * Descarga un CSV garantizando el BOM UTF-8 (`\uFEFF`), necesario para que Excel
 * interprete correctamente tildes, ñ y símbolos en español.
 */
function downloadCsv(content: string, filename: string) {
  const withBom = content.startsWith('\uFEFF') ? content : `\uFEFF${content}`;
  const blob = new Blob([withBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function StatCard({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return (
    <div className="glass-panel p-5 transition-ui hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
      <div className={`mb-5 size-2 rounded-full ${accent}`} />
      <p className="label-caps text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="mt-2 font-display text-4xl tracking-[-.03em]" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{note}</p>
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border bg-[hsl(var(--card))] p-3.5">
      <p className="label-caps flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
        {icon}
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

/** Pestaña con los datos personales, académicos y médicos del estudiante. */
function EstudianteTab({ data }: { data: MatriculaDetail }) {
  const estudiante = data.estudiante;
  return (
    <div className="grid gap-4">
      <DetailGrid>
        <DetailItem label="Nombre completo" value={estudiante.nombre_completo} icon={<UserRound size={13} />} />
        <DetailItem label="Grado al que aspira" value={estudiante.grado_al_que_aspira} icon={<GraduationCap size={13} />} />
        <DetailItem label="Tipo de documento" value={documentTypeLabel(estudiante.tipo_documento)} icon={<FileText size={13} />} />
        <DetailItem label="Número de documento" value={estudiante.documento_identidad} />
        <DetailItem label="Fecha de nacimiento" value={formatDateOnly(estudiante.fecha_nacimiento)} icon={<CalendarDays size={13} />} />
        <DetailItem label="Fecha de registro" value={formatDateTime(estudiante.fecha_registro)} icon={<CalendarDays size={13} />} />
        <DetailItem label="EPS" value={dash(estudiante.eps)} icon={<HeartPulse size={13} />} />
        <DetailItem label="Tipo de sangre" value={dash(estudiante.tipo_sangre)} icon={<HeartPulse size={13} />} />
      </DetailGrid>
      <DetailItem label="Observaciones médicas" value={dash(estudiante.observaciones_medicas)} icon={<HeartPulse size={13} />} />
    </div>
  );
}

/** Pestaña con los datos del acudiente o padre de familia. */
function AcudienteTab({ data }: { data: MatriculaDetail }) {
  const acudiente = data.acudiente;
  return (
    <div className="grid gap-4">
      <DetailGrid>
        <DetailItem label="Nombre completo" value={acudiente.nombre_completo} icon={<UserRound size={13} />} />
        <DetailItem label="Parentesco" value={dash(acudiente.parentesco)} icon={<Users size={13} />} />
        <DetailItem label="Tipo de documento" value={documentTypeLabel(acudiente.tipo_documento)} icon={<FileText size={13} />} />
        <DetailItem label="Número de documento" value={acudiente.documento_identidad} />
        <DetailItem label="Teléfono" value={acudiente.telefono} icon={<Phone size={13} />} />
        <DetailItem label="Correo electrónico" value={acudiente.correo} icon={<Mail size={13} />} />
        <DetailItem label="Ocupación" value={dash(acudiente.ocupacion)} />
        <DetailItem label="Fecha de registro" value={formatDateTime(acudiente.fecha_registro)} icon={<CalendarDays size={13} />} />
      </DetailGrid>
      <DetailItem label="Dirección" value={dash(acudiente.direccion)} icon={<MapPin size={13} />} />
    </div>
  );
}

/** Pestaña con el pago, la referencia, el comprobante y las transacciones. */
function PagoTab({ data }: { data: MatriculaDetail }) {
  return (
    <div className="grid gap-4">
      <DetailGrid>
        <DetailItem label="Referencia de pago" value={<span className="font-data">{data.referencia_pago}</span>} icon={<CreditCard size={13} />} />
        <DetailItem label="Año lectivo" value={String(data.anio_lectivo)} icon={<CalendarDays size={13} />} />
        <DetailItem label="Monto total" value={<span className="font-data text-base">{COP.format(data.monto_total)}</span>} icon={<CreditCard size={13} />} />
        <DetailItem label="Método de pago" value={data.metodo_pago ? paymentMethodLabels[data.metodo_pago] ?? data.metodo_pago : 'Por confirmar'} />
        <DetailItem label="Estado de la matrícula" value={estadoMatriculaLabels[data.estado_pago]} />
        <DetailItem label="Estado del pago" value={<StatusPill status={data.estado_pago} />} />
        <DetailItem label="Fecha de pago" value={formatDateTime(data.fecha_pago)} icon={<CalendarDays size={13} />} />
        <DetailItem label="Fecha de creación" value={formatDateTime(data.fecha_creacion)} icon={<CalendarDays size={13} />} />
        <DetailItem label="Última actualización" value={formatDateTime(data.fecha_actualizacion)} icon={<RefreshCw size={13} />} />
        <DetailItem label="ID de matrícula" value={<span className="font-data">#{data.id}</span>} />
      </DetailGrid>

      <div className="rounded-lg border bg-[hsl(var(--card))] p-3.5">
        <p className="label-caps text-[hsl(var(--muted-foreground))]">Comprobante de pago</p>
        {data.comprobante_url ? (
          <div className="mt-3 grid gap-3">
            <img
              src={data.comprobante_url}
              alt={`Comprobante de la matrícula ${data.referencia_pago}`}
              className="max-h-72 w-full rounded-lg border object-contain bg-[hsl(var(--muted))]"
            />
            <a
              href={data.comprobante_url}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex w-fit items-center gap-2 text-sm font-bold text-[hsl(var(--primary))] underline"
              data-testid="link-comprobante"
            >
              Abrir comprobante en una pestaña nueva
            </a>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Sin comprobante adjunto. El acudiente puede enviarlo por WhatsApp con la referencia de pago.
          </p>
        )}
      </div>

      <div className="rounded-lg border bg-[hsl(var(--card))] p-3.5">
        <p className="label-caps text-[hsl(var(--muted-foreground))]">
          Transacciones registradas ({data.transacciones.length})
        </p>
        {data.transacciones.length === 0 ? (
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Aún no hay transacciones de pasarela para esta matrícula.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-xs">
              <thead>
                <tr className="border-b text-[hsl(var(--muted-foreground))]">
                  <th className="py-2 pr-3 font-bold uppercase tracking-wider">ID pasarela</th>
                  <th className="py-2 pr-3 font-bold uppercase tracking-wider">Estado</th>
                  <th className="py-2 pr-3 font-bold uppercase tracking-wider">Monto</th>
                  <th className="py-2 font-bold uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.transacciones.map((transaccion) => (
                  <tr className="border-b last:border-0" key={transaccion.id}>
                    <td className="py-2 pr-3 font-data">{transaccion.id_transaccion_pasarela}</td>
                    <td className="py-2 pr-3 font-semibold">{transaccion.estado_pasarela}</td>
                    <td className="py-2 pr-3 font-data">{COP.format(transaccion.monto)}</td>
                    <td className="py-2">{formatDateTime(transaccion.fecha_transaccion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal de detalle completo                                                   */
/* -------------------------------------------------------------------------- */

function MatriculaDetailDialog({
  matriculaId,
  onClose,
  onRequestDelete,
}: {
  matriculaId: number | null;
  onClose: () => void;
  onRequestDelete: (target: { id: number; estudiante: string; referencia: string }) => void;
}) {
  const detail = useGetMatriculaDetail(matriculaId);
  const data = detail.data;

  return (
    <Dialog open={matriculaId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl" data-testid="dialog-matricula-detail">
        {detail.isLoading ? (
          <div className="grid gap-3 py-6">
            <div className="skeleton h-8 w-2/3 rounded-lg" />
            <div className="skeleton h-11 w-full rounded-lg" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="skeleton h-20 rounded-lg" />
              <div className="skeleton h-20 rounded-lg" />
              <div className="skeleton h-20 rounded-lg" />
              <div className="skeleton h-20 rounded-lg" />
            </div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
              <LoaderCircle className="animate-spin" size={16} /> Cargando el detalle de la matrícula…
            </p>
          </div>
        ) : !data ? (
          <div className="grid gap-4 py-8 text-center">
            <Activity className="mx-auto text-[hsl(var(--destructive))]" size={30} />
            <DialogTitle className="font-display text-2xl">No pudimos cargar el detalle</DialogTitle>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {detail.error instanceof Error ? detail.error.message : 'La matrícula no está disponible o fue eliminada.'}
            </p>
            <DialogFooter className="justify-center">
              <button
                type="button"
                onClick={() => void detail.refetch()}
                className="focus-ring rounded-lg border px-4 py-2.5 text-sm font-bold transition-ui hover:border-[hsl(var(--primary))]"
                data-testid="button-retry-detail"
              >
                Reintentar
              </button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="label-caps text-[hsl(var(--primary))]">Detalle de la matrícula</p>
                  <DialogTitle className="mt-2 font-display text-2xl sm:text-3xl" data-testid="text-detail-student">
                    {data.estudiante.nombre_completo}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm">
                    Referencia <span className="font-data font-semibold text-[hsl(var(--foreground))]">{data.referencia_pago}</span>
                    {' · '}
                    {data.estudiante.grado_al_que_aspira} · Año lectivo {data.anio_lectivo}
                  </DialogDescription>
                </div>
                <StatusPill status={data.estado_pago} />
              </div>
            </DialogHeader>

            <Tabs defaultValue="estudiante" className="mt-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="estudiante" className="gap-1.5" data-testid="tab-estudiante">
                  <GraduationCap size={15} /> Estudiante
                </TabsTrigger>
                <TabsTrigger value="acudiente" className="gap-1.5" data-testid="tab-acudiente">
                  <Users size={15} /> Acudiente
                </TabsTrigger>
                <TabsTrigger value="pago" className="gap-1.5" data-testid="tab-pago">
                  <CreditCard size={15} /> Pago
                </TabsTrigger>
              </TabsList>
              <TabsContent value="estudiante">
                <EstudianteTab data={data} />
              </TabsContent>
              <TabsContent value="acudiente">
                <AcudienteTab data={data} />
              </TabsContent>
              <TabsContent value="pago">
                <PagoTab data={data} />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  onRequestDelete({
                    id: data.id,
                    estudiante: data.estudiante.nombre_completo,
                    referencia: data.referencia_pago,
                  })
                }
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--destructive)/.35)] px-4 py-2.5 text-sm font-bold text-[hsl(var(--destructive))] transition-ui hover:bg-[hsl(var(--destructive)/.08)]"
                data-testid="button-delete-from-detail"
              >
                <Trash2 size={16} /> Eliminar matrícula
              </button>
              <button
                type="button"
                onClick={onClose}
                className="focus-ring rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-ui"
                data-testid="button-close-detail"
              >
                Cerrar
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Confirmación de eliminación                                                 */
/* -------------------------------------------------------------------------- */

type DeleteTarget = { id: number; estudiante: string; referencia: string };

function DeleteMatriculaDialog({
  target,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  target: DeleteTarget | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="dialog-delete-matricula">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl">¿Eliminar esta matrícula?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6">
            ¿Estás seguro de que deseas eliminar esta matrícula? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {target && (
          <div className="rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.06)] p-4 text-sm">
            <p className="font-bold">{target.estudiante}</p>
            <p className="mt-1 text-[hsl(var(--muted-foreground))]">
              Referencia <span className="font-data">{target.referencia}</span> · ID #{target.id}
            </p>
            <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
              Se eliminarán también las transacciones asociadas. El estudiante y el acudiente solo se borran si no
              tienen otras matrículas registradas.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} data-testid="button-cancel-delete">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              // Evita el cierre automático para poder mostrar el estado "Eliminando…".
              event.preventDefault();
              onConfirm();
            }}
            className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/.9)]"
            data-testid="button-confirm-delete"
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="animate-spin" size={16} /> Eliminando…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Trash2 size={16} /> Sí, eliminar
              </span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Panel principal                                                             */
/* -------------------------------------------------------------------------- */

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const user = safeUser();
  const [mobileNav, setMobileNav] = useState(false);
  const [view, setView] = useState<'matriculas' | 'configuracion'>('matriculas');
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [grade, setGrade] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const health = useHealthCheck();
  const params = useMemo<ListAdminMatriculasParams>(
    () => ({ estado: status || undefined, grado: grade || undefined, busqueda: appliedSearch || undefined, limit: 50, offset: 0 }),
    [status, grade, appliedSearch],
  );
  const exportParams = useMemo<ExportAdminMatriculasParams>(
    () => ({ estado: status || undefined, grado: grade || undefined, busqueda: appliedSearch || undefined }),
    [status, grade, appliedSearch],
  );

  const statsQuery = useGetDashboardStats();
  const listQuery = useListAdminMatriculas(params, { query: { queryKey: getListAdminMatriculasQueryKey(params) } });
  const approve = useApproveMatriculaManual();
  const webhook = useReceivePaymentWebhook();
  const remove = useDeleteMatricula();
  const exportQuery = useExportAdminMatriculas(exportParams, {
    query: { enabled: false, queryKey: getExportAdminMatriculasQueryKey(exportParams) },
  });

  useEffect(() => {
    if (!localStorage.getItem('guadalupe_token')) setLocation('/admin/login');
  }, [setLocation]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: ['admin-matriculas'] });
  };

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 4200);
  };

  const approveRow = (id: number) => {
    approve.mutate(
      { id, data: { metodo_pago: 'TRANSFERENCIA' as PaymentMethod, observacion: 'Aprobación manual desde la consola institucional.' } },
      {
        onSuccess: () => {
          showFeedback('La matrícula fue aprobada manualmente.');
          refresh();
          void queryClient.invalidateQueries({ queryKey: getGetMatriculaDetailQueryKey(id) });
        },
        onError: () => showFeedback('No fue posible aprobar la matrícula.'),
      },
    );
  };

  const syncRow = (row: Matricula) => {
    webhook.mutate(
      {
        data: {
          referencia_pago: row.referencia_pago,
          id_transaccion_pasarela: `consola-${row.id}`,
          estado_pasarela: 'APROBADO',
          monto: row.monto_total,
          metodo_pago: 'TRANSFERENCIA',
        },
      },
      {
        onSuccess: () => {
          showFeedback('Confirmación enviada al sistema de pagos.');
          refresh();
          void queryClient.invalidateQueries({ queryKey: getGetMatriculaDetailQueryKey(row.id) });
        },
        onError: () => showFeedback('No fue posible sincronizar este pago.'),
      },
    );
  };

  /** Descarga el CSV de los registros filtrados (UTF-8 con BOM para Excel). */
  const exportCsv = async () => {
    const response = await exportQuery.refetch();
    if (response.error || !response.data) {
      showFeedback(
        response.error instanceof Error ? response.error.message : 'No hay información disponible para exportar.',
      );
      return;
    }
    const total = listQuery.data?.total ?? rows.length;
    downloadCsv(response.data, `matriculas-guadalupe-${new Date().toISOString().slice(0, 10)}.csv`);
    showFeedback(`Reporte CSV descargado con ${total} registro${total === 1 ? '' : 's'} según los filtros aplicados.`);
  };

  /** Cierra el detalle y abre la alerta de confirmación de eliminación. */
  const requestDelete = (target: DeleteTarget) => {
    setDetailId(null);
    setDeleteTarget(target);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    remove.mutate(
      { id: target.id },
      {
        onSuccess: () => {
          setDeleteTarget(null);
          void queryClient.invalidateQueries({ queryKey: ['admin-matriculas'] });
          void queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          showFeedback(`La matrícula ${target.referencia} fue eliminada correctamente.`);
        },
        onError: (error) => {
          setDeleteTarget(null);
          showFeedback(error instanceof Error ? error.message : 'No fue posible eliminar la matrícula.');
        },
      },
    );
  };

  const logout = () => {
    localStorage.removeItem('guadalupe_token');
    localStorage.removeItem('guadalupe_user');
    setLocation('/admin/login');
  };

  const data = statsQuery.data;
  const rows = listQuery.data?.matriculas ?? [];
  const filtersActive = Boolean(status || grade || appliedSearch);

  if (!localStorage.getItem('guadalupe_token')) return null;

  return (
    <div className="grain min-h-[100dvh] bg-[hsl(var(--background))]">
      <div className="flex min-h-[100dvh]">
        <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col bg-[hsl(var(--sidebar))] p-5 text-[hsl(var(--sidebar-foreground))] transition-ui lg:static lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between">
            <BrandMark />
            <button onClick={() => setMobileNav(false)} className="rounded-lg p-2 lg:hidden" data-testid="button-close-nav">
              <X size={19} />
            </button>
          </div>
          <div className="mt-12">
            <p className="label-caps opacity-45">Operación</p>
            <nav className="mt-4 grid gap-1">
              <button
                onClick={() => { setView('matriculas'); setMobileNav(false); }}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition-ui ${view === 'matriculas' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'opacity-65 hover:bg-[hsl(var(--sidebar-accent))] hover:opacity-100'}`}
                data-testid="nav-dashboard"
              >
                <ClipboardList size={18} /> Matrículas
              </button>
              <button
                onClick={() => { setView('configuracion'); setMobileNav(false); }}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition-ui ${view === 'configuracion' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]' : 'opacity-65 hover:bg-[hsl(var(--sidebar-accent))] hover:opacity-100'}`}
                data-testid="nav-settings"
              >
                <Palette size={18} /> Configuración de la Institución
              </button>
            </nav>
          </div>
          <div className="mt-auto rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.6)] p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--foreground))]">
                {initials(user.nombre || 'AD')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user.nombre || 'Administrador'}</p>
                <p className="truncate text-xs opacity-60">{user.rol || 'Equipo institucional'}</p>
              </div>
            </div>
            <button onClick={logout} className="mt-4 flex w-full items-center gap-2 border-t border-[hsl(var(--sidebar-border))] pt-3 text-xs font-bold opacity-65 transition-ui hover:opacity-100" data-testid="button-logout">
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        </aside>
        {mobileNav && (
          <button
            className="fixed inset-0 z-20 bg-[hsl(var(--foreground)/.35)] lg:hidden"
            onClick={() => setMobileNav(false)}
            aria-label="Cerrar menú"
            data-testid="button-overlay-nav"
          />
        )}
        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b bg-white/70 px-5 py-4 backdrop-blur sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileNav(true)} className="rounded-lg border p-2 lg:hidden" data-testid="button-open-nav">
                <Menu size={19} />
              </button>
              <div>
                <p className="label-caps text-[hsl(var(--primary))]">Consola institucional</p>
                <p className="mt-1 hidden text-sm text-[hsl(var(--muted-foreground))] sm:block">Seguimiento del año lectivo 2026.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] sm:flex">
                <span className={`size-2 rounded-full ${health.isError ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(152_48%_45%)]'}`} />
                {health.isError ? 'Servicio con alertas' : 'Todos los sistemas activos'}
              </span>
              <button
                onClick={refresh}
                className="focus-ring rounded-lg border p-2 text-[hsl(var(--muted-foreground))] transition-ui hover:bg-[hsl(var(--muted))]"
                data-testid="button-refresh-dashboard"
                title="Actualizar datos"
              >
                <RefreshCw size={17} className={statsQuery.isFetching || listQuery.isFetching ? 'animate-spin' : ''} />
              </button>
            </div>
          </header>
          <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            {view === 'configuracion' ? (
              <InstitutionSettingsPanel />
            ) : (
              <>
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                  <div>
                    <p className="label-caps text-[hsl(var(--primary))]">Seguimiento de matrícula · 2026</p>
                    <h1 className="mt-3 font-display text-4xl tracking-[-.04em] sm:text-5xl">Resumen de matrículas</h1>
                    <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
                      La operación de admisiones, en una sola mirada. Haz clic en una fila para ver el detalle completo.
                    </p>
                  </div>
                </div>

                {feedback && (
                  <div
                    className="mt-6 flex items-center gap-3 rounded-lg border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.07)] px-4 py-3 text-sm font-bold text-[hsl(var(--primary))]"
                    data-testid="alert-dashboard-feedback"
                  >
                    <CheckCircle2 size={18} /> {feedback}
                  </div>
                )}

                {statsQuery.isError ? (
                  <div className="mt-8 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.06)] p-6">
                    <p className="font-bold">No pudimos cargar los indicadores.</p>
                    <button
                      onClick={() => void statsQuery.refetch()}
                      className="mt-3 text-sm font-bold text-[hsl(var(--destructive))] underline"
                      data-testid="button-retry-stats"
                    >
                      Intentar de nuevo
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statsQuery.isLoading ? (
                      [1, 2, 3, 4].map((key) => <div className="skeleton h-36 rounded-xl" key={key} />)
                    ) : (
                      <>
                        <StatCard label="Recaudado" value={COP.format(data?.total_recaudado ?? 0)} note="Total confirmado" accent="bg-[hsl(var(--primary))]" />
                        <StatCard label="Matrículas" value={String(data?.total_matriculas ?? 0)} note="Solicitudes recibidas" accent="bg-[hsl(var(--accent))]" />
                        <StatCard label="Aprobadas" value={String(data?.aprobadas ?? 0)} note="Listas para continuar" accent="bg-[hsl(152_48%_45%)]" />
                        <StatCard label="Revisión manual" value={String(data?.revision_manual ?? 0)} note={`${data?.pendientes ?? 0} pendientes de pago`} accent="bg-[hsl(202_48%_50%)]" />
                      </>
                    )}
                  </div>
                )}

                <section className="glass-panel mt-10 overflow-hidden">
                  <div className="flex flex-col gap-5 border-b p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ClipboardList size={19} className="text-[hsl(var(--primary))]" />
                        <h2 className="font-display text-2xl">Últimas solicitudes</h2>
                      </div>
                      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                        {listQuery.data?.total ?? 0} registros que coinciden con tus filtros
                        {filtersActive ? ' (la exportación respeta estos filtros)' : ''}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          onKeyDown={(event) => { if (event.key === 'Enter') setAppliedSearch(search.trim()); }}
                          className="focus-ring h-10 w-full rounded-lg border bg-[hsl(var(--background))] pl-9 pr-3 text-sm outline-none sm:w-56"
                          placeholder="Buscar estudiante…"
                          data-testid="input-filter-search"
                        />
                      </div>
                      <button
                        onClick={() => setAppliedSearch(search.trim())}
                        className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
                        data-testid="button-apply-search"
                      >
                        <Filter size={15} /> Filtrar
                      </button>
                      <button
                        onClick={exportCsv}
                        disabled={exportQuery.isFetching}
                        className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--card))] px-3 text-sm font-bold transition-ui hover:border-[hsl(var(--primary))] disabled:cursor-wait disabled:opacity-60"
                        data-testid="button-export-csv"
                        title="Descarga un CSV con todas las columnas, listo para Excel"
                      >
                        {exportQuery.isFetching ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowDownToLine size={16} />}
                        {exportQuery.isFetching ? 'Generando…' : 'Exportar a CSV'}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 border-b bg-[hsl(var(--muted)/.3)] p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-[1fr_1fr_auto]">
                    <label className="grid gap-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))]">
                      Estado
                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value as PaymentStatus | '')}
                        className="focus-ring h-10 rounded-lg border bg-[hsl(var(--card))] px-3 text-sm font-semibold text-[hsl(var(--foreground))]"
                        data-testid="select-filter-status"
                      >
                        {statusOptions.map((option) => (
                          <option value={option.value} key={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))]">
                      Grado
                      <select
                        value={grade}
                        onChange={(event) => setGrade(event.target.value)}
                        className="focus-ring h-10 rounded-lg border bg-[hsl(var(--card))] px-3 text-sm font-semibold text-[hsl(var(--foreground))]"
                        data-testid="select-filter-grade"
                      >
                        <option value="">Todos los grados</option>
                        {(data?.por_grado ?? []).map((item) => (
                          <option value={item.grado} key={item.grado}>{item.grado}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-end">
                      <button
                        onClick={() => { setStatus(''); setGrade(''); setSearch(''); setAppliedSearch(''); }}
                        className="h-10 rounded-lg px-3 text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                        data-testid="button-clear-filters"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </div>

                  {listQuery.isError ? (
                    <div className="p-10 text-center">
                      <Activity className="mx-auto text-[hsl(var(--destructive))]" size={28} />
                      <p className="mt-3 font-bold">No pudimos cargar las matrículas.</p>
                      <button
                        onClick={() => void listQuery.refetch()}
                        className="mt-3 text-sm font-bold text-[hsl(var(--primary))] underline"
                        data-testid="button-retry-list"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : listQuery.isLoading ? (
                    <div className="grid gap-3 p-6">
                      {[1, 2, 3, 4].map((key) => <div className="skeleton h-16 rounded-lg" key={key} />)}
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileSpreadsheet className="mx-auto text-[hsl(var(--muted-foreground))]" size={32} />
                      <p className="mt-4 font-display text-2xl">No hay solicitudes aquí.</p>
                      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Prueba con otros filtros o vuelve a consultar más tarde.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1000px] text-left text-sm">
                        <thead>
                          <tr className="border-b text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            <th className="px-6 py-4">Estudiante</th>
                            <th className="px-4 py-4">Acudiente</th>
                            <th className="px-4 py-4">Grado</th>
                            <th className="px-4 py-4">Valor</th>
                            <th className="px-4 py-4">Estado</th>
                            <th className="px-4 py-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>{rows.map((row) => (
                          <tr
                            className="cursor-pointer border-b last:border-0 transition-ui hover:bg-[hsl(var(--muted)/.35)]"
                            key={row.id}
                            data-testid={`row-enrollment-${row.id}`}
                            tabIndex={0}
                            onClick={() => setDetailId(row.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setDetailId(row.id);
                              }
                            }}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="grid size-9 place-items-center rounded-full bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--secondary-foreground))]">
                                  {initials(row.nombre_estudiante)}
                                </div>
                                <div>
                                  <p className="font-bold">{row.nombre_estudiante}</p>
                                  <p className="mt-0.5 font-data text-[11px] text-[hsl(var(--muted-foreground))]">
                                    {row.documento_estudiante || 'Sin documento'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-semibold">{dash(row.nombre_acudiente)}</p>
                              <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{dash(row.correo_acudiente)}</p>
                            </td>
                            <td className="px-4 py-4 font-semibold">{row.grado}</td>
                            <td className="px-4 py-4 font-data text-xs font-semibold">{COP.format(row.monto_total)}</td>
                            <td className="px-4 py-4"><StatusPill status={row.estado_pago} /></td>
                            <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  onClick={() => setDetailId(row.id)}
                                  className="focus-ring inline-flex items-center gap-1 rounded-md bg-[hsl(var(--primary)/.1)] px-2.5 py-2 text-xs font-bold text-[hsl(var(--primary))] transition-ui hover:bg-[hsl(var(--primary)/.18)]"
                                  data-testid={`button-view-detail-${row.id}`}
                                  title="Ver el detalle completo"
                                >
                                  <Eye size={14} /> Ver detalles
                                </button>
                                {(row.estado_pago === 'PENDIENTE' || row.estado_pago === 'REVISION_MANUAL') && (
                                  <>
                                    <button
                                      onClick={() => approveRow(row.id)}
                                      disabled={approve.isPending}
                                      className="focus-ring inline-flex items-center gap-1 rounded-md border px-2.5 py-2 text-xs font-bold transition-ui hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                                      data-testid={`button-approve-${row.id}`}
                                    >
                                      <Check size={14} /> Aprobar
                                    </button>
                                    <button
                                      onClick={() => syncRow(row)}
                                      disabled={webhook.isPending}
                                      className="focus-ring rounded-md border px-2.5 py-2 text-xs font-bold transition-ui hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                                      data-testid={`button-sync-payment-${row.id}`}
                                    >
                                      Sincronizar
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() =>
                                    requestDelete({
                                      id: row.id,
                                      estudiante: row.nombre_estudiante,
                                      referencia: row.referencia_pago,
                                    })
                                  }
                                  className="focus-ring inline-flex items-center gap-1 rounded-md border border-[hsl(var(--destructive)/.35)] px-2.5 py-2 text-xs font-bold text-[hsl(var(--destructive))] transition-ui hover:bg-[hsl(var(--destructive)/.08)]"
                                  data-testid={`button-delete-${row.id}`}
                                  title="Eliminar esta matrícula"
                                >
                                  <Trash2 size={14} /> Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </section>
                <div className="mt-6 flex flex-col gap-3 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[hsl(var(--primary))]" /> Datos de acceso restringido al equipo autorizado.
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <UserRound size={14} /> {user.correo || 'Cuenta institucional'}
                  </span>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <MatriculaDetailDialog matriculaId={detailId} onClose={() => setDetailId(null)} onRequestDelete={requestDelete} />
      <DeleteMatriculaDialog
        target={deleteTarget}
        isPending={remove.isPending}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}