/* eslint-disable max-lines */
import ApexCharts from 'apexcharts';

console.log('[porcentaje-radio] script loaded ✅');

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

function parseNumeric(raw: unknown): number | null {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function normalizePercent(raw: number): number {
  // Si raw está entre 0 y 1, no lo multiplicamos por 100 (lo dejamos tal cual)
  if (raw >= 0 && raw <= 1) return clamp(raw); // No multiplicamos por 100

  // Si ya es mayor que 1, lo tratamos como porcentaje completo
  return clamp(raw);
}


function waitForElement(selector: string, timeoutMs = 8000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const existing = document.querySelector(selector) as HTMLElement | null;
    if (existing) return resolve(existing);

    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        obs.disconnect();
        resolve(el);
      } else if (Date.now() - start > timeoutMs) {
        obs.disconnect();
        resolve(null);
      }
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });
  });
}

async function initPorcentajeRadioChart() {
  console.log('[porcentaje-radio] init called');

  if (document.readyState === 'loading') {
    await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
  }

  const el = await waitForElement('#porcentaje-radio', 8000);
  if (!el) {
    console.warn('[porcentaje-radio] No apareció #porcentaje-radio en 8s');
    return;
  }

  const empresaId = el.dataset.empresaId || el.getAttribute('data-empresa-id');
  const rawPct = el.dataset.porcentaje || el.getAttribute('data-porcentaje');

  console.log('[porcentaje-radio] data-empresa-id:', empresaId);
  console.log('[porcentaje-radio] data-porcentaje:', rawPct);

  const n = parseNumeric(rawPct);
  const porcentaje = n === null ? 0 : normalizePercent(n);

  const options = {
    series: [0],
    colors: ['#8c681d'],
    chart: {
      type: 'radialBar',
      height: 200,
      fontFamily: 'Inter, sans-serif',
      foreColor: '#fffff',
      toolbar: { show: false },
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { margin: 0, size: '70%', background: 'transparent' },
        track: { background: '#F3F4F6', strokeWidth: '100%', margin: 0 },
        dataLabels: {
          show: true,
          name: { show: false },
          value: {
            show: true,
            fontSize: '22px',
            fontWeight: 'bold',
            offsetY: 5,
            color: '#ffffff',
            formatter: function (val: number) {
              return val + '%';
            },
          },
        },
      },
    },
    stroke: { lineCap: 'round' },
    labels: ['Progreso'],
    tooltip: {
      enabled: true,
      fillSeriesColor: false,
      theme: 'light',
      style: { fontSize: '14px', fontFamily: 'Inter, sans-serif' },
      y: {
        formatter: function (val: number) {
          if (val >= 80) return `${val}% completado - Casi listo`;
          if (val >= 60) return `${val}% - Vamos por buen camino`;
          if (val >= 40) return `${val}% - Continúa así`;
          return `${val}% - Sigue adelante`;
        },
      },
    },
  };

  const chart = new ApexCharts(el, options);
  await chart.render();

  console.log('[porcentaje-radio] porcentaje final:', porcentaje);
  chart.updateSeries([porcentaje], true);
}

initPorcentajeRadioChart();
document.addEventListener('astro:page-load', () => initPorcentajeRadioChart());
