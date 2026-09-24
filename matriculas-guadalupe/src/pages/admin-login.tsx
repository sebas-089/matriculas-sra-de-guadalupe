import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAdminLogin } from '@/lib/api';
import { BrandMark } from '@/components/brand';
import { useSettings } from '@/components/settings-provider';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const login = useAdminLogin();
  const { settings } = useSettings();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    login.mutate({ data: { password } }, {
      onSuccess: (result) => {
        localStorage.setItem('guadalupe_token', result.token);
        localStorage.setItem('guadalupe_user', JSON.stringify(result.usuario));
        setLocation('/admin/dashboard');
      },
      onError: () => setError('No pudimos validar la contraseña. Inténtalo nuevamente.'),
    });
  };

  return (
    <div className="grain min-h-[100dvh] bg-[hsl(var(--sidebar))]">
      <div className="grid min-h-[100dvh] lg:grid-cols-[.85fr_1.15fr]">
        <aside className="relative hidden overflow-hidden p-10 text-[hsl(var(--sidebar-foreground))] lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-32 top-20 size-96 rounded-full border-[64px] border-[hsl(var(--accent)/.12)]" />
          <div className="absolute -bottom-40 -left-28 size-[32rem] rounded-full border-[70px] border-[hsl(var(--sidebar-foreground)/.05)]" />
          <BrandMark />
          <div className="relative max-w-md pb-8">
            <p className="label-caps text-[hsl(var(--accent))]">Consola institucional</p>
            <h1 className="mt-5 font-display text-6xl leading-[.98] tracking-[-.04em]">Orden para cuidar mejor.</h1>
            <p className="mt-6 max-w-sm leading-7 opacity-70">Una vista precisa para que cada familia reciba respuestas a tiempo.</p>
          </div>
          <div className="relative flex items-center gap-3 text-xs opacity-60"><ShieldCheck size={15} /> Acceso protegido · {settings.school_name}</div>
        </aside>
        <main className="flex items-center justify-center bg-[hsl(var(--background))] px-5 py-10 sm:px-10">
          <div className="w-full max-w-md animate-rise-in">
            <div className="mb-10 flex items-center justify-between lg:hidden"><BrandMark /><Link href="/" className="focus-ring text-sm font-bold text-[hsl(var(--muted-foreground))]" data-testid="link-mobile-home">Volver al sitio</Link></div>
            <div className="glass-panel p-6 sm:p-8">
              <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-[hsl(var(--accent)/.25)] text-[hsl(var(--foreground))]"><KeyRound size={22} /></div>
              <p className="label-caps text-[hsl(var(--primary))]">Área reservada</p>
              <h2 className="mt-3 font-display text-4xl tracking-[-.03em]">Bienvenido de vuelta.</h2>
              <p className="mt-3 leading-6 text-[hsl(var(--muted-foreground))]">Ingresa con la contraseña institucional para gestionar matrículas y pagos.</p>
              {error && <div className="mt-5 rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.07)] px-4 py-3 text-sm font-semibold text-[hsl(var(--destructive))]" data-testid="alert-login-error">{error}</div>}
              <form onSubmit={submit} className="mt-6 grid gap-5" data-testid="form-admin-login">
                <label className="grid gap-2 text-sm font-bold">Contraseña<div className="relative"><input required autoComplete="current-password" minLength={8} type={visible ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="focus-ring glass-control h-12 w-full rounded-lg border px-3.5 pr-12 font-medium outline-none transition-ui focus:border-[hsl(var(--primary))]" placeholder="Ingresa la contraseña institucional" data-testid="input-admin-password" /><button type="button" onClick={() => setVisible((value) => !value)} className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="button-toggle-password">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
                <div className="flex items-center gap-3 rounded-lg bg-[hsl(var(--muted)/.55)] p-3.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]"><LockKeyhole size={16} className="shrink-0 text-[hsl(var(--primary))]" /> No compartas esta contraseña ni la ingreses desde enlaces recibidos por correo.</div>
                <button type="submit" disabled={login.isPending} className="focus-ring interactive-button inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))] transition-ui disabled:cursor-wait disabled:opacity-60" data-testid="button-admin-login">{login.isPending ? 'Verificando acceso…' : 'Ingresar a la consola'} <ArrowRight size={17} /></button>
              </form>
              <Link href="/" className="focus-ring mt-8 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--muted-foreground))] transition-ui hover:text-[hsl(var(--foreground))]" data-testid="link-login-home"><ArrowLeft size={16} /> Regresar al sitio público</Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}