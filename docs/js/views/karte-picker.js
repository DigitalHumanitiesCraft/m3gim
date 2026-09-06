/**
 * Entitaets-Wahl der Karte als Sektion der geteilten Sidebar.
 *
 * Sie folgt demselben Bedienmuster wie jede Facette (Eingabefeld mit
 * Vorschlaegen, entfernbarer Chip), traegt aber genau einen Wert: die Karte
 * beantwortet "wo war DIESE Entitaet praesent". Der frueher hier stehende
 * Art-Umschalter (Alle/Organisationen/Personen) und die Dauerliste sind damit
 * entfallen. Die Liste mischt drei Inhaltsfamilien, und seit die
 * Vorschlagszeile des Geruests ein Familiensymbol traegt, unterscheidet dieses
 * sie; das frueher vorangestellte Textpraefix ist entfallen (E-241, loest den
 * zweiten Satz von E-235 ab).
 *
 * Der Control mutiert nur `state.entity` und meldet die Wahl per Callback; das
 * Neuzeichnen bleibt Sache der View.
 */

/** Name der Inhaltsfamilie je Entitaets-Art, fuer den Namen der Vorschlagszeile
 *  in der Vorlesereihenfolge: das Symbol selbst ist `aria-hidden`. */
const KIND_LABEL = { org: 'Organisation', person: 'Person', werk: 'Werk' };

/**
 * @param {Array<{id:string, name:string, kind:string, family:string, records:Set}>} entities
 * @param {{entity: ?object}} state
 * @param {() => void} onSelect
 * @returns {Object} Sektions-Spec fuer createSidebar
 */
export function entitySection(entities, state, onSelect) {
  const options = entities
    .map(e => ({
      value: e.id,
      label: e.name,
      family: e.family,
      familyLabel: KIND_LABEL[e.kind] || KIND_LABEL.person,
      count: e.records ? e.records.size : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));

  return {
    title: 'Entität',
    titleActive: () => !!state.entity,
    // Zugeklappt im Start, damit die geteilten Filter ueber der view-eigenen
    // Sektion stehen bleiben; die gewaehlte Entitaet steht im Streifen.
    collapsible: true,
    collapsed: () => true,
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
