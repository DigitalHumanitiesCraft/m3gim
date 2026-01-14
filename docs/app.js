/**
 * M³GIM - JSON-LD Daten laden und in Konsole verfügbar machen
 */

(async function() {
  const statusEl = document.getElementById('status');
  const statsEl = document.getElementById('stats');

  try {
    // JSON-LD laden
    const response = await fetch('data/m3gim.jsonld');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Global verfügbar machen
    window.m3gim = data;

    // Statistiken berechnen
    const records = data['@graph'] || [];
    const objekte = records.filter(r => !r['@type']?.includes('rico:Photograph'));
    const fotos = records.filter(r => r['@type']?.includes('rico:Photograph'));

    // UI aktualisieren
    statusEl.className = 'status success';
    statusEl.textContent = `Erfolgreich geladen: ${records.length} Records`;

    statsEl.style.display = 'grid';
    document.getElementById('total-count').textContent = records.length;
    document.getElementById('objekte-count').textContent = objekte.length;
    document.getElementById('fotos-count').textContent = fotos.length;

    // Export-Datum formatieren
    const exportDate = data['m3gim:exportDate'];
    if (exportDate) {
      const date = new Date(exportDate);
      document.getElementById('export-date').textContent = date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Beispiel-Record anzeigen
    if (records.length > 0) {
      document.getElementById('sample-record').textContent = JSON.stringify(records[0], null, 2);
    }

    // Konsolen-Ausgabe
    console.log('='.repeat(60));
    console.log('M³GIM Daten geladen');
    console.log('='.repeat(60));
    console.log(`Records gesamt: ${records.length}`);
    console.log(`  - Objekte: ${objekte.length}`);
    console.log(`  - Fotos: ${fotos.length}`);
    console.log('');
    console.log('Zugriff via: window.m3gim');
    console.log('  - window.m3gim["@graph"]  → Alle Records');
    console.log('  - window.m3gim["@context"] → JSON-LD Context');
    console.log('='.repeat(60));

  } catch (error) {
    statusEl.className = 'status error';
    statusEl.textContent = `Fehler beim Laden: ${error.message}`;
    console.error('M³GIM Ladefehler:', error);
  }
})();
