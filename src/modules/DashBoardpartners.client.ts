/* eslint-disable max-lines */

import ApexCharts from "apexcharts";

async function fetchChartData(params: Record<string, string> = {}) {
  const url = new URL("/api/charts/cantidad-partners", window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "No se pudieron cargar los datos");
  // Debe devolver { categories: string[], series: number[] }
  return json as { categories: string[]; series: number[] };
}

const getMainChartOptions = (categories: string[], seriesData: number[]) => {
  let mainChartColors: any = {};
  if (document.documentElement.classList.contains("dark")) {
    mainChartColors = { borderColor: "#374151", labelColor: "#9CA3AF", opacityFrom: 0, opacityTo: 0.15 };
  } else {
    mainChartColors = { borderColor: "#F3F4F6", labelColor: "#6B7280", opacityFrom: 0.45, opacityTo: 0 };
  }

  return {
    chart: { height: 420, type: "area", fontFamily: "Inter, sans-serif", foreColor: mainChartColors.labelColor, toolbar: { show: false } },
    fill: { type: "gradient", gradient: { enabled: true, opacityFrom: mainChartColors.opacityFrom, opacityTo: mainChartColors.opacityTo } },
    dataLabels: { enabled: false },
    tooltip: { style: { fontSize: "14px", fontFamily: "Inter, sans-serif" } },
    grid: { show: true, borderColor: mainChartColors.borderColor, strokeDashArray: 1, padding: { left: 35, bottom: 15 } },
    series: [{ name: "Referidos por día", data: seriesData, color: "#1A56DB" }],
    markers: { size: 5, strokeColors: "#ffffff", hover: { sizeOffset: 3 } },
    xaxis: {
      categories,
      labels: { style: { colors: [mainChartColors.labelColor], fontSize: "14px", fontWeight: 500 } },
      axisBorder: { color: mainChartColors.borderColor },
      axisTicks: { color: mainChartColors.borderColor },
      crosshairs: { show: true, position: "back", stroke: { color: mainChartColors.borderColor, width: 1, dashArray: 10 } },
    },
    yaxis: {
      labels: {
        style: { colors: [mainChartColors.labelColor], fontSize: "14px", fontWeight: 500 },
        formatter(v: number) { return `${v}`; },
      },
    },
    legend: { fontSize: "14px", fontWeight: 500, fontFamily: "Inter, sans-serif", labels: { colors: [mainChartColors.labelColor] }, itemMargin: { horizontal: 10 } },
    responsive: [{ breakpoint: 1024, options: { xaxis: { labels: { show: false } } } }],
  };
};

let chart: ApexCharts | null = null;

async function initMainChart() {
  const el = document.getElementById("main-chart");
  if (!el) return;

  // estado de carga
  el.innerHTML = '<div style="padding:1rem;color:#6B7280;">Cargando…</div>';

  try {
    const { categories, series } = await fetchChartData(); // { from, to } si quieres
    const cats = categories?.length ? categories : ["Sin datos"];
    const data = series?.length ? series : [0];

    // ¡LIMPIA el contenedor antes de renderizar!
    el.innerHTML = "";

    chart = new ApexCharts(el, getMainChartOptions(cats, data));
    await chart.render();

    // re-theme sin reconstruir
    document.addEventListener("dark-mode", () => {
      if (chart) chart.updateOptions(getMainChartOptions(cats, data));
    });
  } catch (e) {
    console.error(e);
    el.innerHTML = '<div style="padding:1rem;color:#DC2626;">No se pudo cargar el gráfico.</div>';
  }
}

document.addEventListener("DOMContentLoaded", initMainChart);


