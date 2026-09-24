CREATE TYPE "public"."estado_pago" AS ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REVISION_MANUAL');--> statement-breakpoint
CREATE TYPE "public"."metodo_pago" AS ENUM('PSE', 'TARJETA', 'EFECTIVO', 'CONSIGNACION', 'TRANSFERENCIA');--> statement-breakpoint
CREATE TYPE "public"."rol_admin" AS ENUM('SUPER_ADMIN', 'RECTOR', 'SECRETARIA', 'CONTABILIDAD');--> statement-breakpoint
CREATE TABLE "acudientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre_completo" text NOT NULL,
	"tipo_documento" text NOT NULL,
	"documento_identidad" text NOT NULL,
	"parentesco" text,
	"correo" text NOT NULL,
	"telefono" text NOT NULL,
	"direccion" text,
	"ocupacion" text,
	"fecha_registro" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acudientes_documento_identidad_unique" UNIQUE("documento_identidad")
);
--> statement-breakpoint
CREATE TABLE "estudiantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"acudiente_id" integer NOT NULL,
	"nombre_completo" text NOT NULL,
	"tipo_documento" text NOT NULL,
	"documento_identidad" text NOT NULL,
	"fecha_nacimiento" date NOT NULL,
	"grado_al_que_aspira" text NOT NULL,
	"eps" text NOT NULL,
	"tipo_sangre" text NOT NULL,
	"observaciones_medicas" text,
	"fecha_registro" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estudiantes_documento_identidad_unique" UNIQUE("documento_identidad")
);
--> statement-breakpoint
CREATE TABLE "matriculas" (
	"id" serial PRIMARY KEY NOT NULL,
	"estudiante_id" integer NOT NULL,
	"anio_lectivo" integer NOT NULL,
	"monto_total" numeric(12, 2) NOT NULL,
	"referencia_pago" text NOT NULL,
	"estado_pago" "estado_pago" DEFAULT 'PENDIENTE' NOT NULL,
	"metodo_pago" "metodo_pago",
	"comprobante_url" text,
	"fecha_pago" timestamp with time zone,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_actualizacion" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matriculas_referencia_pago_unique" UNIQUE("referencia_pago")
);
--> statement-breakpoint
CREATE TABLE "transacciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"matricula_id" integer NOT NULL,
	"id_transaccion_pasarela" text NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"estado_pasarela" text NOT NULL,
	"respuesta_raw" jsonb,
	"fecha_transaccion" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transacciones_id_transaccion_pasarela_unique" UNIQUE("id_transaccion_pasarela")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"school_name" text DEFAULT 'Centro Educativo Nuestra Señora de Guadalupe' NOT NULL,
	"logo_url" text,
	"background_url" text,
	"primary_color" text DEFAULT '#1f4e79' NOT NULL,
	"address" text DEFAULT 'Calle 12 # 4-56, Barrio Centro, Popayán, Cauca' NOT NULL,
	"phone" text DEFAULT '+57 313 245 8907' NOT NULL,
	"whatsapp" text DEFAULT '573132458907' NOT NULL,
	"email" text DEFAULT 'admisiones@guadalupe.edu.co' NOT NULL,
	"welcome_text" text DEFAULT 'Completa la matrícula de tu hijo o hija en pocos minutos. Un proceso claro, acompañado y seguro.' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "usuarios_admin" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"correo" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "rol_admin" DEFAULT 'SECRETARIA' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_admin_correo_unique" UNIQUE("correo")
);
--> statement-breakpoint
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_acudiente_id_acudientes_id_fk" FOREIGN KEY ("acudiente_id") REFERENCES "public"."acudientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_estudiante_id_estudiantes_id_fk" FOREIGN KEY ("estudiante_id") REFERENCES "public"."estudiantes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_matricula_id_matriculas_id_fk" FOREIGN KEY ("matricula_id") REFERENCES "public"."matriculas"("id") ON DELETE no action ON UPDATE no action;