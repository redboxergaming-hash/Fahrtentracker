# Projektstatus (Snapshot)

Stand: 2026-04-12

## Fertig umgesetzt (im aktuellen Code)
- Grundgerüst als React + TypeScript + Vite + Tailwind App.
- Lokale Datenhaltung über Dexie (IndexedDB) für Fahrzeuge, Fahrten und Tankeinträge.
- Seiten für Dashboard, Fahrzeuge (Liste/Detail/Create/Edit), Fahrten (Liste/Detail/Create/Edit) und Live-Tracking.
- Stats-Seite als UI-Scaffold mit Filtern und Platzhaltern.

## Geplant / noch offen
- Vollständige Implementierung der Statistik-Darstellung (Karten/Charts an echte Berechnungen anbinden).
- Fuel- und Settings-Bereiche sind aktuell noch Platzhalter-Routen.
- E2E-Tests und robustere CI-Prüfungen.

## Aktuelle bekannte Probleme
- Sicherheitswarnungen aus `npm audit` in den installierten Abhängigkeiten.
- Browser-gestützte Screenshot-Automatisierung kann in dieser Umgebung abstürzen.
