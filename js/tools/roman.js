"use strict";

/*
 * Tool: Roman Numerals — convert either way (1..3999) with a step-by-step
 * breakdown, plus a reference table.
 */

(function (global) {
  var T = global.MenaToolbox;
  if (!T) return;

  var TABLE = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];

  var VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

  function toRoman(n) {
    var num = Math.floor(Number(n));
    if (!isFinite(num) || num < 1 || num > 3999) return null;
    var out = "";
    TABLE.forEach(function (pair) {
      while (num >= pair[0]) { out += pair[1]; num -= pair[0]; }
    });
    return out;
  }

  function expand(n) {
    var num = Math.floor(Number(n));
    if (!isFinite(num) || num < 1 || num > 3999) return null;
    var parts = [];
    TABLE.forEach(function (pair) {
      var count = 0;
      while (num >= pair[0]) { num -= pair[0]; count += 1; }
      if (count) parts.push(pair[1] + " (" + pair[0] + ")" + (count > 1 ? " ×" + count : ""));
    });
    return parts;
  }

  function fromRoman(text) {
    var s = String(text == null ? "" : text).trim().toUpperCase();
    if (!s) return null;
    if (!/^[IVXLCDM]+$/.test(s)) return null;
    var total = 0;
    for (var i = 0; i < s.length; i += 1) {
      var value = VALUES[s.charAt(i)];
      var next = VALUES[s.charAt(i + 1)];
      total += next && next > value ? -value : value;
    }
    // Reject non-canonical forms (IIII, VV, IL, …) by round-tripping.
    if (toRoman(total) !== s) return null;
    if (total < 1 || total > 3999) return null;
    return total;
  }

  function render(mount, api) {
    var data = api.getData();
    var panel = api.el("div", "tb-panel");

    var row = api.el("div", "tb-row");
    var numberField = api.el("label", "tb-field");
    numberField.appendChild(api.el("span", "tb-field-label", "Number (1–3999)"));
    var numInput = api.el("input", "tb-input");
    numInput.type = "number";
    numInput.min = 1;
    numInput.max = 3999;
    numInput.value = data.number == null ? 2026 : data.number;
    numberField.appendChild(numInput);

    var romanField = api.el("label", "tb-field");
    romanField.appendChild(api.el("span", "tb-field-label", "Roman numeral"));
    var romanInput = api.el("input", "tb-input tb-mono");
    romanInput.value = data.roman || "MMXXVI";
    romanField.appendChild(romanInput);

    row.appendChild(numberField);
    row.appendChild(romanField);
    panel.appendChild(row);

    var big = api.el("div", "tb-output tb-big", "");
    var steps = api.el("div", "tb-kv");
    panel.appendChild(big);
    panel.appendChild(api.el("p", "tb-note", "Breakdown:"));
    panel.appendChild(steps);
    mount.appendChild(panel);

    function updateFromNumber() {
      var roman = toRoman(numInput.value);
      data.number = numInput.value;
      if (roman) {
        romanInput.value = roman;
        data.roman = roman;
        big.textContent = roman;
        renderSteps(numInput.value);
      } else {
        big.textContent = "—";
        steps.innerHTML = "";
      }
      api.setData(data);
    }

    function updateFromRoman() {
      var n = fromRoman(romanInput.value);
      data.roman = romanInput.value;
      if (n != null) {
        numInput.value = n;
        data.number = n;
        big.textContent = String(n);
        renderSteps(n);
      } else {
        big.textContent = "Not a valid Roman numeral (1–3999).";
        steps.innerHTML = "";
      }
      api.setData(data);
    }

    function renderSteps(n) {
      steps.innerHTML = "";
      var parts = expand(n) || [];
      if (!parts.length) { steps.appendChild(api.el("dd", null, "—")); return; }
      parts.forEach(function (part) {
        steps.appendChild(api.el("dt", null, part.split(" ")[0]));
        steps.appendChild(api.el("dd", null, part));
      });
    }

    numInput.addEventListener("input", updateFromNumber);
    romanInput.addEventListener("input", updateFromRoman);

    // reference table
    var ref = api.el("div", "tb-panel");
    ref.appendChild(api.el("h2", "tb-panel-title", "Roman reference"));
    var table = api.el("div", "tb-kv");
    [1, 4, 5, 9, 10, 40, 50, 90, 100, 400, 500, 900, 1000].forEach(function (n) {
      table.appendChild(api.el("dt", null, String(n)));
      table.appendChild(api.el("dd", "tb-mono", toRoman(n)));
    });
    ref.appendChild(table);
    mount.appendChild(ref);

    updateFromNumber();
    return function cleanup() {};
  }

  T.tools.roman = {
    TABLE: TABLE,
    toRoman: toRoman,
    fromRoman: fromRoman,
    expand: expand
  };

  T.register({
    id: "roman",
    name: "Roman Numerals",
    icon: "🏛️",
    group: "Converters",
    blurb: "Numbers ⇄ Roman numerals (1–3999)",
    keywords: "roman numeral convert latin i v x l c d m",
    render: render
  });
})(typeof window !== "undefined" ? window : this);
