"use strict";

/*
 * Tool: Calculator — basic, scientific and programmer modes.
 * A hand-written recursive-descent parser (no eval, no Function).
 */

(function (global) {
  var T = global.MenaToolbox;
  if (!T) return;

  var CONSTANTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2, phi: (1 + Math.sqrt(5)) / 2 };

  var FUNCTIONS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    ln: Math.log, log: Math.log10, log2: Math.log2, log10: Math.log10,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
    round: Math.round, floor: Math.floor, ceil: Math.ceil, sign: Math.sign
  };

  var TRIG = { sin: 1, cos: 1, tan: 1 };

  function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) return NaN;
    if (n > 170) return Infinity;
    var out = 1;
    for (var i = 2; i <= n; i += 1) out *= i;
    return out;
  }

  function tokenize(input) {
    var src = String(input == null ? "" : input)
      .replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/√/g, "sqrt");
    var tokens = [];
    var i = 0;
    while (i < src.length) {
      var ch = src.charAt(i);
      if (/\s/.test(ch)) { i += 1; continue; }
      if (/[0-9.]/.test(ch)) {
        var num = "";
        while (i < src.length && /[0-9.]/.test(src.charAt(i))) { num += src.charAt(i); i += 1; }
        if ((num.match(/\./g) || []).length > 1) throw new Error("Bad number: " + num);
        tokens.push({ type: "num", value: parseFloat(num) });
        continue;
      }
      if (/[a-zA-Z_]/.test(ch)) {
        var name = "";
        while (i < src.length && /[a-zA-Z0-9_]/.test(src.charAt(i))) { name += src.charAt(i); i += 1; }
        tokens.push({ type: "name", value: name.toLowerCase() });
        continue;
      }
      if ("+-*/^%(),!".indexOf(ch) !== -1) { tokens.push({ type: ch }); i += 1; continue; }
      throw new Error("Unexpected character: " + ch);
    }
    return tokens;
  }

  function evaluate(input, options) {
    var opts = options || {};
    var angle = opts.angle === "deg" ? "deg" : "rad";
    var toRad = function (x) { return angle === "deg" ? (x * Math.PI) / 180 : x; };
    var tokens = tokenize(input);
    var pos = 0;

    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }
    function expect(type) {
      var t = next();
      if (!t || t.type !== type) throw new Error("Expected " + type);
      return t;
    }

    function parseExpression() {
      var value = parseTerm();
      while (peek() && (peek().type === "+" || peek().type === "-")) {
        var op = next().type;
        var rhs = parseTerm();
        value = op === "+" ? value + rhs : value - rhs;
      }
      return value;
    }

    function parseTerm() {
      var value = parseUnary();
      while (peek() && (peek().type === "*" || peek().type === "/" || peek().type === "%")) {
        var op = next().type;
        var rhs = parseUnary();
        if (op === "*") value *= rhs;
        else if (op === "/") value /= rhs;
        else value = value % rhs;
      }
      return value;
    }

    function parseUnary() {
      if (peek() && peek().type === "-") { next(); return -parseUnary(); }
      if (peek() && peek().type === "+") { next(); return parseUnary(); }
      return parsePower();
    }

    function parsePower() {
      var base = parsePostfix();
      if (peek() && peek().type === "^") {
        next();
        return Math.pow(base, parseUnary());
      }
      return base;
    }

    function parsePostfix() {
      var value = parsePrimary();
      while (peek() && peek().type === "!") { next(); value = factorial(value); }
      return value;
    }

    function parsePrimary() {
      var t = peek();
      if (!t) throw new Error("Unexpected end of expression");
      if (t.type === "num") { next(); return t.value; }
      if (t.type === "(") { next(); var inner = parseExpression(); expect(")"); return inner; }
      if (t.type === "name") {
        next();
        var name = t.value;
        if (peek() && peek().type === "(") {
          next();
          var args = [];
          if (peek() && peek().type !== ")") {
            args.push(parseExpression());
            while (peek() && peek().type === ",") { next(); args.push(parseExpression()); }
          }
          expect(")");
          if (name === "min") return Math.min.apply(Math, args);
          if (name === "max") return Math.max.apply(Math, args);
          if (name === "pow") return Math.pow(args[0], args[1]);
          if (name === "log" && args.length === 2) return Math.log(args[0]) / Math.log(args[1]);
          var fn = FUNCTIONS[name];
          if (!fn) throw new Error("Unknown function: " + name);
          return fn(TRIG[name] ? toRad(args[0]) : args[0]);
        }
        if (name in CONSTANTS) return CONSTANTS[name];
        if (name === "ans") return typeof opts.ans === "number" ? opts.ans : 0;
        throw new Error("Unknown name: " + name);
      }
      throw new Error("Unexpected token: " + (t.type || t.value));
    }

    var result = parseExpression();
    if (pos < tokens.length) throw new Error("Unexpected trailing input");
    return result;
  }

  function fromBase(text, base) {
    var s = String(text == null ? "" : text).trim().toLowerCase().replace(/^0[xbo]/, "");
    if (!s) return NaN;
    var neg = false;
    if (s.charAt(0) === "-") { neg = true; s = s.slice(1); }
    var value = 0;
    for (var i = 0; i < s.length; i += 1) {
      var d = parseInt(s.charAt(i), 36);
      if (isNaN(d) || d >= base) return NaN;
      value = value * base + d;
    }
    return neg ? -value : value;
  }

  function toBase(value, base) {
    var n = Math.trunc(Number(value));
    if (!isFinite(n)) return "—";
    if (base === 10 || !base) return String(n);
    var neg = n < 0;
    n = Math.abs(n);
    var digits = "0123456789abcdefghijklmnopqrstuvwxyz";
    var out = "";
    if (n === 0) out = "0";
    while (n > 0) { out = digits.charAt(n % base) + out; n = Math.floor(n / base); }
    return (neg ? "-" : "") + out;
  }

  function pad(value, bits) {
    var s = toBase(value >>> 0, 2);
    var width = bits || 16;
    while (s.length < width) s = "0" + s;
    return s.length > width ? s.slice(s.length - width) : s;
  }

  function bitwise(op, a, b, bits) {
    var width = bits || 32;
    var mask = width === 8 ? 0xff : width === 16 ? 0xffff : 0xffffffff;
    var x = Math.trunc(a) & mask;
    var y = Math.trunc(b) & mask;
    switch (op) {
      case "and": return x & y;
      case "or": return x | y;
      case "xor": return x ^ y;
      case "shl": return (x << y) & mask;
      case "shr": return (x >>> y) & mask;
      case "not": return (~x) & mask;
      default: throw new Error("Unknown operator: " + op);
    }
  }

  function fmt(value) {
    if (isNaN(value)) return "Error";
    if (!isFinite(value)) return value > 0 ? "∞" : "-∞";
    if (Math.abs(value) >= 1e15 || (value !== 0 && Math.abs(value) < 1e-9)) {
      return value.toExponential(8).replace(/\.?0+e/, "e");
    }
    return String(Math.round(value * 1e12) / 1e12);
  }

  // -------------------------------------------------------------------- UI

  function render(mount, api) {
    var data = api.getData();
    var mode = data.mode || "basic";
    var angle = data.angle || "rad";
    var progBase = data.base || 10;
    var progBits = data.bits || 32;
    var pendingOp = null;
    var pendingValue = 0;

    var tabs = api.el("div", "tb-tabs");
    var tabButtons = {};
    ["basic", "scientific", "programmer"].forEach(function (name) {
      var b = api.el("button", "tb-tab", name.charAt(0).toUpperCase() + name.slice(1));
      b.type = "button";
      b.addEventListener("click", function () { setMode(name); });
      tabButtons[name] = b;
      tabs.appendChild(b);
    });

    var exprInput = api.el("input", "tb-input");
    exprInput.type = "text";
    exprInput.spellcheck = false;
    exprInput.placeholder = "Type an expression, e.g. 2*(3+4)^2   or   sin(30)";
    exprInput.value = data.lastExpr || "";

    var output = api.el("div", "tb-output tb-big", "0");
    var note = api.el("p", "tb-error", "");

    var keypad = api.el("div", "tb-calc-grid");
    var controls = api.el("div", "tb-row");

    var display = api.el("div", "tb-panel");
    display.appendChild(exprInput);
    display.appendChild(output);
    display.appendChild(note);

    var panel = api.el("div", "tb-panel");
    panel.appendChild(controls);
    panel.appendChild(keypad);

    mount.appendChild(tabs);
    mount.appendChild(display);
    mount.appendChild(panel);

    function setMode(name) {
      mode = name;
      data.mode = name;
      api.setData(data);
      Object.keys(tabButtons).forEach(function (k) { tabButtons[k].classList.toggle("is-active", k === name); });
      build();
    }

    function build() {
      controls.innerHTML = "";
      keypad.innerHTML = "";
      note.textContent = "";
      if (mode === "programmer") controls.appendChild(progControls());
      var grid = mode === "basic" ? basicKeys() : mode === "scientific" ? sciKeys() : progKeys();
      grid.forEach(function (k) { keypad.appendChild(k); });
      if (mode === "programmer") refreshProgrammer();
    }

    function key(label, kind, cls) {
      var b = api.el("button", "tb-key" + (cls ? " " + cls : ""), label);
      b.type = "button";
      b.addEventListener("click", function () { handle(label, kind); });
      return b;
    }

    function append(text) {
      exprInput.value += text;
      note.textContent = "";
      if (mode === "programmer") refreshProgrammer();
    }

    function handle(label, kind) {
      if (kind === "clear") { exprInput.value = ""; output.textContent = "0"; note.textContent = ""; if (mode === "programmer") refreshProgrammer(); return; }
      if (kind === "back") { exprInput.value = exprInput.value.slice(0, -1); if (mode === "programmer") refreshProgrammer(); return; }
      if (kind === "equals") { compute(); return; }
      if (kind === "angle") { angle = angle === "deg" ? "rad" : "deg"; data.angle = angle; api.setData(data); build(); return; }
      append(label);
    }

    function compute() {
      var expr = exprInput.value.trim();
      if (!expr) return;
      if (mode === "programmer") { refreshProgrammer(); return; }
      try {
        var value = evaluate(expr, { angle: angle, ans: data.ans });
        data.ans = value;
        data.lastExpr = expr;
        api.setData(data);
        output.textContent = fmt(value);
        note.textContent = "";
      } catch (e) {
        note.textContent = e.message;
      }
    }

    function basicKeys() {
      return [
        key("C", "clear", "op"), key("(", null, "op"), key(")", null, "op"), key("÷", null, "op"),
        key("7"), key("8"), key("9"), key("×", null, "op"),
        key("4"), key("5"), key("6"), key("−", null, "op"),
        key("1"), key("2"), key("3"), key("+", null, "op"),
        key("0"), key(".", null, "op"), key("⌫", "back", "op"), key("=", "equals", "eq")
      ];
    }

    function sciKeys() {
      return [
        key(angle === "deg" ? "DEG" : "RAD", "angle", "op"),
        key("sin(", null, "op"), key("cos(", null, "op"), key("tan(", null, "op"),
        key("ln(", null, "op"), key("log(", null, "op"), key("√(", null, "op"), key("^", null, "op"),
        key("!", null, "op"), key("π", null, "op"), key("e", null, "op"), key("%", null, "op"),
        key("7"), key("8"), key("9"), key("÷", null, "op"),
        key("4"), key("5"), key("6"), key("×", null, "op"),
        key("1"), key("2"), key("3"), key("−", null, "op"),
        key("0"), key(".", null, "op"), key("C", "clear", "op"), key("=", "equals", "eq")
      ];
    }

    function progKeys() {
      var digits = "0123456789abcdef";
      var allowed = digits.slice(0, Math.max(progBase, 10));
      var keys = [];
      for (var i = 0; i < allowed.length; i += 1) keys.push(key(allowed.charAt(i).toUpperCase()));
      keys.push(key("C", "clear", "op"));
      keys.push(key("⌫", "back", "op"));
      [["AND", "and"], ["OR", "or"], ["XOR", "xor"], ["NOT", "not"], ["<<", "shl"], [">>", "shr"]].forEach(function (pair) {
        var b = api.el("button", "tb-key op", pair[0]);
        b.type = "button";
        b.addEventListener("click", function () { applyBit(pair[1]); });
        keys.push(b);
      });
      return keys;
    }

    function progControls() {
      var baseSel = api.el("select", "tb-input");
      [["HEX", 16], ["DEC", 10], ["OCT", 8], ["BIN", 2]].forEach(function (pair) {
        var o = api.el("option", null, pair[0]);
        o.value = String(pair[1]);
        if (progBase === pair[1]) o.selected = true;
        baseSel.appendChild(o);
      });
      baseSel.addEventListener("change", function () {
        var old = progBase;
        progBase = parseInt(baseSel.value, 10);
        data.base = progBase;
        var v = fromBase(exprInput.value, old);
        exprInput.value = isNaN(v) ? "" : toBase(v, progBase);
        api.setData(data);
        build();
      });
      var bitsSel = api.el("select", "tb-input");
      [8, 16, 32].forEach(function (bits) {
        var o = api.el("option", null, bits + "-bit");
        o.value = String(bits);
        if (progBits === bits) o.selected = true;
        bitsSel.appendChild(o);
      });
      bitsSel.addEventListener("change", function () {
        progBits = parseInt(bitsSel.value, 10);
        data.bits = progBits;
        api.setData(data);
        refreshProgrammer();
      });
      var wrap = api.el("div", "tb-row");
      wrap.appendChild(baseSel);
      wrap.appendChild(bitsSel);
      return wrap;
    }

    function applyBit(op) {
      var v = fromBase(exprInput.value, progBase);
      if (isNaN(v)) v = 0;
      if (op === "not") {
        exprInput.value = toBase(bitwise("not", v, 0, progBits), progBase);
      } else if (pendingOp) {
        exprInput.value = toBase(bitwise(pendingOp, pendingValue, v, progBits), progBase);
        pendingOp = null;
      } else {
        pendingOp = op;
        pendingValue = v;
        exprInput.value = "";
      }
      note.textContent = "";
      refreshProgrammer();
    }

    function refreshProgrammer() {
      var v = fromBase(exprInput.value, progBase);
      if (isNaN(v)) { output.textContent = "—"; return; }
      var n = v >>> 0;
      output.textContent = "DEC " + v + "    HEX " + toBase(n, 16).toUpperCase() +
        "    OCT " + toBase(n, 8) + "    BIN " + pad(n, progBits);
    }

    exprInput.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      if (mode === "programmer") refreshProgrammer();
      else compute();
    });

    setMode(mode);
    if (mode === "programmer") refreshProgrammer();
    else if (data.ans != null) output.textContent = fmt(data.ans);

    return function cleanup() {};
  }

  T.tools.calculator = {
    evaluate: evaluate,
    tokenize: tokenize,
    factorial: factorial,
    fromBase: fromBase,
    toBase: toBase,
    pad: pad,
    bitwise: bitwise,
    fmt: fmt,
    CONSTANTS: CONSTANTS
  };

  T.register({
    id: "calculator",
    name: "Calculator",
    icon: "🧮",
    group: "Math",
    blurb: "Basic, scientific and programmer maths",
    keywords: "calc math arithmetic sin cos bitwise hex binary base",
    render: render
  });
})(typeof window !== "undefined" ? window : this);
