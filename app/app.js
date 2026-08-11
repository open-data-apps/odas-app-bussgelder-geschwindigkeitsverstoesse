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
 *   "csvQuelle2023": "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2023.csv",
 *   "csvQuelle2022": "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2022.csv",
 *   "csvQuelle2021": "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverst%C3%B6%C3%9Fe%202021.csv",
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
  return `${appPath}/odp-data?path=${encodeURIComponent(
    extractPathFromUrl(targetUrl),
  )}`;
}

async function fetchViaOdasProxy(targetUrl) {
  const response = await fetch(getOdasProxyEndpoint(targetUrl), {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`ODAS-Proxy-Fehler: HTTP ${response.status}`);
  }

  const proxyData = await response.json();
  if (!proxyData || typeof proxyData.content !== "string") {
    throw new Error("ODAS-Proxy-Antwort enthält keinen content-String.");
  }

  return proxyData.content;
}

async function fetchOdasResource(targetUrl, configdata = {}) {
  if (isOdasProxyEnabled(configdata)) {
    return fetchViaOdasProxy(targetUrl);
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  } catch (error) {
    throw new Error(
      `Direkter Datenabruf fehlgeschlagen (${error.message}). Bitte prüfen Sie die Daten-URL und die CORS-Freigabe der Datenquelle.`,
    );
  }
}

async function fetchOdasJson(targetUrl, configdata = {}) {
  return JSON.parse(await fetchOdasResource(targetUrl, configdata));
}

