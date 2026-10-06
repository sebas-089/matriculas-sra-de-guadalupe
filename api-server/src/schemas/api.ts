/**
 * Contratos de validación de la API (equivalente a `@workspace/api-zod`, ahora
 * local al proyecto para que el despliegue no dependa del monorepo de Replit).
 *
 * Se usa la API estable de Zod 3 (`z.string()`, `z.coerce`, …) disponible en
 * zod >= 3.25, por lo que funciona igual en Node y en las funciones de Vercel.
 */
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Tipos compartidos                                                          */
/* -------------------------------------------------------------------------- */

export const PaymentStatusSchema = z.enum(["PENDIENTE", "APROBADO", "RECHAZADO", "REVISION_MANUAL"]);
export const PaymentMethodSchema = z.enum(["PSE", "TARJETA", "EFECTIVO", "CONSIGNACION", "TRANSFERENCIA"]);
export const AdminRoleSchema = z.enum(["SUPER_ADMIN", "RECTOR", "SECRETARIA", "CONTABILIDAD"]);
export const StudentGradeSchema = z.enum(["Pre jardín", "Jardín", "Transición", "Primero (1°)", "Cuarto (4°)", "Quinto (5°)"]);

export const MatriculaSchema = z.object({
  id: z.number().int(),
  nombre_estudiante: z.string(),
  documento_estudiante: z.string().optional(),
  nombre_acudiente: z.string().optional(),
  correo_acudiente: z.string().email().optional(),
  grado: z.string(),
  anio_lectivo: z.number().int(),
  monto_total: z.number(),
  referencia_pago: z.string(),
  estado_pago: PaymentStatusSchema,
  metodo_pago: z.union([PaymentMethodSchema, z.null()]).optional(),
  fecha_pago: z.coerce.date().nullish(),
  fecha_creacion: z.coerce.date(),
});

/* -------------------------------------------------------------------------- */
/* Health                                                                     */
/* -------------------------------------------------------------------------- */

export const HealthCheckResponse = z.object({ status: z.string() });

/* -------------------------------------------------------------------------- */
/* Matrículas                                                                 */
/* -------------------------------------------------------------------------- */

export const CreateMatriculaBody = z.object({
  acudiente: z.object({
    nombre_completo: z.string().min(3),
    tipo_documento: z.enum(["CC", "CE", "TI", "PEP", "PAS"]),
    documento_identidad: z.string().min(4),
    parentesco: z.string().trim().max(60).optional(),
    correo: z.string().email(),
    telefono: z.string().min(7),
    direccion: z.string().optional(),
    ocupacion: z.string().optional(),
  }),
  estudiante: z.object({
    nombre_completo: z.string().min(3),
    tipo_documento: z.enum(["RC", "TI", "CC", "CE"]),
    documento_identidad: z.string().min(4),
    fecha_nacimiento: z.coerce.date(),
    grado_al_que_aspira: StudentGradeSchema,
    eps: z.string(),
    tipo_sangre: z.enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]),
    observaciones_medicas: z.string().optional(),
  }),
  anio_lectivo: z.number().int().min(2024),
  monto_total: z.number().min(0).default(850000),
});

export const CreateMatriculaResponse = z.object({
  matricula: MatriculaSchema,
  mensaje: z.string(),
});

export const ConsultMatriculaParams = z.object({
  referencia_o_documento: z.coerce.string(),
});

export const ConsultMatriculaResponse = z.object({
  matricula: MatriculaSchema,
  acudiente: z.string().optional(),
  estudiante: z.string().optional(),
});

export const ReceivePaymentWebhookBody = z.object({
  referencia_pago: z.string(),
  id_transaccion_pasarela: z.string(),
  estado_pasarela: z.string(),
  monto: z.number(),
  respuesta_raw: z.record(z.string(), z.unknown()).optional(),
  metodo_pago: PaymentMethodSchema.optional(),
});

export const ReceivePaymentWebhookResponse = z.object({
  procesado: z.boolean(),
  referencia_pago: z.string().optional(),
});

/* -------------------------------------------------------------------------- */
/* Administración                                                              */
/* -------------------------------------------------------------------------- */

export const AdminLoginBody = z.object({ password: z.string().min(8) });

export const AdminLoginResponse = z.object({
  token: z.string(),
  usuario: z.object({
    id: z.number().int(),
    nombre: z.string(),
    correo: z.string().email(),
    rol: AdminRoleSchema,
  }),
});

export const GetDashboardStatsResponse = z.object({
  total_recaudado: z.number(),
  total_matriculas: z.number().int(),
  aprobadas: z.number().int(),
  pendientes: z.number().int(),
  revision_manual: z.number().int(),
  rechazadas: z.number().int(),
  por_grado: z
    .array(
      z.object({
        grado: z.string(),
        cantidad: z.number().int(),
      }),
    )
    .optional(),
});

