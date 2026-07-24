# Changelog

## 1.3.0 - 2026-07-24

- **FIX:** Laufzeit-Fehlermeldung wird vor der Anzeige HTML-maskiert (`escapeHtmlForBase`); ein Fehlertext kann kein Markup mehr in die Seite einschleusen (XSS)
- **FIX:** Startseiten-Renderer wird nun `await`et; bei asynchronen Apps erscheint kein kurzzeitiges `[object Promise]` in `#main-content`

## 1.2.0 - 2026-07-23

- **ENH:** Datenabruf auf den Schalter `proxyAktiv` umgestellt; direkte Abrufe sind der Standard, der ODAS-Proxy wird nur noch bei `ja` verwendet
- **ENH:** Einfachen Standalone-Betrieb hinter Traefik mit derselben `odas-config/config.json` wie in der Entwicklung ergänzt
- **ENH:** Traefik-Anbindung auf das externe Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` festgelegt
- **FIX:** Proxy-Basispfad funktioniert jetzt auch bei URLs mit `index.html`; der Ziel-Pfad wird URL-kodiert
- **DOC:** `proxyAktiv` bleibt auf `ja` voreingestellt, weil opendata.bonn.de keinen CORS-Header sendet; Standalone-Betrieb erfordert eine CORS-freigegebene Datenquelle
- **DOC:** Start über `STANDALONE=true make up` dokumentiert

## 03.07.2026 (Version 1.1.0)

- **FEATURE**: Schale 4 – escapeHtml(), renderWeitereInfos(), Datenfrische via HTTP Last-Modified
- **ENH**: Datenfrische-Indikator liest Last-Modified-Header der CSV-Datei aus
- **ENH**: Weiterführende Links konfigurierbar (opendata.bonn.de, TBNR-Katalog)
- **ENH**: Für-wen-Abschnitt in der Beschreibung hinzugefügt
- **ENH**: CSS-Präfix `bg-` für app-spezifische Styles eingeführt
- **ENH**: escapeHtml()-Hilfsfunktion für sicheres HTML-Rendering von Textfeldern

## 31.03.2026 (Version 2.0.0)

- **FEATURE**: Implementierung als spezifische Bußgelder-App für Stadt Bonn
- **ENH**: CSV-Datenverarbeitung mit Windows-1252 Encoding und Semikolon-Trennzeichen
- **ENH**: Proxy-Endpunkt für CORS-Workaround (Datenabruf über `/odp-data`)
- **ENH**: KPI-Kacheln: Gesamtverstöße, Gesamtbußgelder, Durchschnittsbußgeld, Messpunkte
- **ENH**: Zeitreihen-Chart: Monatliche Verstöße mit Bußgeldsummen-Overlay
- **ENH**: Donut-Chart mit Top 8 Verstoßkategorien
- **ENH**: Umfangreiche Filterfunktion (Tatort-Freitext, Verstoßkategorie, Mindestbußgeld)
- **ENH**: Paginierte Tabellenansicht mit 50 Einträgen pro Seite
- **ENH**: Unterstützung multiple Datenjahre (2021, 2022, 2023) mit Jahr-Selector
- **ENH**: Progress-Indikator für Datenladevorgang
