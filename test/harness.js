"use strict";

/*
 * love-toolbox — dependency-free Node harness.
 *
 * Loads the shell and every tool file into a fake DOM, then asserts the pure
 * functions of each tool and smoke-renders every registered tool.
 *
 *   node test/harness.js
 */

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const store = {};

function classList() {
  const set = new Set();
  return {
    add: (...names) => names.forEach((n) => set.add(n)),
    remove: (...names) => names.forEach((n) => set.delete(n)),
    toggle: (name, force) => {
      const want = force === undefined ? !set.has(name) : !!force;
      if (want) set.add(name); else set.delete(name);
      return want;
    },
    contains: (name) => set.has(name)
  };
}

let elementSeq = 0;
const byId = {};

function makeElement(tag, doc) {
  const node = {
    nodeType: 1,
    tagName: String(tag || "div").toUpperCase(),
    _tag: tag,
    children: [],
    attributes: {},
    classList: classList(),
    style: {},
    dataset: {},
    files: [],
    _id: "el" + (elementSeq += 1),
    textContent: "",
    innerHTML: "",
    value: "",
    className: "",
    type: "",
    href: "",
    placeholder: "",
    rows: 0,
    checked: false,
    disabled: false,
    selected: false,
    scrollTop: 0,
    ownerDocument: doc,
    appendChild(child) {
      if (child && child._isFragment) {
        child.children.slice().forEach((c) => node.appendChild(c));
        return child;
      }
      this.children.push(child);
      if (child && child.id) byId[child.id] = child;
      return child;
    },
    insertBefore(child) { return this.appendChild(child); },
    removeChild(child) {
      const i = this.children.indexOf(child);
      if (i !== -1) this.children.splice(i, 1);
      return child;
    },
    replaceChildren(...kids) { this.children = []; kids.forEach((k) => this.appendChild(k)); },
    remove() {},
    setAttribute(k, v) { this.attributes[k] = String(v); if (k === "id") { this.id = String(v); byId[this.id] = this; } },
    getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    hasAttribute(k) { return k in this.attributes; },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    focus() {},
    blur() {},
    select() {},
    click() {},
    scrollIntoView() {},
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    contains() { return false; },
    getContext() {
      return {
        clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {},
        moveTo() {}, lineTo() {}, save() {}, restore() {}, translate() {}, rotate() {},
        setTransform() {}, createLinearGradient: () => ({ addColorStop() {} }),
        fillText() {}, measureText: () => ({ width: 10 }), putImageData() {}, drawImage() {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }), setLineDash() {}
      };
    },
    toDataURL() { return "data:image/png;base64,"; }
  };
  Object.defineProperty(node, "id", {
    get() { return this._id2 || ""; },
    set(v) { this._id2 = String(v); byId[this._id2] = this; }
  });
  Object.defineProperty(node, "firstChild", { get() { return this.children[0] || null; } });
  return node;
}

function makeDocument() {
  const doc = {
    body: null,
    documentElement: null,
    createElement: (tag) => makeElement(tag, doc),
    createElementNS: (ns, tag) => makeElement(tag, doc),
    createTextNode: (text) => ({ nodeType: 3, textContent: String(text) }),
    createDocumentFragment: () => {
      const frag = makeElement("fragment", doc);
      frag._isFragment = true;
      return frag;
    },
    getElementById: (id) => byId[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    execCommand() { return true; },
    readyState: "complete",
    hidden: false,
    visibilityState: "visible"
  };
  doc.body = makeElement("body", doc);
  doc.documentElement = makeElement("html", doc);
  return doc;
}

const document = makeDocument();

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  JSON,
  Intl,
  Number,
  String,
  Array,
  Object,
  RegExp,
  Error,
  isFinite,
  isNaN,
  parseInt,
  parseFloat,
  encodeURIComponent,
  decodeURIComponent,
  encodeURI,
  decodeURI,
  TextEncoder: global.TextEncoder,
  Uint8Array,
  Uint32Array,
  Uint8ClampedArray,
  Float64Array,
  Blob: global.Blob,
  URL: global.URL,
  atob: global.atob,
  btoa: global.btoa,
  performance: { now: () => Date.now() },
  localStorage: {
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
  },
  document,
  navigator: { language: "en", clipboard: { writeText: async () => {} } },
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  confirm: () => true,
  alert: () => {},
  scrollTo: () => {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

vm.createContext(sandbox);

function load(rel) {
  const file = path.join(ROOT, rel);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: rel });
}

load("js/app.js");

const toolsDir = path.join(ROOT, "js", "tools");
const toolFiles = fs.existsSync(toolsDir)
  ? fs.readdirSync(toolsDir).filter((f) => f.endsWith(".js")).sort()
  : [];
toolFiles.forEach((f) => load(path.join("js", "tools", f)));

// ------------------------------------------------------------- assertions

let failures = 0;
let checks = 0;

function assert(cond, message) {
  checks += 1;
  if (cond) {
    console.log("ok - " + message);
  } else {
    failures += 1;
    console.error("FAIL: " + message);
    process.exitCode = 1;
  }
}

function eq(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  assert(a === b, message + (a === b ? "" : " (got " + a + ", want " + b + ")"));
}

function close(actual, expected, eps, message) {
  const ok = Math.abs(actual - expected) <= (eps == null ? 1e-9 : eps);
  assert(ok, message + (ok ? "" : " (got " + actual + ", want " + expected + ")"));
}

const NS = sandbox.window.MenaToolbox;
const T = NS;

// ------------------------------------------------------------- shell tests

