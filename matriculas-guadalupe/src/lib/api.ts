import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

export type PaymentStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REVISION_MANUAL';
export type PaymentMethod = 'PSE' | 'TARJETA' | 'EFECTIVO' | 'CONSIGNACION' | 'TRANSFERENCIA';
export type StudentGrade = 'Pre jardín' | 'Jardín' | 'Transición' | 'Primero (1°)' | 'Cuarto (4°)' | 'Quinto (5°)';

export type GuardianInput = {
  nombre_completo: string;
  tipo_documento: string;
  documento_identidad: string;
  parentesco?: string;
  correo: string;
  telefono: string;
  direccion: string;
  ocupacion: string;
};

export type StudentInput = {
  nombre_completo: string;
  tipo_documento: string;
  documento_identidad: string;
  fecha_nacimiento: string;
  grado_al_que_aspira: StudentGrade;
  eps: string;
  tipo_sangre: string;
  observaciones_medicas: string;
};

export type MatriculaInput = {
  acudiente: GuardianInput;
  estudiante: StudentInput;
  anio_lectivo: number;
  monto_total: number;
};

export type Matricula = {
  id: number;
  nombre_estudiante: string;
  documento_estudiante?: string;
  nombre_acudiente?: string;
  correo_acudiente?: string;
  grado: string;
  anio_lectivo: number;
  monto_total: number;
  referencia_pago: string;
  estado_pago: PaymentStatus;
  metodo_pago: PaymentMethod | null;
  fecha_pago: string | null;
  fecha_creacion: string;
};

type ApiError = Error & { status?: number };
const apiBase = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('guadalupe_token');
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    const error = new Error(body.error || `La solicitud falló (${response.status}).`) as ApiError;
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

function queryOptions(options?: { query?: { enabled?: boolean; queryKey?: readonly unknown[] } }) {
  return options?.query;
}

export function useHealthCheck(): UseQueryResult<{ status: string }> {
  return useQuery({ queryKey: ['health'], queryFn: () => request<{ status: string }>('/healthz'), staleTime: 30_000 });
}

export function useCreateMatricula() {
  return useMutation({
    mutationFn: (input: { data: MatriculaInput }) => request<{ matricula: Matricula; mensaje: string }>('/matriculas', { method: 'POST', body: JSON.stringify(input.data) }),
  });
}

export function getConsultMatriculaQueryKey(reference: string) { return ['consult-matricula', reference] as const; }
export function useConsultMatricula(reference: string, options?: { query?: { enabled?: boolean; queryKey?: readonly unknown[] } }) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getConsultMatriculaQueryKey(reference),
    queryFn: () => request<{ matricula: Matricula; acudiente: string; estudiante: string }>(`/matriculas/consultar/${encodeURIComponent(reference)}`),
    enabled: queryOptions(options)?.enabled ?? Boolean(reference),
  });
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: (input: { data: { password: string } }) => request<{ token: string; usuario: { id: number; nombre: string; correo: string; rol: string } }>('/admin/login', { method: 'POST', body: JSON.stringify(input.data) }),
  });
}

export type ListAdminMatriculasParams = { estado?: PaymentStatus; grado?: string; busqueda?: string; limit?: number; offset?: number };
export function getGetDashboardStatsQueryKey() { return ['dashboard-stats'] as const; }
export function useGetDashboardStats() {
  return useQuery({ queryKey: getGetDashboardStatsQueryKey(), queryFn: () => request<{ total_recaudado: number; total_matriculas: number; aprobadas: number; pendientes: number; revision_manual: number; rechazadas: number; por_grado: { grado: string; cantidad: number }[] }>('/admin/dashboard-stats') });
}

export function getListAdminMatriculasQueryKey(params: ListAdminMatriculasParams) { return ['admin-matriculas', params] as const; }
export function useListAdminMatriculas(params: ListAdminMatriculasParams, options?: { query?: { queryKey?: readonly unknown[] } }) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return useQuery({ queryKey: options?.query?.queryKey ?? getListAdminMatriculasQueryKey(params), queryFn: () => request<{ matriculas: Matricula[]; total: number }>(`/admin/matriculas?${query}`) });
}

export function useApproveMatriculaManual() {
  return useMutation({
    mutationFn: (input: { id: number; data: { metodo_pago?: PaymentMethod; observacion?: string } }) => request<Matricula>(`/admin/matriculas/${input.id}/aprobar-manual`, { method: 'PUT', body: JSON.stringify(input.data) }),
  });
}

export function useReceivePaymentWebhook() {
  return useMutation({
    mutationFn: (input: { data: { referencia_pago: string; id_transaccion_pasarela: string; estado_pasarela: string; monto: number; metodo_pago: PaymentMethod } }) => request<{ procesado: boolean; referencia_pago: string }>('/webhooks/pago', { method: 'POST', body: JSON.stringify(input.data) }),
  });
}

