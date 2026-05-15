import { Chart, registerables } from 'chart.js';
import {
	ChoroplethController,
	ColorScale,
	GeoFeature,
	ProjectionScale,
} from 'chartjs-chart-geo';
import { feature } from 'topojson-client';
import usAtlas from 'us-atlas/states-10m.json';

Chart.register(
	ChoroplethController,
	GeoFeature,
	ProjectionScale,
	ColorScale,
	...registerables,
);

type GeoChartWindow = Window & {
	companyGeoChart?: Chart;
};

function renderGeoError(container: HTMLElement) {
	container.dataset.mapInitialized = '0';
	container.innerHTML =
		'<div style="display:flex;align-items:center;justify-content:center;height:400px;color:#666;flex-direction:column;"><div style="margin-bottom:10px;">Error: No se pudieron cargar los datos del mapa</div><div style="font-size:12px;">Verifica la configuracion del grafico</div></div>';
}

function initCompanyGeoChart() {
	const container = document.getElementById(
		'datamap-container',
	) as HTMLElement | null;
	if (!container || container.dataset.mapInitialized === '1') return;

	container.dataset.mapInitialized = '1';
	const loader = container.querySelector('.map-loader') as HTMLElement | null;
	const estadoMapa = (container.dataset.estadoMapa ?? '').trim().toLowerCase();

	try {
		const nation = (
			feature(usAtlas as any, (usAtlas as any).objects.nation) as any
		).features[0];
		const states = (
			feature(usAtlas as any, (usAtlas as any).objects.states) as any
		).features as Array<any>;

		const selectedState = states.find(
			(s) => s.properties.name.toLowerCase() === estadoMapa,
		);

		// Si encontramos el estado, hacemos zoom: outline = solo ese estado.
		// chart.js ajusta la projection al bbox del outline → estados pequeños
		// como Delaware se ven en tamaño real.
		const outline = selectedState ?? nation;

		const canvas = document.createElement('canvas');
		container.innerHTML = '';
		container.appendChild(canvas);
		container.style.height = '240px';
		container.style.maxHeight = '320px';

		// Cuando hay estado seleccionado, dibujamos solo ese feature (sin el
		// resto del país). Si no, fallback al mapa completo.
		const mapData = selectedState
			? [{ feature: selectedState, value: 1 }]
			: states.map((state) => ({
					feature: state,
					value: state.properties.name.toLowerCase() === estadoMapa ? 1 : 0,
				}));

		const win = window as GeoChartWindow;
		win.companyGeoChart?.destroy();

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			renderGeoError(container);
			return;
		}

		win.companyGeoChart = new Chart(ctx, {
			type: 'choropleth',
			data: {
				labels: states.map((state) => state.properties.name),
				datasets: [
					{
						label: 'Estados',
						outline,
						data: mapData,
						backgroundColor: 'transparent',
						borderColor: '#94a3b8',
						borderWidth: 2,
						hoverBackgroundColor: 'transparent',
						hoverBorderColor: '#94a3b8',
						hoverBorderWidth: 2,
						skip: false,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					projection: {
						axis: 'x',
						projection: 'albersUsa',
					},
					color: {
						axis: 'x',
						display: false,
					},
				},
				plugins: {
					legend: { display: false },
					tooltip: { enabled: false },
				},
			},
		});

		if (loader) {
			loader.style.transition = 'opacity 0.2s ease-out';
			loader.style.opacity = '0';
			setTimeout(() => loader.remove(), 200);
		}
	} catch (error) {
		console.error('Error al inicializar el mapa:', error);
		renderGeoError(container);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initCompanyGeoChart, {
		once: true,
	});
} else {
	initCompanyGeoChart();
}

document.addEventListener('astro:page-load', initCompanyGeoChart);