assert(!!NS, "namespace MenaToolbox exposed");
assert(NS.storageKey === "mena-toolbox", "storage key is mena-toolbox");
assert(typeof NS.register === "function", "register() exposed");
const toolCount = NS.list().length;
assert(toolCount === toolFiles.length, "tool files == registered tools (" + toolFiles.length + ")");

// unique ids
const ids = NS.list().map((t) => t.id);
assert(new Set(ids).size === ids.length, "tool ids are unique");

// every tool has required fields
NS.list().forEach((t) => {
  assert(!!t.name && !!t.group, "tool '" + t.id + "' has name + group");
});

// router
eq(NS.parseRoute(""), { name: "dashboard", id: null, query: {} }, "parseRoute('') → dashboard");
eq(NS.parseRoute("#/"), { name: "dashboard", id: null, query: {} }, "parseRoute('#/') → dashboard");
eq(NS.parseRoute("#/settings").name, "settings", "parseRoute('#/settings') → settings");
eq(NS.parseRoute("#/tool/units").id, "units", "parseRoute('#/tool/units') → units");
eq(NS.parseRoute("#/tool/units?x=1").query.x, "1", "parseRoute keeps query params");
eq(NS.parseRoute("#/nonsense").name, "dashboard", "unknown route falls back to dashboard");
eq(NS.routeHref({ name: "tool", id: "units" }), "#/tool/units", "routeHref(tool)");

// helpers
assert(NS.esc("<a>&\"'") === "&lt;a&gt;&amp;&quot;&#39;", "esc escapes html");
eq(NS.fmtNumber(1234567.891, 2), "1,234,567.89", "fmtNumber groups thousands");
eq(NS.fmtNumber(0.5, 0), "1", "fmtNumber rounds");
assert(Number.isNaN(NS.parseNumber("")), "parseNumber('') is NaN");
eq(NS.parseNumber("1,234"), 1234, "parseNumber strips commas");
eq(NS.clamp(12, 0, 10), 10, "clamp");
assert(typeof NS.uid(8) === "string" && NS.uid(8).length === 8, "uid length");

// state
const def = NS.defaultState();
assert(def.v === 1 && def.data && def.settings, "defaultState shape");
assert(def.settings.currency === "PKR", "default currency PKR");

const round = NS.importState(JSON.stringify({ v: 1, settings: { currency: "RON", decimals: 3, startOfWeek: 1 }, favorites: ["units"], recent: [], usage: { units: 2 }, data: { units: { a: 1 } } }));
assert(round.ok, "importState accepts a backup");
assert(NS.getState().settings.currency === "RON", "importState applied currency");
assert(NS.getState().data.units.a === 1, "importState kept tool data");
assert(!NS.importState("{nope").ok, "importState rejects bad JSON");
assert(!NS.importState("[1,2]").ok, "importState rejects arrays");
assert(!NS.importState("").ok, "importState rejects empty");
assert(NS.exportState().indexOf('"currency": "RON"') !== -1, "exportState writes settings");

// a fresh clean state for the smoke tests
NS.clearAll();
assert(NS.getState().favorites.length === 0, "clearAll empties favourites");

// search
assert(NS.searchTools("").length === NS.list().length, "empty search returns all tools");
if (toolCount) {
  const first = NS.list()[0];
  const s1 = NS.searchTools(first.name).map((t) => t.id);
  assert(s1.indexOf(first.id) !== -1, "search finds a tool by its own name");
  assert(NS.searchTools("zzzzzznotool").length === 0, "search returns nothing for gibberish");
}
assert(NS.getTool("nope") === null, "getTool(unknown) → null");

// favourites
NS.toggleFavorite("units");
assert(NS.isFavorite("units"), "toggleFavorite adds");
NS.toggleFavorite("units");
assert(!NS.isFavorite("units"), "toggleFavorite removes");

// groups
if (toolCount) {
  const g = NS.groups();
  assert(g.length >= 1 && g[0].tools.length >= 1, "groups() returns grouped tools");
}

// ------------------------------------------------ generic render smoke test

function apiFor(tool) {
  return {
    id: tool.id,
    route: { name: "tool", id: tool.id, query: {} },
    node: null,
    state: NS.getState(),
    settings: NS.getState().settings,
    getData: () => NS.getData(tool.id),
    setData: (v) => NS.setData(tool.id, v),
    save: () => true,
    esc: NS.esc,
    el: NS.el,
    uid: NS.uid,
    clamp: NS.clamp,
    fmtNumber: NS.fmtNumber,
    parseNumber: NS.parseNumber,
    toast: () => {},
    copy: () => ({ ok: true, copied: true })
  };
}

NS.list().forEach((tool) => {
  const mount = document.createElement("div");
  assert(typeof tool.render === "function", "tool '" + tool.id + "' has a render()");
  let threw = null;
  try {
    const api = apiFor(tool);
    api.node = mount;
    const cleanup = tool.render(mount, api);
    if (typeof cleanup === "function") cleanup();
  } catch (e) {
    threw = e;
  }
  assert(!threw, "tool '" + tool.id + "' renders without throwing" + (threw ? " — " + threw.message : ""));
});

// ------------------------------------------------------- per-tool unit tests

const TESTS = require("./tools.test.js");
Object.keys(TESTS).forEach((id) => {
  const tool = NS.tools[id];
  assert(!!tool, "tool namespace MenaToolbox.tools." + id + " exists");
  if (!tool) return;
  TESTS[id](tool, { assert, eq, close, NS });
});

console.log("\n" + checks + " checks, " + failures + " failure(s)" + (failures ? "" : " — all green"));
