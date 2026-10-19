"use strict";

/*
 * Per-tool unit tests for the love-toolbox harness.
 *
 * Each key is a tool id; each value is `function (tool, t)` where `tool` is the
 * pure-function namespace the tool exposed on `MenaToolbox.tools[<id>]` and
 * `t` provides `{ assert, eq, close, NS }`.
 */

module.exports = {
  calculator: function (calc, t) {
    const { assert, eq, close } = t;

    eq(calc.evaluate("1+2*3"), 7, "calculator: precedence");
    eq(calc.evaluate("(1+2)*3"), 9, "calculator: parentheses");
    eq(calc.evaluate("2^3^2"), 512, "calculator: right-associative power");
    eq(calc.evaluate("-5+2"), -3, "calculator: unary minus");
    eq(calc.evaluate("10/4"), 2.5, "calculator: division");
    eq(calc.evaluate("10%3"), 1, "calculator: modulo");
    eq(calc.evaluate("5!"), 120, "calculator: factorial");
    eq(calc.evaluate("sqrt(16)"), 4, "calculator: sqrt");
    eq(calc.evaluate("pow(2,10)"), 1024, "calculator: pow()");
    eq(calc.evaluate("min(3,7,2)"), 2, "calculator: min()");
    eq(calc.evaluate("max(3,7,2)"), 7, "calculator: max()");
    close(calc.evaluate("pi"), Math.PI, 1e-12, "calculator: pi constant");
    close(calc.evaluate("sin(0)"), 0, 1e-12, "calculator: sin(0)");
    close(calc.evaluate("sin(90)", { angle: "deg" }), 1, 1e-12, "calculator: degrees mode");
    close(calc.evaluate("cos(0)"), 1, 1e-12, "calculator: cos(0)");
    close(calc.evaluate("log(1000)"), 3, 1e-12, "calculator: log10");
    close(calc.evaluate("log(8,2)"), 3, 1e-12, "calculator: log base 2");
    eq(calc.evaluate("1+2", { ans: 40 }) !== undefined, true, "calculator: ans option accepted");
    eq(calc.evaluate("ans+2", { ans: 40 }), 42, "calculator: ans used");
    eq(calc.evaluate("2.5+2.5"), 5, "calculator: decimals");

    let threw = false;
    try { calc.evaluate("1+"); } catch (e) { threw = true; }
    assert(threw, "calculator: incomplete expression throws");
    threw = false;
    try { calc.evaluate("nope(1)"); } catch (e) { threw = true; }
    assert(threw, "calculator: unknown function throws");
    threw = false;
    try { calc.evaluate("window"); } catch (e) { threw = true; }
    assert(threw, "calculator: no host access");

    eq(calc.fromBase("ff", 16), 255, "calculator: hex parse");
    eq(calc.fromBase("1010", 2), 10, "calculator: bin parse");
    eq(calc.fromBase("777", 8), 511, "calculator: oct parse");
    assert(Number.isNaN(calc.fromBase("12", 2)), "calculator: invalid digits rejected");
    eq(calc.toBase(255, 16), "ff", "calculator: toBase hex");
    eq(calc.toBase(10, 2), "1010", "calculator: toBase bin");
    eq(calc.toBase(-16, 16), "-10", "calculator: toBase negative");
    eq(calc.toBase(0, 2), "0", "calculator: toBase zero");
    eq(calc.pad(5, 8), "00000101", "calculator: binary pad");

    eq(calc.bitwise("and", 12, 10, 8), 8, "calculator: bitwise AND");
    eq(calc.bitwise("or", 12, 10, 8), 14, "calculator: bitwise OR");
    eq(calc.bitwise("xor", 12, 10, 8), 6, "calculator: bitwise XOR");
    eq(calc.bitwise("not", 0, 0, 8), 255, "calculator: bitwise NOT 8-bit");
    eq(calc.bitwise("shl", 1, 4, 8), 16, "calculator: bitwise SHL");
    eq(calc.bitwise("shr", 16, 4, 8), 1, "calculator: bitwise SHR");

    eq(calc.factorial(0), 1, "calculator: 0! = 1");
    eq(calc.factorial(5), 120, "calculator: 5!");
    eq(calc.fmt(0.1 + 0.2), "0.3", "calculator: fmt cleans float noise");
  }
};
