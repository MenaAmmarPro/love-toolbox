"use strict";

/*
 * Tool: Unit Converter — length, mass, temperature, area, volume, speed,
 * time, data, pressure, energy, power and angle.
 */

(function (global) {
  var T = global.MenaToolbox;
  if (!T) return;

  var CATEGORIES = {
    length: {
      name: "Length", base: "m",
      units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, µm: 1e-6, nm: 1e-9, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 }
    },
    mass: {
      name: "Mass", base: "kg",
      units: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.028349523125, st: 6.35029318 }
    },
    temperature: {
      name: "Temperature", base: "°C", special: true,
      units: { "°C": 1, "°F": 0.5555555556, K: 1 }
    },
    area: {
      name: "Area", base: "m²",
      units: { "m²": 1, "km²": 1e6, "cm²": 1e-4, ha: 10000, acre: 4046.8564224, "ft²": 0.09290304, "in²": 0.00064516, "mi²": 2589988.110336 }
    },
    volume: {
      name: "Volume", base: "l",
      units: { l: 1, ml: 0.001, "m³": 1000, "cm³": 0.001, gal: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.2365882365, "fl oz": 0.0295735295625, tbsp: 0.01478676478125, tsp: 0.00492892159375 }
    },
    speed: {
      name: "Speed", base: "m/s",
      units: { "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704, kn: 0.5144444444444444, "ft/s": 0.3048 }
    },
    time: {
      name: "Time", base: "s",
      units: { s: 1, ms: 0.001, min: 60, h: 3600, day: 86400, week: 604800, year: 31557600 }
    },
    data: {
      name: "Data", base: "B",
      units: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, bit: 0.125, Kbit: 128, Mbit: 131072, Gbit: 134217728 }
    },
    pressure: {
      name: "Pressure", base: "Pa",
      units: { Pa: 1, kPa: 1000, bar: 100000, atm: 101325, psi: 6894.757293168, mmHg: 133.322387415 }
    },
    energy: {
      name: "Energy", base: "J",
      units: { J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3600000 }
    },
    power: {
      name: "Power", base: "W",
      units: { W: 1, kW: 1000, MW: 1e6, hp: 745.6998715822702 }
    },
    angle: {
      name: "Angle", base: "deg",
      units: { deg: 1, rad: 57.29577951308232, grad: 0.9, turn: 360 }
    }
  };

  function tempToC(value, unit) {
    if (unit === "°F") return (value - 32) / 1.8;
    if (unit === "K") return value - 273.15;
    return value;
  }

  function tempFromC(celsius, unit) {
    if (unit === "°F") return celsius * 1.8 + 32;
    if (unit === "K") return celsius + 273.15;
    return celsius;
  }

  function unitsOf(category) {
    var cat = CATEGORIES[category];
    return cat ? Object.keys(cat.units) : [];
  }

  function convert(value, category, from, to) {
    var cat = CATEGORIES[category];
    var num = Number(value);
    if (!cat || isNaN(num)) return NaN;
    if (!(from in cat.units) || !(to in cat.units)) return NaN;
    if (cat.special) return tempFromC(tempToC(num, from), to);
    var inBase = num * cat.units[from];
    return inBase / cat.units[to];
  }

  function convertAll(value, category, from) {
    var out = [];
    unitsOf(category).forEach(function (unit) {
      out.push({ unit: unit, value: convert(value, category, from, unit) });
    });
    return out;
  }

  function fmt(value) {
    if (isNaN(value)) return "—";
    if (!isFinite(value)) return value > 0 ? "∞" : "-∞";
    if (value !== 0 && (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-6)) return value.toExponential(6);
    return String(Math.round(value * 1e10) / 1e10);
  }

  // -------------------------------------------------------------------- UI

  function render(mount, api) {
    var data = api.getData();
    var category = data.category && CATEGORIES[data.category] ? data.category : "length";
    var from = data.from || unitsOf(category)[0];
    var to = data.to || unitsOf(category)[1] || unitsOf(category)[0];

    var panel = api.el("div", "tb-panel");

    var catRow = api.el("label", "tb-field");
    catRow.appendChild(api.el("span", "tb-field-label", "Category"));
    var catSel = api.el("select", "tb-input");
    Object.keys(CATEGORIES).forEach(function (key) {
      var o = api.el("option", null, CATEGORIES[key].name);
      o.value = key;
      if (key === category) o.selected = true;
      catSel.appendChild(o);
    });
    catRow.appendChild(catSel);

    var amountInput = api.el("input", "tb-input");
    amountInput.type = "number";
    amountInput.value = data.amount == null ? 1 : data.amount;
    amountInput.step = "any";

    var fromSel = api.el("select", "tb-input");
    var toSel = api.el("select", "tb-input");

    var swapBtn = api.el("button", "tb-btn", "⇄ Swap");
    swapBtn.type = "button";

    var row = api.el("div", "tb-row");
    var amountField = api.el("label", "tb-field");
    amountField.appendChild(api.el("span", "tb-field-label", "Value"));
    amountField.appendChild(amountInput);
    var fromField = api.el("label", "tb-field");
    fromField.appendChild(api.el("span", "tb-field-label", "From"));
    fromField.appendChild(fromSel);
    var toField = api.el("label", "tb-field");
    toField.appendChild(api.el("span", "tb-field-label", "To"));
    toField.appendChild(toSel);
    row.appendChild(amountField);
    row.appendChild(fromField);
    row.appendChild(toField);

    var result = api.el("div", "tb-output tb-big", "—");
    var table = api.el("div", "tb-kv");

    panel.appendChild(catRow);
    panel.appendChild(row);
    panel.appendChild(swapBtn);
    panel.appendChild(result);
    panel.appendChild(table);
    mount.appendChild(panel);

    function fillUnits() {
      var list = unitsOf(category);
      if (list.indexOf(from) === -1) from = list[0];
      if (list.indexOf(to) === -1) to = list[1] || list[0];
      [fromSel, toSel].forEach(function (sel, idx) {
        sel.innerHTML = "";
        list.forEach(function (u) {
          var o = api.el("option", null, u);
          o.value = u;
          if (u === (idx === 0 ? from : to)) o.selected = true;
          sel.appendChild(o);
        });
      });
    }

    function update() {
      var value = parseFloat(amountInput.value);
      data.category = category;
      data.from = from;
      data.to = to;
      data.amount = amountInput.value;
      api.setData(data);
      if (isNaN(value)) { result.textContent = "—"; table.innerHTML = ""; return; }
      result.textContent = fmt(convert(value, category, from, to)) + " " + to;
      table.innerHTML = "";
      convertAll(value, category, from).forEach(function (entry) {
        var dt = api.el("dt", null, entry.unit);
        var dd = api.el("dd", null, fmt(entry.value));
        table.appendChild(dt);
        table.appendChild(dd);
      });
    }

    catSel.addEventListener("change", function () {
      category = catSel.value;
      from = unitsOf(category)[0];
      to = unitsOf(category)[1] || from;
      fillUnits();
      update();
    });
    fromSel.addEventListener("change", function () { from = fromSel.value; update(); });
    toSel.addEventListener("change", function () { to = toSel.value; update(); });
    amountInput.addEventListener("input", update);
    swapBtn.addEventListener("click", function () {
      var tmp = from; from = to; to = tmp;
      fillUnits();
      update();
    });

    fillUnits();
    update();
    return function cleanup() {};
  }

  T.tools.units = {
    CATEGORIES: CATEGORIES,
    convert: convert,
    convertAll: convertAll,
    unitsOf: unitsOf,
    fmt: fmt
  };

  T.register({
    id: "units",
    name: "Unit Converter",
    icon: "📏",
    group: "Converters",
    blurb: "Length, mass, temperature, data and more",
    keywords: "unit convert length mass temperature area volume speed data km miles celsius fahrenheit",
    render: render
  });
})(typeof window !== "undefined" ? window : this);
