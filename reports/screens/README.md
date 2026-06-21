# Screenshot-Spur

Prüfbare visuelle Belege der Frontend-Arbeit, damit der Stand ohne eigenen Lauf gesichtet werden kann. Erzeugt headless über Playwright gegen `docs/` auf `localhost:8765`. Dateiname `YYYY-MM-DD-bereich-zustand.png`.

## 2026-06-21 Mobilitätskarte geschärft (E-114, Milestone-Runde)

| Datei | Zeigt |
|---|---|
| `2026-06-21-mobility-base.png` | Basisansicht. Label-Ausdünnung beschriftet nur die Hauptstationen (Wien, München, Zürich), der Rest bleibt entzerrt bis Hover oder Zoom. Im Detailstreifen der neue Knopf „3 abseits der Karte". |
| `2026-06-21-mobility-tooltip.png` | Knoten-Tooltip beim Überfahren von Wien: dominante Sicht (Performativ), Ereigniszahl (21), Zeitspanne (1956–1968). |
| `2026-06-21-mobility-offmap.png` | Off-Map-Panel. New York wird ehrlich als außerhalb des Kartenausschnitts projiziert ausgewiesen, mit Verweis auf den Koordinaten-Fehlmatch AF-01, statt off-canvas auszulaufen. |
| `2026-06-21-mobility-zoom.png` | In den Cluster gezoomt. Mehr Stationen werden sichtbar beschriftet (Salzburg, Stuttgart, Bayreuth, Paris), Font und Umriss bleiben gegen den Zoom bildschirmkonstant. |

Stand vor dem Live-Deploy: Code auf `main` gesichert, die öffentliche Ansicht (dhcraft.org/m3gim) wird nicht durch den Push aktualisiert. Diese Spur ist die Grundlage für die Freigabe.
