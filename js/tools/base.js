"use strict";

/*
 * Tool: Base Converter — convert between any bases 2..36, with BigInt so very
 * large numbers stay exact. Also shows the ASCII/byte view of the value.
 */

(function (global) {
  var T = global.MenaToolbox;
  if (!T) return;

  var DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

  function clean(text) {
    return String(text == null ? "" : text)
      .trim()
      .toLowerCase()
      .replace(/^0[xbo]/, "")
      .replace(/[\s,_]/g, "");
  }

  function parseBig(text, base) {
    var s = clean(text);
    if (!s) return null;
    var neg = false;
    if (s.charAt(0) === "-") { neg = true; s = s.slice(1); }
    if (s.charAt(0) === "+") s = s.slice(1);
    if (!s) return null;
    var b = BigInt(base);
    var value = 0n;
    for (var i = 0; i < s.length; i += 1) {
      var d = DIGITS.indexOf(s.charAt(i));
      if (d < 0 || d >= base) return null;
      value = value * b + BigInt(d);
    }
    return neg ? -value : value;
  }

  function toBaseBig(value, base) {
    var v = BigInt(value);
    if (v === 0n) return "0";
    var b = BigInt(base);
    var neg = v < 0n;
    if (neg) v = -v;
    var out = "";
    while (v > 0n) {
      out = DIGITS.charAt(Number(v % b)) + out;
      v = v / b;
    }
    return (neg ? "-" : "") + out;
  }

  function convert(text, fromBase, toBase) {
    var v = parseBig(text, fromBase);
    if (v === null) return null;
    return toBaseBig(v, toBase);
  }

  function group(text) {
    var s = String(text);
    var neg = s.charAt(0) === "-";
    if (neg) s = s.slice(1);
    return (neg ? "-" : "") + s.replace(/\B(?=(.{4})+$)/g, " ");
  }

  function toBytes(value) {
    var v = BigInt(value);
    if (v < 0n) v = -v;
    var out = [];
    while (v > 0n) { out.unshift(Number(v % 256n)); v = v / 256n; }
    return out;
  }

  function toAscii(value) {
    var v = BigInt(value);
    var neg = v < 0n;
    if (neg) v = -v;
    var hex = toBaseBig(v, 16);
    if (hex.length % 2) hex = "0" + hex;
    var out = "";
    for (var i = 0; i < hex.length; i += 2) {
      var code = parseInt(hex.slice(i, i + 2), 16);
      out += code >= 32 && code < 127 ? String.fromCharCode(code) : ".";
    }
    return (neg ? "-" : "") + out;
  }

  function fmtBig(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function render(mount, api) {
    var data = api.getData();
    var fromBase = data.fromBase || 10;

    var panel = api.el("div", "tb-panel");
    var row = api.el("div", "tb-row");

    var inputField = api.el("label", "tb-field");
    inputField.appendChild(api.el("span", "tb-field-label", "Value"));
    var input = api.el("input", "tb-input tb-mono");
    input.value = data.value == null ? "255" : data.value;
    inputField.appendChild(input);

    var baseField = api.el("label", "tb-field");
    baseField.appendChild(api.el("span", "tb-field-label", "Input base"));
    var baseSel = api.el("select", "tb-input");
    [[2, "Binary (2)"], [8, "Octal (8)"], [10, "Decimal (10)"], [16, "Hex (16)"], [32, "Base 32"], [36, "Base 36"]].forEach(function (pair) {
      var o = api.el("option", null, pair[1]);
      o.value = String(pair[0]);
      if (fromBase === pair[0]) o.selected = true;
      baseSel.appendChild(o);
    });
    baseField.appendChild(baseSel);

    var customField = api.el("label", "tb-field");
    customField.appendChild(api.el("span", "tb-field-label", "Custom base (2–36)"));
    var custom = api.el("input", "tb-input");
    custom.type = "number";
    custom.min = 2;
    custom.max = 36;
    custom.value = data.custom || 7;
    customField.appendChild(custom);

    row.appendChild(inputField);
    row.appendChild(baseField);
    row.appendChild(customField);
    panel.appendChild(row);

    var err = api.el("p", "tb-error", "");
    panel.appendChild(err);
    var table = api.el("div", "tb-kv");
    panel.appendChild(table);

    var bytes = api.el("div", "tb-output");
    panel.appendChild(api.el("p", "tb-note", "Bytes / ASCII:"));
    panel.appendChild(bytes);

    function update() {
      data.value = input.value;
      data.fromBase = fromBase;
      data.custom = parseInt(custom.value, 10) || 7;
      api.setData(data);
      var value = parseBig(input.value, fromBase);
      table.innerHTML = "";
      if (value === null) {
        err.textContent = "Not a valid number in base " + fromBase + ".";
        bytes.textContent = "—";
        return;
      }
      err.textContent = "";
      var customBase = Math.max(2, Math.min(36, parseInt(custom.value, 10) || 7));
      var rows = [
        ["Binary", toBaseBig(value, 2)],
        ["Octal", toBaseBig(value, 8)],
        ["Decimal", fmtBig(value)],
        ["Hex", toBaseBig(value, 16).toUpperCase()],
        ["Base 32", toBaseBig(value, 32)],
        ["Base 36", toBaseBig(value, 36)],
        ["Base " + customBase, toBaseBig(value, customBase)],
        ["Octal (grouped)", group(toBaseBig(value, 8))],
        ["Binary (grouped)", group(toBaseBig(value, 2))],
        ["Hex bytes", toBytes(value).map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join(" ")],
        ["Bits", toBaseBig(value, 2).replace(/^-/, "").length]
      ];
      rows.forEach(function (pair) {
        table.appendChild(api.el("dt", null, pair[0]));
        var dd = api.el("dd", "tb-mono", pair[1]);
        table.appendChild(dd);
      });
      bytes.textContent = toAscii(value) || "—";
    }

    input.addEventListener("input", update);
    baseSel.addEventListener("change", function () { fromBase = parseInt(baseSel.value, 10); update(); });
    custom.addEventListener("input", update);
    update();
    return function cleanup() {};
  }

  T.tools.base = {
    DIGITS: DIGITS,
    parseBig: parseBig,
    toBaseBig: toBaseBig,
    convert: convert,
    group: group,
    toBytes: toBytes,
    toAscii: toAscii,
    fmtBig: fmtBig
  };

  T.register({
    id: "base",
    name: "Number Base",
    icon: "🔢",
    group: "Converters",
    blurb: "Binary, octal, decimal, hex and any base 2–36",
    keywords: "base binary octal decimal hex radix number convert bits bytes ascii bigint",
    render: render
  });
})(typeof window !== "undefined" ? window : this);
