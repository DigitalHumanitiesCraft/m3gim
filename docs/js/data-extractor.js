/**
 * M³GIM Data Extractor
 *
 * Extracts structured data from the 436 real archive records in m3gim.jsonld
 * to generate visualization-ready data for Partitur, Matrix, Kosmos, and Karriere-Fluss.
 *
 * This runs client-side and transforms the RiC-O JSON-LD into the format
 * expected by partitur.js visualizations.
 */

(function() {
  'use strict';

  // Known entities for extraction
  const KNOWN_PERSONS = {
    'Erik Werba': { kategorie: 'vermittler', wikidata: 'Q215530' },
    'Eric Werba': { kategorie: 'vermittler', wikidata: 'Q215530' }, // alternate spelling
    'Ira Malaniuk': { kategorie: 'fokusperson', wikidata: 'Q94208' },
    'Irene Malaniuk': { kategorie: 'fokusperson', wikidata: 'Q94208' }, // birth name
    'Herbert von Karajan': { kategorie: 'dirigent', wikidata: 'Q154895' },
    'Karajan': { kategorie: 'dirigent', wikidata: 'Q154895' },
    'Karl Böhm': { kategorie: 'dirigent', wikidata: 'Q213595' },
    'Böhm': { kategorie: 'dirigent', wikidata: 'Q213595' },
    'Clemens Krauss': { kategorie: 'dirigent', wikidata: 'Q78524' },
    'Rudolf Kempe': { kategorie: 'dirigent', wikidata: 'Q213881' },
    'Wilhelm Furtwängler': { kategorie: 'dirigent', wikidata: 'Q57358' },
    'Furtwängler': { kategorie: 'dirigent', wikidata: 'Q57358' },
    'Hans Knappertsbusch': { kategorie: 'dirigent', wikidata: 'Q213802' },
    'Knappertsbusch': { kategorie: 'dirigent', wikidata: 'Q213802' },
    'Josef Krips': { kategorie: 'dirigent', wikidata: 'Q78479' },
    'Wieland Wagner': { kategorie: 'regisseur', wikidata: 'Q61952' },
    'Wolfgang Wagner': { kategorie: 'regisseur', wikidata: 'Q62tried' },
    'Rudolf Hartmann': { kategorie: 'regisseur', wikidata: 'Q1600284' },
    'Christa Ludwig': { kategorie: 'kollege', wikidata: 'Q233354' },
    'Ludwig': { kategorie: 'kollege', wikidata: 'Q233354' },
    'Walter Berry': { kategorie: 'kollege', wikidata: 'Q78543' },
    'Sena Jurinac': { kategorie: 'kollege', wikidata: 'Q232917' },
    'Jurinac': { kategorie: 'kollege', wikidata: 'Q232917' },
    'Leonie Rysanek': { kategorie: 'kollege', wikidata: 'Q232982' },
    'Rysanek': { kategorie: 'kollege', wikidata: 'Q232982' },
    'Nicolai Gedda': { kategorie: 'kollege', wikidata: 'Q312297' },
    'Wolfgang Windgassen': { kategorie: 'kollege', wikidata: 'Q77279' },
    'Windgassen': { kategorie: 'kollege', wikidata: 'Q77279' },
    'Hans Hotter': { kategorie: 'kollege', wikidata: 'Q77187' },
    'Hotter': { kategorie: 'kollege', wikidata: 'Q77187' },
    'Astrid Varnay': { kategorie: 'kollege', wikidata: 'Q78585' },
    'Varnay': { kategorie: 'kollege', wikidata: 'Q78585' },
    'Martha Mödl': { kategorie: 'kollege', wikidata: 'Q77230' },
    'Mödl': { kategorie: 'kollege', wikidata: 'Q77230' },
    'Nikolaus Kolessa': { kategorie: 'dirigent', wikidata: 'Q4227964' },
    'Kolessa': { kategorie: 'dirigent', wikidata: 'Q4227964' }
  };

  const KNOWN_PLACES = {
    'Wien': { wikidata: 'Q1741', koordinaten: [48.2082, 16.3738] },
    'Vienna': { wikidata: 'Q1741', koordinaten: [48.2082, 16.3738] },
    'München': { wikidata: 'Q1726', koordinaten: [48.1351, 11.5820] },
    'Munich': { wikidata: 'Q1726', koordinaten: [48.1351, 11.5820] },
    'Bayreuth': { wikidata: 'Q3923', koordinaten: [49.9427, 11.5761] },
    'Salzburg': { wikidata: 'Q34713', koordinaten: [47.8095, 13.0550] },
    'Graz': { wikidata: 'Q13298', koordinaten: [47.0707, 15.4395] },
    'Zürich': { wikidata: 'Q72', koordinaten: [47.3769, 8.5417] },
    'Zurich': { wikidata: 'Q72', koordinaten: [47.3769, 8.5417] },
    'London': { wikidata: 'Q84', koordinaten: [51.5074, -0.1278] },
    'Berlin': { wikidata: 'Q64', koordinaten: [52.5200, 13.4050] },
    'Lemberg': { wikidata: 'Q36036', koordinaten: [49.8397, 24.0297], name_heute: 'Lwiw' },
    'Lwiw': { wikidata: 'Q36036', koordinaten: [49.8397, 24.0297] },
    'Stanislau': { wikidata: 'Q171988', koordinaten: [48.9226, 24.7111], name_heute: 'Iwano-Frankiwsk' },
    'Edinburgh': { wikidata: 'Q23436', koordinaten: [55.9533, -3.1883] },
    'Mailand': { wikidata: 'Q490', koordinaten: [45.4642, 9.1900] },
    'Milano': { wikidata: 'Q490', koordinaten: [45.4642, 9.1900] },
    'Paris': { wikidata: 'Q90', koordinaten: [48.8566, 2.3522] },
    'New York': { wikidata: 'Q60', koordinaten: [40.7128, -74.0060] },
    'Mozarteum': { wikidata: 'Q875972', koordinaten: [47.8036, 13.0429] } // Salzburg location
  };

  const KNOWN_WORKS = {
    // Wagner
    'Ring': { komponist: 'Richard Wagner', wikidata: 'Q1568614' },
    'Walküre': { komponist: 'Richard Wagner', wikidata: 'Q1146083' },
    'Die Walküre': { komponist: 'Richard Wagner', wikidata: 'Q1146083' },
    'Rheingold': { komponist: 'Richard Wagner', wikidata: 'Q152494' },
    'Götterdämmerung': { komponist: 'Richard Wagner', wikidata: 'Q212851' },
    'Siegfried': { komponist: 'Richard Wagner', wikidata: 'Q192874' },
    'Tristan': { komponist: 'Richard Wagner', wikidata: 'Q1324254' },
    'Tristan und Isolde': { komponist: 'Richard Wagner', wikidata: 'Q1324254' },
    'Meistersinger': { komponist: 'Richard Wagner', wikidata: 'Q210700' },
    'Die Meistersinger': { komponist: 'Richard Wagner', wikidata: 'Q210700' },
    'Parsifal': { komponist: 'Richard Wagner', wikidata: 'Q194380' },
    'Lohengrin': { komponist: 'Richard Wagner', wikidata: 'Q189654' },
    'Tannhäuser': { komponist: 'Richard Wagner', wikidata: 'Q192052' },
    // Verdi
    'Aida': { komponist: 'Giuseppe Verdi', wikidata: 'Q192627' },
    'AIDA': { komponist: 'Giuseppe Verdi', wikidata: 'Q192627' },
    'Trovatore': { komponist: 'Giuseppe Verdi', wikidata: 'Q223830' },
    'Il Trovatore': { komponist: 'Giuseppe Verdi', wikidata: 'Q223830' },
    'Don Carlos': { komponist: 'Giuseppe Verdi', wikidata: 'Q506789' },
    'Don Carlo': { komponist: 'Giuseppe Verdi', wikidata: 'Q506789' },
    'Maskenball': { komponist: 'Giuseppe Verdi', wikidata: 'Q723417' },
    'Un ballo in maschera': { komponist: 'Giuseppe Verdi', wikidata: 'Q723417' },
    'Traviata': { komponist: 'Giuseppe Verdi', wikidata: 'Q179718' },
    'La Traviata': { komponist: 'Giuseppe Verdi', wikidata: 'Q179718' },
    // Strauss
    'Rosenkavalier': { komponist: 'Richard Strauss', wikidata: 'Q571432' },
    'Der Rosenkavalier': { komponist: 'Richard Strauss', wikidata: 'Q571432' },
    'Elektra': { komponist: 'Richard Strauss', wikidata: 'Q571352' },
    'Ariadne': { komponist: 'Richard Strauss', wikidata: 'Q639110' },
    'Ariadne auf Naxos': { komponist: 'Richard Strauss', wikidata: 'Q639110' },
    'Frau ohne Schatten': { komponist: 'Richard Strauss', wikidata: 'Q640090' },
    // Gluck/Händel/Barock
    'Orfeo': { komponist: 'Christoph Willibald Gluck', wikidata: 'Q309950' },
    'Orpheus': { komponist: 'Christoph Willibald Gluck', wikidata: 'Q309950' },
    'Giulio Cesare': { komponist: 'Georg Friedrich Händel', wikidata: 'Q47048' },
    // Other
    'Carmen': { komponist: 'Georges Bizet', wikidata: 'Q183048' },
    'CARMEN': { komponist: 'Georges Bizet', wikidata: 'Q183048' },
    'Bohème': { komponist: 'Giacomo Puccini', wikidata: 'Q188161' },
    'BOHÈME': { komponist: 'Giacomo Puccini', wikidata: 'Q188161' },
    'Madama Butterfly': { komponist: 'Giacomo Puccini', wikidata: 'Q187946' },
    'MADAMA BUTTERFLY': { komponist: 'Giacomo Puccini', wikidata: 'Q187946' },
    'Cavalleria Rusticana': { komponist: 'Pietro Mascagni', wikidata: 'Q192365' },
    'Tiefland': { komponist: 'Eugen d\'Albert', wikidata: 'Q1319133' },
    'TIEFLAND': { komponist: 'Eugen d\'Albert', wikidata: 'Q1319133' },
    'Don Quichotte': { komponist: 'Jules Massenet', wikidata: 'Q1237509' },
    'DON QUICHOTTE': { komponist: 'Jules Massenet', wikidata: 'Q1237509' },
    'Fidelio': { komponist: 'Ludwig van Beethoven', wikidata: 'Q193951' },
    'Eugen Onegin': { komponist: 'Pjotr Iljitsch Tschaikowski', wikidata: 'Q506795' },
    'EUGEN ONEGIN': { komponist: 'Pjotr Iljitsch Tschaikowski', wikidata: 'Q506795' }
  };

  const KNOWN_ROLES = {
    'Fricka': { werk: 'Ring', komponist: 'Richard Wagner' },
    'Waltraute': { werk: 'Götterdämmerung', komponist: 'Richard Wagner' },
    'Erda': { werk: 'Ring', komponist: 'Richard Wagner' },
    'Brangäne': { werk: 'Tristan und Isolde', komponist: 'Richard Wagner' },
    'Kundry': { werk: 'Parsifal', komponist: 'Richard Wagner' },
    'Ortrud': { werk: 'Lohengrin', komponist: 'Richard Wagner' },
    'Venus': { werk: 'Tannhäuser', komponist: 'Richard Wagner' },
    'Magdalene': { werk: 'Die Meistersinger', komponist: 'Richard Wagner' },
    'Amneris': { werk: 'Aida', komponist: 'Giuseppe Verdi' },
    'Azucena': { werk: 'Il Trovatore', komponist: 'Giuseppe Verdi' },
    'Eboli': { werk: 'Don Carlos', komponist: 'Giuseppe Verdi' },
    'Ulrica': { werk: 'Un ballo in maschera', komponist: 'Giuseppe Verdi' },
    'Octavian': { werk: 'Der Rosenkavalier', komponist: 'Richard Strauss' },
    'Klytämnestra': { werk: 'Elektra', komponist: 'Richard Strauss' },
    'Komponist': { werk: 'Ariadne auf Naxos', komponist: 'Richard Strauss' },
    'Amme': { werk: 'Frau ohne Schatten', komponist: 'Richard Strauss' }
  };

  const KNOWN_INSTITUTIONS = {
    'Wiener Staatsoper': { wikidata: 'Q192389', ort: 'Wien' },
    'Staatsoper Wien': { wikidata: 'Q192389', ort: 'Wien' },
    'Bayerische Staatsoper': { wikidata: 'Q159371', ort: 'München' },
    'Bayrische Staatstheater': { wikidata: 'Q159371', ort: 'München' },
    'Salzburger Festspiele': { wikidata: 'Q629477', ort: 'Salzburg' },
    'Bayreuther Festspiele': { wikidata: 'Q156471', ort: 'Bayreuth' },
    'Grazer Oper': { wikidata: 'Q697727', ort: 'Graz' },
    'Opernhaus Zürich': { wikidata: 'Q436305', ort: 'Zürich' },
    'Covent Garden': { wikidata: 'Q188094', ort: 'London' },
    'Metropolitan Opera': { wikidata: 'Q131849', ort: 'New York' },
    'Edinburgh Festival': { wikidata: 'Q726395', ort: 'Edinburgh' },
    'Mozarteum': { wikidata: 'Q875972', ort: 'Salzburg' }
  };

  // Lebensphasen (from research)
  const LEBENSPHASEN = [
    { id: 'LP1', name: 'Kindheit & Jugend', von: 1919, bis: 1937, ort: 'Lemberg', mobilitaet: null },
    { id: 'LP2', name: 'Ausbildung', von: 1937, bis: 1944, ort: 'Lemberg', mobilitaet: 'bildung' },
    { id: 'LP3', name: 'Flucht & Neubeginn', von: 1944, bis: 1945, ort: 'Wien', mobilitaet: 'erzwungen' },
    { id: 'LP4', name: 'Erste Festengagements', von: 1945, bis: 1950, ort: 'Graz', mobilitaet: 'geografisch' },
    { id: 'LP5', name: 'Internationaler Aufstieg', von: 1950, bis: 1955, ort: 'Wien/München', mobilitaet: 'geografisch' },
    { id: 'LP6', name: 'Höhepunkt', von: 1955, bis: 1965, ort: 'international', mobilitaet: 'geografisch' },
    { id: 'LP7', name: 'Spätphase & Rückzug', von: 1965, bis: 2009, ort: 'Zürich', mobilitaet: 'lebensstil' }
  ];

  /**
   * Parse a date string (various formats) to year
   */
  function parseYear(dateStr) {
    if (!dateStr) return null;
    // Handle ranges like "1940-12-20/1940-12-31"
    if (dateStr.includes('/')) {
      dateStr = dateStr.split('/')[0];
    }
    // Extract year
    const match = dateStr.match(/(\d{4})/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract entities from text
   */
  function extractEntities(text) {
    if (!text) return { persons: [], places: [], works: [], institutions: [], roles: [] };

    const result = {
      persons: [],
      places: [],
      works: [],
      institutions: [],
      roles: []
    };

    // Extract persons
    Object.keys(KNOWN_PERSONS).forEach(name => {
      if (text.includes(name)) {
        const info = KNOWN_PERSONS[name];
        if (!result.persons.find(p => p.wikidata === info.wikidata)) {
          result.persons.push({ name, ...info });
        }
      }
    });

    // Extract places
    Object.keys(KNOWN_PLACES).forEach(name => {
      if (text.includes(name)) {
        const info = KNOWN_PLACES[name];
        if (!result.places.find(p => p.wikidata === info.wikidata)) {
          result.places.push({ name, ...info });
        }
      }
    });

    // Extract works
    Object.keys(KNOWN_WORKS).forEach(name => {
      if (text.includes(name)) {
        const info = KNOWN_WORKS[name];
        if (!result.works.find(w => w.wikidata === info.wikidata)) {
          result.works.push({ name, ...info });
        }
      }
    });

    // Extract institutions
    Object.keys(KNOWN_INSTITUTIONS).forEach(name => {
      if (text.includes(name)) {
        const info = KNOWN_INSTITUTIONS[name];
        if (!result.institutions.find(i => i.wikidata === info.wikidata)) {
          result.institutions.push({ name, ...info });
        }
      }
    });

    // Extract roles
    Object.keys(KNOWN_ROLES).forEach(name => {
      if (text.includes(name)) {
        const info = KNOWN_ROLES[name];
        if (!result.roles.find(r => r.name === name)) {
          result.roles.push({ name, ...info });
        }
      }
    });

    return result;
  }

  /**
   * Get Lebensphase for a given year
   */
  function getLebensphase(year) {
    if (!year) return null;
    return LEBENSPHASEN.find(lp => year >= lp.von && year <= lp.bis);
  }

  /**
   * Transform RiC-O JSON-LD to visualization data
   */
  function transformData(jsonldData) {
    const records = jsonldData['@graph'] || [];

    // Result structure
    const result = {
      // Metadata
      meta: {
        generated: new Date().toISOString(),
        sourceRecords: records.length,
        version: '2.0'
      },

      // Archive documents (all 436)
      archivalien: {
        dokumente: []
      },

      // Aggregated entities
      personen: [],
      orte: [],
      institutionen: [],
      werke: [],

      // Lebensphasen (fixed)
      lebensphasen: LEBENSPHASEN.map(lp => ({
        ...lp,
        dokumente: []
      })),

      // Mobility events (derived)
      mobilitaet: [],

      // Network data
      netzwerk_kanten: [],

      // Timeline events
      zeitleiste_ereignisse: [],

      // Document aggregations
      dokument_aggregation: {
        nach_jahr: [],
        nach_typ: [],
        nach_ort: []
      }
    };

    // Tracking maps for aggregation
    const personMap = new Map();
    const placeMap = new Map();
    const institutionMap = new Map();
    const workMap = new Map();
    const yearCounts = new Map();
    const typeCounts = new Map();
    const placeCounts = new Map();
    const personDocuments = new Map(); // person -> Set of doc IDs
    const placeDocuments = new Map(); // place -> Map(year -> Set of doc IDs)

    // Process each record
    records.forEach(record => {
      const id = record['@id']?.replace('m3gim:', '') || '';
      const identifier = record['rico:identifier'] || '';
      const title = record['rico:title'] || '';
      const dateStr = record['rico:date'] || '';
      const year = parseYear(dateStr);
      const typeObj = record['rico:hasDocumentaryFormType'];
      const type = typeObj?.['@id']?.replace('m3gim-dft:', '') || 'Unknown';
      const scopeContent = record['rico:scopeAndContent'] || '';
      const extent = record['rico:physicalOrLogicalExtent'] || '';
      const accessStatus = record['m3gim:accessStatus'] || 'offen';
      const digitizationStatus = record['m3gim:digitizationStatus'] || 'nicht_gescannt';
      const photographerName = record['m3gim:photographerName'] || '';
      const photoType = record['m3gim:photoType'] || '';

      // Create archive document entry
      const doc = {
        id: id,
        signatur: identifier,
        titel: title,
        datum: dateStr,
        jahr: year,
        typ: type,
        beschreibung: scopeContent,
        umfang: extent,
        zugang: accessStatus,
        digitalisiert: digitizationStatus === 'gescannt',
        fotograf: photographerName,
        fotoTyp: photoType
      };

      // Extract entities from title + scope
      const combinedText = `${title} ${scopeContent}`;
      const entities = extractEntities(combinedText);

      // Add entity references to document
      doc.personen = entities.persons.map(p => p.name);
      doc.orte = entities.places.map(p => p.name);
      doc.werke = entities.works.map(w => w.name);
      doc.institutionen = entities.institutions.map(i => i.name);
      doc.rollen = entities.roles.map(r => r.name);

      result.archivalien.dokumente.push(doc);

      // Assign to Lebensphase
      if (year) {
        const lp = getLebensphase(year);
        if (lp) {
          const lpData = result.lebensphasen.find(l => l.id === lp.id);
          if (lpData) {
            lpData.dokumente.push(id);
          }
        }
      }

      // Aggregate by year
      if (year) {
        yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
      }

      // Aggregate by type
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

      // Track person mentions
      entities.persons.forEach(person => {
        if (person.kategorie !== 'fokusperson') {
          if (!personMap.has(person.wikidata)) {
            personMap.set(person.wikidata, {
              id: person.wikidata,
              name: person.name,
              kategorie: person.kategorie,
              wikidata: person.wikidata,
              dokumente: new Set(),
              begegnungen: new Map() // zeitraum -> { count, docs }
            });
          }
          const pData = personMap.get(person.wikidata);
          pData.dokumente.add(id);

          // Track by time period
          if (year) {
            const zeitraum = getZeitraum(year);
            if (!pData.begegnungen.has(zeitraum)) {
              pData.begegnungen.set(zeitraum, { count: 0, docs: new Set(), contexts: new Set() });
            }
            const bg = pData.begegnungen.get(zeitraum);
            bg.count++;
            bg.docs.add(id);
            entities.places.forEach(pl => bg.contexts.add(pl.name));
          }
        }
      });

      // Track place mentions
      entities.places.forEach(place => {
        if (!placeMap.has(place.wikidata)) {
          placeMap.set(place.wikidata, {
            id: place.wikidata,
            name: place.name,
            wikidata: place.wikidata,
            koordinaten: place.koordinaten,
            name_heute: place.name_heute,
            zeitraeume: new Map(), // year -> { docs, types }
            dokumente: new Set()
          });
        }
        const plData = placeMap.get(place.wikidata);
        plData.dokumente.add(id);

        if (year) {
          if (!plData.zeitraeume.has(year)) {
            plData.zeitraeume.set(year, { docs: new Set(), types: new Set() });
          }
          plData.zeitraeume.get(year).docs.add(id);
          plData.zeitraeume.get(year).types.add(type);
        }

        placeCounts.set(place.name, (placeCounts.get(place.name) || 0) + 1);
      });

      // Track institutions
      entities.institutions.forEach(inst => {
        if (!institutionMap.has(inst.wikidata)) {
          institutionMap.set(inst.wikidata, {
            id: inst.wikidata,
            name: inst.name,
            wikidata: inst.wikidata,
            ort: inst.ort,
            dokumente: new Set()
          });
        }
        institutionMap.get(inst.wikidata).dokumente.add(id);
      });

      // Track works
      entities.works.forEach(work => {
        if (!workMap.has(work.wikidata)) {
          workMap.set(work.wikidata, {
            id: work.wikidata,
            titel: work.name,
            komponist: work.komponist,
            wikidata: work.wikidata,
            rollen: new Map(), // role name -> { docs, years }
            dokumente: new Set()
          });
        }
        const wData = workMap.get(work.wikidata);
        wData.dokumente.add(id);

        // Track roles for this work
        entities.roles.forEach(role => {
          if (role.werk === work.name || (role.komponist === work.komponist)) {
            if (!wData.rollen.has(role.name)) {
              wData.rollen.set(role.name, { docs: new Set(), years: new Set() });
            }
            wData.rollen.get(role.name).docs.add(id);
            if (year) wData.rollen.get(role.name).years.add(year);
          }
        });
      });
    });

    // Convert person map to array with begegnungen
    result.personen = Array.from(personMap.values()).map(p => ({
      id: p.id,
      name: p.name,
      kategorie: p.kategorie,
      wikidata: p.wikidata,
      dokumente: Array.from(p.dokumente),
      anzahl_dokumente: p.dokumente.size,
      begegnungen: Array.from(p.begegnungen.entries()).map(([zeitraum, data]) => ({
        zeitraum,
        intensitaet: Math.min(5, Math.ceil(data.count / 2)), // normalize to 1-5
        anzahl: data.count,
        kontext: Array.from(data.contexts).join(', '),
        dokumente: Array.from(data.docs)
      }))
    }));

    // Convert place map to array
    result.orte = Array.from(placeMap.values()).map(p => {
      const zeitraeume = Array.from(p.zeitraeume.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([year, data]) => ({
          von: year,
          bis: year,
          typ: data.types.has('Photograph') ? 'auffuehrungsort' : 'wohnort',
          dokumente: Array.from(data.docs)
        }));

      // Merge consecutive years
      const mergedZeitraeume = [];
      zeitraeume.forEach(z => {
        const last = mergedZeitraeume[mergedZeitraeume.length - 1];
        if (last && last.bis === z.von - 1 && last.typ === z.typ) {
          last.bis = z.bis;
          last.dokumente.push(...z.dokumente);
        } else {
          mergedZeitraeume.push({ ...z });
        }
      });

      return {
        id: p.id,
        name: p.name,
        wikidata: p.wikidata,
        koordinaten: p.koordinaten,
        name_heute: p.name_heute,
        zeitraeume: mergedZeitraeume,
        dokumente: Array.from(p.dokumente),
        anzahl_dokumente: p.dokumente.size
      };
    });

    // Convert institutions
    result.institutionen = Array.from(institutionMap.values()).map(i => ({
      ...i,
      dokumente: Array.from(i.dokumente),
      anzahl_dokumente: i.dokumente.size
    }));

    // Convert works with roles
    result.werke = Array.from(workMap.values()).map(w => ({
      id: w.id,
      titel: w.titel,
      komponist: w.komponist,
      wikidata: w.wikidata,
      dokumente: Array.from(w.dokumente),
      anzahl_dokumente: w.dokumente.size,
      rollen: Array.from(w.rollen.entries()).map(([name, data]) => {
        const years = Array.from(data.years).sort();
        return {
          name,
          zeitraum: years.length > 0 ? `${years[0]}-${years[years.length - 1]}` : 'unbekannt',
          anzahl_dokumente: data.docs.size,
          dokumente: Array.from(data.docs)
        };
      })
    }));

    // Create document aggregation by year
    result.dokument_aggregation.nach_jahr = Array.from(yearCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([jahr, anzahl]) => ({ jahr: jahr.toString(), anzahl }));

    // Create document aggregation by type
    result.dokument_aggregation.nach_typ = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([typ, anzahl]) => ({ typ, anzahl }));

    // Create document aggregation by place
    result.dokument_aggregation.nach_ort = Array.from(placeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ort, anzahl]) => ({ ort, anzahl }));

    // Generate network edges
    result.personen.forEach(person => {
      if (person.anzahl_dokumente >= 2) {
        result.netzwerk_kanten.push({
          source: 'Q94208', // Ira Malaniuk
          target: person.wikidata,
          gewicht: person.anzahl_dokumente,
          label: `${person.name} - ${person.kategorie}`,
          dokumente: person.dokumente
        });
      }
    });

    // Generate mobility events from Lebensphasen transitions
    for (let i = 1; i < LEBENSPHASEN.length; i++) {
      const prev = LEBENSPHASEN[i - 1];
      const curr = LEBENSPHASEN[i];
      if (curr.mobilitaet) {
        result.mobilitaet.push({
          id: `MOB_${i}`,
          jahr: curr.von,
          von_ort: prev.ort,
          nach_ort: curr.ort,
          form: curr.mobilitaet,
          beschreibung: `${prev.name} → ${curr.name}`,
          dokumente: result.lebensphasen[i].dokumente.slice(0, 5) // first 5 docs
        });
      }
    }

    // Generate timeline events
    result.zeitleiste_ereignisse = [
      { jahr: 1919, typ: 'geburt', titel: 'Geburt in Stanislau', dokumente: [] },
      { jahr: 1937, typ: 'ausbildung', titel: 'Beginn der Gesangsausbildung', dokumente: [] },
      { jahr: 1944, typ: 'flucht', titel: 'Flucht aus Lemberg', dokumente: [] },
      { jahr: 1945, typ: 'debut', titel: 'Erstes Engagement in Graz', dokumente: [] },
      { jahr: 1952, typ: 'bayreuth', titel: 'Bayreuth-Debut', dokumente: [] },
      { jahr: 1958, typ: 'hoehepunkt', titel: 'Internationale Karriere', dokumente: [] },
      { jahr: 2009, typ: 'tod', titel: 'Tod in Zürich', dokumente: [] }
    ];

    return result;
  }

  /**
   * Get time period string for a year
   */
  function getZeitraum(year) {
    if (year < 1945) return '1940-1944';
    if (year < 1950) return '1945-1949';
    if (year < 1955) return '1950-1954';
    if (year < 1960) return '1955-1959';
    if (year < 1965) return '1960-1964';
    if (year < 1970) return '1965-1969';
    return '1970-1974';
  }

  /**
   * Load and transform data
   */
  async function loadAndTransform() {
    try {
      const response = await fetch('data/m3gim.jsonld');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const jsonldData = await response.json();

      const transformedData = transformData(jsonldData);

      console.log('M³GIM Data Extractor: Transformed', transformedData.archivalien.dokumente.length, 'records');
      console.log('  - Personen:', transformedData.personen.length);
      console.log('  - Orte:', transformedData.orte.length);
      console.log('  - Werke:', transformedData.werke.length);
      console.log('  - Institutionen:', transformedData.institutionen.length);

      return transformedData;
    } catch (error) {
      console.error('M³GIM Data Extractor error:', error);
      return null;
    }
  }

  // Export
  window.M3GIMDataExtractor = {
    loadAndTransform,
    transformData,
    extractEntities,
    KNOWN_PERSONS,
    KNOWN_PLACES,
    KNOWN_WORKS,
    KNOWN_INSTITUTIONS,
    LEBENSPHASEN
  };

})();