let bgInstanzZaehler = 0;

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

  const CSV_SOURCES = {
    2023: (configdata && configdata.csvQuelle2023) || "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2023.csv",
    2022: (configdata && configdata.csvQuelle2022) || "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverstoesse2022.csv",
    2021: (configdata && configdata.csvQuelle2021) || "https://opendata.bonn.de/sites/default/files/Geschwindigkeitsverst%C3%B6%C3%9Fe%202021.csv",
  };

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
  let filteredData = [];
  let currentYear = "2023";
  let currentPage = 0;
  let debounce = null;
  let loadToken = 0; // F-44: monotoner Request-Token – nur der aktuellste Lauf schreibt State/UI
  let chartMonat = null;
  let chartTbnr = null;
  const PAGE_SIZE = 50;

  // ── Basis-HTML rendern ────────────────────────────────────────────────────────
  const el = enclosingHtmlDivElement;
  el.innerHTML = `
    <style>
      .bg-app { background: #f8f9fa; }
      .kpi-card {
        border-radius: 10px; padding: 18px 20px; color: #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,.12);
      }
      .kpi-card .kpi-val  { font-size: 1.9rem; font-weight: 700; line-height: 1.1; }
      .kpi-card .kpi-lbl  { font-size: .72rem; opacity: .85; margin-top: 4px;
                            text-transform: uppercase; letter-spacing: .06em; }
      .kpi-card .kpi-ico  { font-size: 1.6rem; float: right; opacity: .4; }
      .tbl-tatort         { max-width: 260px; overflow: hidden; text-overflow: ellipsis;
                            white-space: nowrap; }
      .badge-tbnr         { font-size: .68rem; white-space: normal; text-align: left; }
      .progress-wrap      { height: 4px; border-radius: 2px; overflow: hidden;
                            background: #e9ecef; }
      .progress-fill      { height: 100%; background: #2563eb;
                            transition: width .4s ease; width: 0; }
      .table-scroll       { max-height: 430px; overflow-y: auto; }
    </style>

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
          <label for="app-jahr" class="form-label mb-0 fw-semibold text-nowrap">Datenjahr:</label>
          <select id="app-jahr" class="form-select form-select-sm" style="min-width:90px">
            ${Object.keys(CSV_SOURCES)
              .map(
                (y) =>
                  `<option value="${y}"${y === currentYear ? " selected" : ""}>${y}</option>`,
              )
              .join("")}
          </select>
        </div>
      </div>

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

      <!-- ── Tabelle ── -->
      <div id="app-table" class="card border-0 shadow-sm d-none">
        <div class="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-2">
          <span class="fw-semibold small">Einzelverstöße</span>
          <span id="table-info" class="text-muted" style="font-size:.8rem"></span>
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

    // Typische Mojibake-Sequenzen (UTF-8 fälschlich als Latin-1/CP1252 gelesen)
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

    // Fallbacks für bereits zu U+FFFD degradierte Zeichen in häufigen Ortsnamen.
    const degradedMap = {
      "Josefsh�he": "Josefshöhe",
      "K�ln": "Köln",
      "k�ln": "köln",
      "K�nigswinter": "Königswinter",
      "k�nigswinter": "königswinter",
      " H�he ": " Höhe ",
      "Stra�e": "Straße",
      "stra�e": "straße",
    };

    Object.entries(degradedMap).forEach(([broken, correct]) => {
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

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () =>
        reject(new Error("Script konnte nicht geladen werden: " + src));
      document.head.appendChild(s);
    });
  }

  async function fetchCsvText(url) {
    // CSV laden: direkt oder ueber den ODAS-Proxy (proxyAktiv).
    // Kein Vorab-Request an die CSV-Domain mehr (F-36); lastModified bleibt null,
    // die Datenfrische stammt aus der datenStand-Konfiguration.
    const content = await fetchOdasResource(url, configdata);

    return { content: content, lastModified: null };
  }

  // ── CSV laden & parsen ────────────────────────────────────────────────────────

  async function loadData(year) {
    const url = CSV_SOURCES[year];
    if (!url) return;

    // F-44: monotoner Request-Token – überholt ein neuerer loadData-Lauf
    // diesen, bricht der Lauf an der nächsten await-Grenze ab.
    const token = ++loadToken;

    // UI vorbereiten
    [
      "#app-kpis",
      "#app-filter",
      "#app-charts",
      "#app-table",
      "#app-error",
    ].forEach(hide);
    show("#app-loading");

    // Falls Daten bereits im Cache liegen, sofort laden
    window._odas_cachedBussgelderDataMap =
      window._odas_cachedBussgelderDataMap || {};
    if (window._odas_cachedBussgelderDataMap[year]) {
      if (token !== loadToken) return;
      allData = window._odas_cachedBussgelderDataMap[year];
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
        renderWeitereInfos(configdata);
        renderMethodikbox(configdata);

        setTimeout(() => hide("#app-loading"), 200);
        ["#app-kpis", "#app-filter", "#app-charts", "#app-table"].forEach(show);
      } catch (err) {
        if (token !== loadToken) return;
        hide("#app-loading");
        show("#app-error");
        el.querySelector("#app-error").innerHTML =
          "<strong>Fehler beim Laden der Skripte:</strong> " + err.message;
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
      var fetched = await fetchCsvText(url);
      if (token !== loadToken) return;
      var csvText = fetched.content;
      setBar(55);
      setBar(70);

      el.querySelector("#loading-text").textContent =
        "Daten werden verarbeitet …";
      const result = Papa.parse(csvText, {
        delimiter: ";",
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        transform: (v) => normalizeCsvText(v).trim(),
      });
      setBar(85);

      if (token !== loadToken) return;

      // Nur vollständige, valide Zeilen
      allData = result.data.filter(
        (r) =>
          r.TATTAG &&
          r.TATORT &&
          r.TATBESTANDBE_TBNR &&
          r.GELDBUSSE &&
          !isNaN(parseInt(r.GELDBUSSE, 10)),
      );

      // Im globalen Cache speichern – nur vom aktuellsten Lauf.
      if (token !== loadToken) return;
      window._odas_cachedBussgelderDataMap[year] = allData;

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
      renderWeitereInfos(configdata);
      renderMethodikbox(configdata);

      setTimeout(() => hide("#app-loading"), 400);
      ["#app-kpis", "#app-filter", "#app-charts", "#app-table"].forEach(show);
    } catch (err) {
      if (token !== loadToken) return;
      hide("#app-loading");
      show("#app-error");
      const u = safeHttpUrl(url);
      const testlink = u
        ? ` Direkter Testlink: <a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(u)}</a>`
        : "";
      el.querySelector("#app-error").innerHTML =
        `<strong>Fehler beim Laden der Daten:</strong> ${escapeHtml(err.message)}` +
        '<br><small class="text-muted">Bitte prüfen Sie, ob der Server CORS-Anfragen erlaubt.' +
        testlink +
        "</small>";
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

  // ── Filter anwenden ───────────────────────────────────────────────────────────

  function applyFilter() {
    const ort = el.querySelector("#filter-ort").value.toLowerCase();
    const tbnr = el.querySelector("#filter-tbnr").value;
    const minB = parseInt(el.querySelector("#filter-min").value, 10) || 0;

    filteredData = allData.filter((r) => {
      if (ort && !r.TATORT.toLowerCase().includes(ort)) return false;
      if (tbnr && r.TATBESTANDBE_TBNR !== tbnr) return false;
      if (parseInt(r.GELDBUSSE, 10) < minB) return false;
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

  el.querySelector("#app-jahr").addEventListener("change", (e) => {
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
  return;
}
