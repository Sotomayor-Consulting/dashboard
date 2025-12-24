import { DataTable } from "simple-datatables";

export function initDataTable(selector = "#myTable") {
  const el = document.querySelector(selector) as HTMLTableElement | null;
  if (!el) return;

  // Evita doble init si Astro navega sin recargar (View Transitions)
  if ((el as any).__dt) return;

  const dt = new DataTable(el, {
    searchable: true,
    fixedHeight: true,
    perPage: 10,
    perPageSelect: [5, 10, 25, 50],
  });

  (el as any).__dt = dt;
}
