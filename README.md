# Bussgelder und Geschwindigkeitsverstoesse - App fuer den Open Data App-Store (ODAS)

Interaktive Visualisierung von Bussgeldern und Geschwindigkeitsverstoessen der Stadt Bonn fuer den [Open Data App Store](https://open-data-app-store.de/). Entspricht der [Open Data App-Spezifikation](https://open-data-apps.github.io/open-data-app-docs/open-data-app-spezifikation/). Mehr unter https://github.com/open-data-apps

---

## Funktionen

![Screenshot der Bussgeld-App](assets/Desktop_Screenshot_1.png)

![Screenshot der Bussgeld-App (Detailansicht)](assets/Desktop_Screenshot_2.png)

Single Page Application mit Logo, Menue, Impressum/Datenschutz/Kontakt-Seiten und Fusszeile. Die Konfiguration wird vom ODAS geladen. Inhalte:

- **Kennzahlen**: Gesamtanzahl Verstoesse, Gesamtbussgeldsumme, durchschnittliches Bussgeld, Anzahl Messpunkte
- **Verstoesse nach Monat**: Kombiniertes Chart (Balken fuer Anzahl, Linie fuer Bussgeldsumme)
- **Top-8 Verstoßkategorien**: Donut-Chart auf Basis TBNR-Codes
- **Filter**: Tatort-Freitext, Verstoßkategorie, Mindest-Bussgeld
- **Datentabelle**: Paginierte Detailansicht (50 Datensaetze pro Seite)
- **Jahresumschaltung**: Datensaetze 2021, 2022, 2023

---

## Datenformat

Unterstuetzt **CSV** (Semikolon-separiert, Windows-1252-kodiert).

---

## Kompatible Datensaetze

Datensaetze zu Geschwindigkeitsverstoessen mit folgenden Kernfeldern:

| Schema-Feld         | Beschreibung                     | Beispiel         |
| ------------------- | -------------------------------- | ---------------- |
| `TATTAG`            | Datum des Verstoßes (TT.MM.JJJJ) | `10.05.2023`     |
| `TATZEIT`           | Uhrzeit im HHmm-Format           | `1430`           |
| `TATORT`            | Ort/Strasse des Verstoßes        | `Mainzer Straße` |
| `TATBESTANDBE_TBNR` | Verstoßcode (Tatbestandskatalog) | `103205`         |
| `GELDBUSSE`         | Bussgeld in EUR                  | `55`             |

---

## Entwicklung

**Voraussetzungen:** Docker / Docker Compose, Make

```bash
make build up
```

App laeuft auf http://localhost:8089 (Konfiguration wird lokal geladen).

### Wichtige Dateien

| Datei                      | Beschreibung                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| `app/app.js`               | Hauptlogik: Datenladen, Aufbereitung, Filterung, Chart.js-Diagramme, Tabelle |
| `app-package.json`         | App-Metadaten und Instanz-Konfigurationsfelder fuer den ODAS                 |
| `assets/odas-app-icon.svg` | App-Icon                                                                     |
| `odas-config/config.json`  | Lokale Konfiguration fuer die Entwicklung                                    |
| `docker-compose.yml`       | Lokale Laufzeitumgebung                                                      |

---

## Konfiguration (Instanz)

| Parameter      | Beschreibung                                        | Pflicht |
| -------------- | --------------------------------------------------- | ------- |
| `apiurl`       | Basis-URL des Open-Data-Datensatzes / der Ressource | ja      |
| `urlDaten`     | URL zur Datensatz-Seite im ODP                      | ja      |
| `titel`        | Anzeigetitel der App                                | ja      |
| `seitentitel`  | Browser-Tab-Titel                                   | ja      |
| `kontakt`      | Inhalt der Kontaktseite (Markdown)                  | ja      |
| `beschreibung` | Inhalt der Seite "Ueber diese App" (Markdown)       | ja      |
| `impressum`    | Inhalt der Impressumsseite (Markdown)               | ja      |
| `datenschutz`  | Inhalt der Datenschutzseite (Markdown)              | ja      |
| `fusszeile`    | Text in der Fusszeile                               | ja      |

---

## Technische Hinweise

- **Proxy fuer CORS-Workaround**: CSV-Abrufe laufen ueber den lokalen Endpunkt `/odp-data?path=...` per `POST`.
- **Erwartete Proxy-Response**:

```json
{
  "content": "CSV-Rohdaten als String"
}
```

- **Bibliotheken**:
  - `PapaParse` fuer CSV-Parsing
  - `Chart.js` fuer Diagramme
  - `Bootstrap 5` fuer Layout und Komponenten

---

## Datenquellen (Bonn)

- **2023**: https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2023.csv
- **2022**: https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2022.csv
- **2021**: https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverst%C3%B6%C3%9Fe%202021.csv

Quelle: [opendata.bonn.de](https://opendata.bonn.de)

---

## Autor

© 2026, Ondics GmbH
