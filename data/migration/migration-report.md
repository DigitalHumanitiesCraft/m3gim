# Migration-Report v2 — ALL

Quellzeilen: 3514  →  Zielzeilen: 5547

## Selbsttests

- [PASS] T1 Vollstaendigkeit (jede Quellzeile -> >=1 Zielzeile)
- [PASS] T2 Korrektheit (jede Zielzeile -> existierende Quellzeile)
- [PASS] T3 Token-Konservierung (Quellname vollstaendig im Output)
- [PASS] T4 Funktion-Konservierung (Funktionsrollen -> funktion-Zeile)
- [PASS] T5 Encoding-Guard (kein U+FFFD im Output)
- [PASS] T6 aktivitaet_id durchgehend leer

## Flag-Verteilung (Review-Hinweise)

- aktivitaet-trigger: 619
- alias: 14
- datum-format: 31
- erwaehnung: 682
- geld: 56
- komposit: 1260
- name-form: 6
- ort-rolle: 62
- unmapped: 1
- vokab: 399

## Gold-Sample Folio 7_29 (Anleitungsbeispiel)

- Zielzeilen: 108
- Aktivitaets-Entitaeten vollstaendig: JA
- Alle Quell-Personen erhalten: JA