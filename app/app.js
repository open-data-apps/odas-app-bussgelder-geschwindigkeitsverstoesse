/*
 * ODAS-App: Bußgelder & Geschwindigkeitsverstöße
 *
 * Datensätze: Stadt Bonn – Bußgelder fließender Verkehr (Lizenz: CC Zero)
 *   2021: resource/efef5c5b-decf-4479-922f-a1cc32eeaad2
 *   2022: resource/8393944a-b58e-4940-bb9c-791479e13d95
 *   2023: resource/d91a7a3e-d630-4391-b1ce-226837233b83
 *
 * Format: CSV, Semikolon, Windows-1252-Encoding
 * Felder:  TATTAG | TATZEIT | TATORT | TATBESTANDBE_TBNR | GELDBUSSE
 *
 * config.json:
 * {
 *   "apiurls": [
 *     { "name": "verstoesse-2023", "label": "CSV-Quelle 2023", "url": "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2023.csv" },
 *     { "name": "verstoesse-2022", "label": "CSV-Quelle 2022", "url": "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2022.csv" },
 *     { "name": "verstoesse-2021", "label": "CSV-Quelle 2021", "url": "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverst%C3%B6%C3%9Fe%202021.csv" }
 *   ],
 *   "titel":  "Bußgelder & Geschwindigkeitsverstöße"
 * }
 *
 * @param {Object} configdata              - Konfigurationsdaten aus config.json
 * @param         enclosingHtmlDivElement  - Umschließendes HTML-Element
 * @returns null
 */
function isOdasProxyEnabled(configdata = {}) {
  return String(configdata.proxyAktiv || "").trim().toLowerCase() === "ja";
}

function extractPathFromUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname + parsedUrl.search;
  } catch (_error) {
    return String(url || "");
  }
}

function getOdasAppBasePath(pathname) {
  let appPath =
    pathname === undefined
      ? typeof window !== "undefined"
        ? window.location.pathname
        : "/"
      : String(pathname || "/");

  if (!appPath.endsWith("/")) {
    const lastSlashIndex = appPath.lastIndexOf("/");
    const lastSegment = appPath.substring(lastSlashIndex + 1);
    if (lastSegment.includes(".")) {
      appPath = appPath.substring(0, lastSlashIndex + 1);
    }
  }

  return appPath.replace(/\/+$/, "");
}

function getOdasProxyEndpoint(targetUrl, pathname) {
  const appPath = getOdasAppBasePath(pathname);
  return `${appPath}/odp-data?path=${encodeURIComponent(targetUrl)}`;
}

async function fetchViaOdasProxy(targetUrl, options = {}) {
  if (typeof isKeineDatenquelleKonfiguriert === "function" && isKeineDatenquelleKonfiguriert(targetUrl)) {
    throw new Error("Keine Datenquelle konfiguriert.");
  } else if (typeof isKeineDatenquelleKonfiguriert !== "function") {
    const v = String(targetUrl || "").trim();
    if (!v || /^\{\{.*\}\}$/.test(v) || /^<.*>$/.test(v)) throw new Error("Keine Datenquelle konfiguriert.");
  }

  const response = await fetch(getOdasProxyEndpoint(targetUrl), {
    method: "POST",
    signal: options && options.signal ? options.signal : undefined,
  });

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch (_e) {}
    const originHint = /origin not allowed/i.test(body) ? " – URL origin not allowed" : "";
    throw new Error(`ODAS-Proxy-Fehler: HTTP ${response.status}${originHint}`);
  }

  const proxyData = await response.json();
  if (!proxyData || typeof proxyData.content !== "string") {
    throw new Error("ODAS-Proxy-Antwort enthält keinen content-String.");
  }

  return proxyData.content;
}

