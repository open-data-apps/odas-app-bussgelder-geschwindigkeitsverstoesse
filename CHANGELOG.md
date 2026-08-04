# Changelog

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
