/**
 * Entitaets-Wahl der Karte als Sektion der geteilten Sidebar.
 *
 * Sie folgt demselben Bedienmuster wie jede Facette (Eingabefeld mit
 * Vorschlaegen, entfernbarer Chip), traegt aber genau einen Wert: die Karte
 * beantwortet "wo war DIESE Entitaet praesent". Der frueher hier stehende
 * Art-Umschalter (Alle/Organisationen/Personen) und die Dauerliste sind damit
 * entfallen; die Art steht als Praefix am Vorschlag.
 *
 * Der Control mutiert nur `state.entity` und meldet die Wahl per Callback; das
 * Neuzeichnen bleibt Sache der View.
 */

/**
 * @param {Array<{id:string, name:string, kind:string, records:Set}>} entities
 * @param {{entity: ?object}} state
 * @param {() => void} onSelect
 * @returns {Object} Sektions-Spec fuer createSidebar
 */
export function entitySection(entities, state, onSelect) {
  const options = entities
    .map(e => ({
      value: e.id,
      label: `${e.kind === 'org' ? 'Org' : 'Pers'} · ${e.name}`,
      count: e.records ? e.records.size : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));

  return {
    title: 'Entität',
    titleActive: () => !!state.entity,
    controls: [{
      kind: 'facet',
      key: 'entitaet',
      single: true,
      options: () => options,
      selected: () => (state.entity ? [state.entity.id] : []),
      onSelect: (values) => {
        const id = values[0];
        state.entity = id ? entities.find(e => e.id === id) || null : null;
        onSelect();
      },
    }],
  };
}
