# M³GIM: Mapping Mobile Musicians

Digital Archive & Research Platform for Music Theater Mobility Studies

---

## Project Status

**Current Phase:** Fresh Start - Post-Prototype Implementation

This repository has been cleaned and is ready for the new implementation phase. All learnings from the prototype have been captured in [PROTOTYPE_LEARNINGS.md](PROTOTYPE_LEARNINGS.md).

---

## Project Overview

**M³GIM** (Mapping Mobile Musicians - Mobilität und Musiktheaterwissen im Graz der Nachkriegszeit am Beispiel der Sängerin Ira Malaniuk) is a digital humanities research project investigating transnational knowledge transfer in postwar music theater (1945-1969) through the lens of Ukrainian-Austrian mezzo-soprano Ira Malaniuk (1919-2009).

**Project Team:**
- Project Lead: Univ.-Prof.in Dr.in Nicole K. Strohmann (KUG Graz)
- Technical Implementation: Dr. Christopher Pollin (Digital Humanities Craft OG)

**Duration:** 01.01.2026 - 31.12.2026 (Phase 1: Feasibility Study)

---

## Research Questions

1. **RQ1 - Urban Culture:** How did singers shape Graz's music and theater culture?
2. **RQ2 - Genre Transformation:** Which narrative structures were influenced by migration?
3. **RQ3 - Knowledge Transfer:** How was ephemeral music theater knowledge transferred?
4. **RQ4 - Mobility Forms:** Which specific forms of mobility can be identified?

---

## Source Materials

**Archive:** Ira Malaniuk Estate (UAKUG/NIM)
**Location:** Universitätsarchiv der Kunstuniversität Graz
**Extent:** 182 archival units in 17 archive boxes
**Period:** 1924-1998 (focus: 1945-1969)

**Available Sources:** [data/sources/](data/sources/)
- Correspondence (Korrespondenz)
- Press clippings (Kritik)
- Concert programs (Programmzettel)
- Activity lists (Tätigkeitslisten)
- Contracts (Vertrag)
- Source compilation (MalaniukQuellenAuswahl)

---

## Repository Structure

```
m3gim/
├── data/
│   └── sources/           # PDF and DOCX source materials (21 MB)
├── PROTOTYPE_LEARNINGS.md # Complete knowledge from prototype phase
├── README.md              # This file
└── .gitignore
```

---

## Next Steps

The implementation will follow the lessons learned from the prototype phase:

1. Define clean data model (English field names, controlled vocabularies)
2. Set up automated processing pipeline (Python + GitHub Actions)
3. Build web catalog with embedded data (offline-first architecture)
4. Implement visualizations (network graphs, geographic maps, timeline)
5. Deploy to GitHub Pages

See [PROTOTYPE_LEARNINGS.md](PROTOTYPE_LEARNINGS.md) for detailed technical decisions and best practices.

---

## License

- Code: MIT License
- Data & Documentation: CC BY 4.0
- Source materials: See individual file rights

---

## Contact

- Project Lead: nicole.strohmann@kug.ac.at
- Technical Lead: christopher.pollin@gmail.com
- Repository: https://github.com/chpollin/malaniuk

---

Last Updated: 2026-01-12
