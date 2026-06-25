# Migration-Report v2 — UAKUG/NIM_137

Quellzeilen: 614  →  Zielzeilen: 1166

## Selbsttests

- [PASS] T1 Vollstaendigkeit (jede Quellzeile -> >=1 Zielzeile)
- [PASS] T2 Korrektheit (jede Zielzeile -> existierende Quellzeile)
- [PASS] T3 Token-Konservierung (Quellname vollstaendig im Output)
- [PASS] T4 Funktion-Konservierung (Funktionsrollen -> funktion-Zeile)
- [PASS] T5 Encoding-Guard (kein U+FFFD im Output)
- [PASS] T6 aktivitaet_id durchgehend leer

## Flag-Verteilung (Review-Hinweise)

- aktivitaet-trigger: 120
- alias: 10
- erwaehnung: 25
- komposit: 495
- name-form: 3
- vokab: 10

## Gold-Sample Folio 7_29 (Anleitungsbeispiel)

- Zielzeilen: 108
- Aktivitaets-Entitaeten vollstaendig: JA
- Alle Quell-Personen erhalten: JA