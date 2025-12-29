// src/client/mapa-empresas.client.ts
import { Chart, registerables } from 'chart.js';
import {
	ChoroplethController,
	GeoFeature,
	ProjectionScale,
	ColorScale,
} from 'chartjs-chart-geo';
import * as topojson from 'topojson-client';

Chart.register(
	ChoroplethController,
	GeoFeature,
	ProjectionScale,
	ColorScale,
	...registerables,
);

let chartInstance: Chart | null = null;

export async function renderizarMapaEstados(
	containerId: string,
	colorDestacado: string = '#967432',
	empresaId?: string, // ← Ya lo tienes
) {
	console.log('Inicializando mapa...');
	console.log('Empresa ID:', empresaId);

	const container = document.getElementById(containerId);
	if (!container) return;

	container.innerHTML = `<p style="text-align:center; padding:2rem; color:#666;">Cargando mapa...</p>`;

	let estadoDestacado: string | null = null;
	try {
		// Usa empresaId si existe
		const url = empresaId
			? `/api/generales/estado-incorporacion?empresaId=${empresaId}`
			: '/api/generales/estado-incorporacion';

		const res = await fetch(url);
		if (res.ok) {
			const data = await res.json();
			estadoDestacado = data.estado?.trim();
			console.log('Estado desde API:', estadoDestacado);
		} else {
			console.warn('API no respondió OK:', res.status);
		}
	} catch (e: any) {
		console.error('Error API:', e.message);
	}

	if (!estadoDestacado) {
		container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:#666;">
        <p>No se encontró estado de incorporación</p>
        <p><small>Completa los datos de tu empresa</small></p>
      </div>
    `;
		return;
	}

	// === 2. CARGAR MAPA ===
	let usData: any;
	try {
		const res = await fetch('https://unpkg.com/us-atlas/states-10m.json');
		if (!res.ok) throw new Error('HTTP ' + res.status);
		usData = await res.json();
	} catch (e: any) {
		console.error('Error CDN:', e.message);
		container.innerHTML = `<p style="color:red">Error cargando mapa</p>`;
		return;
	}

	// === 3. EXTRAER DATOS ===
	let nation: any,
		states: any[] = [];
	try {
		nation = topojson.feature(usData, usData.objects.nation).features[0];
		states = topojson.feature(usData, usData.objects.states).features;
	} catch (e: any) {
		console.error('Error en topojson:', e.message);
		container.innerHTML = `<p style="color:red">Error procesando mapa</p>`;
		return;
	}

	if (!states.length) {
		container.innerHTML = `<p style="color:red">No se encontraron estados</p>`;
		return;
	}

	// === 4. CREAR CANVAS ===
	container.innerHTML = '';
	const canvas = document.createElement('canvas');
	container.appendChild(canvas);

	// === 5. CHART ===
	try {
		chartInstance = new Chart(canvas, {
			type: 'choropleth',
			data: {
				labels: states.map((d) => d.properties?.name || 'Sin nombre'),
				datasets: [
					{
						outline: nation,
						data: states.map((state) => ({
							feature: state,
							value: state.properties?.name === estadoDestacado ? 1 : 0,
							highlighted: state.properties?.name === estadoDestacado,
						})),
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: 'rgba(0,0,0,0.85)',
						titleColor: '#fff',
						bodyColor: '#fff',
						borderColor: colorDestacado,
						borderWidth: 1,
						cornerRadius: 8,
						displayColors: false,
						padding: 12,
						titleFont: { size: 14, weight: 'bold' },
						bodyFont: { size: 13 },
						callbacks: {
							label: function (ctx: any) {
								const nombreEstado = ctx.raw.feature.properties?.name;
								if (ctx.raw.highlighted) {
									return `${nombreEstado}: Estado de tu empresa`;
								}
								return nombreEstado;
							},
						},
					},
				},
				scales: {
					projection: {
						type: 'projection',
						axis: 'x',
						projection: 'albersUsa',
					},
					color: {
						type: 'color',
						axis: 'x',
						display: false,
						quantize: 2,
						interpolate: (v: number) => (v === 1 ? colorDestacado : '#f5f5f5'),
					},
				},
				elements: {
					geoFeature: {
						borderColor: '#fff',
						borderWidth: (ctx) => (ctx.raw?.highlighted ? 3 : 1),
						backgroundColor: (ctx) =>
							ctx.raw?.highlighted ? colorDestacado : 'transparent',
					},
				},
			},
		});

		// === RESPONSIVE: Redibujar al cambiar tamaño ===
		const resizeObserver = new ResizeObserver(() => {
			if (chartInstance) {
				chartInstance.resize();
			}
		});
		resizeObserver.observe(container);

		// === OPCIONAL: Redibujar al cambiar ventana ===
		window.addEventListener('resize', () => {
			if (chartInstance) {
				chartInstance.resize();
			}
		});

		// === ZOOM ===
		setTimeout(() => {
			const feature = states.find(
				(s) => s.properties?.name === estadoDestacado,
			);
			if (feature && chartInstance) {
				// @ts-ignore
				chartInstance.zoomToFeature?.(feature);
			}
		}, 800);
	} catch (error: any) {
		console.error('Error al crear chart:', error);
		container.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
	}
}

if (typeof window !== 'undefined') {
	(window as any).renderizarMapaEstados = renderizarMapaEstados;
}
