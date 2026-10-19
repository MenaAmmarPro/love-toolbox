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
  },

  units: function (units, t) {
    const { assert, eq, close } = t;

    eq(units.convert(1, "length", "km", "m"), 1000, "units: 1 km = 1000 m");
    close(units.convert(1, "length", "mi", "m"), 1609.344, 1e-9, "units: 1 mi in m");
    close(units.convert(1, "length", "in", "cm"), 2.54, 1e-9, "units: 1 in = 2.54 cm");
    close(units.convert(1, "length", "km", "mi"), 0.621371192237334, 1e-9, "units: 1 km in miles");
    close(units.convert(1, "mass", "kg", "lb"), 2.2046226218487757, 1e-9, "units: 1 kg in lb");
    close(units.convert(100, "temperature", "°C", "°F"), 212, 1e-9, "units: 100°C = 212°F");
    close(units.convert(0, "temperature", "°C", "K"), 273.15, 1e-9, "units: 0°C = 273.15 K");
    close(units.convert(32, "temperature", "°F", "°C"), 0, 1e-9, "units: 32°F = 0°C");
    close(units.convert(1, "data", "GB", "MB"), 1024, 1e-9, "units: 1 GB = 1024 MB");
    close(units.convert(1, "data", "GB", "bit"), 8589934592, 1e-3, "units: 1 GB in bits");
    close(units.convert(1, "energy", "kWh", "J"), 3600000, 1e-6, "units: 1 kWh = 3.6 MJ");
    close(units.convert(1, "time", "h", "s"), 3600, 1e-9, "units: 1 h = 3600 s");
    close(units.convert(1, "speed", "km/h", "m/s"), 0.2777777777777778, 1e-9, "units: km/h → m/s");
    close(units.convert(180, "angle", "deg", "rad"), Math.PI, 1e-9, "units: 180° = π rad");
    close(units.convert(1, "area", "ha", "m²"), 10000, 1e-9, "units: 1 ha = 10 000 m²");
    close(units.convert(1, "volume", "l", "ml"), 1000, 1e-9, "units: 1 l = 1000 ml");
    close(units.convert(1, "pressure", "atm", "Pa"), 101325, 1e-6, "units: 1 atm = 101325 Pa");
    close(units.convert(1, "power", "hp", "W"), 745.6998715822702, 1e-6, "units: 1 hp in W");

    assert(units.unitsOf("length").indexOf("mi") !== -1, "units: length includes miles");
    assert(units.unitsOf("nope").length === 0, "units: unknown category → no units");
    assert(Number.isNaN(units.convert(1, "length", "km", "nope")), "units: unknown unit → NaN");
    assert(units.convertAll(1, "length", "m").length === units.unitsOf("length").length, "units: convertAll covers all units");
    eq(units.convert(0, "length", "m", "km"), 0, "units: zero stays zero");
  },

  dates: function (dates, t) {
    const { assert, eq } = t;

    assert(dates.isLeapYear(2024), "dates: 2024 is a leap year");
    assert(!dates.isLeapYear(1900), "dates: 1900 is not a leap year");
    assert(dates.isLeapYear(2000), "dates: 2000 is a leap year");
    eq(dates.daysInMonth(2024, 1), 29, "dates: Feb 2024 has 29 days");
    eq(dates.daysInMonth(2023, 1), 28, "dates: Feb 2023 has 28 days");

    eq(dates.toISO(new Date(2026, 9, 19)), "2026-10-19", "dates: toISO pads");
    const parsed = dates.parseDate("2026-10-19");
    eq(dates.toISO(parsed), "2026-10-19", "dates: parseDate ISO round trip");
    assert(dates.parseDate("nonsense!!") === null, "dates: bad date → null");

    eq(dates.daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 31)), 30, "dates: daysBetween");
    eq(dates.toISO(dates.addDays(new Date(2026, 0, 31), 1)), "2026-02-01", "dates: addDays crosses month");
    eq(dates.toISO(dates.addDays(new Date(2026, 9, 19), -19)), "2026-09-30", "dates: subtract days");
    eq(dates.toISO(dates.addMonths(new Date(2026, 0, 31), 1)), "2026-02-28", "dates: addMonths clamps");
    eq(dates.toISO(dates.addYears(new Date(2020, 1, 29), 1)), "2021-02-28", "dates: leap day +1 year clamps");

    const diff = dates.diffParts(new Date(2020, 0, 15), new Date(2021, 2, 20));
    eq([diff.years, diff.months, diff.days], [1, 2, 5], "dates: diffParts y/m/d");
    eq(diff.totalDays, 430, "dates: diffParts totalDays");

    const age = dates.ageOn(new Date(2000, 0, 1), new Date(2026, 0, 1));
    eq(age.years, 26, "dates: age years");
    eq(age.months, 0, "dates: age months");
    eq(age.days, 0, "dates: age days on birthday");
    eq(age.daysToNextBirthday, 365, "dates: days to next birthday");
    eq(age.nextBirthday, "2027-01-01", "dates: next birthday");

    eq(dates.weekNumber(new Date(2026, 0, 1)) >= 1, true, "dates: week number is sane");
    eq(dates.quarter(new Date(2026, 9, 19)), 4, "dates: quarter");
    eq(dates.formatDate(new Date(2026, 9, 5), "DD/MM/YYYY"), "05/10/2026", "dates: custom format");
    eq(dates.formatDate(new Date(2026, 9, 5), "YYYY-MM-DD"), "2026-10-05", "dates: ISO format");
  },

  text: function (txt, t) {
    const { assert, eq } = t;

    const s = txt.stats("Hello world. This is a test!\n\nSecond paragraph here.");
    eq(s.words, 9, "text: word count");
    eq(s.lines, 3, "text: line count");
    eq(s.sentences, 3, "text: sentence count");
    eq(s.paragraphs, 2, "text: paragraph count");
    assert(s.characters > 0 && s.charactersNoSpaces < s.characters, "text: character counts");

    eq(txt.titleCase("hello WORLD of js"), "Hello World Of Js", "text: title case");
    eq(txt.sentenceCase("hello world. second one. third"), "Hello world. Second one. Third", "text: sentence case");
    eq(txt.capitalize("hello world"), "Hello World", "text: capitalize");
    eq(txt.camelCase("hello world-of_js"), "helloWorldOfJs", "text: camelCase");
    eq(txt.pascalCase("hello world"), "HelloWorld", "text: PascalCase");
    eq(txt.snakeCase("HelloWorld thing"), "hello_world_thing", "text: snake_case");
    eq(txt.kebabCase("HelloWorld thing"), "hello-world-thing", "text: kebab-case");
    eq(txt.constantCase("hello world"), "HELLO_WORLD", "text: CONSTANT_CASE");
    eq(txt.dotCase("Hello World"), "hello.world", "text: dot.case");

    eq(txt.reverseText("abc"), "cba", "text: reverse");
    eq(txt.reverseLines("a\nb\nc"), "c\nb\na", "text: reverse lines");
    eq(txt.sortLines("b\nc\na"), "a\nb\nc", "text: sort lines");
    eq(txt.sortLines("b\nc\na", true), "c\nb\na", "text: sort lines descending");
    eq(txt.uniqueLines("a\nb\na\nc"), "a\nb\nc", "text: unique lines");
    eq(txt.trimLines("  a  \n b"), "a\nb", "text: trim lines");
    eq(txt.removeEmptyLines("a\n\n\nb"), "a\nb", "text: remove empty lines");
    eq(txt.collapseSpaces("a    b\n   c"), "a b\nc", "text: collapse spaces");
    eq(txt.removeLineBreaks("a\nb\n c"), "a b c", "text: join lines");
    eq(txt.numberLines("a\nb"), "1. a\n2. b", "text: number lines");
    eq(txt.numberLines("a\nb", 5), "5. a\n6. b", "text: number lines start");

    eq(txt.slugify("Héllo Wörld! 42 things"), "hello-world-42-things", "text: slugify strips accents");
    eq(txt.escapeHtml("<a href=\"x\">&"), "&lt;a href=&quot;x&quot;&gt;&amp;", "text: escape html");
    eq(txt.unescapeHtml("&lt;b&gt;hi&lt;/b&gt;"), "<b>hi</b>", "text: unescape html");
    eq(txt.stripTags("<p>hi <b>there</b></p>"), "hi there", "text: strip tags");
    eq(txt.wrapText("one two three four", 7), "one two\nthree\nfour", "text: wrap");

    eq(txt.findReplace("aAaA", "a", "x", false), "xxxx", "text: replace insensitive");
    eq(txt.findReplace("aAaA", "a", "x", true), "xAxA", "text: replace sensitive");
    eq(txt.findReplace("abc", "$1", "$2"), "abc", "text: replace treats find literally");

    eq(txt.extractEmails("me@x.com and you@y.org"), ["me@x.com", "you@y.org"], "text: extract emails");
    eq(txt.extractUrls("see https://a.b/c and http://d.e"), ["https://a.b/c", "http://d.e"], "text: extract urls");
    eq(txt.extractNumbers("a1 b-2.5 c"), [1, -2.5], "text: extract numbers");

    const freq = txt.wordFrequency("the cat the dog the", 1, 2);
    eq(freq[0].word, "the", "text: most common word");
    eq(freq[0].count, 3, "text: most common count");
    eq(txt.wordFrequency("a b", 5).length, 0, "text: min count filters");

    const shuffled = txt.shuffleLines("a\nb\nc", () => 0);
    eq(shuffled.split("\n").sort(), ["a", "b", "c"], "text: shuffle keeps all lines");
  },

  base: function (base, t) {
    const { assert, eq } = t;

    eq(base.convert("ff", 16, 10), "255", "base: hex → dec");
    eq(base.convert("255", 10, 16), "ff", "base: dec → hex");
    eq(base.convert("1010", 2, 10), "10", "base: bin → dec");
    eq(base.convert("777", 8, 10), "511", "base: oct → dec");
    eq(base.convert("-10", 10, 2), "-1010", "base: negative");
    eq(base.convert("z", 36, 10), "35", "base: base36 digit");
    eq(base.convert("0", 10, 2), "0", "base: zero");
    eq(base.convert("0x1f", 16, 10), "31", "base: 0x prefix tolerated");
    eq(base.convert("1 000", 10, 10), "1000", "base: spaces tolerated");
    eq(base.convert("ffffffffffffffff", 16, 10), "18446744073709551615", "base: 64-bit exact (BigInt)");
    assert(base.convert("2", 2, 10) === null, "base: invalid digit → null");
    assert(base.convert("", 10, 10) === null, "base: empty → null");

    eq(base.toBaseBig(0n, 2), "0", "base: toBaseBig zero");
    eq(base.toBaseBig(12345678901234567890n, 16), "ab54a98ceb1f0ad2", "base: huge → hex");
    eq(base.group("11111111"), "1111 1111", "base: binary grouping");
    eq(base.group("-1111"), "-1111", "base: negative grouping");
    eq(base.toBytes(0x4142n), [65, 66], "base: toBytes");
    eq(base.toAscii(0x4142n), "AB", "base: toAscii");
    eq(base.fmtBig(1234567n), "1,234,567", "base: thousands grouping");
  },

  roman: function (roman, t) {
    const { assert, eq } = t;

    eq(roman.toRoman(1), "I", "roman: 1");
    eq(roman.toRoman(4), "IV", "roman: 4");
    eq(roman.toRoman(9), "IX", "roman: 9");
    eq(roman.toRoman(40), "XL", "roman: 40");
    eq(roman.toRoman(90), "XC", "roman: 90");
    eq(roman.toRoman(400), "CD", "roman: 400");
    eq(roman.toRoman(1987), "MCMLXXXVII", "roman: 1987");
    eq(roman.toRoman(2026), "MMXXVI", "roman: 2026");
    eq(roman.toRoman(3999), "MMMCMXCIX", "roman: 3999");
    assert(roman.toRoman(0) === null, "roman: 0 rejected");
    assert(roman.toRoman(4000) === null, "roman: 4000 rejected");
    assert(roman.toRoman("x") === null, "roman: non-number rejected");

    eq(roman.fromRoman("XIV"), 14, "roman: XIV = 14");
    eq(roman.fromRoman("MCMLXXXVII"), 1987, "roman: MCMLXXXVII");
    eq(roman.fromRoman("mmxxvi"), 2026, "roman: lowercase accepted");
    assert(roman.fromRoman("IIII") === null, "roman: non-canonical IIII rejected");
    assert(roman.fromRoman("VX") === null, "roman: VX rejected");
    assert(roman.fromRoman("ABC") === null, "roman: letters rejected");
    assert(roman.fromRoman("") === null, "roman: empty rejected");

    // round-trip 1..3999
    let allOk = true;
    for (let n = 1; n <= 3999; n += 1) {
      if (roman.fromRoman(roman.toRoman(n)) !== n) { allOk = false; break; }
    }
    assert(allOk, "roman: 1..3999 round-trip");
    assert(roman.expand(1987).length > 0, "roman: breakdown exists");
  }
};
