"use strict";

/*
 * Tool: Colour Converter — parse and convert between HEX, RGB(A), HSL, HSV,
 * CMYK and CSS names, with luminance and contrast checks.
 */

(function (global) {
  var T = global.MenaToolbox;
  if (!T) return;

  var NAMES = {
    black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], green: [0, 128, 0],
    blue: [0, 0, 255], yellow: [255, 255, 0], cyan: [0, 255, 255], magenta: [255, 0, 255],
    silver: [192, 192, 192], gray: [128, 128, 128], grey: [128, 128, 128],
    maroon: [128, 0, 0], olive: [128, 128, 0], lime: [0, 255, 0], teal: [0, 128, 128],
    navy: [0, 0, 128], purple: [128, 0, 128], fuchsia: [255, 0, 255], aqua: [0, 255, 255],
    orange: [255, 165, 0], pink: [255, 192, 203], gold: [255, 215, 0], coral: [255, 127, 80],
    tomato: [255, 99, 71], violet: [238, 130, 238], indigo: [75, 0, 130],
    salmon: [250, 128, 114], khaki: [240, 230, 140], lavender: [230, 230, 250],
    crimson: [220, 20, 60], turquoise: [64, 224, 208], plum: [221, 160, 221],
    orchid: [218, 112, 214], beige: [245, 245, 220], ivory: [255, 255, 240],
    snow: [255, 250, 250], peachpuff: [255, 218, 185], mistyrose: [255, 228, 225]
  };

  function clampByte(v) { return Math.max(0, Math.min(255, Math.round(Number(v) || 0))); }

  function parse(input) {
    if (input == null) return null;
    var s = String(input).trim().toLowerCase();
    if (!s) return null;
    if (NAMES[s]) return { r: NAMES[s][0], g: NAMES[s][1], b: NAMES[s][2], a: 1 };

    var hex = /^#?([0-9a-f]{3,8})$/.exec(s);
    if (hex) {
      var h = hex[1];
      if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
      if (h.length === 4) h = h.slice(0, 3).split("").map(function (c) { return c + c; }).join("");
      if (h.length === 6 || h.length === 8) {
        return {
          r: parseInt(h.slice(0, 2), 16),
          g: parseInt(h.slice(2, 4), 16),
          b: parseInt(h.slice(4, 6), 16),
          a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        };
      }
      return null;
    }

    var rgb = /^rgba?\(([^)]+)\)$/.exec(s);
    if (rgb) {
      var parts = rgb[1].split(/[,/\s]+/).filter(Boolean);
      if (parts.length < 3) return null;
      return {
        r: clampByte(parseFloat(parts[0])),
        g: clampByte(parseFloat(parts[1])),
        b: clampByte(parseFloat(parts[2])),
        a: parts.length > 3 ? Math.max(0, Math.min(1, parseFloat(parts[3]))) : 1
      };
    }
    return null;
  }

  function toHex(color, withAlpha) {
    var c = color;
    var hex = "#" + [c.r, c.g, c.b].map(function (v) {
      return ("0" + clampByte(v).toString(16)).slice(-2);
    }).join("");
    if (withAlpha && c.a != null && c.a < 1) {
      hex += ("0" + Math.round(c.a * 255).toString(16)).slice(-2);
    }
    return hex.toUpperCase();
  }

  function toRgbString(color) {
    if (color.a != null && color.a < 1) {
      return "rgba(" + clampByte(color.r) + ", " + clampByte(color.g) + ", " + clampByte(color.b) + ", " + Math.round(color.a * 100) / 100 + ")";
    }
    return "rgb(" + clampByte(color.r) + ", " + clampByte(color.g) + ", " + clampByte(color.b) + ")";
  }

  function toHsl(color) {
    var r = clampByte(color.r) / 255, g = clampByte(color.g) / 255, b = clampByte(color.b) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var h = 0, sat = 0;
    if (max !== min) {
      var d = max - min;
      sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(sat * 100), l: Math.round(l * 100) };
  }

  function toHsv(color) {
    var r = clampByte(color.r) / 255, g = clampByte(color.g) / 255, b = clampByte(color.b) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round((max === 0 ? 0 : d / max) * 100),
      v: Math.round(max * 100)
    };
  }

  function toCmyk(color) {
    var r = clampByte(color.r) / 255, g = clampByte(color.g) / 255, b = clampByte(color.b) / 255;
    var k = 1 - Math.max(r, g, b);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    return {
      c: Math.round(((1 - r - k) / (1 - k)) * 100),
      m: Math.round(((1 - g - k) / (1 - k)) * 100),
      y: Math.round(((1 - b - k) / (1 - k)) * 100),
      k: Math.round(k * 100)
    };
  }

  function hslToRgb(h, s, l) {
    var hh = ((h % 360) + 360) % 360 / 360;
    var ss = Math.max(0, Math.min(1, s / 100));
    var ll = Math.max(0, Math.min(1, l / 100));
    if (ss === 0) {
      var v = Math.round(ll * 255);
      return { r: v, g: v, b: v, a: 1 };
    }
    var q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    var p = 2 * ll - q;
    function hue(t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return {
      r: Math.round(hue(hh + 1 / 3) * 255),
      g: Math.round(hue(hh) * 255),
      b: Math.round(hue(hh - 1 / 3) * 255),
      a: 1
    };
  }

  function relativeLuminance(color) {
    var channels = [color.r, color.g, color.b].map(function (v) {
      var c = clampByte(v) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrastRatio(a, b) {
    var l1 = relativeLuminance(a);
    var l2 = relativeLuminance(b);
    var light = Math.max(l1, l2);
    var dark = Math.min(l1, l2);
    return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
  }

  function readableOn(color) {
    return relativeLuminance(color) > 0.35 ? "#000000" : "#FFFFFF";
  }

  function mix(a, b, weight) {
    var w = weight == null ? 0.5 : weight;
    return {
      r: Math.round(a.r * (1 - w) + b.r * w),
      g: Math.round(a.g * (1 - w) + b.g * w),
      b: Math.round(a.b * (1 - w) + b.b * w),
      a: 1
    };
  }

  function lighten(color, amount) {
    var hsl = toHsl(color);
    return hslToRgb(hsl.h, hsl.s, Math.max(0, Math.min(100, hsl.l + amount)));
  }

  function darken(color, amount) {
    var hsl = toHsl(color);
    return hslToRgb(hsl.h, hsl.s, Math.max(0, Math.min(100, hsl.l - amount)));
  }

  function random() {
    return { r: Math.floor(Math.random() * 256), g: Math.floor(Math.random() * 256), b: Math.floor(Math.random() * 256), a: 1 };
  }

  var FIELDS = [
    ["HEX", function (c) { return toHex(c); }],
    ["HEX8", function (c) { return toHex(c, true); }],
    ["RGB", toRgbString],
    ["HSL", function (c) { var x = toHsl(c); return "hsl(" + x.h + ", " + x.s + "%, " + x.l + "%)"; }],
    ["HSV", function (c) { var x = toHsv(c); return "hsv(" + x.h + ", " + x.s + "%, " + x.v + "%)"; }],
    ["CMYK", function (c) { var x = toCmyk(c); return "cmyk(" + x.c + "%, " + x.m + "%, " + x.y + "%, " + x.k + "%)"; }]
  ];

  function render(mount, api) {
    var data = api.getData();
    var panel = api.el("div", "tb-panel");

    var row = api.el("div", "tb-row");
    var pickField = api.el("label", "tb-field");
    pickField.appendChild(api.el("span", "tb-field-label", "Colour picker"));
    var picker = api.el("input", "tb-input");
    picker.type = "color";
    picker.value = data.hex || "#FF9FCF";
    pickField.appendChild(picker);

    var textField = api.el("label", "tb-field");
    textField.appendChild(api.el("span", "tb-field-label", "Or type a colour"));
    var text = api.el("input", "tb-input tb-mono");
    text.placeholder = "#ff9fcf, rgb(255,159,207), pink…";
    textField.appendChild(text);

    row.appendChild(pickField);
    row.appendChild(textField);
    panel.appendChild(row);

    var swatch = api.el("div", "tb-swatch");
    swatch.style.height = "72px";
    swatch.style.borderRadius = "14px";
    swatch.style.border = "1px solid var(--line)";
    swatch.style.margin = "0.6rem 0";
    panel.appendChild(swatch);

    var err = api.el("p", "tb-error", "");
    var kv = api.el("div", "tb-kv");
    panel.appendChild(err);
    panel.appendChild(kv);

    var contrast = api.el("div", "tb-kv");
    panel.appendChild(api.el("p", "tb-note", "Contrast (WCAG):"));
    panel.appendChild(contrast);

    mount.appendChild(panel);

    var shades = api.el("div", "tb-panel");
    shades.appendChild(api.el("h2", "tb-panel-title", "Tints & shades"));
    var shadeRow = api.el("div", "tb-swatch-row");
    shades.appendChild(shadeRow);
    mount.appendChild(shades);

    function show(color) {
      swatch.style.background = toHex(color);
      kv.innerHTML = "";
      FIELDS.forEach(function (pair) {
        kv.appendChild(api.el("dt", null, pair[0]));
        kv.appendChild(api.el("dd", "tb-mono", pair[1](color)));
      });
      var white = { r: 255, g: 255, b: 255, a: 1 };
      var black = { r: 0, g: 0, b: 0, a: 1 };
      contrast.innerHTML = "";
      [["On white", white], ["On black", black]].forEach(function (pair) {
        contrast.appendChild(api.el("dt", null, pair[0]));
        contrast.appendChild(api.el("dd", null, contrastRatio(color, pair[1]) + ":1"));
      });
      contrast.appendChild(api.el("dt", null, "Readable text"));
      contrast.appendChild(api.el("dd", null, readableOn(color)));

      shadeRow.innerHTML = "";
      [-40, -20, 0, 20, 40].forEach(function (amount) {
        var c = amount === 0 ? color : amount < 0 ? lighten(color, -amount) : darken(color, amount);
        var chip = api.el("button", "tb-swatch-chip");
        chip.type = "button";
        chip.style.background = toHex(c);
        chip.title = toHex(c);
        chip.addEventListener("click", function () {
          text.value = toHex(c);
          picker.value = toHex(c);
          show(c);
          data.hex = toHex(c);
          api.setData(data);
        });
        shadeRow.appendChild(chip);
      });
    }

    function apply(value) {
      var color = parse(value);
      if (!color) { err.textContent = "Couldn't read that colour."; return; }
      err.textContent = "";
      data.hex = toHex(color);
      api.setData(data);
      picker.value = toHex(color);
      show(color);
    }

    picker.addEventListener("input", function () { text.value = ""; apply(picker.value); });
    text.addEventListener("input", function () { apply(text.value); });

    var randomBtn = api.el("button", "tb-btn", "🎲 Random");
    randomBtn.type = "button";
    randomBtn.addEventListener("click", function () { apply(toHex(random())); });
    panel.appendChild(randomBtn);

    apply(picker.value);
    return function cleanup() {};
  }

  T.tools.colors = {
    NAMES: NAMES,
    parse: parse,
    toHex: toHex,
    toRgbString: toRgbString,
    toHsl: toHsl,
    toHsv: toHsv,
    toCmyk: toCmyk,
    hslToRgb: hslToRgb,
    relativeLuminance: relativeLuminance,
    contrastRatio: contrastRatio,
    readableOn: readableOn,
    mix: mix,
    lighten: lighten,
    darken: darken,
    FIELDS: FIELDS
  };

  T.register({
    id: "colors",
    name: "Colour Converter",
    icon: "🎨",
    group: "Converters",
    blurb: "HEX, RGB, HSL, HSV, CMYK + contrast",
    keywords: "colour color hex rgb hsl hsv cmyk contrast wcag luminance tint shade picker",
    render: render
  });
})(typeof window !== "undefined" ? window : this);
