// GELDBUSSE mit Dezimalkomma (Bonner Quellen, z. B. „132,5“, „143,75“).
// Führt die ausgelieferte app/app.js und die vendorte PapaParse-Datei per vm aus;
// gefakt sind nur DOM, Netzwerk und Chart.js.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const APP_DIR = path.join(__dirname, "../app");

// Werte wie in den echten Quellen; Summe 538,5, März 276,25, April 262,25.
const CSV = [
  "TATTAG;TATZEIT;TATORT;TATBESTANDBE_TBNR;GELDBUSSE",
  "01.03.2023;0815;Bonn, Reuterstraße;141711;132,5",
  "02.03.2023;0915;Bonn, Kennedyallee;141712;143,75",
  "03.04.2023;1015;Bonn, Adenauerallee;141713;143,5",
  "04.04.2023;1115;Bonn, Bonner Talweg;141714;118,75",
].join("\r\n");

const CONFIG = {
  apiurls: ["2023", "2022", "2021"].map((jahr) => ({
    name: "verstoesse-" + jahr,
    label: "CSV-Quelle " + jahr,
    url: "https://example.org/bussgelder-" + jahr + ".csv",
  })),
};

const EUR = " €";

function makeElement() {
  const listeners = {};
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    className: "",
    style: {},
    dataset: {},
    classList: { add() {}, remove() {} },
    listeners,
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    fire(type, event = {}) {
      (listeners[type] || []).forEach((fn) => fn({ target: this, ...event }));
    },
    querySelectorAll: () => [],
    getContext: () => ({}),
    appendChild() {},
    scrollIntoView() {},
  };
}

function makeContainer() {
  const registry = new Map();
  return {
    innerHTML: "",
    querySelector(sel) {
      if (!registry.has(sel)) registry.set(sel, makeElement());
      return registry.get(sel);
    },
    querySelectorAll: () => [],
  };
}

async function starteApp() {
  const charts = [];
  const sandbox = {
    console,
    URL,
    TextDecoder,
    AbortController,
    // Debounce und Ladeindikator-Timer ohne Wartezeit.
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout,
    Chart: class {
      constructor(_ctx, config) {
        charts.push(config);
      }
      destroy() {}
    },
    fetch: async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => Uint8Array.from(Buffer.from(CSV, "latin1")).buffer,
    }),
    document: {
      querySelector: () => null,
      createElement: (tag) => (tag === "script" ? {} : makeElement()),
      head: { appendChild: (s) => s.onload && s.onload() },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(APP_DIR, "vendor/papaparse/papaparse.min.js"), "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(path.join(APP_DIR, "app.js"), "utf8"), sandbox, { filename: "app/app.js" });

  const el = makeContainer();
  sandbox.app(CONFIG, el);
  await warteBis(() => el.querySelector("#kpi-summe").textContent, el);
  return { el, charts };
}

async function warteBis(bedingung, el) {
  for (let i = 0; i < 200; i++) {
    if (bedingung()) return;
    await new Promise((r) => setTimeout(r, 0));
  }
  assert.fail("Erwarteter Zustand nicht erreicht. Container: " + el.innerHTML.slice(0, 300));
}

test("KPI-Summe und Mittelwert rechnen Cent-Beträge mit, Kacheln zeigen ganze Euro", async () => {
  const { el } = await starteApp();
  assert.equal(el.querySelector("#kpi-anzahl").textContent, "4");
  assert.equal(el.querySelector("#kpi-summe").textContent, "539" + EUR); // 538,5 gerundet
  assert.equal(el.querySelector("#kpi-avg").textContent, "135" + EUR);
});

test("Tabelle zeigt Bußgelder im deutschen Format mit zwei Nachkommastellen", async () => {
  const { el } = await starteApp();
  const tabelle = el.querySelector("#table-body").innerHTML;
  for (const betrag of ["132,50", "143,75", "143,50", "118,75"]) {
    assert.ok(tabelle.includes(">" + betrag + EUR + "<"), betrag + " fehlt in der Tabelle");
  }
});

test("Monatsdiagramm summiert Cent-Beträge", async () => {
  const { charts } = await starteApp();
  const summen = charts[0].data.datasets[1].data;
  assert.equal(summen[2], 276.25);
  assert.equal(summen[3], 262.25);
});

test("Mindestbetrag-Filter vergleicht mit Nachkommastellen", async () => {
  const { el } = await starteApp();
  const min = el.querySelector("#filter-min");
  min.value = "143.6"; // input[type=number] liefert den Wert immer mit Punkt
  min.fire("input");
  await warteBis(() => !el.querySelector("#filter-info").textContent.startsWith("4 von"), el);
  assert.equal(el.querySelector("#filter-info").textContent, "1 von 4 Verstößen angezeigt");
  assert.equal(el.querySelector("#kpi-summe").textContent, "144" + EUR); // 143,75 gerundet
});

test("Jahresvergleich summiert Cent-Beträge", async () => {
  const { el } = await starteApp();
  el.querySelector("#app-vergleich-i1").fire("change", { target: { checked: true } });
  const body = el.querySelector("#vergleich-body");
  await warteBis(() => body.innerHTML.includes("vgl-block"), el);
  assert.equal(body.innerHTML.split(">538,50" + EUR + "<").length - 1, 3);
});