export const ListAdminMatriculasQueryParams = z.object({
  estado: PaymentStatusSchema.optional(),
  grado: z.coerce.string().optional(),
  busqueda: z.coerce.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ListAdminMatriculasResponse = z.object({
  matriculas: z.array(MatriculaSchema),
  total: z.number().int(),
});

export const ApproveMatriculaManualParams = z.object({ id: z.coerce.number().int() });

export const ApproveMatriculaManualBody = z.object({
  metodo_pago: PaymentMethodSchema.optional(),
  observacion: z.string().optional(),
});

export const ApproveMatriculaManualResponse = MatriculaSchema;

/* -------------------------------------------------------------------------- */
/* Detalle completo de una matrícula y eliminación                             */
/* -------------------------------------------------------------------------- */

export const MatriculaDetailParams = z.object({ id: z.coerce.number().int() });

const EstudianteDetailSchema = z.object({
  id: z.number().int(),
  nombre_completo: z.string(),
  tipo_documento: z.string(),
  documento_identidad: z.string(),
  fecha_nacimiento: z.string(),
  grado_al_que_aspira: z.string(),
  eps: z.string().nullable(),
  tipo_sangre: z.string().nullable(),
  observaciones_medicas: z.string().nullable(),
  fecha_registro: z.coerce.date(),
});

const AcudienteDetailSchema = z.object({
  id: z.number().int(),
  nombre_completo: z.string(),
  tipo_documento: z.string(),
  documento_identidad: z.string(),
  parentesco: z.string().nullable(),
  correo: z.string(),
  telefono: z.string(),
  direccion: z.string().nullable(),
  ocupacion: z.string().nullable(),
  fecha_registro: z.coerce.date(),
});

const TransaccionDetailSchema = z.object({
  id: z.number().int(),
  id_transaccion_pasarela: z.string(),
  monto: z.number(),
  estado_pasarela: z.string(),
  fecha_transaccion: z.coerce.date(),
});

export const MatriculaDetailResponse = z.object({
  id: z.number().int(),
  anio_lectivo: z.number().int(),
  monto_total: z.number(),
  referencia_pago: z.string(),
  estado_pago: PaymentStatusSchema,
  metodo_pago: z.union([PaymentMethodSchema, z.null()]),
  comprobante_url: z.string().nullable(),
  fecha_pago: z.coerce.date().nullable(),
  fecha_creacion: z.coerce.date(),
  fecha_actualizacion: z.coerce.date(),
  estudiante: EstudianteDetailSchema,
  acudiente: AcudienteDetailSchema,
  transacciones: z.array(TransaccionDetailSchema),
});

export const DeleteMatriculaResponse = z.object({
  eliminada: z.boolean(),
  id: z.number().int(),
  mensaje: z.string(),
});

/* -------------------------------------------------------------------------- */
/* Exportación CSV                                                             */
/* -------------------------------------------------------------------------- */

export const ExportAdminMatriculasQueryParams = z.object({
  estado: PaymentStatusSchema.optional(),
  grado: z.coerce.string().optional(),
  busqueda: z.coerce.string().optional(),
});

export const ExportAdminMatriculasResponse = z.string();

/* -------------------------------------------------------------------------- */
/* Configuración de la institución (system_settings)                           */
/* -------------------------------------------------------------------------- */

const optionalImageUrl = z
  .string()
  .trim()
  .max(4_000_000)
  .refine(
    (value) => value === "" || /^(https?:\/\/|data:image\/|\/)/i.test(value),
    "Debe ser una URL http(s), una imagen en base64 (data:image/...) o una ruta que empiece por '/'.",
  );

export const HexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Usa un color hexadecimal, por ejemplo #1f4e79");

export const UpdateSettingsBody = z.object({
  school_name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(160).optional(),
  logo_url: optionalImageUrl.optional(),
  background_url: optionalImageUrl.optional(),
  primary_color: HexColorSchema.optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z
    .string()
    .trim()
    .max(40)
    .refine(
      (value) => value === "" || /^[+0-9()\s-]{7,40}$/.test(value),
      "Usa únicamente números, espacios, guiones y el signo +.",
    )
    .optional(),
  email: z
    .string()
    .trim()
    .max(160)
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Correo electrónico inválido.",
    )
    .optional(),
  welcome_text: z.string().trim().max(600).optional(),
});

export const GetSettingsResponse = z.object({
  school_name: z.string(),
  logo_url: z.string(),
  background_url: z.string(),
  primary_color: z.string(),
  address: z.string(),
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string(),
  welcome_text: z.string(),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsBody>;
export type SettingsResponse = z.infer<typeof GetSettingsResponse>;
