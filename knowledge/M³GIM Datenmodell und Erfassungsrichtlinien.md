# M³GIM Datenmodell und Erfassungsrichtlinien

## 1. Forschungsfragen und Leitsatz

Die Erschließung des Teilnachlasses Ira Malaniuk (UAKUG/NIM, 436 Archiveinheiten) ist forschungsfragengetrieben. Wir erfassen, was zur Beantwortung der Forschungsfragen beiträgt, nicht alles, was in einer Quelle steht.

* ***FF1.** Wie prägten Sänger*innen die Grazer Musik- und Theaterkultur, welche Rolle spielte Mobilität für Professionalisierung und Vernetzung?
* **FF2.** Welche narrativen und ästhetischen Strukturen wurden durch Migration beeinflusst und wie trugen diese zur Transformation des Operngenres bei?
* **FF3.** Wie wurde Musiktheaterwissen – flüchtig, oft mündlich überliefert – durch Mobilität transferiert und adaptiert?
* **FF4.** Welche Mobilitätsformen (geografisch, erzwungen, Bildungs- und Lebensstilmobilität) lassen sich bei Malaniuk identifizieren?

**Leitsatz.** Ein leeres Feld bedeutet "in dieser Quelle nicht ermittelbar", nicht "unbekannt".

## 2. Dreischichtenmodell

**Schicht 1 – Kernmetadaten (obligatorisch).** Gilt für alle Archiveinheiten. Fundament für Suche, Filterung, Langzeitarchivierung. Orientiert sich an Records in Contexts (RiC) und EAD3.

**Schicht 2 – Kontextuelle Verknüpfungen (empfohlen).** Personen, Orte, Institutionen, Ereignisse, Werke mit Rollenbezeichnungen. Grundlage für Netzwerkanalysen.

**Schicht 3 – Quellentyp-spezifische Felder (fakultativ).** Nur bei vertiefter Erschließung für Fallstudien.

### Farbschema

| Farbe | Bedeutung |
|---|---|
| Blau | Schicht 1 Hauptbestand (M3GIM-Objekte) |
| Orange | Schicht 1 Fotografien (M3GIM-Fotos) |
| Grün | Schicht 2 + 3 (M3GIM-Verknuepfungen) |
| Violett | Indextabellen |

### Erfassungstabellen (Google Sheets)

