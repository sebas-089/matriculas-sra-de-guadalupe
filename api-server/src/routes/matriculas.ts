import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import {
  ConsultMatriculaParams,
  ConsultMatriculaResponse,
  CreateMatriculaBody,
  CreateMatriculaResponse,
  DeleteMatriculaResponse,
  MatriculaDetailParams,
  MatriculaDetailResponse,
  ReceivePaymentWebhookBody,
  ReceivePaymentWebhookResponse,
} from "../schemas/api";
import { eq } from "drizzle-orm";
import {
  acudientesTable,
  db,
  estudiantesTable,
  matriculasTable,
  transaccionesTable,
} from "../db";
import { requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";
import {
  deleteMatriculaById,
  findMatriculaByReferenceOrDocument,
  getMatriculaDetailById,
  toMatriculaView,
} from "../lib/matriculas";

const router: IRouter = Router();

router.post("/matriculas", async (req, res): Promise<void> => {
  const parsed = CreateMatriculaBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid enrollment request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const created = await db.transaction(async (tx) => {
    const [acudiente] = await tx
      .insert(acudientesTable)
      .values({
        nombreCompleto: data.acudiente.nombre_completo,
        tipoDocumento: data.acudiente.tipo_documento,
        documentoIdentidad: data.acudiente.documento_identidad,
        parentesco: data.acudiente.parentesco,
        correo: data.acudiente.correo,
        telefono: data.acudiente.telefono,
        direccion: data.acudiente.direccion,
        ocupacion: data.acudiente.ocupacion,
      })
      .onConflictDoUpdate({
        target: acudientesTable.documentoIdentidad,
        set: {
          nombreCompleto: data.acudiente.nombre_completo,
          parentesco: data.acudiente.parentesco,
          correo: data.acudiente.correo,
          telefono: data.acudiente.telefono,
          direccion: data.acudiente.direccion,
          ocupacion: data.acudiente.ocupacion,
        },
      })
      .returning();

    const [estudiante] = await tx
      .insert(estudiantesTable)
      .values({
        acudienteId: acudiente.id,
        nombreCompleto: data.estudiante.nombre_completo,
        tipoDocumento: data.estudiante.tipo_documento,
        documentoIdentidad: data.estudiante.documento_identidad,
        fechaNacimiento: data.estudiante.fecha_nacimiento.toISOString().slice(0, 10),
        gradoAlQueAspira: data.estudiante.grado_al_que_aspira,
        eps: data.estudiante.eps,
        tipoSangre: data.estudiante.tipo_sangre,
        observacionesMedicas: data.estudiante.observaciones_medicas,
      })
      .onConflictDoUpdate({
        target: estudiantesTable.documentoIdentidad,
        set: {
          acudienteId: acudiente.id,
          nombreCompleto: data.estudiante.nombre_completo,
          tipoDocumento: data.estudiante.tipo_documento,
          fechaNacimiento: data.estudiante.fecha_nacimiento.toISOString().slice(0, 10),
          gradoAlQueAspira: data.estudiante.grado_al_que_aspira,
          eps: data.estudiante.eps,
          tipoSangre: data.estudiante.tipo_sangre,
          observacionesMedicas: data.estudiante.observaciones_medicas,
        },
      })
      .returning();

    const reference = `CENSG-${data.anio_lectivo}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const [matricula] = await tx
      .insert(matriculasTable)
      .values({
        estudianteId: estudiante.id,
        anioLectivo: data.anio_lectivo,
        montoTotal: data.monto_total,
        referenciaPago: reference,
      })
      .returning();

    return {
      matricula,
      estudiante,
      acudiente,
    };
  });

  const response = {
    matricula: toMatriculaView({
      matriculas: created.matricula,
      estudiantes: created.estudiante,
      acudientes: created.acudiente,
    }),
    mensaje: "Solicitud de matrícula creada correctamente.",
  };
  res.status(201).json(CreateMatriculaResponse.parse(response));
});

router.get("/matriculas/consultar/:referencia_o_documento", async (req, res): Promise<void> => {
  const params = ConsultMatriculaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const matricula = await findMatriculaByReferenceOrDocument(params.data.referencia_o_documento);
  if (!matricula) {
    res.status(404).json({ error: "No encontramos una matrícula con ese dato." });
    return;
  }
  res.json(
    ConsultMatriculaResponse.parse({
      matricula,
      acudiente: matricula.nombre_acudiente,
      estudiante: matricula.nombre_estudiante,
    }),
  );
});

router.post("/webhooks/pago", async (req, res): Promise<void> => {
  const parsed = ReceivePaymentWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const processed = await db.transaction(async (tx) => {
    const [matricula] = await tx
      .select()
      .from(matriculasTable)
      .where(eq(matriculasTable.referenciaPago, data.referencia_pago))
      .limit(1);
    if (!matricula) return false;

    const [existing] = await tx
      .select({ id: transaccionesTable.id })
      .from(transaccionesTable)
      .where(eq(transaccionesTable.idTransaccionPasarela, data.id_transaccion_pasarela))
      .limit(1);
    if (existing) return true;

    const state = data.estado_pasarela.toUpperCase();
    const nextStatus = state.includes("APPRO") || state.includes("PAID") || state.includes("SUCCESS")
      ? "APROBADO"
      : state.includes("REJECT") || state.includes("FAIL")
        ? "RECHAZADO"
        : "REVISION_MANUAL";

    await tx.insert(transaccionesTable).values({
      matriculaId: matricula.id,
      idTransaccionPasarela: data.id_transaccion_pasarela,
      monto: data.monto,
      estadoPasarela: data.estado_pasarela,
      respuestaRaw: data.respuesta_raw,
    });
    await tx
      .update(matriculasTable)
      .set({
        estadoPago: nextStatus,
        metodoPago: data.metodo_pago,
        fechaPago: nextStatus === "APROBADO" ? new Date() : undefined,
        fechaActualizacion: new Date(),
      })
      .where(eq(matriculasTable.id, matricula.id));
    return true;
  });

  res.json(
    ReceivePaymentWebhookResponse.parse({
      procesado: processed,
      referencia_pago: data.referencia_pago,
    }),
  );
});

/**
 * Detalle y eliminación por id.
 *
 * Se exponen también bajo `/matriculas/:id` (protegidas con el token de
 * administración) para que el contrato `DELETE /api/matriculas/:id` funcione
 * igual que la ruta canónica `/api/admin/matriculas/:id`.
 */
router.get("/matriculas/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = MatriculaDetailParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Identificador de matrícula inválido." }); return; }

  const detail = await getMatriculaDetailById(params.data.id);
  if (!detail) { res.status(404).json({ error: "Matrícula no encontrada." }); return; }

  res.json(MatriculaDetailResponse.parse(detail));
});

router.delete("/matriculas/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = MatriculaDetailParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Identificador de matrícula inválido." }); return; }

  const eliminada = await deleteMatriculaById(params.data.id);
  if (!eliminada) { res.status(404).json({ error: "Matrícula no encontrada." }); return; }

  req.log.info({ id: params.data.id, admin: (req as AuthenticatedRequest).admin?.correo }, "Matrícula eliminada");
  res.json(DeleteMatriculaResponse.parse({
    eliminada: true,
    id: params.data.id,
    mensaje: "La matrícula fue eliminada correctamente.",
  }));
});

export default router;