# Changelog

## 1.28.0 - 2026-08-22
- **CHG:** `version` in `app-package.json` zu `app-version` umbenannt.
- **ENH:** Top-Level-Feld `app-package-version` ergänzt (Wert `"2"`: mehrere benannte API-URLs über `instanz-config.apiurls`).

## 1.27.0 - 2026-08-21
- **CHG:** Die drei skalaren Felder `csvQuelle2021`, `csvQuelle2022`, `csvQuelle2023` durch das Array-Feld `apiurls` ersetzt (`typ: "array"`, Einträge `verstoesse-2021`, `verstoesse-2022`, `verstoesse-2023`). Neuer Standard portfolioweit; `app.js` liest jede Quelle jetzt über `getOdasApiUrl(configdata, "<name>")`.

## 1.26.0 - 2026-08-20
- Markdown-Metadaten: Paketbeschreibungen auf echtes Markdown umgestellt, exakte Identität Top-Level/Instanz hergestellt, lokale HTML-Fixture semantisch gespiegelt.

## 1.25.0 - 2026-08-20
- FIX: Verworfene Datensätze werden jetzt gezählt und als Hinweis angezeigt (F-73)
- FIX: Aktiver Fallback auf Bonn-Demodaten bei fehlendem `csvQuelleXXXX` wird jetzt sichtbar angezeigt statt kommentarlos verwendet (F-89)
- FIX: Encoding-Korrektur von einer festen Bonn-Ortsnamen-Liste auf generisches `TextDecoder("windows-1252")` umgestellt — funktioniert jetzt auch bei anderen Kommunen mit Windows-1252-kodierten Quellen (F-89)

## 1.24.0 - 2026-08-17
- `fetchOdasJson()` wirft jetzt bei nicht-JSON-Antworten (CSV, HTML, leerer Body) eine sprechende Konfigurationsfehlermeldung statt der rohen `JSON.parse`-Parserfehlermeldung (F-66)
- `urlDaten` zeigte auf einen nicht mehr existierenden Host (`offenedaten.esslingen.de`/`open-data-esslingen.de`, NXDOMAIN) bzw. auf den Platzhalter `.../testdaten` (HTTP 404) — jetzt auf die reale Datensatz-Landingpage der tatsächlich konfigurierten `apiurl`-Quelle verweisend, live per HTTP-Abruf verifiziert (F-67)

## 1.23.0 - 2026-08-17
- **CHG:** `instanz-config`-`category`-Vokabular auf Deutsch umgestellt (`allgemein`, `beschreibung`, `datenherkunft`, `kontakt-rechtliches`, `sonstiges`); die entfallenen Kategorien `metrics` und `advanced` wurden auf `beschreibung` bzw. `sonstiges` verteilt

## 1.22.0 - 2026-08-13
- FIX: Lifecycle-Ressourcen aufgeräumt (F-57): app() registriert je Container ein Teardown in einer instanzübergreifenden Map-Registry; `onPageLeave` ruft diese aus und leert sie — beide Chart-Instanzen (`chartMonat`, `chartTbnr`) werden per `.destroy()` abgeräumt, `loadToken` invalidiert alle noch laufenden Datenladevorgänge, `debounce` und der Ladeindikator-Hide-Timeout werden gecleart; beim Seitenwechsel entstehen keine Charts mehr und der Folge-Seiten-DOM bleibt unberührt

## 1.21.0 - 2026-08-12
- FIX: Instanzlokaler Jahres-Cache (F-55): der Bussgeld-Datenbestand wird statt im globalen `window._odas_cachedBussgelderDataMap` in einer instanzlokalen `dataCache`-Konstante verwaltet — getrennte App-Instanzen teilen keine Daten mehr über den window-weiten Cache

## 1.20.0 - 2026-08-12
- FIX: `app/index.html` auf den Template-Stand (F-47): Datei byte-gleich aus `oda-generic` übernommen — gültiges HTML, deutsche ARIA-Labels, Footer im Body; Titel und Fußzeile bleiben Platzhalter und werden zur Laufzeit aus der Instanz-Config überschrieben

## 1.19.0 - 2026-08-11
- FIX: Veraltete Antworten verwerfen (F-44): instanzlokaler `loadToken` – `loadData(year)` startet jeden Lauf mit neuem Token und prüft nach jeder await-Grenze (Cache-Pfad, CSV-Abruf, Parser, Skript-Loads) vor jeder State-/UI-Zuweisung, ob der Lauf noch aktuell ist; ein langsamer Vorjahres-Lauf kann das gewählte Jahr nicht mehr überschreiben, und der Cache-Eintrag wird nur vom aktuellsten Lauf geschrieben

## 1.18.0 - 2026-08-11
- FIX: XSS- und URL-Vertrag geschlossen (F-35): Fehlermeldungen `err.message` escaped; Testlink nur noch über `safeHttpUrl` (ungültiges Schema → kein Link)
- FIX: Netzverkehr angeglichen (F-36): Vorab-Request an die CSV-Domain entfernt — bei `proxyAktiv=ja` entsteht kein direkter Request mehr; das Datenfrische-Label fällt auf die `datenStand`-Konfiguration zurück

