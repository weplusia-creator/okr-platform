import { useState, useEffect, useCallback } from 'react';

interface InfoBarData {
  dolarBlue: { compra: number; venta: number } | null;
  dolarOficial: { compra: number; venta: number } | null;
  riesgoPais: number | null;
  temperatura: number | null;
  loading: boolean;
}

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function useInfoBar(): InfoBarData {
  const [data, setData] = useState<InfoBarData>({
    dolarBlue: null,
    dolarOficial: null,
    riesgoPais: null,
    temperatura: null,
    loading: true,
  });

  const fetchData = useCallback(async () => {
    const results: Partial<InfoBarData> = {};

    // Fetch dollar rates and riesgo pais in parallel
    const [blueRes, oficialRes, riesgoRes] = await Promise.allSettled([
      fetch('https://dolarapi.com/v1/dolares/blue').then((r) => r.json()),
      fetch('https://dolarapi.com/v1/dolares/oficial').then((r) => r.json()),
      fetch('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo').then((r) => r.json()),
    ]);

    if (blueRes.status === 'fulfilled' && blueRes.value) {
      results.dolarBlue = { compra: blueRes.value.compra, venta: blueRes.value.venta };
    }
    if (oficialRes.status === 'fulfilled' && oficialRes.value) {
      results.dolarOficial = { compra: oficialRes.value.compra, venta: oficialRes.value.venta };
    }
    if (riesgoRes.status === 'fulfilled' && riesgoRes.value) {
      results.riesgoPais = riesgoRes.value.valor ?? riesgoRes.value.value ?? null;
    }

    // Geolocation + weather
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          maximumAge: 600000, // Cache 10 min
        });
      });
      const { latitude, longitude } = pos.coords;
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
      );
      const weatherData = await weatherRes.json();
      if (weatherData?.current_weather?.temperature != null) {
        results.temperatura = Math.round(weatherData.current_weather.temperature);
      }
    } catch {
      // Geolocation denied or weather fetch failed - silent
    }

    setData((prev) => ({
      ...prev,
      ...results,
      loading: false,
    }));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return data;
}