// F-89: `options.encoding` erlaubt es Aufrufern, die Rohbytes der Antwort mit
// einem expliziten Zeichensatz (z. B. "windows-1252") zu dekodieren, statt
// sich auf das UTF-8-Default von response.text() zu verlassen. Ohne Angabe
// bleibt das Verhalten unverändert (UTF-8 via response.text()) – betrifft
// also nur den direkten (Nicht-Proxy-)Abruf.
async function fetchOdasResource(targetUrl, configdata = {}, options = {}) {
  if (isOdasProxyEnabled(configdata)) {
    return fetchViaOdasProxy(targetUrl, options);
  }

  try {
    const response = await fetch(targetUrl, { signal: options.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (options.encoding) {
      const bytes = await response.arrayBuffer();
      return new TextDecoder(options.encoding).decode(bytes);
    }
    return response.text();
  } catch (error) {
    // Abbruch ist kein Fehlerfall – unverpackt weiterreichen, damit Aufrufer
    // ihn still behandeln können (BG-B4).
    if (error && error.name === "AbortError") throw error;
    throw new Error(
      `Direkter Datenabruf fehlgeschlagen (${error.message}). Bitte prüfen Sie die Daten-URL und die CORS-Freigabe der Datenquelle.`,
    );
  }
}

/**
 * Löst eine benannte Datenressource aus configdata.apiurls auf.
 * Neue apiurls-Form (typ: "array"); das frühere skalare apiurl wird nicht mehr gelesen.
 * @returns {string} getrimmte URL, oder "" für den Zustand "keine Quelle konfiguriert"
 */
function getOdasApiUrl(configdata, name) {
  const liste = Array.isArray(configdata && configdata.apiurls) ? configdata.apiurls : [];
  const treffer = liste.find((eintrag) => eintrag && eintrag.name === name);
  return String((treffer && treffer.url) || "").trim();
}

async function fetchOdasJson(targetUrl, configdata = {}) {
  const rawContent = await fetchOdasResource(targetUrl, configdata);
  try {
    return JSON.parse(rawContent);
  } catch (_error) {
    throw new Error(
      `Die konfigurierte Daten-URL liefert kein JSON, sondern ${describeNonJsonPayload(rawContent)}. ` +
        "Bitte in der Instanzkonfiguration den API-Endpunkt der Datenquelle eintragen, " +
        "nicht den Datensatz- oder Download-Link.",
    );
  }
}

function describeNonJsonPayload(rawContent) {
  const text = String(rawContent == null ? "" : rawContent).trim();
  if (!text) return "eine leere Antwort";
  if (text.startsWith("<")) return "eine HTML-Seite";
  const firstLine = text.split(/\r?\n/, 1)[0];
  if (/[,;]/.test(firstLine)) return "eine CSV- oder Textdatei";
  return "unlesbaren Inhalt";
}

function isKeineDatenquelleKonfiguriert(targetUrl) {
  const quelle = String(targetUrl || "").trim();
  return !quelle || /^\{\{.*\}\}$/.test(quelle) || /^<.*>$/.test(quelle);
}


const TYP_BEZEICHNUNG = {
  "ckan-dkan-ds": "Tabellen-API mit Daten-ID",
  "ckan-ps": "Datensatz-API",
  "ckan-dl": "Datei-Download",
  "ods21": "Open-Data-Suche (API v2.1)",
  "wfs": "Kartendienst (WFS)",
  "sparql": "Wissensdatenbank (SPARQL)",
  "csv-zip": "Statische Datei"
};

function validateUrlTypErwartung(url, erwarteterTyp) {
  const u = String(url || "");
  if (!erwarteterTyp || isKeineDatenquelleKonfiguriert(u)) return null;
  const checks = {
    "ckan-dkan-ds": /\/api\/3\/action\/datastore_search\?resource_id=/i,
    "ckan-ps": /\/api\/3\/action\/package_show\?id=/i,
    "ckan-dl": /\/dataset\/.*\/resource\/.*\/download\//i,
    "ods21": /\/api\/explore\/v2\.1\//i,
    "wfs": /service=WFS/i,
    "sparql": /\/api\/ts\/v1\/kg\/sparql/i,
    "csv-zip": /\.(csv|json|zip)(\?|$)/i
  };
  const re = checks[erwarteterTyp];
  if (!re) return null;
  if (!re.test(u)) {
    const soll = TYP_BEZEICHNUNG[erwarteterTyp] || erwarteterTyp;
    return `Typ passt nicht: erwartet „${soll}", erhalten „${u.slice(0, 60)}…". Prüfen Sie den Hilfe-Tooltip bei „URLs zu Datenressourcen".`;
  }
  return null;
}

function classifyOdasFehler(error, kontext = {}) {
  const msg = String((error && error.message) || error || "");
  const url = String(kontext.url || "");
  const label = String(kontext.label || "Datenressource");
  const typLabel = String(kontext.typLabel || TYP_BEZEICHNUNG[kontext.erwarteterTyp] || "Datenquelle");
  if (/Keine Datenquelle konfiguriert/i.test(msg) || isKeineDatenquelleKonfiguriert(url)) {
    return {
      kind: "KEINE_QUELLE",
      titel: "Es ist keine Datenquelle konfiguriert.",
      hinweis: `Prüfen Sie unter „URLs zu Datenressourcen → ${label}" ob eine gültige ${typLabel}-URL eingetragen ist (Hilfe-Tooltip beachten).`,
      detail: msg,
      alertClass: "alert-info"
    };
  }
  if (/Typ passt nicht: erwartet/i.test(msg)) {
    return {
      kind: "TYP_MISMATCH",
      titel: msg,
      hinweis: `Diese App erwartet ${typLabel}. Korrigieren Sie die URL gemäß Hilfe-Tooltip (Beispiel dort).`,
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/URL origin not allowed/i.test(msg)) {
    return {
      kind: "PROXY_ORIGIN",
      titel: "ODAS-Proxy blockiert: Ziel-Origin nicht freigegeben.",
      hinweis: "Tragen Sie die Ziel-Origin als eigenen Eintrag unter „URLs zu Datenressourcen“ ein oder prüfen Sie proxyAktiv.",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/ODAS-Proxy-Fehler/i.test(msg) || /kein content-String/i.test(msg)) {
    return {
      kind: "PROXY_HTTP",
      titel: msg,
      hinweis: "Prüfen Sie proxyAktiv und Erreichbarkeit im ODAS-Live-System (lokal 404 ist normal).",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/Direkter Datenabruf fehlgeschlagen/i.test(msg) || /Failed to fetch/i.test(msg)) {
    const corsHint = /Failed to fetch/i.test(msg) ? " – vermutlich CORS blockiert → im ODAS-Live proxyAktiv=ja." : "";
    return {
      kind: "DIREKT_CORS_HTTP",
      titel: msg,
      hinweis: `Prüfen Sie URL und CORS der Quelle${corsHint}`,
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/liefert kein JSON/i.test(msg) || /HTML-Seite|CSV-|leere Antwort|unlesbaren/i.test(msg)) {
    return {
      kind: "PAYLOAD_TYP",
      titel: msg,
      hinweis: "Tragen Sie den passenden Endpunkt ein – nicht die Datensatzseite (/dataset/…) – Hilfe-Tooltip beachten.",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/CKAN.*Fehler|success:false/i.test(msg)) {
    return {
      kind: "CKAN_API",
      titel: msg,
      hinweis: "Prüfen Sie Daten-ID / Datensatz-ID (existiert die Tabelle/Datei noch auf dem Portal?).",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  if (/404|Nicht gefunden/i.test(msg)) {
    return {
      kind: "HTTP_404",
      titel: msg,
      hinweis: "Ressource/Datensatz auf dem Portal nicht gefunden (404).",
      detail: msg,
      alertClass: "alert-danger"
    };
  }
  return {
    kind: "UNBEKANNT",
    titel: msg || "Unbekannter Fehler beim Laden.",
    hinweis: "Prüfen Sie Konfiguration und Erreichbarkeit der Quelle.",
    detail: msg,
    alertClass: "alert-danger"
  };
}

function renderOdasFehler(container, error, kontext = {}) {
  if (!container) return;
  const typWarn = validateUrlTypErwartung(kontext.url, kontext.erwarteterTyp);
  if (typWarn && !/Typ passt nicht/i.test(String(error && error.message))) {
    error = new Error(typWarn);
  }
  const info = classifyOdasFehler(error, kontext);
  const url = String(kontext.url || "");
  const urlZeile = url ? `<p class="mb-1 small text-muted">Konfigurierte URL: <code>${escapeHtml(url.length > 80 ? url.slice(0, 80) + "…" : url)}</code></p>` : "";
  const titel = kontext.leer ? "Keine Datensätze gefunden." : info.titel;
  const alertClass = kontext.leer ? "alert-info" : info.alertClass;
  container.innerHTML = `<div class="alert ${alertClass}" role="alert"><strong>${escapeHtml(titel)}</strong><p class="mb-1">${escapeHtml(info.hinweis)}</p>${urlZeile}<details class="small"><summary>Details</summary><code>${escapeHtml(info.detail || String(error))}</code></details></div>`;
}

let bgInstanzZaehler = 0;

// F-57: instanzuebergreifende Lifecycle-Registry, keyed by Container. Jede
// app()-Instanz registriert ihr Teardown hier; onPageLeave (von app/app-base.js
// vor dem Seitenwechsel aufgerufen) fuehrt alle soweit moeglich aus und leert
// die Registry.
const bgLifecycleCleanups = new Map();

function onPageLeave() {
  bgLifecycleCleanups.forEach((cleanup) => {
    if (typeof cleanup !== "function") return;
    try {
      cleanup();
    } catch (error) {
      console.warn("Fehler beim Abraeumen der Bussgeld-Instanz:", error);
    }
  });
  bgLifecycleCleanups.clear();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeHttpUrl(value) {
  const s = String(value || "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

function app(configdata, enclosingHtmlDivElement) {
  const bgUid = "i" + ++bgInstanzZaehler;
  // ── Konfiguration ─────────────────────────────────────────────────────────────
  const TITLE =
    (configdata && configdata.titel) || "Bußgelder & Geschwindigkeitsverstöße";

  // F-89: Feldname je Jahr + hartkodierte Bonn-Demo-URL als Fallback, falls
  // das jeweilige Pflichtfeld in der Instanz-Config fehlt. csvFallbackFields
  // sammelt, welche Jahre tatsächlich auf die Demo-URL zurückfallen, damit
  // ein sichtbarer Hinweis (statt eines stillen Fallbacks) gerendert werden
  // kann.
  const CSV_FIELD_NAMES = {
    2023: "verstoesse-2023",
    2022: "verstoesse-2022",
    2021: "verstoesse-2021",
  };
  const CSV_FALLBACK_URLS = {
    2023: "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2023.csv",
    2022: "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2022.csv",
    2021: "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverst%C3%B6%C3%9Fe%202021.csv",
  };
  const csvFallbackFields = Object.keys(CSV_FALLBACK_URLS).filter(
    (year) => !getOdasApiUrl(configdata, CSV_FIELD_NAMES[year]),
  );
  const CSV_SOURCES = {};
  Object.keys(CSV_FALLBACK_URLS).forEach((year) => {
    CSV_SOURCES[year] =
      getOdasApiUrl(configdata, CSV_FIELD_NAMES[year]) ||
      CSV_FALLBACK_URLS[year];
  });

  // Bundeseinheitlicher Tatbestandskatalog – wichtigste Codes
  const TBNR_LABELS = {
    103202: "Innerorts ≤10 km/h zu schnell",
    103203: "Innerorts 11–15 km/h zu schnell",
    103204: "Innerorts 16–20 km/h zu schnell",
    103205: "Innerorts 21–25 km/h zu schnell",
    103206: "Innerorts 26–30 km/h zu schnell",
    103207: "Innerorts 31–40 km/h zu schnell",
    103208: "Innerorts 41–50 km/h zu schnell",
    103209: "Innerorts >50 km/h zu schnell",
    141236: "Außerorts ≤10 km/h zu schnell",
    141237: "Außerorts 11–15 km/h zu schnell",
    141238: "Außerorts 16–20 km/h zu schnell",
    141239: "Außerorts 21–25 km/h zu schnell",
    141240: "Außerorts 26–30 km/h zu schnell",
    141241: "Außerorts 31–40 km/h zu schnell",
    141242: "Außerorts 41–50 km/h zu schnell",
    141243: "Außerorts >50 km/h zu schnell",
    141712: "Autobahn ≤10 km/h zu schnell",
    141721: "Autobahn 11–15 km/h zu schnell",
    141722: "Autobahn 16–20 km/h zu schnell",
    141723: "Autobahn 21–25 km/h zu schnell",
    141724: "Autobahn 26–30 km/h zu schnell",
    141725: "Autobahn 31–40 km/h zu schnell",
    141726: "Autobahn 41–50 km/h zu schnell",
  };

  const MONTHS = [
    "Jan",
    "Feb",
    "Mär",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ];
  const CHART_COLORS = [
    "#2563eb",
    "#dc2626",
    "#d97706",
    "#059669",
    "#7c3aed",
    "#db2777",
    "#0284c7",
    "#ca8a04",
    "#16a34a",
    "#ea580c",
  ];

  // ── App-State ─────────────────────────────────────────────────────────────────
  let allData = [];
  const dataCache = {}; // F-55: instanzlokaler Jahres-Cache – keine globale Kollision
  const discardedCache = {}; // F-73: instanzlokaler Cache der Verwerfungszahl je Jahr
  let filteredData = [];
  let currentYear = "2023";
  let currentPage = 0;
  let debounce = null;
  let loadToken = 0; // F-44: monotoner Request-Token – nur der aktuellste Lauf schreibt State/UI
  let chartMonat = null;
  let chartTbnr = null;
  const PAGE_SIZE = 50;
  let disposed = false; // F-57: nach onPageLeave keine UI-Mutation mehr
  let loadingHideTimer = null; // F-57: Handle fuer den Ladeindikator-Hide-Timeout
  let loadController = null; // BG-B4: AbortController des laufenden CSV-Abrufs
  let compareController = null; // Jahresvergleich: eigener Abruf-Lauf
  let compareMode = false; // Jahresvergleich aktiv?

  // ── Lifecycle-Registrierung (F-57) ─────────────────────────────────────────
  // Synchron nach allen lokalen State-Deklarationen, vor DOM-/Async-Arbeit.
  // BG-B1: Vorgänger-Instanz desselben Containers zuerst abräumen — sonst
  // leaken bei Same-Page-Re-Render beide Chart-Instanzen.
  const bgVorherigerCleanup = bgLifecycleCleanups.get(enclosingHtmlDivElement);
  if (bgVorherigerCleanup) {
    try {
      bgVorherigerCleanup();
    } catch (_e) {}
  }
  bgLifecycleCleanups.set(enclosingHtmlDivElement, () => {
    disposed = true;
    loadToken++; // F-57: alle in-flight Loads (F-44-Token) invalidieren
    if (loadController) {
      loadController.abort();
      loadController = null;
    }
    if (compareController) {
      compareController.abort();
      compareController = null;
    }
    if (chartMonat) {
      chartMonat.destroy();
      chartMonat = null;
    }
    if (chartTbnr) {
      chartTbnr.destroy();
      chartTbnr = null;
    }
    if (debounce) {
      clearTimeout(debounce);
      debounce = null;
    }
    if (loadingHideTimer) {
      clearTimeout(loadingHideTimer);
      loadingHideTimer = null;
    }
  });

  // ── Basis-HTML rendern ────────────────────────────────────────────────────────
  const el = enclosingHtmlDivElement;
  el.innerHTML = `

    <div class="bg-app rounded-3 p-3 p-md-4">

      <!-- ── Kopfzeile ── -->
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h5 class="fw-bold mb-1">🚦 ${escapeHtml(TITLE)}</h5>
          <div class="text-muted small">
            Quelle: Stadt Bonn – Ordnungsamt &nbsp;·&nbsp;
            <a href="https://opendata.bonn.de" target="_blank" rel="noopener" class="text-muted">opendata.bonn.de</a>
            &nbsp;·&nbsp; Lizenz: CC Zero
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <label for="app-jahr-${bgUid}" class="form-label mb-0 fw-semibold text-nowrap">Datenjahr:</label>
          <select id="app-jahr-${bgUid}" class="form-select form-select-sm" style="min-width:90px">
            ${Object.keys(CSV_SOURCES)
              .map(
                (y) =>
                  `<option value="${y}"${y === currentYear ? " selected" : ""}>${y}</option>`,
              )
              .join("")}
          </select>
          <div class="form-check form-switch mb-0 ms-2">
            <input class="form-check-input" type="checkbox" role="switch" id="app-vergleich-${bgUid}">
            <label class="form-check-label small fw-semibold text-nowrap" for="app-vergleich-${bgUid}">Jahresvergleich</label>
          </div>
        </div>
      </div>

      <!-- ── Konfigurations-Fallback-Hinweis (F-89) ── -->
      <div id="bg-fallback-hinweis" class="alert alert-info py-2 px-3 mb-3 small d-none" role="alert"></div>

      <!-- ── Datenfrische ── -->
      <div id="bg-datenstand-row" class="text-end mb-2 d-none">
        <small id="bg-datenstand" class="text-muted"></small>
      </div>

      <!-- ── Ladeindikator ── -->
      <div id="app-loading" class="mb-4">
        <div class="d-flex align-items-center gap-3 mb-2">
          <div class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
          <span id="loading-text" class="text-muted small">Daten werden geladen …</span>
        </div>
        <div class="progress-wrap">
          <div id="loading-bar" class="progress-fill"></div>
        </div>
      </div>

      <!-- ── Fehlermeldung ── -->
      <div id="app-error" class="alert alert-danger d-none" role="alert"></div>

      <!-- ── Verworfene Datensätze (F-73) ── -->
      <div id="bg-verworfen-hinweis" class="alert alert-info py-2 px-3 mb-3 small d-none" role="alert"></div>

      <!-- ── KPI-Kacheln ── -->
      <div id="app-kpis" class="row g-3 mb-4 d-none">
        <div class="col-6 col-lg-3">
          <div class="kpi-card" style="background:linear-gradient(135deg,#2563eb,#1e40af)">
            <span class="kpi-ico">⚡</span>
            <div class="kpi-val" id="kpi-anzahl">–</div>
            ${kpiContext(configdata.kpiKontext1, "1")}
            <div class="kpi-lbl">Verstöße gesamt</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="kpi-card" style="background:linear-gradient(135deg,#dc2626,#9b1c1c)">
            <span class="kpi-ico">💶</span>
            <div class="kpi-val" id="kpi-summe">–</div>
            ${kpiContext(configdata.kpiKontext2, "2")}
            <div class="kpi-lbl">Bußgelder gesamt (€)</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="kpi-card" style="background:linear-gradient(135deg,#d97706,#92400e)">
            <span class="kpi-ico">📊</span>
            <div class="kpi-val" id="kpi-avg">–</div>
            ${kpiContext(configdata.kpiKontext3, "3")}
            <div class="kpi-lbl">Ø Bußgeld (€)</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="kpi-card" style="background:linear-gradient(135deg,#059669,#064e3b)">
            <span class="kpi-ico">📍</span>
            <div class="kpi-val" id="kpi-orte">–</div>
            ${kpiContext(configdata.kpiKontext4, "4")}
            <div class="kpi-lbl">Messpunkte (Orte)</div>
          </div>
        </div>
      </div>

      <!-- ── Filter ── -->
      <div id="app-filter" class="card border-0 shadow-sm mb-4 d-none">
        <div class="card-body py-3">
          <div class="row g-2 align-items-end">
            <div class="col-12 col-md-5">
              <label class="form-label form-label-sm mb-1 fw-semibold">🔍 Tatort (Freitext)</label>
              <input type="text" id="filter-ort" class="form-control form-control-sm"
                     placeholder="z. B. Mainzer Straße, Kennedyallee …">
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label form-label-sm mb-1 fw-semibold">Verstoßkategorie</label>
              <select id="filter-tbnr" class="form-select form-select-sm">
                <option value="">Alle Kategorien</option>
              </select>
            </div>
            <div class="col-6 col-md-2">
              <label class="form-label form-label-sm mb-1 fw-semibold">Bußgeld min. (€)</label>
              <input type="number" id="filter-min" class="form-control form-control-sm"
                     min="0" step="5" value="0">
            </div>
            <div class="col-6 col-md-1 d-grid">
              <button id="filter-reset" class="btn btn-sm btn-outline-secondary" title="Filter zurücksetzen">↺</button>
            </div>
          </div>
          <div class="mt-2 text-muted small" id="filter-info"></div>
        </div>
      </div>

      <!-- ── Charts ── -->
      <div id="app-charts" class="row g-4 mb-4 d-none">
        <div class="col-12 col-lg-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="card-title text-muted mb-3">📅 Verstöße nach Monat</h6>
              <canvas id="chart-monat"></canvas>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex flex-column">
              <h6 class="card-title text-muted mb-3">🏷️ Top Verstoßkategorien</h6>
              <div class="flex-grow-1 d-flex align-items-center">
                <canvas id="chart-tbnr"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Jahresvergleich (alle Jahre, aktuelle Filter) ── -->
      <div id="app-vergleich" class="card border-0 shadow-sm mb-4 d-none">
        <div class="card-body">
          <h6 class="card-title text-muted mb-1">📊 Jahresvergleich</h6>
          <p class="text-muted small mb-3">Alle Jahre mit den aktuellen Filtern (Tatort, Kategorie, Bußgeld min.) - unabhängig vom gewählten Datenjahr.</p>
          <div id="vergleich-body"></div>
        </div>
      </div>

      <!-- ── Tabelle ── -->
      <div id="app-table" class="card border-0 shadow-sm d-none">
        <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
          <span class="fw-semibold small">Einzelverstöße</span>
          <div class="d-flex align-items-center gap-2">
            <button id="bg-btn-export" type="button" class="btn btn-sm btn-outline-secondary" title="Gefilterte Einzelverstöße als CSV laden">CSV-Export</button>
            <span id="table-info" class="text-muted" style="font-size:.8rem"></span>
          </div>
        </div>
        <div class="table-scroll">
          <table class="table table-sm table-hover mb-0 align-middle">
            <thead class="table-light" style="position:sticky;top:0;z-index:1">
              <tr>
                <th style="width:100px">Datum</th>
                <th style="width:70px">Uhrzeit</th>
                <th>Tatort</th>
                <th>Verstoßkategorie</th>
                <th class="text-end" style="width:100px">Bußgeld</th>
              </tr>
            </thead>
            <tbody id="table-body"></tbody>
          </table>
        </div>
        <div class="card-footer bg-white py-2" id="pagination"></div>
      </div>

      <!-- ── Weitere Informationen ── -->
      <div id="bg-weitere-infos-section"></div>
      <div id="bg-methodik-section"></div>

    </div>
  `;

  // F-89: Sichtbarer Hinweis, wenn eine oder mehrere apiurls.verstoesse-XXXX-Pflichteintraege
  // fehlen und deshalb auf die hartkodierte Bonn-Demo-URL zurückgefallen wird.
  // Info-Stil (nicht Fehler-Stil), da es sich um einen Konfigurationszustand
  // und keinen App-Fehler handelt.
  if (csvFallbackFields.length) {
    const hintEl = el.querySelector("#bg-fallback-hinweis");
    if (hintEl) {
      const fieldListHtml = csvFallbackFields
        .map((year) => "<code>" + CSV_FIELD_NAMES[year] + "</code>")
        .join(", ");
      const verb = csvFallbackFields.length > 1 ? "sind" : "ist";
      const jahre = csvFallbackFields.join(", ");
      hintEl.innerHTML =
        "Hinweis: Für " +
        (csvFallbackFields.length > 1 ? "die Jahre " : "das Jahr ") +
        escapeHtml(jahre) +
        " werden Bonn-Demodaten angezeigt, da " +
        fieldListHtml +
        " nicht konfiguriert " +
        verb +
        ".";
      hintEl.classList.remove("d-none");
    }
  }

  // ── Hilfsfunktionen ───────────────────────────────────────────────────────────

  function fmt(n) {
    return Number(n).toLocaleString("de-DE");
  }
  function fmtEur(n) {
    return Number(n).toLocaleString("de-DE") + "\u202F€";
  }
  function tbnrLabel(code) {
    const c = (code || "").trim();
    return TBNR_LABELS[c] || "TBNR " + c;
  }
  function formatTime(t) {
    const s = String(t || "").padStart(4, "0");
    return s.substring(0, 2) + ":" + s.substring(2, 4);
  }
  function getMonth(tattag) {
    const parts = (tattag || "").split(".");
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      if (m >= 1 && m <= 12) return m - 1;
    }
    return -1;
  }

  function normalizeCsvText(value) {
    if (typeof value !== "string") return value;

    // F-89: Die eigentliche Encoding-Korrektur passiert jetzt beim Abruf
    // (fetchCsvText -> fetchOdasResource mit { encoding: "windows-1252" }),
    // per TextDecoder direkt auf den Rohbytes der Antwort - das funktioniert
    // generisch fuer jede Windows-1252-kodierte Quelle, nicht nur fuer Bonn.
    // Die vormals hier gepflegte feste Liste bekannt kaputter Bonner
    // Ortsnamen (z. B. "K�ln"->"Köln") ist dadurch hinfaellig und wurde
    // entfernt, da U+FFFD-Ersatzzeichen beim Abruf ohnehin nicht mehr
    // entstehen.
    //
    // Verbleibend: typische Mojibake-Sequenzen, bei denen urspruenglich
    // UTF-8-kodierter Text faelschlich als Latin-1/CP1252 gelesen wurde
    // (z. B. ueber den ODAS-Proxy, dessen serverseitige Dekodierung dieser
    // Client-Fix nicht beeinflussen kann). Das ist eine allgemeine
    // Zeichen-Korrektur, keine Bonn-spezifische Ortsnamen-Liste.
    const mojibakeMap = {
      "Ã„": "Ä",
      "Ã–": "Ö",
      Ãœ: "Ü",
      "Ã¤": "ä",
      "Ã¶": "ö",
      "Ã¼": "ü",
      ÃŸ: "ß",
      "â€“": "–",
      "â€”": "—",
      "â€ž": "„",
      "â€œ": "“",
      "â€": "”",
      "â€˜": "‘",
      "â€™": "’",
    };

    let fixed = value;
    Object.entries(mojibakeMap).forEach(([broken, correct]) => {
      fixed = fixed.split(broken).join(correct);
    });

    return fixed;
  }

  function show(id) {
    el.querySelector(id).classList.remove("d-none");
  }
  function hide(id) {
    el.querySelector(id).classList.add("d-none");
  }
  function setBar(p) {
    el.querySelector("#loading-bar").style.width = p + "%";
  }

  // F-73: Zeigt an, wie viele CSV-Zeilen beim Parsen verworfen wurden (fehlendes
  // Datum, Tatort, Tatbestand oder ein nicht-numerisches Bußgeld) – statt sie
  // stillschweigend aus der Auswertung zu entfernen.
  function renderVerworfenHinweis(count) {
    const hintEl = el.querySelector("#bg-verworfen-hinweis");
    if (!hintEl) return;
    if (count > 0) {
      hintEl.textContent =
        fmt(count) +
        " Datensatz/Datensätze ohne gültiges Datum, Tatort, Tatbestand oder Bußgeld wurden beim Laden übersprungen.";
      hintEl.classList.remove("d-none");
    } else {
      hintEl.classList.add("d-none");
      hintEl.textContent = "";
    }
  }

  function loadScript(src) {
    // BG-B3: Ein bereits eingefügter, aber noch nicht fertig geladener
    // Script-Tag wurde vorher sofort als „geladen“ gewertet. Bei schnellem
    // Jahreswechsel fehlten Papa/Chart dann noch und der Lauf brach mit einem
    // ReferenceError ab. Jetzt wird auf denselben Ladevorgang gewartet.
    return new Promise((resolve, reject) => {
      const fehler = () =>
        reject(new Error("Script konnte nicht geladen werden: " + src));
      const vorhanden = document.querySelector('script[src="' + src + '"]');
      if (vorhanden) {
        if (vorhanden.bgGeladen) {
          resolve();
          return;
        }
        vorhanden.addEventListener("load", () => resolve());
        vorhanden.addEventListener("error", fehler);
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => {
        s.bgGeladen = true;
        resolve();
      };
      s.onerror = fehler;
      document.head.appendChild(s);
    });
  }

  async function fetchCsvText(url, signal) {
    // CSV laden: direkt oder ueber den ODAS-Proxy (proxyAktiv).
    // Kein Vorab-Request an die CSV-Domain mehr (F-36); lastModified bleibt null,
    // die Datenfrische stammt aus der datenStand-Konfiguration.
    // F-89: Die Bonner Quellen sind laut README Windows-1252-kodiert (siehe
    // Datei-Kopfkommentar). Beim direkten Abruf (ohne Proxy) werden die
    // Rohbytes deshalb explizit als Windows-1252 dekodiert statt über das
    // UTF-8-Default von response.text() – das funktioniert generisch für
    // jede Windows-1252-kodierte CSV-Quelle, nicht nur für Bonner Ortsnamen.
    // BG-B4: `signal` bricht einen laufenden (mehrere MB großen) Download beim
    // Jahres-/Seitenwechsel ab, statt ihn bis zum Ende durchlaufen zu lassen.
    const content = await fetchOdasResource(url, configdata, {
      encoding: "windows-1252",
      signal,
    });

    return { content: content, lastModified: null };
  }

  // ── CSV laden & parsen ────────────────────────────────────────────────────────

  // Gemeinsamer Parse-Schritt für den Jahreslauf und den Jahresvergleich:
  // Semikolon-CSV, nur vollständige Zeilen; die Differenz wird als
  // „verworfen“ zurückgegeben (F-73).
  function parseCsvZuRecords(csvText) {
    const result = Papa.parse(csvText, {
      delimiter: ";",
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => normalizeCsvText(v).trim(),
    });
    const parsedTotal = result.data.length;
    const records = result.data.filter(
      (r) =>
        r.TATTAG &&
        r.TATORT &&
        r.TATBESTANDBE_TBNR &&
        r.GELDBUSSE &&
        !isNaN(parseInt(r.GELDBUSSE, 10)),
    );
    return { records: records, discarded: parsedTotal - records.length };
  }

  async function loadData(year) {
    const url = CSV_SOURCES[year];    const bgKontext = {
      url,
      label: `Verstoße-CSV ${year}`,
      typLabel: "Statische Datei",
      erwarteterTyp: "csv-zip",
    };
    if (!url) {
      hide("#app-loading");
      renderOdasFehler(el, new Error("Keine Datenquelle konfiguriert."), bgKontext);
      return;
    }
    // Variante A (F-92): Typprüfung vor dem ersten Fetch.
    const bgTypWarn = validateUrlTypErwartung(url, "csv-zip");
    if (bgTypWarn) {
      hide("#app-loading");
      renderOdasFehler(el, new Error(bgTypWarn), bgKontext);
      return;
    }

    // F-44: monotoner Request-Token – überholt ein neuerer loadData-Lauf
    // diesen, bricht der Lauf an der nächsten await-Grenze ab.
    const token = ++loadToken;
    // BG-B4: der CSV-Abruf ist zusätzlich abbrechbar (große Jahres-CSV).
    const controller = new AbortController();
    if (loadController) loadController.abort();
    loadController = controller;

    // UI vorbereiten
    [
      "#app-kpis",
      "#app-filter",
      "#app-charts",
      "#app-table",
      "#app-error",
      "#bg-verworfen-hinweis",
    ].forEach(hide);
    show("#app-loading");

    // Falls Daten bereits im instanzlokalen Cache liegen, sofort laden
    if (dataCache[year]) {
      if (token !== loadToken) return;
      allData = dataCache[year];
      if (allData.length === 0) {
        hide("#app-loading");
        show("#app-error");
        renderVerworfenHinweis(discardedCache[year] || 0);
        const errEl = el.querySelector("#app-error");
        if (errEl) {
          errEl.className = "alert alert-info";
          errEl.innerHTML = "Keine Datensätze für das ausgewählte Jahr in der Datenquelle gefunden.";
        }
        renderWeitereInfos(configdata);
        renderMethodikbox(configdata);
        return;
      }

      el.querySelector("#loading-text").textContent =
        `✓ ${fmt(allData.length)} Datensätze aus Cache geladen.`;
      setBar(100);

      try {
        await loadScript(
          "vendor/papaparse/papaparse.min.js",
        );
        if (token !== loadToken) return;
        await loadScript(
          "vendor/chartjs/chart.umd.min.js",
        );
        if (token !== loadToken) return;

        // UI aufbauen
        buildFilterOptions();
        applyFilter();
        renderVerworfenHinweis(discardedCache[year] || 0);
        renderWeitereInfos(configdata);
        renderMethodikbox(configdata);

        loadingHideTimer = setTimeout(() => {
          if (disposed) return;
          hide("#app-loading");
        }, 200);
        ["#app-kpis", "#app-filter", "#app-charts", "#app-table"].forEach(show);
      } catch (err) {
        if (token !== loadToken) return;
        hide("#app-loading");
        show("#app-error");
        const errEl = el.querySelector("#app-error");
        if (errEl) {
          errEl.className = "alert alert-danger";
          errEl.innerHTML = "<strong>Fehler beim Laden der Skripte:</strong> " + escapeHtml(err.message);
        }
      }
      return;
    }

    el.querySelector("#loading-text").textContent =
      "Bibliotheken werden geladen …";
    setBar(5);

    try {
      // PapaParse dynamisch laden
      await loadScript(
        "vendor/papaparse/papaparse.min.js",
      );
      if (token !== loadToken) return;
      setBar(15);
      el.querySelector("#loading-text").textContent =
        `CSV ${year} wird heruntergeladen (kann einige Sekunden dauern) …`;

      // CSV über den lokalen Proxy laden (CORS-Workaround)
      loadController = controller;
      var fetched = await fetchCsvText(url, controller.signal);
      if (token !== loadToken) return;
      var csvText = fetched.content;
      setBar(55);
      setBar(70);

      el.querySelector("#loading-text").textContent =
        "Daten werden verarbeitet …";
      const parsed = parseCsvZuRecords(csvText);
      setBar(85);

      if (token !== loadToken) return;

      allData = parsed.records;
      // F-73: Zeilen ohne gültiges Datum/Tatort/Tatbestand/Bußgeld wurden oben
      // stillschweigend verworfen – die Differenz wird gezählt und (sofern >0)
      // als sichtbarer Hinweis angezeigt statt kommentarlos zu verschwinden.
      const discardedCount = parsed.discarded;
      // Im instanzlokalen Cache speichern – nur vom aktuellsten Lauf.
      if (token !== loadToken) return;
      dataCache[year] = allData;
      discardedCache[year] = discardedCount;

      if (allData.length === 0) {
        hide("#app-loading");
        show("#app-error");
        renderVerworfenHinweis(discardedCount);
        const errEl = el.querySelector("#app-error");
        if (errEl) {
          errEl.className = "alert alert-info";
          errEl.innerHTML = "Keine Datensätze für das ausgewählte Jahr in der Datenquelle gefunden.";
        }
        renderWeitereInfos(configdata);
        renderMethodikbox(configdata);
        return;
      }

      // Datenfrische-Label: kein Vorab-Request mehr (F-36) — Fallback auf die
      // datenStand-Konfiguration.
      var datenstand = ((configdata && configdata.datenStand) || "").trim();
      if (datenstand) {
        var badge = enclosingHtmlDivElement.querySelector("#bg-datenstand");
        if (badge) {
          badge.textContent = datenstand;
          enclosingHtmlDivElement
            .querySelector("#bg-datenstand-row")
            .classList.remove("d-none");
        }
      }

      el.querySelector("#loading-text").textContent =
        `✓ ${fmt(allData.length)} Datensätze geladen.`;
      setBar(95);

      // Chart.js laden
      await loadScript(
        "vendor/chartjs/chart.umd.min.js",
      );
      if (token !== loadToken) return;
      setBar(100);

      // UI aufbauen
      buildFilterOptions();
      applyFilter();
      renderVerworfenHinweis(discardedCount);
      renderWeitereInfos(configdata);
      renderMethodikbox(configdata);

      loadingHideTimer = setTimeout(() => {
        if (disposed) return;
        hide("#app-loading");
      }, 400);
      ["#app-kpis", "#app-filter", "#app-charts", "#app-table"].forEach(show);
    } catch (err) {
      if (token !== loadToken) return;
      hide("#app-loading");
      renderOdasFehler(el, err, bgKontext);
    }
  }

  // ── Filter-Dropdown befüllen ──────────────────────────────────────────────────

  function buildFilterOptions() {
    const codes = [
      ...new Set(allData.map((r) => r.TATBESTANDBE_TBNR).filter(Boolean)),
    ].sort();
    const sel = el.querySelector("#filter-tbnr");
    sel.innerHTML = '<option value="">Alle Kategorien</option>';
    codes.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = tbnrLabel(code);
      sel.appendChild(opt);
    });
  }

  // ── Jahresvergleich ──────────────────────────────────────────────────────────
  // Zeigt je Jahr Anzahl und Bußgeldsumme unter den aktuellen Filtern
  // (Tatort/Kategorie/Bußgeld min.). Bewusst als Balkenliste statt als dritte
  // Chart.js-Instanz: der F-57-Lifecycle-Guard prüft „genau 2 Charts“ und
  // bleibt so unverändert scharf.
  async function ladeJahresDaten(year, signal) {
    if (dataCache[year]) return dataCache[year];
    // PapaParse wird vom regulären Ladevorgang bereits geladen; hier nur
    // absichern, falls der Vergleich zuerst aktiviert wird.
    await loadScript("vendor/papaparse/papaparse.min.js");
    const quelle = CSV_SOURCES[year];
    if (!quelle) return null;
    const fetched = await fetchCsvText(quelle, signal);
    const parsed = parseCsvZuRecords(fetched.content);
    dataCache[year] = parsed.records;
    discardedCache[year] = parsed.discarded;
    return parsed.records;
  }

  function renderVergleich() {
    const body = el.querySelector("#vergleich-body");
    if (!body) return;
    const jahre = Object.keys(CSV_SOURCES).sort();
    const proJahr = jahre.map((year) => {
      const geladen = dataCache[year];
      if (!geladen) return { year, verfuegbar: false };
      // Dieselben Filter wie applyFilter, nur eben über die Jahresgrenze hinweg.
      const treffer = geladen.filter((r) => {
        if (ortFilter && !r.TATORT.toLowerCase().includes(ortFilter)) return false;
        if (tbnrFilter && r.TATBESTANDBE_TBNR !== tbnrFilter) return false;
        if (parseInt(r.GELDBUSSE, 10) < minFilter) return false;
        return true;
      });
      return {
        year,
        verfuegbar: true,
        anzahl: treffer.length,
        summe: treffer.reduce((s, r) => s + parseInt(r.GELDBUSSE, 10), 0),
      };
    });

    const maxAnzahl = Math.max(1, ...proJahr.map((e) => e.anzahl || 0));
    const maxSumme = Math.max(1, ...proJahr.map((e) => e.summe || 0));
    body.innerHTML = proJahr
      .map((e) => {
        if (!e.verfuegbar) {
          return (
            '<div class="vgl-block"><div class="vgl-jahr">' +
            escapeHtml(e.year) +
            '</div><div class="vgl-nicht-verfuegbar">Daten für dieses Jahr nicht verfügbar.</div></div>'
          );
        }
        const wA = Math.round((e.anzahl / maxAnzahl) * 100);
        const wS = Math.round((e.summe / maxSumme) * 100);
        return (
          '<div class="vgl-block">' +
          '<div class="vgl-jahr">' +
          escapeHtml(e.year) +
          "</div>" +
          '<div class="vgl-metric"><span class="vgl-legende">Verstöße</span>' +
          '<div class="vgl-track"><div class="vgl-bar anzahl" style="width:' +
          wA +
          '%"></div></div>' +
          '<span class="vgl-val">' +
          escapeHtml(fmt(e.anzahl)) +
          "</span></div>" +
          '<div class="vgl-metric"><span class="vgl-legende">Bußgelder</span>' +
          '<div class="vgl-track"><div class="vgl-bar summe" style="width:' +
          wS +
          '%"></div></div>' +
          '<span class="vgl-val haupt">' +
          escapeHtml(fmtEur(e.summe)) +
          "</span></div>" +
          "</div>"
        );
      })
      .join("");
  }

  async function aktualisiereVergleich() {
    if (!compareMode) return;
    const controller = new AbortController();
    if (compareController) compareController.abort();
    compareController = controller;
    const body = el.querySelector("#vergleich-body");
    if (body) body.innerHTML = '<div class="text-muted small">Jahresdaten werden geladen …</div>';
    try {
      for (const year of Object.keys(CSV_SOURCES).sort()) {
        if (controller.signal.aborted || disposed) return;
        await ladeJahresDaten(year, controller.signal);
      }
    } catch (err) {
      // Ein nicht ladbares Jahr darf den Vergleich nicht verhindern — es wird
      // unten als „nicht verfügbar“ ausgewiesen.
      if (controller.signal.aborted || disposed) return;
    }
    if (controller.signal.aborted || disposed) return;
    renderVergleich();
  }

  // ── Filter anwenden ───────────────────────────────────────────────────────────

  // Filterwerte einmal zentral lesen: applyFilter (Jahresansicht) und
  // renderVergleich (Jahresvergleich) müssen identisch filtern.
  let ortFilter = "";
  let tbnrFilter = "";
  let minFilter = 0;

  function applyFilter() {
    ortFilter = el.querySelector("#filter-ort").value.toLowerCase();
    tbnrFilter = el.querySelector("#filter-tbnr").value;
    minFilter = parseInt(el.querySelector("#filter-min").value, 10) || 0;

    filteredData = allData.filter((r) => {
      if (ortFilter && !r.TATORT.toLowerCase().includes(ortFilter)) return false;
      if (tbnrFilter && r.TATBESTANDBE_TBNR !== tbnrFilter) return false;
      if (parseInt(r.GELDBUSSE, 10) < minFilter) return false;
      return true;
    });

    el.querySelector("#filter-info").textContent =
      fmt(filteredData.length) +
      " von " +
      fmt(allData.length) +
      " Verstößen angezeigt";

    currentPage = 0;
    updateKPIs();
    updateCharts();
    renderTable();
    if (compareMode) renderVergleich();
  }

  // ── KPI-Kacheln ──────────────────────────────────────────────────────────────

  function updateKPIs() {
    if (!filteredData.length) {
      ["#kpi-anzahl", "#kpi-summe", "#kpi-avg", "#kpi-orte"].forEach((id) => {
        el.querySelector(id).textContent = "0";
      });
      return;
    }
    const anzahl = filteredData.length;
    const summe = filteredData.reduce(
      (s, r) => s + parseInt(r.GELDBUSSE, 10),
      0,
    );
    const avg = Math.round(summe / anzahl);
    const orte = new Set(filteredData.map((r) => r.TATORT)).size;

    el.querySelector("#kpi-anzahl").textContent = fmt(anzahl);
    el.querySelector("#kpi-summe").textContent = fmtEur(summe);
    el.querySelector("#kpi-avg").textContent = fmtEur(avg);
    el.querySelector("#kpi-orte").textContent = fmt(orte);
  }

  // ── Charts ────────────────────────────────────────────────────────────────────

  function updateCharts() {
    // --- Monatsbalken ---
    const monatCounts = new Array(12).fill(0);
    const monatSummen = new Array(12).fill(0);
    filteredData.forEach((r) => {
      const m = getMonth(r.TATTAG);
      if (m >= 0) {
        monatCounts[m]++;
        monatSummen[m] += parseInt(r.GELDBUSSE, 10);
      }
    });

    if (chartMonat) chartMonat.destroy();
    chartMonat = new Chart(el.querySelector("#chart-monat").getContext("2d"), {
      type: "bar",
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: "Anzahl Verstöße",
            data: monatCounts,
            backgroundColor: "rgba(37,99,235,0.78)",
            borderRadius: 5,
            yAxisID: "y",
          },
          {
            label: "Bußgelder (€)",
            data: monatSummen,
            type: "line",
            borderColor: "#dc2626",
            backgroundColor: "rgba(220,38,38,0.08)",
            pointBackgroundColor: "#dc2626",
            tension: 0.35,
            fill: true,
            yAxisID: "y2",
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { font: { size: 12 }, boxWidth: 14 } },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ctx.datasetIndex === 1
                  ? " " + fmtEur(ctx.parsed.y)
                  : " " + fmt(ctx.parsed.y) + " Verstöße",
            },
          },
        },
        scales: {
          y: {
            position: "left",
            ticks: { callback: (v) => fmt(v) },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
          y2: {
            position: "right",
            ticks: { callback: (v) => fmtEur(v) },
            grid: { drawOnChartArea: false },
          },
          x: { grid: { display: false } },
        },
      },
    });

    // --- Donut-Chart Top-Kategorien ---
    const tbnrCnt = {};
    filteredData.forEach((r) => {
      const lbl = tbnrLabel(r.TATBESTANDBE_TBNR);
      tbnrCnt[lbl] = (tbnrCnt[lbl] || 0) + 1;
    });
    const top8 = Object.entries(tbnrCnt)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (chartTbnr) chartTbnr.destroy();
    chartTbnr = new Chart(el.querySelector("#chart-tbnr").getContext("2d"), {
      type: "doughnut",
      data: {
        labels: top8.map((t) => t[0]),
        datasets: [
          {
            data: top8.map((t) => t[1]),
            backgroundColor: CHART_COLORS,
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        cutout: "58%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { font: { size: 11 }, boxWidth: 12, padding: 8 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = ((ctx.parsed / filteredData.length) * 100).toFixed(
                  1,
                );
                return " " + fmt(ctx.parsed) + " (" + pct + "%)";
              },
            },
          },
        },
      },
    });
  }

  // ── Tabelle + Pagination ──────────────────────────────────────────────────────

  function renderTable() {
    const total = filteredData.length;
    const pages = Math.ceil(total / PAGE_SIZE);
    const start = currentPage * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);
    const rows = filteredData.slice(start, end);

    el.querySelector("#table-info").textContent =
      "Zeige " + fmt(start + 1) + "–" + fmt(end) + " von " + fmt(total);

    el.querySelector("#table-body").innerHTML = rows
      .map((r) => {
        const b = parseInt(r.GELDBUSSE, 10);
        const bClass =
          b >= 200
            ? "text-danger fw-bold"
            : b >= 100
              ? "text-danger"
              : b >= 50
                ? "text-warning fw-semibold"
                : "";
        return `<tr>
        <td class="text-nowrap">${escapeHtml(r.TATTAG)}</td>
        <td class="text-nowrap text-muted">${escapeHtml(formatTime(r.TATZEIT))}</td>
        <td class="tbl-tatort" title="${escapeHtml(r.TATORT)}">${escapeHtml(r.TATORT)}</td>
        <td><span class="badge bg-secondary badge-tbnr">${escapeHtml(tbnrLabel(r.TATBESTANDBE_TBNR))}</span></td>
        <td class="text-end ${bClass}">${fmtEur(b)}</td>
      </tr>`;
      })
      .join("");

    renderPagination(pages);
  }

  function renderPagination(totalPages) {
    const pag = el.querySelector("#pagination");
    if (totalPages <= 1) {
      pag.innerHTML = "";
      return;
    }

    const p = currentPage;
    let items = [];

    // Prev
    items.push({ label: "‹", page: p - 1, disabled: p === 0 });

    // Seitenbuttons mit Ellipsis
    const range = [];
    for (let i = 0; i < totalPages; i++) range.push(i);
    const visible = range.filter(
      (i) => i === 0 || i === totalPages - 1 || Math.abs(i - p) <= 2,
    );
    let prev = -1;
    visible.forEach((i) => {
      if (prev >= 0 && i - prev > 1)
        items.push({ label: "…", page: -1, disabled: true });
      items.push({ label: String(i + 1), page: i, active: i === p });
      prev = i;
    });

    // Next
    items.push({ label: "›", page: p + 1, disabled: p === totalPages - 1 });

    pag.innerHTML =
      '<ul class="pagination pagination-sm mb-0 flex-wrap gap-1">' +
      items
        .map(
          (it) =>
            `<li class="page-item${it.disabled ? " disabled" : ""}${it.active ? " active" : ""}">
          <button class="page-link" data-page="${it.page}"${it.disabled ? ' tabindex="-1"' : ""}>${it.label}</button>
        </li>`,
        )
        .join("") +
      "</ul>";

    pag.querySelectorAll("[data-page]").forEach((btn) => {
      const pg = parseInt(btn.dataset.page, 10);
      if (isNaN(pg) || pg < 0) return;
      btn.addEventListener("click", () => {
        currentPage = pg;
        renderTable();
        el.querySelector("#app-table").scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }

  /* ── Schale 4: KPI Kontext ── */
  function kpiContext(kontext, id) {
    var text = String(kontext || "").trim();
    if (!text) return "";
    var targetId = "bg-kpi-kontext-" + id + "-" + bgUid;
    return (
      '<button class="bg-kpi-info-toggle collapsed" type="button" ' +
      'data-bs-toggle="collapse" data-bs-target="#' +
      targetId +
      '" ' +
      'aria-expanded="false" aria-controls="' +
      targetId +
      '" ' +
      'aria-label="Erklärung zu diesem Wert">' +
      '<span class="bg-kpi-info-icon" aria-hidden="true">ⓘ</span>' +
      "</button>" +
      '<div id="' +
      targetId +
      '" class="collapse">' +
      '<div class="bg-kpi-kontext">' +
      escapeHtml(text) +
      "</div>" +
      "</div>"
    );
  }

  /* ── Schale 4: Methodikbox ── */
  function renderMethodikbox(cfg) {
    var hinweis = ((cfg && cfg.datenquelleHinweis) || "").trim();
    var stand = ((cfg && cfg.datenStand) || "").trim();
    if (!hinweis && !stand) return;
    var standHtml = stand
      ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
      : "";
    el.querySelector("#bg-methodik-section").innerHTML =
      '<section class="bg-methodik mt-3">' +
      '<button class="bg-methodik-toggle collapsed" type="button" ' +
      'data-bs-toggle="collapse" data-bs-target="#bg-methodik-body-' + bgUid + '" ' +
      'aria-expanded="false" aria-controls="bg-methodik-body-' + bgUid + '">' +
      '<h2 class="h5 mb-0">Methodik &amp; Datenquelle</h2>' +
      '<span class="bg-methodik-chevron" aria-hidden="true">&#9662;</span>' +
      "</button>" +
      '<div id="bg-methodik-body-' + bgUid + '" class="collapse">' +
      '<div class="bg-methodik-content">' +
      standHtml +
      hinweis +
      "</div></div></section>";
  }

  function renderWeitereInfos(configdata) {
    var links = (configdata.weiterfuehrendeLinks || "").trim();
    if (!links) return;
    el.querySelector("#bg-weitere-infos-section").innerHTML =
      '<section class="bg-weitere-infos mt-4">' +
      '<h2 class="h5 mb-3">Weitere Informationen</h2>' +
      '<div class="bg-weitere-infos-content">' +
      links +
      "</div></section>";
  }

  // ── Event-Listener ────────────────────────────────────────────────────────────

  el.querySelector(`#app-jahr-${bgUid}`).addEventListener("change", (e) => {
    currentYear = e.target.value;
    if (chartMonat) {
      chartMonat.destroy();
      chartMonat = null;
    }
    if (chartTbnr) {
      chartTbnr.destroy();
      chartTbnr = null;
    }
    loadData(currentYear);
  });

  // Jahresvergleich ein-/ausschalten
  el.querySelector(`#app-vergleich-${bgUid}`).addEventListener("change", (e) => {
    compareMode = e.target.checked;
    if (compareMode) {
      show("#app-vergleich");
      aktualisiereVergleich();
    } else {
      hide("#app-vergleich");
    }
  });

  // CSV-Export der aktuell gefilterten Einzelverstöße.
  el.querySelector("#bg-btn-export").addEventListener("click", () => {
    if (disposed) return;
    if (filteredData.length === 0) {
      el.querySelector("#filter-info").textContent = "Keine Daten zum Exportieren.";
      return;
    }
    const esc = (v) => {
      const s = String(v ?? "");
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const zeilen = [
      "Datenjahr;Datum;Uhrzeit;Tatort;Verstosskategorie;TBNR;Bussgeld_EUR",
    ];
    filteredData.forEach((r) => {
      zeilen.push(
        [
          currentYear,
          r.TATTAG || "",
          formatTime(r.TATZEIT),
          r.TATORT || "",
          tbnrLabel(r.TATBESTANDBE_TBNR),
          r.TATBESTANDBE_TBNR || "",
          r.GELDBUSSE ?? "",
        ]
          .map(esc)
          .join(";"),
      );
    });
    const blob = new Blob(["\uFEFF" + zeilen.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bussgelder-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  ["#filter-ort", "#filter-tbnr", "#filter-min"].forEach((id) => {
    el.querySelector(id).addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(applyFilter, 280);
    });
  });

  el.querySelector("#filter-reset").addEventListener("click", () => {
    el.querySelector("#filter-ort").value = "";
    el.querySelector("#filter-tbnr").value = "";
    el.querySelector("#filter-min").value = "0";
    applyFilter();
  });

  // ── Start ─────────────────────────────────────────────────────────────────────
  loadData(currentYear);
  return null;
}

// ── addToHead – muss AUSSERHALB und NACH app() stehen ─────────────────────────
function addToHead() {
  return ``;
}