## 1.17.0 - 2026-08-07
- CHG: Bootstrap-Ziele instanzeindeutig (F-32): KPI-Kontext- und Methodik-Ziele (`#bg-kpi-kontext-<id>` und `#bg-methodik-body`) um eine Instanzkennung ergänzt — mehrere Instanzen derselben App auf einer Seite klappen ihre Panels unabhängig auf

## 1.16.0 - 2026-08-06
- FIX: DOM-Zugriffe auf den App-Container gescopt (F-25)

## 1.15.0 - 2026-08-06
- FIX: Datenschutzangabe beschreibt den tatsaechlichen Stand nach dem Vendoring (Welle G)

## 1.14.0 - 2026-08-06
- FIX: Drittanbieterliste "Beim Aufruf kontaktierte Drittanbieter" entfernt — alle Programmbibliotheken liegen jetzt lokal in `app/vendor/`, beim Aufruf werden keine externen Bibliotheksserver mehr kontaktiert

## 1.13.0 - 2026-08-06
- FIX: PapaParse vendored in `app/vendor/` statt von CDN geladen (Vendoring Teil 3) — Standalone-Betrieb laedt die Zusatzbibliotheken nicht mehr extern

## 1.12.0 - 2026-08-06
- FIX: Base auf Template oda-generic 1.6.0 vereinheitlicht (Hook renderPageOverride)

## 1.11.0 - 2026-08-04
- FIX: Datenschutzhinweis "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Bootstrap/Leaflet/Chart.js) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln, Zusatzbibliotheken) bleiben genannt

## 1.10.0 - 2026-08-04
- FIX: Bootstrap, Chart.js vendored in `app/vendor/` statt von CDN geladen (F-07 Teil 2) — Standalone-Betrieb laedt diese Bibliotheken nicht mehr extern

## 1.9.0 - 2026-08-04
- FIX: Chart.js-Version vereinheitlicht auf 4.4.9 (vorher uneinheitlich gepinnt oder ganz ungepinnt, laedt bei jedem Aufruf die neueste Version) — Voraussetzung fuer das geplante Vendoring (F-07 Teil 2)

## 1.8.0 - 2026-08-04
- FIX: Drittanbieter (CDN, Kartendienste) in `datenschutz`-Default und README dokumentiert (F-07 Teil 1)
- FIX: Bootstrap CSS/JS auf einheitlich 5.3.8 gezogen (vorher gemischt 5.3.0/5.3.1 bzw. 5.3.0/5.3.0) (F-31)

## 1.7.0 - 2026-07-31
- DOC: Standalone-Anleitung individualisiert (F-10) - `proxyAktiv` ist auf `nein` zu
  **setzen** statt zu belassen; Austausch der CSV-Quellen als eigener Schritt ergaenzt
- DOC: Standalone als eingeschraenkt gekennzeichnet

## 1.6.0 - 2026-07-31
- CHG: Platzhalter-Titel in der lokalen Konfiguration durch den echten App-Titel ersetzt

## 1.5.0 - 2026-07-31
- FIX: escapeHtml() von der DOM- auf die Regex-Variante umgestellt (F-08); die alte Fassung maskierte " und ' nicht
- FIX: Maskierung auf alle Daten- und Attributkontexte ausgedehnt (F-08)
- CHG: toter Konfigurationsschlüssel lizenz entfernt (F-17)
- CHG: brandingCSS und brandingCSSFile als Base-Abhängigkeiten deklariert und lokal gespiegelt (F-17)
- CHG: format.typ von "String" auf v1-sicheres "string" korrigiert (F-18)
- CHG: dropdown-Default auf Feldebene verschoben statt in format (F-18)
- FIX: daten.schema enthielt eine Feldbeschreibung statt eines Pfades; Beschreibung nach daten.beschreibung verschoben (F-19)

## 1.4.0 - 2026-07-30

- **FIX:** Laufzeitfehler nach dem Laden der Konfiguration werden jetzt sichtbar gemeldet; `handleRouting()` wird `await`et und besitzt einen Fehlerpfad. Bisher blieb die Seite bei einem Fehler im Seitenaufbau stumm leer
- **FIX:** `getConfigUrl()` schneidet bei einer URL ohne abschliessenden Schraegstrich nicht mehr das letzte Verzeichnis ab; die Konfiguration wird auch unter `.../app` gefunden
- **FIX:** Klick auf einen Hash-Link, der bereits die aktive Seite bezeichnet, rendert die Seite neu (`setupSamePageLinks()`) - das Logo fuehrt damit aus Unteransichten zurueck zur Startseite
- **ENH:** `app/app-base.js` ist wieder byte-identisch zum Template `oda-generic` 1.4.0; app-spezifisches Aufraeumen laeuft ueber den neuen Hook `onPageLeave(page)` in `app/app.js`
- **FIX:** Der Pfad zur Branding-CSS wird jetzt relativ zum App-Verzeichnis aufgeloest (`../assets/branding.css`); bisher wurde die Datei beim lokalen Test unterhalb von `app/` gesucht und deshalb nicht gefunden

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
