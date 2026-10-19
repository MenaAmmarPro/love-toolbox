"use strict";

/*
 * love-toolbox — the shell.
 *
 * One page, one namespace (`window.MenaToolbox`), one honest set of little
 * helpers. Everything is stored locally under `mena-toolbox`; nothing leaves
 * the device. Tools register themselves from `js/tools/*.js` and the hash
 * router shows one at a time at `#/tool/<id>`.
 *
 * The file must load happily in a bare Node context (see test/harness.js), so
 * every DOM / location / storage touch is guarded.
 */

(function (global) {
  var STATE_KEY = "mena-toolbox";
  var STATE_VERSION = 1;

  // ---------------------------------------------------------------- helpers

  function esc(value) {
    if (value == null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uid(len) {
    var n = len || 10;
    var out = "";
    var alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    var bytes = null;
    try {
      if (global.crypto && global.crypto.getRandomValues) {
        bytes = new Uint8Array(n);
        global.crypto.getRandomValues(bytes);
      }
    } catch (e) {
      bytes = null;
    }
    for (var i = 0; i < n; i += 1) {
      var v = bytes ? bytes[i] : Math.floor(Math.random() * 256);
      out += alphabet.charAt(v % alphabet.length);
    }
    return out;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function fmtNumber(value, decimals) {
    var d = decimals == null ? 2 : decimals;
    if (!isFinite(value)) return "—";
    var rounded = Number(value.toFixed(d));
    var parts = String(rounded).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  function parseNumber(text) {
    if (typeof text === "number") return text;
    var cleaned = String(text == null ? "" : text).replace(/[,\s]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  // ------------------------------------------------------------------ state

  function defaultState() {
    return {
      v: STATE_VERSION,
      settings: {
        currency: "PKR",
        decimals: 2,
        startOfWeek: 0,
        fontScale: 1
      },
      favorites: [],
      recent: [],
      usage: {},
      data: {}
    };
  }

  var state = defaultState();

  function storage() {
    try {
      if (global.localStorage) return global.localStorage;
    } catch (e) {
      // storage can be blocked; tools still work this session
    }
    return null;
  }

  function normalizeState(raw) {
    var base = defaultState();
    if (!raw || typeof raw !== "object") return base;
    base.settings.currency = typeof raw.settings?.currency === "string" ? raw.settings.currency : base.settings.currency;
    base.settings.decimals = typeof raw.settings?.decimals === "number" ? raw.settings.decimals : base.settings.decimals;
    base.settings.startOfWeek = typeof raw.settings?.startOfWeek === "number" ? raw.settings.startOfWeek : base.settings.startOfWeek;
    base.settings.fontScale = typeof raw.settings?.fontScale === "number" ? raw.settings.fontScale : base.settings.fontScale;
    base.favorites = Array.isArray(raw.favorites) ? raw.favorites.slice() : [];
    base.recent = Array.isArray(raw.recent) ? raw.recent.slice() : [];
    base.usage = raw.usage && typeof raw.usage === "object" ? raw.usage : {};
    base.data = raw.data && typeof raw.data === "object" ? raw.data : {};
    return base;
  }

  function loadState() {
    var store = storage();
    if (!store) return state;
    try {
      var raw = store.getItem(STATE_KEY);
      if (raw) state = normalizeState(JSON.parse(raw));
    } catch (e) {
      state = defaultState();
    }
    return state;
  }

  function saveState() {
    var store = storage();
    if (!store) return false;
    try {
      store.setItem(STATE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getData(id) {
    if (!state.data[id]) state.data[id] = {};
    return state.data[id];
  }

  function setData(id, value) {
    state.data[id] = value || {};
    saveState();
    return state.data[id];
  }

  function exportState() {
    return JSON.stringify(state, null, 2);
  }

  function importState(text) {
    if (typeof text !== "string" || !text.trim()) {
      return { ok: false, error: "Nothing to import." };
    }
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: "That isn't valid JSON." };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Expected a toolbox backup object." };
    }
    state = normalizeState(parsed);
    saveState();
    return { ok: true };
  }

  function clearAll() {
    state = defaultState();
    saveState();
    return state;
  }

  // --------------------------------------------------------------- registry

  var tools = [];
  var byId = {};

  function register(tool) {
    if (!tool || !tool.id) return false;
    if (byId[tool.id]) return false;
    var entry = {
      id: tool.id,
      name: tool.name || tool.id,
      icon: tool.icon || "✦",
      group: tool.group || "Other",
      blurb: tool.blurb || "",
      keywords: tool.keywords || "",
      data: !!tool.data,
      render: typeof tool.render === "function" ? tool.render : null,
      state: tool.state || null
    };
    tools.push(entry);
    byId[entry.id] = entry;
    tools.sort(function (a, b) {
      if (a.group === b.group) return a.name.localeCompare(b.name);
      return a.group.localeCompare(b.group);
    });
    return true;
  }

  function list() {
    return tools.slice();
  }

  function getTool(id) {
    return byId[id] || null;
  }

  function groups() {
    var order = [];
    var map = {};
    tools.forEach(function (t) {
      if (!map[t.group]) {
        map[t.group] = [];
        order.push(t.group);
      }
      map[t.group].push(t);
    });
    return order.map(function (name) {
      return { name: name, tools: map[name] };
    });
  }

  function haystack(tool) {
    return (tool.name + " " + tool.id + " " + tool.group + " " + tool.blurb + " " + tool.keywords).toLowerCase();
  }

  function searchTools(query) {
    var q = String(query == null ? "" : query).trim().toLowerCase();
    if (!q) return list();
    var terms = q.split(/\s+/);
    var scored = [];
    tools.forEach(function (t) {
      var hay = haystack(t);
      var score = 0;
      var ok = true;
      for (var i = 0; i < terms.length; i += 1) {
        var idx = hay.indexOf(terms[i]);
        if (idx === -1) { ok = false; break; }
        score += 100 - Math.min(idx, 90);
        if (t.name.toLowerCase().indexOf(terms[i]) === 0) score += 40;
      }
      if (ok) scored.push({ tool: t, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (s) { return s.tool; });
  }

  function isFavorite(id) {
    return state.favorites.indexOf(id) !== -1;
  }

  function toggleFavorite(id) {
    var idx = state.favorites.indexOf(id);
    if (idx === -1) state.favorites.push(id);
    else state.favorites.splice(idx, 1);
    saveState();
    return isFavorite(id);
  }

  function touchRecent(id) {
    var idx = state.recent.indexOf(id);
    if (idx !== -1) state.recent.splice(idx, 1);
    state.recent.unshift(id);
    if (state.recent.length > 12) state.recent.length = 12;
    state.usage[id] = (state.usage[id] || 0) + 1;
    saveState();
  }

  function recentTools() {
    return state.recent.map(getTool).filter(Boolean);
  }

  // ----------------------------------------------------------------- router

  function parseRoute(hash) {
    var raw = String(hash == null ? "" : hash);
    if (raw.charAt(0) === "#") raw = raw.slice(1);
    if (raw.charAt(0) === "/") raw = raw.slice(1);
    var qIndex = raw.indexOf("?");
    var query = {};
    if (qIndex !== -1) {
      var qs = raw.slice(qIndex + 1);
      raw = raw.slice(0, qIndex);
      qs.split("&").forEach(function (pair) {
        if (!pair) return;
        var eq = pair.indexOf("=");
        var key = eq === -1 ? pair : pair.slice(0, eq);
        var val = eq === -1 ? "" : pair.slice(eq + 1);
        try { query[decodeURIComponent(key)] = decodeURIComponent(val); }
        catch (e) { query[key] = val; }
      });
    }
    var parts = raw.split("/").filter(function (p) { return p !== ""; });
    if (parts.length === 0) return { name: "dashboard", id: null, query: query };
    if (parts[0] === "tool") {
      if (!parts[1]) return { name: "dashboard", id: null, query: query };
      return { name: "tool", id: parts[1], query: query };
    }
    if (parts[0] === "settings") return { name: "settings", id: null, query: query };
    if (parts[0] === "about") return { name: "about", id: null, query: query };
    return { name: "dashboard", id: null, query: query };
  }

  function routeHref(route) {
    if (route.name === "tool") return "#/tool/" + route.id;
    if (route.name === "settings") return "#/settings";
    if (route.name === "about") return "#/about";
    return "#/";
  }

  // ------------------------------------------------------------------- DOM

  function $(id) {
    try { return global.document ? global.document.getElementById(id) : null; }
    catch (e) { return null; }
  }

  function el(tag, className, text) {
    var node = global.document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var toastHost = null;

  function toast(message) {
    if (!toastHost) toastHost = $("tb-toasts");
    if (!toastHost) return;
    var node = el("div", "tb-toast", message);
    toastHost.appendChild(node);
    global.setTimeout(function () {
      node.classList.add("tb-toast-out");
      global.setTimeout(function () { if (node.remove) node.remove(); }, 300);
    }, 1800);
  }

  function copyText(text) {
    var value = String(text == null ? "" : text);
    var done = { ok: true, copied: false };
    try {
      if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
        global.navigator.clipboard.writeText(value);
        done.copied = true;
      }
    } catch (e) {
      // fall through to the legacy path
    }
    if (!done.copied && global.document && global.document.createElement) {
      try {
        var area = global.document.createElement("textarea");
        area.value = value;
        if (global.document.body && global.document.body.appendChild) {
          global.document.body.appendChild(area);
          if (area.select) area.select();
          if (global.document.execCommand) global.document.execCommand("copy");
          if (area.remove) area.remove();
          done.copied = true;
        }
      } catch (e) {
        done.ok = false;
      }
    }
    return done;
  }

  // -------------------------------------------------------------- rendering

  var currentCleanup = null;
  var currentRoute = { name: "dashboard", id: null, query: {} };
  var paletteOpen = false;
  var paletteMatches = [];
  var paletteIndex = 0;

  function toolCard(tool, compact) {
    var card = el("a", "tb-card" + (compact ? " tb-card-compact" : ""));
    card.href = routeHref({ name: "tool", id: tool.id });
    card.setAttribute("data-tool", tool.id);
    card.innerHTML =
      '<span class="tb-card-icon" aria-hidden="true">' + esc(tool.icon) + "</span>" +
      '<span class="tb-card-body">' +
        '<span class="tb-card-name">' + esc(tool.name) + "</span>" +
        (compact ? "" : '<span class="tb-card-blurb">' + esc(tool.blurb) + "</span>") +
      "</span>";
    var star = el("button", "tb-star" + (isFavorite(tool.id) ? " is-on" : ""), isFavorite(tool.id) ? "★" : "☆");
    star.type = "button";
    star.setAttribute("aria-label", isFavorite(tool.id) ? "Remove from favourites" : "Add to favourites");
    star.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var on = toggleFavorite(tool.id);
      star.classList.toggle("is-on", on);
      star.textContent = on ? "★" : "☆";
      toast(on ? "Added to favourites" : "Removed from favourites");
    });
    card.appendChild(star);
    return card;
  }

  function renderSidebar() {
    var nav = $("tb-nav");
    if (!nav) return;
    nav.innerHTML = "";
    nav.appendChild(sidebarLink("#/", "🏠", "Dashboard", currentRoute.name === "dashboard"));
    if (state.favorites.length) {
      nav.appendChild(el("p", "tb-nav-head", "Favourites"));
      state.favorites.map(getTool).filter(Boolean).forEach(function (t) {
        nav.appendChild(sidebarLink(routeHref({ name: "tool", id: t.id }), t.icon, t.name, currentRoute.id === t.id));
      });
    }
    groups().forEach(function (group) {
      nav.appendChild(el("p", "tb-nav-head", group.name));
      group.tools.forEach(function (t) {
        nav.appendChild(sidebarLink(routeHref({ name: "tool", id: t.id }), t.icon, t.name, currentRoute.id === t.id));
      });
    });
    nav.appendChild(el("p", "tb-nav-head", "More"));
    nav.appendChild(sidebarLink("#/settings", "⚙", "Settings", currentRoute.name === "settings"));
    nav.appendChild(sidebarLink("#/about", "♥", "About", currentRoute.name === "about"));
  }

  function sidebarLink(href, icon, label, active) {
    var a = el("a", "tb-nav-link" + (active ? " is-active" : ""));
    a.href = href;
    a.innerHTML = '<span class="tb-nav-icon" aria-hidden="true">' + esc(icon) + "</span>" +
      '<span class="tb-nav-label">' + esc(label) + "</span>";
    return a;
  }

  function renderDashboard() {
    var view = $("tb-view");
    if (!view) return;
    view.innerHTML = "";
    view.appendChild(el("h1", "tb-view-title", "Toolbox"));
    view.appendChild(el("p", "tb-view-sub", "Every little helper we might need — all offline, all ours."));

    var search = el("input", "tb-search");
    search.type = "search";
    search.id = "tb-dash-search";
    search.placeholder = "Search " + tools.length + " tools…";
    search.setAttribute("aria-label", "Search tools");
    view.appendChild(search);

    var results = el("div", "tb-dash-results");
    view.appendChild(results);

    function paint(query) {
      results.innerHTML = "";
      if (!query && state.favorites.length) {
        results.appendChild(el("h2", "tb-group-head", "★ Favourites"));
        var favWrap = el("div", "tb-grid");
        state.favorites.map(getTool).filter(Boolean).forEach(function (t) { favWrap.appendChild(toolCard(t)); });
        results.appendChild(favWrap);
      }
      if (!query && state.recent.length) {
        var recent = recentTools();
        if (recent.length) {
          results.appendChild(el("h2", "tb-group-head", "Recently used"));
          var recentWrap = el("div", "tb-grid");
          recent.forEach(function (t) { recentWrap.appendChild(toolCard(t, true)); });
          results.appendChild(recentWrap);
        }
      }
      var found = searchTools(query);
      if (query) {
        results.appendChild(el("h2", "tb-group-head", found.length + (found.length === 1 ? " result" : " results")));
        var wrap = el("div", "tb-grid");
        found.forEach(function (t) { wrap.appendChild(toolCard(t)); });
        results.appendChild(wrap);
        if (!found.length) results.appendChild(el("p", "tb-empty", "No tool matches that — try another word."));
        return;
      }
      groups().forEach(function (group) {
        results.appendChild(el("h2", "tb-group-head", group.name));
        var grid = el("div", "tb-grid");
        group.tools.forEach(function (t) { grid.appendChild(toolCard(t)); });
        results.appendChild(grid);
      });
    }

    search.addEventListener("input", function () { paint(search.value); });
    paint("");
  }

  function renderTool(id, query) {
    var view = $("tb-view");
    var tool = getTool(id);
    if (!view) return;
    view.innerHTML = "";
    if (!tool) {
      view.appendChild(el("h1", "tb-view-title", "Not found"));
      view.appendChild(el("p", "tb-view-sub", "That tool doesn't exist. Pick another from the sidebar."));
      var back = el("a", "button button-primary", "Back to dashboard");
      back.href = "#/";
      view.appendChild(back);
      return;
    }
    touchRecent(id);

    var head = el("div", "tb-tool-head");
    var title = el("h1", "tb-view-title");
    title.innerHTML = '<span class="tb-tool-emoji" aria-hidden="true">' + esc(tool.icon) + "</span> " + esc(tool.name);
    head.appendChild(title);
    if (tool.blurb) head.appendChild(el("p", "tb-view-sub", tool.blurb));
    var fav = el("button", "tb-fav-btn" + (isFavorite(id) ? " is-on" : ""), isFavorite(id) ? "★ Favourite" : "☆ Favourite");
    fav.type = "button";
    fav.addEventListener("click", function () {
      var on = toggleFavorite(id);
      fav.classList.toggle("is-on", on);
      fav.textContent = on ? "★ Favourite" : "☆ Favourite";
      renderSidebar();
    });
    head.appendChild(fav);
    view.appendChild(head);

    var mount = el("div", "tb-tool-body");
    view.appendChild(mount);

    var api = {
      id: id,
      route: { name: "tool", id: id, query: query || {} },
      node: mount,
      state: state,
      settings: state.settings,
      getData: function () { return getData(id); },
      setData: function (value) { return setData(id, value); },
      save: saveState,
      esc: esc,
      el: el,
      uid: uid,
      clamp: clamp,
      fmtNumber: fmtNumber,
      parseNumber: parseNumber,
      toast: toast,
      copy: copyText
    };

    cleanupCurrent();
    if (tool.render) {
      var maybe = tool.render(mount, api);
      if (typeof maybe === "function") currentCleanup = maybe;
    } else {
      mount.appendChild(el("p", "tb-empty", "This tool has no interface yet."));
    }
    if (global.scrollTo) { try { global.scrollTo({ top: 0, behavior: "instant" }); } catch (e) { /* older browsers */ } }
  }

  function cleanupCurrent() {
    if (typeof currentCleanup === "function") {
      try { currentCleanup(); } catch (e) { /* ignore */ }
    }
    currentCleanup = null;
  }

  function renderSettings() {
    var view = $("tb-view");
    if (!view) return;
    view.innerHTML = "";
    view.appendChild(el("h1", "tb-view-title", "Settings"));
    view.appendChild(el("p", "tb-view-sub", "Small preferences, and your data — kept only on this device."));

    var card = el("div", "tb-panel");
    card.appendChild(el("h2", "tb-panel-title", "Preferences"));

    var currency = selectField("Default currency", ["PKR", "RON", "EUR", "USD", "GBP", "INR"], state.settings.currency);
    currency.select.addEventListener("change", function () {
      state.settings.currency = currency.select.value;
      saveState();
      toast("Currency set to " + currency.select.value);
    });
    card.appendChild(currency.wrap);

    var decimals = numberField("Decimal places", state.settings.decimals, 0, 8, 1);
    decimals.input.addEventListener("change", function () {
      state.settings.decimals = clamp(parseInt(decimals.input.value, 10) || 2, 0, 8);
      decimals.input.value = state.settings.decimals;
      saveState();
    });
    card.appendChild(decimals.wrap);

    var week = selectField("Week starts on", ["Sunday", "Monday", "Saturday"], ["Sunday", "Monday", "Saturday"][state.settings.startOfWeek] || "Sunday");
    week.select.addEventListener("change", function () {
      state.settings.startOfWeek = ["Sunday", "Monday", "Saturday"].indexOf(week.select.value);
      saveState();
    });
    card.appendChild(week.wrap);
    view.appendChild(card);

    var favCard = el("div", "tb-panel");
    favCard.appendChild(el("h2", "tb-panel-title", "Favourites"));
    if (!state.favorites.length) {
      favCard.appendChild(el("p", "tb-empty", "Star a tool to pin it here and at the top of the dashboard."));
    } else {
      var chips = el("div", "tb-chips");
      state.favorites.map(getTool).filter(Boolean).forEach(function (t) {
        var chip = el("a", "tb-chip", t.icon + " " + t.name);
        chip.href = routeHref({ name: "tool", id: t.id });
        chips.appendChild(chip);
      });
      favCard.appendChild(chips);
    }
    view.appendChild(favCard);

    var dataCard = el("div", "tb-panel");
    dataCard.appendChild(el("h2", "tb-panel-title", "Backup & restore"));
    dataCard.appendChild(el("p", "tb-muted", "Download everything as a JSON file, or paste a backup back in."));

    var btnRow = el("div", "tb-btn-row");
    var dl = el("button", "button button-primary", "⬇ Download backup");
    dl.type = "button";
    dl.addEventListener("click", function () {
      var json = exportState();
      var name = "love-toolbox-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      if (!downloadFile(name, json, "application/json")) {
        copyText(json);
        toast("Backup copied to the clipboard");
      } else {
        toast("Backup downloaded");
      }
    });
    btnRow.appendChild(dl);

    var clearBtn = el("button", "button button-ghost", "Erase everything");
    clearBtn.type = "button";
    clearBtn.addEventListener("click", function () {
      if (global.confirm && !global.confirm("Erase all toolbox data? This cannot be undone.")) return;
      clearAll();
      toast("Everything erased");
      renderSidebar();
      routeTo({ name: "settings" });
    });
    btnRow.appendChild(clearBtn);
    dataCard.appendChild(btnRow);

    var file = el("input", "tb-file");
    file.type = "file";
    file.accept = ".json,application/json";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { applyImport(String(reader.result)); };
      reader.readAsText(f);
    });
    dataCard.appendChild(file);

    var area = el("textarea", "tb-textarea");
    area.rows = 4;
    area.placeholder = "…or paste a backup here";
    dataCard.appendChild(area);
    var pasteBtn = el("button", "button button-primary", "Restore from text");
    pasteBtn.type = "button";
    pasteBtn.addEventListener("click", function () { if (applyImport(area.value)) area.value = ""; });
    dataCard.appendChild(pasteBtn);

    var usage = measureUsage();
    dataCard.appendChild(el("p", "tb-muted", "Stored locally: " + usage.bytes + " bytes across " + usage.keys + " key" + (usage.keys === 1 ? "" : "s") + "."));
    view.appendChild(dataCard);
  }

  function applyImport(text) {
    var result = importState(text);
    if (!result.ok) { toast(result.error); return false; }
    toast("Backup restored ♥");
    renderSidebar();
    routeTo({ name: "settings" });
    return true;
  }

  function selectField(label, options, value) {
    var wrap = el("label", "tb-field");
    wrap.appendChild(el("span", "tb-field-label", label));
    var select = el("select", "tb-input");
    options.forEach(function (opt) {
      var o = el("option", null, opt);
      o.value = opt;
      if (opt === value) o.selected = true;
      select.appendChild(o);
    });
    wrap.appendChild(select);
    return { wrap: wrap, select: select };
  }

  function numberField(label, value, min, max, step) {
    var wrap = el("label", "tb-field");
    wrap.appendChild(el("span", "tb-field-label", label));
    var input = el("input", "tb-input");
    input.type = "number";
    input.value = value;
    input.min = min;
    input.max = max;
    input.step = step || 1;
    wrap.appendChild(input);
    return { wrap: wrap, input: input };
  }

  function renderAbout() {
    var view = $("tb-view");
    if (!view) return;
    view.innerHTML = "";
    view.appendChild(el("h1", "tb-view-title", "About"));
    var p = el("div", "tb-panel");
    p.innerHTML =
      "<p>Love Toolbox is a single, quiet place for the little helpers we reach for " +
      "all day — a calculator, a converter, a timer, a note or two.</p>" +
      "<p>It is one page with " + tools.length + " tools. Everything is computed in your " +
      "browser and saved only on your own device (<code>mena-toolbox</code>). No accounts, " +
      "no tracking, no network requests.</p>" +
      "<p>Press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to search every tool by name.</p>" +
      "<p class=\"tb-muted\">Made with love, just for you ♥</p>";
    view.appendChild(p);

    var tips = el("div", "tb-panel");
    tips.appendChild(el("h2", "tb-panel-title", "Deep links"));
    var ul = el("ul", "tb-list");
    ul.innerHTML =
      "<li><code>#/</code> — the dashboard</li>" +
      "<li><code>#/tool/calculator</code> — open a tool directly</li>" +
      "<li><code>#/settings</code> — preferences and backup</li>";
    tips.appendChild(ul);
    view.appendChild(tips);
  }

  function downloadFile(name, content, type) {
    try {
      if (!global.Blob || !global.URL || !global.document) return false;
      var blob = new global.Blob([content], { type: type || "text/plain" });
      var url = global.URL.createObjectURL(blob);
      var a = global.document.createElement("a");
      a.href = url;
      a.download = name;
      if (global.document.body && global.document.body.appendChild) global.document.body.appendChild(a);
      if (a.click) a.click();
      global.setTimeout(function () {
        try { global.URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        if (a.remove) a.remove();
      }, 1000);
      return true;
    } catch (e) {
      return false;
    }
  }

  function measureUsage() {
    var store = storage();
    var keys = 0;
    var bytes = 0;
    if (store && store.length != null) {
      for (var i = 0; i < store.length; i += 1) {
        var k = store.key(i);
        if (k && k.indexOf("mena-") === 0) {
          keys += 1;
          bytes += (k.length + String(store.getItem(k) || "").length);
        }
      }
    }
    return { keys: keys, bytes: bytes };
  }

  // ----------------------------------------------------------------- palette

  function renderPalette() {
    var list = $("tb-palette-list");
    if (!list) return;
    list.innerHTML = "";
    if (!paletteMatches.length) {
      list.appendChild(el("li", "tb-palette-empty", "No matches"));
      return;
    }
    paletteMatches.forEach(function (tool, i) {
      var li = el("li", "tb-palette-item" + (i === paletteIndex ? " is-active" : ""));
      li.setAttribute("data-id", tool.id);
      li.innerHTML = '<span class="tb-palette-icon">' + esc(tool.icon) + "</span>" +
        '<span class="tb-palette-name">' + esc(tool.name) + "</span>" +
        '<span class="tb-palette-group">' + esc(tool.group) + "</span>";
      li.addEventListener("mouseenter", function () { paletteIndex = i; paintPaletteActive(); });
      li.addEventListener("click", function () { choosePalette(i); });
      list.appendChild(li);
    });
  }

  function paintPaletteActive() {
    var list = $("tb-palette-list");
    if (!list) return;
    var items = list.children || [];
    for (var i = 0; i < items.length; i += 1) {
      if (items[i].classList) items[i].classList.toggle("is-active", i === paletteIndex);
    }
  }

  function openPalette() {
    var overlay = $("tb-palette");
    var input = $("tb-palette-input");
    if (!overlay || !input) return;
    paletteOpen = true;
    overlay.hidden = false;
    input.value = "";
    paletteMatches = list();
    paletteIndex = 0;
    renderPalette();
    if (input.focus) input.focus();
  }

  function closePalette() {
    var overlay = $("tb-palette");
    if (overlay) overlay.hidden = true;
    paletteOpen = false;
  }

  function choosePalette(index) {
    var tool = paletteMatches[index];
    if (!tool) return;
    closePalette();
    routeTo({ name: "tool", id: tool.id });
  }

  function bindPalette() {
    var overlay = $("tb-palette");
    var input = $("tb-palette-input");
    var opener = $("tb-open-palette");
    if (opener) opener.addEventListener("click", openPalette);
    if (!overlay || !input) return;

    if (overlay.querySelectorAll) {
      var closers = overlay.querySelectorAll("[data-close='palette']");
      for (var i = 0; i < closers.length; i += 1) closers[i].addEventListener("click", closePalette);
    }

    input.addEventListener("input", function () {
      paletteMatches = searchTools(input.value);
      paletteIndex = 0;
      renderPalette();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        paletteIndex = Math.min(paletteIndex + 1, paletteMatches.length - 1);
        paintPaletteActive();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        paletteIndex = Math.max(paletteIndex - 1, 0);
        paintPaletteActive();
      } else if (event.key === "Enter") {
        event.preventDefault();
        choosePalette(paletteIndex);
      } else if (event.key === "Escape") {
        closePalette();
      }
    });

    if (global.document && global.document.addEventListener) {
      global.document.addEventListener("keydown", function (event) {
        var mod = event.ctrlKey || event.metaKey;
        if (mod && (event.key === "k" || event.key === "K")) {
          event.preventDefault();
          if (paletteOpen) closePalette(); else openPalette();
        } else if (event.key === "Escape" && paletteOpen) {
          closePalette();
        }
      });
    }
  }

  // ------------------------------------------------------------------ boot

  function render(route) {
    currentRoute = route;
    cleanupCurrent();
    if (route.name === "tool") renderTool(route.id, route.query);
    else if (route.name === "settings") renderSettings();
    else if (route.name === "about") renderAbout();
    else renderDashboard();
    renderSidebar();
  }

  function currentHash() {
    try {
      if (global.location && typeof global.location.hash === "string") return global.location.hash;
    } catch (e) { /* ignore */ }
    return "";
  }

  function routeTo(route) {
    var href = routeHref(route);
    try {
      if (global.location) {
        if (global.location.hash === href) { render(parseRoute(href)); return; }
        global.location.hash = href;
        return;
      }
    } catch (e) { /* ignore */ }
    render(parseRoute(href));
  }

  function onHashChange() {
    render(parseRoute(currentHash()));
  }

  function boot() {
    var app = $("tb-app");
    if (!app) return; // bare-node harness: nothing to do
    loadState();
    bindPalette();
    if (global.addEventListener) global.addEventListener("hashchange", onHashChange);
    render(parseRoute(currentHash()));
  }

  // --------------------------------------------------------------- assembly

  var MenaToolbox = {
    version: "1.0.0",
    namespace: "MenaToolbox",
    storageKey: STATE_KEY,
    // pure helpers
    esc: esc,
    uid: uid,
    clamp: clamp,
    fmtNumber: fmtNumber,
    parseNumber: parseNumber,
    deepClone: deepClone,
    // state
    defaultState: defaultState,
    loadState: loadState,
    saveState: saveState,
    getState: function () { return state; },
    getData: getData,
    setData: setData,
    exportState: exportState,
    importState: importState,
    clearAll: clearAll,
    measureUsage: measureUsage,
    // registry
    register: register,
    list: list,
    getTool: getTool,
    groups: groups,
    searchTools: searchTools,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    recentTools: recentTools,
    // router
    parseRoute: parseRoute,
    routeHref: routeHref,
    routeTo: routeTo,
    render: render,
    currentRoute: function () { return currentRoute; },
    // ui
    toast: toast,
    copyText: copyText,
    downloadFile: downloadFile,
    openPalette: openPalette,
    closePalette: closePalette,
    // test hook
    boot: boot,
    el: el,
    tools: {}
  };

  global.MenaToolbox = MenaToolbox;

  if (global.document && global.document.addEventListener) {
    global.document.addEventListener("DOMContentLoaded", boot);
  }
})(typeof window !== "undefined" ? window : this);
