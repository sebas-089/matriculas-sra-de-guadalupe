import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, useGetSettings, type SystemSettings } from '@/lib/api';
import { hexToHslTriplet, isLightColor } from '@/lib/color';

type SettingsContextValue = {
  settings: SystemSettings;
  isLoading: boolean;
  refetch: () => void;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: { ...DEFAULT_SETTINGS },
  isLoading: false,
  refetch: () => undefined,
});

/**
 * Carga la configuración institucional desde `/api/settings` y aplica en vivo
 * el color principal, el texto sobre el color principal y la imagen de fondo.
 * Cualquier componente puede leerla con `useSettings()`.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const query = useGetSettings();
  const settings = query.data ?? DEFAULT_SETTINGS;

  useEffect(() => {
    const root = document.documentElement;
    const triplet = hexToHslTriplet(settings.primary_color);

    if (triplet) {
      root.style.setProperty('--primary', triplet);
      root.style.setProperty('--ring', triplet);
      root.style.setProperty('--primary-foreground', isLightColor(settings.primary_color) ? '215 35% 18%' : '0 0% 100%');
    }

    if (settings.background_url) {
      root.style.setProperty('--app-background-image', `url("${settings.background_url}")`);
    } else {
      root.style.removeProperty('--app-background-image');
    }

    if (settings.school_name) {
      document.title = `Matrículas · ${settings.school_name}`;
    }
  }, [settings.primary_color, settings.background_url, settings.school_name]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isLoading: query.isLoading,
      refetch: () => {
        void query.refetch();
      },
    }),
    [settings, query.isLoading, query.refetch],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