- [M3GIM-Objekte](https://drive.google.com/open?id=1tpNY5ooBXZCnsT1zRBF2_BhrGmS2GYjUyM8NFwi-zOo) – Kernmetadaten Hauptbestand, Plakate, Tonträger (Schicht 1)
- [M3GIM-Fotos](https://docs.google.com/spreadsheets/d/1H1AVtMuih_hceI35OXS-ttpbpV4bVy6kVC0pL1Sg8Hk/edit?usp=sharing) – Kernmetadaten Fotografien (Schicht 1)
- [M3GIM-Verknuepfungen](https://docs.google.com/spreadsheets/d/1th3fWqadBy98DjRRQuqZLdwDnVEcFvah60OS3Pi02KA/edit?usp=sharing) – Verknüpfungen und Details (Schicht 2 + 3)
- [M3GIM-Personenindex](https://drive.google.com/open?id=1MHzdOy6qm1ylQeESVU-KJOgmSvYkl210-iPs3q0hOKE)
- [M3GIM-Organisationsindex](https://drive.google.com/open?id=1zusl-KtvWhooeyFd3r3SMHZ1t-8rwm8xnZULaFsKwik)
- [M3GIM-Ortsindex](https://drive.google.com/open?id=1XUwvhfI85I34OYesqmYb2rWmHfaBV10y5ecfnvuwEZk)
- [M3GIM-Werkindex](https://drive.google.com/open?id=19D6NZCak_RLpMAeh6fjKMdgIydizSHSO9rFlDGJnPIY)

## 3. Schicht 1 – Kernmetadaten Hauptbestand

Erfassung in **M3GIM-Objekte** (blau hinterlegt). Eine Zeile pro Archiveinheit. Gilt für Hauptbestand (182), Plakate (25) und Tonträger (1).

| Feld | Typ | Format | Beschreibung |
|---|---|---|---|
| archivsignatur | String | `UAKUG/NIM_XXX` | Persistenter Identifier |
| box_nr | String | Freitext | Physische Lokalisierung, Boxnummer oder Standortbezeichnung |
| titel | String | Freitext | Normierter Titel der Archiveinheit |
| entstehungsdatum | String | ISO 8601 | Entstehungszeitraum |
| datierungsevidenz | String | Dropdown | Quelle der Datierung |
| dokumenttyp | String | Dropdown | Quellentyp |
| sprache | String | Dropdown | ISO 639-1 Sprachcode |
| umfang | String | Freitext | Anzahl Blatt, Seiten oder Stück |
| zugaenglichkeit | String | Dropdown | Rechtliche oder physische Einschränkungen |
| scan_status | String | Dropdown | Digitalisierungsstatus |
| bearbeiter | String | Freitext | Name der erfassenden Person |
| erfassungsdatum | Date | YYYY-MM-DD | Letztes Änderungsdatum |

### Standardkonformität

| Feld | RiC-CM | EAD3 |
|---|---|---|
| archivsignatur | Identifier | `<unitid>` |
| box_nr | Instantiation | `<container>` |
| titel | Name | `<unittitle>` |
| entstehungsdatum | Date-Entity | `<unitdatestructured>` |
| datierungsevidenz | Date-Attribute | `<unitdate @certainty>` |
| dokumenttyp | DocumentaryFormType | `<genreform>` |
| sprache | Language | `<langmaterial>` |
| umfang | Extent | `<physdescstructured>` |
| zugaenglichkeit | Erweiterung | `<accessrestrict>` |
| scan_status | Erweiterung | `<localcontrol>` |

## 4. Schicht 1 – Kernmetadaten Fotografien

Erfassung in **M3GIM-Fotos** (orange hinterlegt). Eine Zeile pro Fotografie. Die abweichende Feldstruktur ergibt sich aus den spezifischen Anforderungen der Fotoerschließung.

| Feld | Typ | Format | Beschreibung |
|---|---|---|---|
| archivsignatur | String | `UAKUG/NIM_FS_XXX` | Persistenter Identifier |
| alte_signatur | String | Freitext | Frühere Archivsignatur (falls vorhanden) |
| fotobox_nr | String | Freitext | Physische Ablage, Boxnummer oder Standortbezeichnung |
| titel | String | Freitext | Bildtitel, oft Rollenbezeichnung |
| entstehungsdatum | String | ISO 8601 | Aufnahmedatum |
| datierungsevidenz | String | Dropdown | Quelle der Datierung |
| beschreibung | String | Freitext | Detaillierte Bildbeschreibung |
| stichwoerter | String | Freitext | Schlagwörter, semikolongetrennt |
| fotograf | String | Freitext | Name des Fotografen oder Studios |
| fototyp | String | Dropdown | Technische Klassifikation |
| format | String | Freitext | Physische Größe (z.B. 10x15 cm) |
| aufnahmeort | String | Freitext | Ort der Aufnahme |
| rechte | String | Freitext | Urheberrechtsangabe |
| filename | String | Freitext | Digitalisat-Dateiname |
| bearbeiter | String | Freitext | Name der erfassenden Person |
| erfassungsdatum | Date | YYYY-MM-DD | Letztes Änderungsdatum |

### Unterschiede zur Objekttabelle

| Aspekt | Objekttabelle | Fototabelle |
|---|---|---|
| Signaturschema | NIM_XXX | NIM_FS_XXX |
| Zusatzfelder | – | fotograf, fototyp, stichwoerter, rechte, alte_signatur, beschreibung |
| Entfallende Felder | – | sprache, dokumenttyp, umfang |
| Physische Ablage | box_nr | fotobox_nr |

Beide Standortfelder sind Freitext und akzeptieren sowohl numerische Werte als auch Standortbezeichnungen.

## 5. Schicht 2 – Kontextuelle Verknüpfungen

Erfassung in **M3GIM-Verknuepfungen** (grün hinterlegt). Eine Zeile pro Verknüpfung. Gilt für alle Objekttypen (Hauptbestand, Fotos, Plakate, Tonträger).

### Tabellenstruktur

| Spalte | Beschreibung | Validierung |
|---|---|---|
| archivsignatur | Verweis auf das Objekt | Muss in Objekt- oder Fototabelle existieren |
| typ | Art der Verknüpfung | Dropdown |
| name | Name der Entität oder des Ereignisses | Freitext |
| rolle | Rolle oder Typ der Verknüpfung | Dropdown |
| datum | Datum bei Ereignissen | ISO 8601 |
| anmerkung | Zusatzinformationen | Freitext |

### Werte für typ

`person` · `ort` · `institution` · `ereignis` · `werk` · `detail`

### Werte für rolle (nach typ)

**person.** verfasser, adressat, erwähnt, vertragspartner, unterzeichner, abgebildet

**ort.** entstehungsort, zielort, erwähnt, auffuehrungsort, wohnort, vertragsort

**institution.** vertragspartner, arbeitgeber, veranstalter, vermittler, adressat, erwähnt

**ereignis.** rahmenveranstaltung, premiere, auftritt, probe, implizit

**werk.** interpretin

**detail.** Feldname (z.B. honorar, publikationsorgan, kostüm_rolle)

## 6. Schicht 3 – Quellentyp-spezifische Felder

Schicht-3-Felder werden bei vertiefter Erschließung für Fallstudien erfasst. Sie werden in der **Verknüpfungstabelle** mit typ "detail" eingetragen. Der Feldname steht in der Spalte "name", der Wert in der Spalte "rolle".

### Erfassungsformat

| archivsignatur | typ | name | rolle | datum | anmerkung |
|---|---|---|---|---|---|
| UAKUG/NIM_028 | detail | honorar | 1.000 DM | | Julius Cäsar |
| UAKUG/NIM_028 | detail | nebenleistungen | Flugkosten Zürich-München | | |

### Typische Schicht-3-Felder nach Dokumenttyp

**Verträge**

| Feld | Beschreibung | FF-Bezug |
|---|---|---|
| honorar | Gage mit Währung und Bezugsgröße | FF1 |
| nebenleistungen | Reisekosten, Unterkunft etc. | FF4 |
| vermittlungsprovision | Prozentsatz und Aufteilung | FF3 |
| rundfunkrechte | Regelungen zu Übertragungen | FF1 |
| vertragslaufzeit | Beginn und Ende des Engagements | FF1 |

**Korrespondenz**

| Feld | Beschreibung | FF-Bezug |
|---|---|---|
| korrespondenztyp | privat, geschäftlich, offiziell | FF3 |
| vermittler | vermittelnde Person oder Institution | FF3 |
| repertoirehinweise | erwähnte Werke oder Partien | FF2 |

**Presse**

| Feld | Beschreibung | FF-Bezug |
|---|---|---|
| publikationsorgan | Name der Zeitung oder Zeitschrift | FF2 |
| rezensent | Verfasser der Kritik | FF2 |
| besprochene_auffuehrung | Datum und Ort der rezensierten Aufführung | FF2 |
| bewertungstendenz | positiv, neutral, negativ, gemischt | FF2 |

**Fotografien**

| Feld | Beschreibung | FF-Bezug |
|---|---|---|
| aufnahmeanlass | Bühnenszene, Porträt, Probe, privat | FF1 |
| kostüm_rolle | dargestellte Partie bei Bühnenfotos | FF2 |
| inszenierung | Regisseur und Jahr der Produktion | FF2 |

## 7. Kontrollierte Vokabulare

### dokumenttyp

`autobiografie` · `korrespondenz` · `vertrag` · `programm` · `presse` · `repertoire` · `studienunterlagen` · `identitaetsdokument` · `plakat` · `tontraeger` · `sammlung`

### sprache

`de` · `uk` · `en` · `fr` · `it`

### scan_status

`nicht_gescannt` · `gescannt` · `online`

### datierungsevidenz

`aus_dokument` · `erschlossen` · `extern` · `unbekannt`

### zugaenglichkeit

`offen` · `eingeschraenkt` · `gesperrt`

### fototyp

`sw` · `farbe` · `digital`

### typ (Verknüpfungstabelle)

`person` · `ort` · `institution` · `ereignis` · `werk` · `detail`

## 8. Rollen und Typen mit Definitionen

### Rollen für Personen

| Rolle | Definition |
|---|---|
| verfasser | hat das Dokument erstellt |
| adressat | ist Empfänger des Dokuments |
| erwähnt | wird im Dokument genannt |
| vertragspartner | ist Partei eines dokumentierten Vertrags |
| unterzeichner | hat das Dokument unterschrieben |
| abgebildet | ist auf Fotografie oder Abbildung zu sehen |

### Rollen für Orte

| Rolle | Definition |
|---|---|
| entstehungsort | wo das Dokument verfasst oder die Aufnahme gemacht wurde |
| zielort | wohin das Dokument gesendet wurde |
| erwähnt | wird im Dokument genannt |
| auffuehrungsort | wo eine dokumentierte Aufführung stattfand |
| wohnort | Wohnsitz einer im Dokument genannten Person |
| vertragsort | wo ein Vertrag geschlossen wurde |

### Rollen für Institutionen

| Rolle | Definition |
|---|---|
| vertragspartner | ist Partei eines dokumentierten Vertrags |
| arbeitgeber | Anstellungsverhältnis mit genannter Person |
| veranstalter | hat dokumentiertes Ereignis organisiert |
| vermittler | hat zwischen Parteien vermittelt |
| adressat | ist Empfänger des Dokuments |
| erwähnt | wird im Dokument genannt |

### Typen für Ereignisse

| Typ | Definition |
|---|---|
| rahmenveranstaltung | übergeordnetes Festival oder Spielzeit |
| premiere | Erstaufführung oder Premiere einer Neuinszenierung |
| auftritt | einzelne Vorstellung oder Konzert |
| probe | dokumentierte Probenarbeit |
| implizit | Ereignis wird indirekt erschlossen |

### Rollen für Werke

| Rolle | Definition |
|---|---|
| interpretin | Malaniuk trat in diesem Werk auf |

**Hinweis.** Die Rolle "erwähnt" entfällt für Werke. Wenn ein Werk ohne Auftrittsbezug zu Malaniuk genannt wird, ist es in der Regel nicht forschungsrelevant genug für die Erfassung.

## 9. Validierungsregeln

### Objekttabelle

**archivsignatur.** Regex `^UAKUG/NIM_\d{3}$` für Hauptbestand, `^UAKUG/NIM/PL_\d{2}$` für Plakate, `^UAKUG/NIM_TT_\d{2}$` für Tonträger. Muss eindeutig sein.

**box_nr.** Freitext. Typischerweise Boxnummer 1–10 oder Standortbezeichnung (siehe Abschnitt Standortfelder).

**entstehungsdatum.** ISO 8601 mit folgenden Formaten: `YYYY` | `YYYY-MM` | `YYYY-MM-DD` | `YYYY/YYYY` | `YYYY-MM-DD/YYYY-MM-DD`. Qualifier: `circa:1958` | `vor:1958` | `nach:1958`. Zeiträume im Format YYYY-MM-DD/YYYY-MM-DD sind die häufigste Variante.

**Kontrollierte Felder.** Nur Werte aus Vokabular zulässig (Dropdown).

### Fototabelle

**archivsignatur.** Regex `^UAKUG/NIM_FS_\d{3}$`. Muss eindeutig sein.

**fotobox_nr.** Freitext. Typischerweise Boxnummer 1–6 oder Standortbezeichnung (siehe Abschnitt Standortfelder).

**fototyp.** Nur Werte aus Vokabular (sw, farbe, digital).

**entstehungsdatum.** ISO 8601, identische Formate wie Objekttabelle.

### Verknüpfungstabelle

**archivsignatur.** Muss in Objekt- oder Fototabelle existieren.

**typ.** Nur Werte aus Vokabular (Dropdown).

**rolle.** Nur Werte aus Vokabular, abhängig vom typ (Dropdown).

**datum.** ISO 8601 (bei Ereignissen).

### Indextabellen

**m3gim_id.** Regex nach Präfix (P, O, L, W) + Zahl, eindeutig.

**wikidata_id.** Regex `^Q[0-9]+$` oder leer.

### Standortfelder

Die Felder box_nr und fotobox_nr sind Freitextfelder und akzeptieren heterogene Standortangaben aus dem Archiv. Neben numerischen Boxnummern kommen folgende Varianten vor:

- "Vitrine" – Ausstellungsobjekte in Vitrinen
- "LS I/05" – Sonderlagerung
- "FBox_01" – Fotoboxen
- "Stiegenhaus: Vitrine rechts, oberes Fach" – Vitrinen im Gebäude

Die Originalwerte aus dem Archivexport werden unverändert übernommen. Eine Normalisierung ist nicht vorgesehen, da die Standortangaben die physische Realität im Archiv abbilden.

## 10. Normdaten

**Primärquelle.** Wikidata (Q-IDs)

**Begründung.** Breite Abdeckung, einheitliche URIs, Verlinkung zu GND/VIAF/GeoNames, SPARQL-fähig.

**Format.** Erfassung: `Q94208`. Ausgabe: `https://www.wikidata.org/wiki/Q94208`.

**Workflow.** Wikidata-IDs werden nicht bei der Erfassung eingetragen, sondern nachträglich per Reconciliation ergänzt. In der Verknüpfungstabelle werden lesbare Namen erfasst, die Auflösung zu Wikidata erfolgt über die Indextabellen.

## 11. Entitätsindizes

Personen, Organisationen, Orte und Werke werden in separaten Indextabellen verwaltet (violett hinterlegt). Jede Entität erhält eine projektinterne ID. Die Wikidata-ID wird per Reconciliation ergänzt.

### ID-Schema

| Entitätstyp | Präfix | Beispiel |
|---|---|---|
| Personen | P | P1, P2, P3 |
| Organisationen | O | O1, O2, O3 |
| Orte | L | L1, L2, L3 |
| Werke | W | W1, W2, W3 |

### Personenindex

| Spalte | Beschreibung |
|---|---|
| m3gim_id | Projektinterne ID, Format P + laufende Nummer |
| name | Ansetzungsform des Namens |
| wikidata_id | Wikidata Q-ID, leer wenn nicht vorhanden |
| lebensdaten | Geburts- und Sterbejahr zur Disambiguierung |
| anmerkung | Freitext für Zusatzinformationen |

### Organisationsindex

| Spalte | Beschreibung |
|---|---|
| m3gim_id | Projektinterne ID, Format O + laufende Nummer |
| name | Ansetzungsform des Namens |
| wikidata_id | Wikidata Q-ID, leer wenn nicht vorhanden |
| ort | Sitz der Organisation zur Disambiguierung |
| anmerkung | Freitext für Zusatzinformationen |

### Ortsindex

| Spalte | Beschreibung |
|---|---|
| m3gim_id | Projektinterne ID, Format L + laufende Nummer |
| name | Ansetzungsform des Ortsnamens |
| wikidata_id | Wikidata Q-ID, leer wenn nicht vorhanden |
| land | Staat zur Disambiguierung |
| anmerkung | Freitext für Zusatzinformationen |

### Werkindex

| Spalte | Beschreibung |
|---|---|
| m3gim_id | Projektinterne ID, Format W + laufende Nummer |
| titel | Ansetzungsform des Werktitels |
| wikidata_id | Wikidata Q-ID, leer wenn nicht vorhanden |
| komponist | Urheber des Werks |
| anmerkung | Freitext für Zusatzinformationen |

### Verknüpfung zwischen Tabellen

In der Verknüpfungstabelle werden **lesbare Namen** eingetragen (z.B. "Malaniuk, Ira"), nicht die IDs. Die Zuordnung zwischen Name und Index erfolgt programmatisch beim Export. Ein Python-Skript prüft, ob alle Namen in der Verknüpfungstabelle im entsprechenden Index existieren, und meldet fehlende Einträge.

### Ereignisse

Ereignisse werden nicht indiziert, da sie in der Regel einmalig und dokumentgebunden sind. Sie werden direkt in der Verknüpfungstabelle mit typ "ereignis" erfasst.

## 12. Erfassungsworkflow

### Schritt 1: Objekt anlegen

In **M3GIM-Objekte** (Hauptbestand, Plakate, Tonträger) oder **M3GIM-Fotos** (Fotografien) eine neue Zeile mit allen Schicht-1-Feldern erfassen. Dropdowns für kontrollierte Felder nutzen.

### Schritt 2: Verknüpfungen erfassen

In **M3GIM-Verknuepfungen** für dasselbe Objekt (gleiche Archivsignatur) alle relevanten Verknüpfungen anlegen. Pro Verknüpfung eine Zeile.

### Schritt 3: Indizes pflegen

Neue Personen, Organisationen, Orte oder Werke in den entsprechenden Indextabellen anlegen. Die m3gim_id fortlaufend vergeben.

### Schritt 4: Details ergänzen (optional)

Bei vertiefter Erschließung Schicht-3-Felder in der Verknüpfungstabelle mit typ "detail" erfassen.

### Hinweise zur Praxis

- Vor dem Anlegen eines neuen Indexeintrags prüfen, ob die Entität bereits existiert
- Bei Unsicherheit über die korrekte Ansetzungsform eines Namens die Wikidata-Schreibweise verwenden
- Die Anmerkungsfelder nutzen, um Besonderheiten zu dokumentieren
- Bei Konvoluten (mehrere Einzelstücke unter einer Signatur) Rücksprache halten

## 13. Modellierungsbeispiele

### Beispiel 1: Gastvertrag NIM_028

**M3GIM-Objekte** (1 Zeile)

| archivsignatur | box_nr | titel | entstehungsdatum | datierungsevidenz | dokumenttyp | sprache | umfang | zugaenglichkeit | scan_status |
|---|---|---|---|---|---|---|---|---|---|
| UAKUG/NIM_028 | 4 | Gastvertrag Bayerische Staatsoper München, Münchner Sommerfestspiele 1958 | 1958-04-18 | aus_dokument | vertrag | de | 2 Blatt | eingeschraenkt | gescannt |

**M3GIM-Verknuepfungen** (18 Zeilen)

| archivsignatur | typ | name | rolle | datum | anmerkung |
|---|---|---|---|---|---|
| UAKUG/NIM_028 | person | Malaniuk, Ira | vertragspartner | | |
| UAKUG/NIM_028 | person | Hartmann, Rudolf | unterzeichner | | |
| UAKUG/NIM_028 | ort | München | vertragsort | | |
| UAKUG/NIM_028 | ort | Zürich | wohnort | | |
| UAKUG/NIM_028 | ort | Wien | erwähnt | | |
| UAKUG/NIM_028 | institution | Bayerische Staatsoper | vertragspartner | | |
| UAKUG/NIM_028 | institution | Bayerischer Rundfunk | erwähnt | | |
| UAKUG/NIM_028 | institution | Agentur Taubman | vermittler | | |
| UAKUG/NIM_028 | ereignis | Münchner Sommerfestspiele 1958 | rahmenveranstaltung | 1958-08-10/1958-09-09 | |
| UAKUG/NIM_028 | ereignis | Vorstellung Julius Cäsar | auftritt | 1958-08-11 | |
| UAKUG/NIM_028 | ereignis | Vorstellung Meistersinger | auftritt | 1958-08-17 | |
| UAKUG/NIM_028 | ereignis | Vorstellung Meistersinger | auftritt | 1958-08-25 | |
| UAKUG/NIM_028 | werk | Julius Cäsar | interpretin | | Händel |
| UAKUG/NIM_028 | werk | Die Meistersinger von Nürnberg | interpretin | | Wagner |
| UAKUG/NIM_028 | detail | honorar | 1.000 DM | | Julius Cäsar |
| UAKUG/NIM_028 | detail | honorar | 750 DM | | je Meistersinger |
| UAKUG/NIM_028 | detail | nebenleistungen | Flugkosten Zürich-München | | |
| UAKUG/NIM_028 | detail | vermittlungsprovision | 10% | | hälftig geteilt |

---

### Beispiel 2: Korrespondenz NIM_021

**M3GIM-Objekte** (1 Zeile)

| archivsignatur | box_nr | titel | entstehungsdatum | datierungsevidenz | dokumenttyp | sprache | umfang | zugaenglichkeit | scan_status |
|---|---|---|---|---|---|---|---|---|---|
| UAKUG/NIM_021 | 3 | Brief Ira Malaniuk an Hugo Zelzer, Österreichisches Kulturinstitut London | | erschlossen | korrespondenz | de | 1 Blatt | offen | gescannt |

**M3GIM-Verknuepfungen** (13 Zeilen)

| archivsignatur | typ | name | rolle | datum | anmerkung |
|---|---|---|---|---|---|
| UAKUG/NIM_021 | person | Malaniuk, Ira | verfasser | | |
| UAKUG/NIM_021 | person | Zelzer, Hugo | adressat | | |
| UAKUG/NIM_021 | person | Werba, Erik | erwähnt | | |
| UAKUG/NIM_021 | ort | Wien | entstehungsort | | |
| UAKUG/NIM_021 | ort | London | zielort | | |
| UAKUG/NIM_021 | institution | Österreichisches Kulturinstitut London | adressat | | |
| UAKUG/NIM_021 | ereignis | Geplanter Auftritt London | implizit | | |
| UAKUG/NIM_021 | werk | Oh, ihr Felder | interpretin | | Ukrainisches Lied |
| UAKUG/NIM_021 | werk | Wenn ich in die Weite der Steppe schaue | interpretin | | Ukrainisches Lied |
| UAKUG/NIM_021 | werk | Regentropfen | interpretin | | Ukrainisches Lied |
| UAKUG/NIM_021 | detail | vermittler | Prof. Werba | | FF3 |
| UAKUG/NIM_021 | detail | repertoirehinweise | ukrainische Lieder | | FF2, FF4 |
| UAKUG/NIM_021 | detail | wohnort_detail | Wien, Vormosergasse | | FF4 |

---

### Beispiel 3: Pressekritik NIM_004

**M3GIM-Objekte** (1 Zeile)

| archivsignatur | box_nr | titel | entstehungsdatum | datierungsevidenz | dokumenttyp | sprache | umfang | zugaenglichkeit | scan_status |
|---|---|---|---|---|---|---|---|---|---|
| UAKUG/NIM_004 | 1 | Kritik "Wieland Wagner inszeniert Glucks Orpheus", Münchner Merkur | 1953-08-06 | aus_dokument | presse | de | 1 Blatt | offen | gescannt |

**M3GIM-Verknuepfungen** (16 Zeilen)

| archivsignatur | typ | name | rolle | datum | anmerkung |
|---|---|---|---|---|---|
| UAKUG/NIM_004 | person | Malaniuk, Ira | erwähnt | | Titelpartie |
| UAKUG/NIM_004 | person | Wagner, Wieland | erwähnt | | Regisseur |
| UAKUG/NIM_004 | person | Knappertsbusch, Hans | erwähnt | | Dirigent |
| UAKUG/NIM_004 | person | Kupper, Annelies | erwähnt | | |
| UAKUG/NIM_004 | person | Fahberg, Antonie | erwähnt | | |
| UAKUG/NIM_004 | person | Schmidt-Garre, Helmut | verfasser | | Kritiker |
| UAKUG/NIM_004 | person | Erlenwein, Herbert | erwähnt | | Chorleiter |
| UAKUG/NIM_004 | ort | München | auffuehrungsort | | |
| UAKUG/NIM_004 | institution | Bayerische Staatsoper | veranstalter | | |
| UAKUG/NIM_004 | ereignis | Premiere Orpheus | premiere | 1953-08-05 | |
| UAKUG/NIM_004 | werk | Orfeo ed Euridice | interpretin | | Gluck |
| UAKUG/NIM_004 | detail | publikationsorgan | Münchner Merkur | | |
| UAKUG/NIM_004 | detail | rezensent | Helmut Schmidt-Garre | | |
| UAKUG/NIM_004 | detail | besprochene_auffuehrung | 1953-08-05, München | | |
| UAKUG/NIM_004 | detail | bewertungstendenz | positiv | | |
| UAKUG/NIM_004 | detail | malaniuk_bewertung | herrliche Stimme, noble Haltung | | |

---

### Beispiel 4: Fotografie NIM_FS_047

**M3GIM-Fotos** (1 Zeile)

| archivsignatur | alte_signatur | fotobox_nr | titel | entstehungsdatum | datierungsevidenz | beschreibung | stichwoerter | fotograf | fototyp | format | aufnahmeort | rechte | filename |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| UAKUG/NIM_FS_047 | | 3 | Ira Malaniuk als Orpheus | 1953 | erschlossen | Bühnenszene aus Glucks Orfeo ed Euridice, Bayerische Staatsoper. Malaniuk in antikem Kostüm mit Lyra | Orpheus; Gluck; Bayreuth; Wieland Wagner | Foto Festspielleitung Bayreuth | sw | 18x24 cm | München | | NIM_FS_047.jpg |

**M3GIM-Verknuepfungen** (8 Zeilen)

| archivsignatur | typ | name | rolle | datum | anmerkung |
|---|---|---|---|---|---|
| UAKUG/NIM_FS_047 | person | Malaniuk, Ira | abgebildet | | Titelpartie Orpheus |
| UAKUG/NIM_FS_047 | ort | München | entstehungsort | | Bayerische Staatsoper |
| UAKUG/NIM_FS_047 | institution | Bayerische Staatsoper | veranstalter | | |
| UAKUG/NIM_FS_047 | ereignis | Orpheus-Inszenierung Wieland Wagner | rahmenveranstaltung | 1953 | |
| UAKUG/NIM_FS_047 | werk | Orfeo ed Euridice | interpretin | | Gluck |
| UAKUG/NIM_FS_047 | detail | aufnahmeanlass | Bühnenszene | | |
| UAKUG/NIM_FS_047 | detail | kostüm_rolle | Orpheus | | Titelpartie |
| UAKUG/NIM_FS_047 | detail | inszenierung | Wieland Wagner, 1953 | | |

---

### Beispiel 5: Objekt mit Sonderstandort NIM_180

**M3GIM-Objekte** (1 Zeile)

| archivsignatur | box_nr | titel | entstehungsdatum | datierungsevidenz | dokumenttyp | sprache | umfang | zugaenglichkeit | scan_status |
|---|---|---|---|---|---|---|---|---|---|
| UAKUG/NIM_180 | Vitrine | Ehrenzeichen der Landeshauptstadt Graz in Gold für Ira Malaniuk | 1985 | aus_dokument | sammlung | de | 1 Stück | offen | nicht_gescannt |

Dieses Beispiel zeigt die Verwendung einer Standortbezeichnung statt einer numerischen Boxnummer.

---

**Zugehörige Indexeinträge** (für alle Beispiele)

| Index | m3gim_id | name | wikidata_id |
|---|---|---|---|
| Personen | P1 | Malaniuk, Ira | Q94208 |
| Personen | P2 | Hartmann, Rudolf | |
| Personen | P3 | Wagner, Wieland | Q61814 |
| Orte | L1 | München | Q1726 |
| Orte | L2 | Zürich | Q72 |
| Orte | L3 | Graz | Q13298 |
| Organisationen | O1 | Bayerische Staatsoper | Q681931 |
| Organisationen | O2 | Landeshauptstadt Graz | |
| Werke | W1 | Orfeo ed Euridice | Q913293 |
| Werke | W2 | Die Meistersinger von Nürnberg | Q190891 |

## 14. Offene Punkte (erfassungsbezogen)

| Thema | Status | Zuständigkeit |
|---|---|---|
| Vokabular dokumenttyp | Erweiterung nach Sichtung im Workshop | gemeinsam |
| Konvolut-Modellierung | Klärung im Erfassungsworkshop am 23.01. | gemeinsam |
| Signatur NIM_021 | Doppelvergabe prüfen | KUG |

---

*Version 2.1 – 2026-01-14*

**Änderungsprotokoll**

- v2.1: box_nr und fotobox_nr als Freitext dokumentiert (vorher Integer), Abschnitt Standortfelder in Validierungsregeln ergänzt, Datumsformat YYYY-MM-DD/YYYY-MM-DD explizit genannt, doppelten Google-Sheets-Link bereinigt, Beispiel 5 mit Sonderstandort ergänzt, offene Punkte aktualisiert (M3GIM-Fotos erledigt), Beispiele 1-3 um plausible box_nr ergänzt
- v2.0: Schicht 1 für Fotografien als eigener Abschnitt, Fototabelle dokumentiert, Beispiel 4 (Fotografie) ergänzt, fototyp als Vokabular, Validierungsregeln für Fototabelle, Farbschema um Orange erweitert, offene Punkte auf erfassungsbezogene Themen fokussiert
- v1.5: Verknüpfungstabelle als zentrales Erfassungsinstrument, Schicht 3 via typ "detail", Erfassungsworkflow
- v1.4: Google-Sheets-Links
- v1.3: Entitätsindizes mit ID-Schema
- v1.2: Rollendefinitionen, Schicht-3-Felder
- v1.1: Initiale Version