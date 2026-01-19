/**
 * Export Utilities for M3GIM Visualizations
 * Provides SVG, PNG, and CSV export functionality
 */

/**
 * Export SVG element as PNG
 */
export async function exportSVGasPNG(svgElement, filename, backgroundColor = 'white') {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = svgElement.getBBox().width + 40;
      canvas.height = svgElement.getBBox().height + 40;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        downloadBlob(blob, filename);
        resolve();
      }, 'image/png');
    };

    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Export SVG element as SVG file
 */
export function exportSVG(svgElement, filename) {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * Export matrix data as CSV
 */
export function exportMatrixAsCSV(matrixData, filename) {
  const { zeitraeume, personen } = matrixData;

  const rows = [];
  rows.push(['Person', 'Kategorie', ...zeitraeume, 'Gesamt'].join(','));

  personen.forEach(person => {
    const encountersMap = new Map(
      person.begegnungen.map(b => [b.zeitraum, b.intensitaet])
    );

    const row = [
      `"${person.name}"`,
      person.kategorie,
      ...zeitraeume.map(z => encountersMap.get(z) || 0),
      person.gesamt_intensitaet || 0
    ];

    rows.push(row.join(','));
  });

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export kosmos data as CSV
 */
export function exportKosmosAsCSV(kosmosData, filename) {
  const rows = [];
  rows.push(['Komponist', 'Werk', 'Dokumente', 'Orte', 'Rollen'].join(','));

  kosmosData.komponisten.forEach(komponist => {
    komponist.werke.forEach(werk => {
      const orte = werk.orte ? werk.orte.map(o => o.name).join('; ') : '';
      const rollen = werk.rollen ? werk.rollen.map(r => r.name).join('; ') : '';

      const row = [
        `"${komponist.name}"`,
        `"${werk.name}"`,
        werk.dokumente,
        `"${orte}"`,
        `"${rollen}"`
      ];

      rows.push(row.join(','));
    });
  });

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Download a blob as file
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Setup export button handlers
 */
export function setupExportHandlers(container, toolbar, vizType, data) {
  toolbar.querySelector('[data-format="svg"]').addEventListener('click', () => {
    const svg = container.querySelector('svg');
    if (svg) {
      exportSVG(svg, `m3gim-${vizType}-${getTimestamp()}.svg`);
    }
  });

  toolbar.querySelector('[data-format="png"]').addEventListener('click', async () => {
    const svg = container.querySelector('svg');
    if (svg) {
      await exportSVGasPNG(svg, `m3gim-${vizType}-${getTimestamp()}.png`);
    }
  });

  const csvBtn = toolbar.querySelector('[data-format="csv"]');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      if (vizType === 'matrix') {
        exportMatrixAsCSV(data, `m3gim-matrix-${getTimestamp()}.csv`);
      } else if (vizType === 'kosmos') {
        exportKosmosAsCSV(data, `m3gim-kosmos-${getTimestamp()}.csv`);
      }
    });
  }
}

/**
 * Get timestamp for filenames
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace(/:/g, '-');
}
