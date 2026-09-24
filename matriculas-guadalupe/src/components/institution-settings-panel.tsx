import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  RotateCcw,
  Save,
} from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  getSettingsQueryKey,
  useUpdateSettings,
  type SystemSettings,
} from '@/lib/api';
import { useSettings } from '@/components/settings-provider';
import { isLightColor, normalizeHex } from '@/lib/color';

const inputClass =
  'focus-ring glass-control h-11 w-full rounded-lg border px-3.5 text-sm font-medium outline-none transition-ui focus:border-[hsl(var(--primary))]';
const labelClass = 'grid gap-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))]';
const MAX_INLINE_IMAGE_BYTES = 400 * 1024;

function initials(name: string) {
  return (name || 'Institución')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      {children}
      {hint && <span className="text-[11px] font-normal text-[hsl(var(--muted-foreground))]">{hint}</span>}
    </label>
  );
}

function Card({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel overflow-hidden">
      <div className="flex items-start gap-3 border-b p-5 sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-xl">{title}</h2>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default function InstitutionSettingsPanel() {
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const update = useUpdateSettings();
  const [form, setForm] = useState<SystemSettings>(settings);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const setField = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4200);
  };

  const readImage = (key: 'logo_url' | 'background_url') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      setError('La imagen supera los 400 KB. Usa una URL pública o una imagen más liviana.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setField(key, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    update.mutate(
      { data: form },
      {
        onSuccess: (saved) => {
          setForm(saved);
          void queryClient.invalidateQueries({ queryKey: getSettingsQueryKey() });
          flash('Configuración guardada. El sitio público ya muestra los cambios.');
        },
        onError: (mutationError) =>
          setError(mutationError instanceof Error ? mutationError.message : 'No fue posible guardar la configuración.'),
      },
    );
  };

  const restoreDefaults = () => {
    setForm({ ...DEFAULT_SETTINGS });
    setError('');
    setMessage('');
  };

  const colorPreview = normalizeHex(form.primary_color) ?? '#1f4e79';

  return (
    <form onSubmit={save} className="grid gap-6" data-testid="form-institution-settings">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="label-caps text-[hsl(var(--primary))]">Personalización institucional</p>
          <h1 className="mt-3 font-display text-4xl tracking-[-.04em] sm:text-5xl">Configuración de la Institución</h1>
          <p className="mt-3 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
            Logo, apariencia y datos de contacto. Se guardan en Neon Postgres y la pantalla pública los lee en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={restoreDefaults}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border bg-[hsl(var(--card))] px-4 py-2.5 text-sm font-bold transition-ui hover:border-[hsl(var(--primary))]"
            data-testid="button-restore-settings"
          >
            <RotateCcw size={16} /> Valores por defecto
          </button>
          <button
            type="submit"
            disabled={update.isPending}
            className="focus-ring interactive-button inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-ui disabled:cursor-wait disabled:opacity-60"
            data-testid="button-save-settings"
          >
            <Save size={17} /> {update.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className="flex items-center gap-3 rounded-lg border border-[hsl(var(--primary)/.25)] bg-[hsl(var(--primary)/.07)] px-4 py-3 text-sm font-bold text-[hsl(var(--primary))]"
          data-testid="alert-settings-success"
        >
          <Save size={18} /> {message}
        </div>
      )}
      {error && (
        <div
          className="rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.06)] px-4 py-3 text-sm font-bold text-[hsl(var(--destructive))]"
          data-testid="alert-settings-error"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <div className="grid gap-6">
          <Card
            icon={<ImageIcon size={19} />}
            title="Logo del colegio"
            description="Emblema que aparece en el encabezado del sitio público y de la consola."
          >
            <Field
              label="URL del logo"
              hint="Acepta https://, una ruta local (/logo.png) o una imagen cargada desde tu equipo (máximo 400 KB)."
            >
              <input
                className={inputClass}
                value={form.logo_url}
                onChange={(event) => setField('logo_url', event.target.value)}
                placeholder="https://misitio.com/logo.png"
                data-testid="input-logo-url"
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={readImage('logo_url')}
                className="focus-ring text-xs font-semibold"
                data-testid="input-logo-file"
              />
              {form.logo_url && (
                <button
                  type="button"
                  onClick={() => setField('logo_url', '')}
                  className="focus-ring rounded-lg border px-3 py-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-ui hover:border-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
                  data-testid="button-clear-logo"
                >
                  Quitar logo
                </button>
              )}
            </div>
          </Card>

          <Card
            icon={<Palette size={19} />}
            title="Apariencia y fondo"
            description="Imagen de fondo de la pantalla pública y color principal de la plataforma."
          >
            <Field
              label="URL de la imagen de fondo"
              hint="Se aplica como fondo del sitio completo. Si se deja vacío se usa el degradado institucional."
            >
              <input
                className={inputClass}
                value={form.background_url}
                onChange={(event) => setField('background_url', event.target.value)}
                placeholder="https://misitio.com/fondo.jpg"
                data-testid="input-background-url"
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={readImage('background_url')}
                className="focus-ring text-xs font-semibold"
                data-testid="input-background-file"
              />
              {form.background_url && (
                <button
                  type="button"
                  onClick={() => setField('background_url', '')}
                  className="focus-ring rounded-lg border px-3 py-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))] transition-ui hover:border-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))]"
                  data-testid="button-clear-background"
                >
                  Quitar fondo
                </button>
              )}
            </div>
            <Field label="Color principal" hint="Se usa en botones, encabezados y acentos del tema.">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={colorPreview}
                  onChange={(event) => setField('primary_color', event.target.value)}
                  className="focus-ring h-11 w-16 cursor-pointer rounded-lg border bg-transparent p-1"
                  data-testid="input-primary-color"
                />
                <input
                  className={`${inputClass} max-w-[10rem] font-data uppercase`}
                  value={form.primary_color}
                  onChange={(event) => setField('primary_color', event.target.value)}
                  placeholder="#1f4e79"
                  data-testid="input-primary-color-hex"
                />
                <div className="flex items-center gap-2">
                  {['#1f4e79', '#0f766e', '#7c2d12', '#4c1d95', '#b91c1c'].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setField('primary_color', preset)}
                      title={preset}
                      style={{ backgroundColor: preset }}
                      className="size-7 rounded-full border transition-ui hover:scale-110"
                      data-testid={`button-color-preset-${preset.replace('#', '')}`}
                    />
                  ))}
                </div>
              </div>
            </Field>
          </Card>

          <Card
            icon={<Building2 size={19} />}
            title="Información institucional"
            description="Datos que se muestran en el sitio público, su pie de página y la consola."
          >
            <Field label="Nombre del colegio o institución">
              <input
                className={inputClass}
                value={form.school_name}
                onChange={(event) => setField('school_name', event.target.value)}
                placeholder="Centro Educativo Nuestra Señora de Guadalupe"
                data-testid="input-school-name"
              />
            </Field>
            <Field label="Texto de bienvenida" hint="Aparece en la portada pública del proceso de matrícula.">
              <textarea
                className={`${inputClass} h-28 resize-none py-3`}
                value={form.welcome_text}
                maxLength={600}
                onChange={(event) => setField('welcome_text', event.target.value)}
                data-testid="input-welcome-text"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dirección">
                <input
                  className={inputClass}
                  value={form.address}
                  onChange={(event) => setField('address', event.target.value)}
                  data-testid="input-address"
                />
              </Field>
              <Field label="Teléfono de contacto">
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                  data-testid="input-phone"
                />
              </Field>
              <Field label="WhatsApp" hint="Solo números con indicativo del país (ej. 573132458907).">
                <input
                  className={`${inputClass} font-data`}
                  value={form.whatsapp}
                  onChange={(event) => setField('whatsapp', event.target.value)}
                  data-testid="input-whatsapp"
                />
              </Field>
              <Field label="Correo electrónico">
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(event) => setField('email', event.target.value)}
                  data-testid="input-email"
                />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="grid gap-4 self-start xl:sticky xl:top-6">
          <section className="glass-panel p-5">
            <p className="label-caps text-[hsl(var(--muted-foreground))]">Vista previa</p>
            <div className="mt-4 flex items-center gap-3">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo institucional" className="size-12 rounded-full border object-cover" />
              ) : (
                <span className="grid size-12 place-items-center rounded-full bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--secondary-foreground))]">
                  {initials(form.school_name)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold">{form.school_name || 'Institución educativa'}</p>
                <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{form.email || 'Sin correo registrado'}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="inline-flex items-center gap-2"><MapPin size={14} /> {form.address || 'Sin dirección'}</span>
              <span className="inline-flex items-center gap-2"><Phone size={14} /> {form.phone || 'Sin teléfono'}</span>
              <span className="inline-flex items-center gap-2"><MessageCircle size={14} /> {form.whatsapp || 'Sin WhatsApp'}</span>
              <span className="inline-flex items-center gap-2"><Mail size={14} /> {form.email || 'Sin correo'}</span>
            </div>
            <div
              className="mt-5 rounded-xl px-4 py-3 text-sm font-bold"
              style={{ backgroundColor: colorPreview, color: isLightColor(colorPreview) ? '#1f2937' : '#ffffff' }}
            >
              Así se verá el color principal
            </div>
          </section>
          <section className="glass-panel p-5">
            <p className="label-caps text-[hsl(var(--muted-foreground))]">Fondo de la pantalla pública</p>
            <div
              className="mt-4 h-32 rounded-xl border bg-[hsl(var(--muted))] bg-cover bg-center"
              style={form.background_url ? { backgroundImage: `url("${form.background_url}")` } : undefined}
            />
            {!form.background_url && (
              <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">Sin imagen: se usa el degradado institucional.</p>
            )}
          </section>
        </aside>
      </div>
    </form>
  );
}