export type ExportAdminMatriculasParams = { estado?: PaymentStatus; grado?: string; busqueda?: string };
export function getExportAdminMatriculasQueryKey(params: ExportAdminMatriculasParams = {}) { return ['admin-export', params] as const; }

/** Construye el `?filtros` de una petición a partir de los parámetros indicados. */
function toQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

/**
 * Descarga el CSV de las matrículas que cumplen los filtros activos.
 * La respuesta se entrega en UTF-8 con BOM (`\uFEFF`), indispensable para que
 * Excel muestre correctamente tildes, ñ y símbolos en español.
 */
export function useExportAdminMatriculas(params: ExportAdminMatriculasParams = {}, options?: { query?: { enabled?: boolean; queryKey?: readonly unknown[] } }) {
  return useQuery({
    queryKey: options?.query?.queryKey ?? getExportAdminMatriculasQueryKey(params),
    queryFn: async () => {
      const token = localStorage.getItem('guadalupe_token') || '';
      const response = await fetch(`${apiBase}/admin/exportar-csv${toQueryString(params)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No fue posible exportar el reporte. Vuelve a iniciar sesión e inténtalo de nuevo.');
      const text = await response.text();
      // Refuerzo del BOM por si la respuesta se transforma en el camino.
      return text.startsWith('\uFEFF') ? text : `\uFEFF${text}`;
    },
    enabled: options?.query?.enabled ?? true,
  });
}

/* -------------------------------------------------------------------------- */
/* Detalle completo y eliminación de matrículas                               */
/* -------------------------------------------------------------------------- */

export type EstudianteDetail = {
  id: number;
  nombre_completo: string;
  tipo_documento: string;
  documento_identidad: string;
  fecha_nacimiento: string;
  grado_al_que_aspira: string;
  eps: string | null;
  tipo_sangre: string | null;
  observaciones_medicas: string | null;
  fecha_registro: string;
};

export type AcudienteDetail = {
  id: number;
  nombre_completo: string;
  tipo_documento: string;
  documento_identidad: string;
  parentesco: string | null;
  correo: string;
  telefono: string;
  direccion: string | null;
  ocupacion: string | null;
  fecha_registro: string;
};

export type TransaccionDetail = {
  id: number;
  id_transaccion_pasarela: string;
  monto: number;
  estado_pasarela: string;
  fecha_transaccion: string;
};

export type MatriculaDetail = {
  id: number;
  anio_lectivo: number;
  monto_total: number;
  referencia_pago: string;
  estado_pago: PaymentStatus;
  metodo_pago: PaymentMethod | null;
  comprobante_url: string | null;
  fecha_pago: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  estudiante: EstudianteDetail;
  acudiente: AcudienteDetail;
  transacciones: TransaccionDetail[];
};

export function getGetMatriculaDetailQueryKey(id: number) { return ['matricula-detail', id] as const; }

/** Carga el detalle completo (estudiante + acudiente + pago + transacciones). */
export function useGetMatriculaDetail(id: number | null, options?: { query?: { enabled?: boolean } }) {
  return useQuery({
    queryKey: getGetMatriculaDetailQueryKey(id ?? 0),
    queryFn: () => request<MatriculaDetail>(`/admin/matriculas/${id}`),
    enabled: (options?.query?.enabled ?? true) && Boolean(id),
    staleTime: 15_000,
  });
}

/** Elimina una matrícula y sus transacciones del backend (acción irreversible). */
export function useDeleteMatricula() {
  return useMutation({
    mutationFn: (input: { id: number }) =>
      request<{ eliminada: boolean; id: number; mensaje: string }>(`/admin/matriculas/${input.id}`, { method: 'DELETE' }),
  });
}

/* -------------------------------------------------------------------------- */
/* Configuración de la institución                                            */
/* -------------------------------------------------------------------------- */

export type SystemSettings = {
  school_name: string;
  logo_url: string;
  background_url: string;
  primary_color: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  welcome_text: string;
};

/** Valores por defecto: espejo de los defaults de la API (system_settings). */
export const DEFAULT_SETTINGS: SystemSettings = {
  school_name: 'Centro Educativo Nuestra Señora de Guadalupe',
  logo_url: '',
  background_url: '',
  primary_color: '#1f4e79',
  address: 'Calle 12 # 4-56, Barrio Centro, Popayán, Cauca',
  phone: '+57 313 245 8907',
  whatsapp: '573132458907',
  email: 'admisiones@guadalupe.edu.co',
  welcome_text: 'Completa la matrícula de tu hijo o hija en pocos minutos. Un proceso claro, acompañado y seguro.',
};

export function getSettingsQueryKey() { return ['system-settings'] as const; }

export function useGetSettings(): UseQueryResult<SystemSettings> {
  return useQuery({
    queryKey: getSettingsQueryKey(),
    queryFn: () => request<SystemSettings>('/settings'),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: (input: { data: Partial<SystemSettings> }) =>
      request<SystemSettings>('/settings', { method: 'PUT', body: JSON.stringify(input.data) }),
  });
}

