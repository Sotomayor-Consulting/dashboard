/* eslint-disable max-lines */

import ApexCharts from 'apexcharts';
import { supabase } from '@lib/supabase';

async function fetchOdooData(params: Record<string, string> = {}) {
	const url = new URL('/api/charts/odooParners', window.location.origin);
	Object.entries(params).forEach(([k, v]) =>
		url.searchParams.set(k, String(v)),
	);
	const res = await fetch(url.toString(), { credentials: 'same-origin' });
	const json = await res.json();
	if (!res.ok)
		throw new Error(json?.error || 'No se pudieron cargar los datos de Odoo');
	return json as { categories: string[]; series: number[] };
}

async function fetchSupabaseData() {
	// Obtener usuario actual de Supabase
	const { data: { user } } = await supabase.auth.getUser();
	
	if (!user) throw new Error('Usuario no autenticado');

	// Consultar referidos filtrando por partner_id y agrupando por fecha
	const { data: referidos, error } = await supabase
		.from('referidos')
		.select('created_at, partner_id')
		.eq('partner_id', user.id);

	if (error) throw new Error(error.message);

	// Agrupar por fecha y contar cantidad
	const groupedByDate: Record<string, number> = referidos?.reduce((acc: Record<string, number>, item: any) => {
		const date = new Date(item.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
		if (date) {
			acc[date] = (acc[date] || 0) + 1;
		}
		return acc;
	}, {} as Record<string, number>) || {};

	// Convertir a arrays para el gráfico
	const categories = Object.keys(groupedByDate).sort();
	const series = Object.values(groupedByDate);

	return { categories, series };
}

async function fetchChartData(params: Record<string, string> = {}) {
	const [odooData, supabaseData] = await Promise.all([
		fetchOdooData(params),
		fetchSupabaseData()
	]);

	// Combinar fechas únicas de ambas fuentes
	const allCategories = [...new Set([...odooData.categories, ...supabaseData.categories])].sort();
	
	// Opción 1: Datasets separados (actual)
	/*const combinedSeries = [
		{
			name: 'Datos Odoo',
			data: allCategories.map(cat => [
				new Date(cat).getTime(), 
				odooData.series[odooData.categories.indexOf(cat)] || 0
			]),
			color: '#1A56DB'
		},
		{
			name: 'Datos Supabase', 
			data: allCategories.map(cat => [
				new Date(cat).getTime(),
				supabaseData.series[supabaseData.categories.indexOf(cat)] || 0
			]),
			color: '#10B981'
		}
	];*/

	// Opción 2: Combinados (comentado - descomentar para usar)
	
	const combinedSeries = [
		{
			name: 'Total Referidos',
			data: allCategories.map(cat => {
				const odooValue = odooData.series[odooData.categories.indexOf(cat)] || 0;
				const supabaseValue = supabaseData.series[supabaseData.categories.indexOf(cat)] || 0;
				return [new Date(cat).getTime(), odooValue + supabaseValue];
			}),
			color: '#0059FF'
		}
	];
	

	return { categories: allCategories, series: combinedSeries };
}

const getMainChartOptions = (seriesData: any[]) => {
	let mainChartColors: any = {};
	if (document.documentElement.classList.contains('dark')) {
		mainChartColors = {
			borderColor: '#374151',
			labelColor: '#9CA3AF',
		};
	} else {
		mainChartColors = {
			borderColor: '#F3F4F6',
			labelColor: '#6B7280',
		};
	}

	return {
		chart: {
			height: 420,
			type: 'bar',
			fontFamily: 'Inter, sans-serif',
			foreColor: mainChartColors.labelColor,
			toolbar: { show: false },
		},
		plotOptions: {
			bar: {
				borderRadius: 4,
				horizontal: false,
				columnWidth: '70%',
				dataLabels: {
					position: 'top',
				},
			},
		},
		dataLabels: {
			enabled: true,
			offsetY: -20,
			style: {
				fontSize: '12px',
				colors: [mainChartColors.labelColor],
			},
			formatter: function (val: number) {
				return val.toString();
			},
		},
		tooltip: { 
			style: { fontSize: '14px', fontFamily: 'Inter, sans-serif' },
			x: {
				format: 'dd MMM yyyy'
			},
			y: {
				formatter: function (val: number) {
					return `${val} referidos`;
				},
			},
		},
		grid: {
			show: true,
			borderColor: mainChartColors.borderColor,
			strokeDashArray: 1,
			padding: { left: 35, bottom: 15 },
		},
		series: seriesData,
		xaxis: {
			type: 'datetime',
			labels: {
				style: {
					colors: [mainChartColors.labelColor],
					fontSize: '14px',
					fontWeight: 500,
				},
				datetimeFormatter: {
					year: 'yyyy',
					month: 'MMM yyyy',
					day: 'dd MMM',
					hour: 'HH:mm'
				}
			},
			axisBorder: { color: mainChartColors.borderColor },
			axisTicks: { color: mainChartColors.borderColor },
		},
		yaxis: {
			labels: {
				style: {
					colors: [mainChartColors.labelColor],
					fontSize: '14px',
					fontWeight: 500,
				},
				formatter(v: number) {
					return `${v}`;
				},
			},
			title: {
				text: 'Cantidad de Referidos',
				style: {
					color: mainChartColors.labelColor,
					fontSize: '14px',
					fontWeight: 500,
				},
			},
		},
		legend: {
			fontSize: '14px',
			fontWeight: 500,
			fontFamily: 'Inter, sans-serif',
			labels: { colors: [mainChartColors.labelColor] },
			itemMargin: { horizontal: 10 },
		},
		responsive: [
			{ breakpoint: 1024, options: { xaxis: { labels: { show: false } } } },
		],
	};
};

let chart: ApexCharts | null = null;

async function initMainChart() {
	const el = document.getElementById('main-chart');
	if (!el) return;

	// estado de carga
	el.innerHTML = '<div style="padding:1rem;color:#6B7280;">Cargando…</div>';

	try {
		const { series } = await fetchChartData();
		const data = series?.length ? series : [{ name: 'Sin datos', data: [[Date.now(), 0]], color: '#1A56DB' }];

		// ¡LIMPIA el contenedor antes de renderizar!
		el.innerHTML = '';

		chart = new ApexCharts(el, getMainChartOptions(data));
		await chart.render();

		// re-theme sin reconstruir
		document.addEventListener('dark-mode', () => {
			if (chart) chart.updateOptions(getMainChartOptions(data));
		});
	} catch (e) {
		console.error(e);
		el.innerHTML =
			'<div style="padding:1rem;color:#DC2626;">No se pudo cargar el gráfico.</div>';
	}
}

document.addEventListener('DOMContentLoaded', initMainChart);
