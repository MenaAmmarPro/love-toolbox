"use strict";

/*
 * Tool: Date Tools — age, date difference, add/subtract days, and calendars.
 */

(function (global) {
  var T = global.MenaToolbox;
  if (!T) return;

  var DAY = 86400000;

  function toISO(date) {
    var d = new Date(date.getTime());
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function parseDate(text) {
    if (text instanceof Date) return isNaN(text.getTime()) ? null : new Date(text.getTime());
    var s = String(text == null ? "" : text).trim();
    if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) {
      var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return isNaN(d.getTime()) ? null : d;
    }
    var m2 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (m2) {
      var d2 = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));
      return isNaN(d2.getTime()) ? null : d2;
    }
    var d3 = new Date(s);
    return isNaN(d3.getTime()) ? null : d3;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function daysInMonth(year, month) {
    return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  }

  function addDays(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + Number(days));
    return d;
  }

  function addMonths(date, months) {
    var d = new Date(date.getTime());
    var targetMonth = d.getMonth() + Number(months);
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(targetMonth);
    d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
    return d;
  }

  function addYears(date, years) {
    return addMonths(date, Number(years) * 12);
  }

  function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
  }

  function diffParts(a, b) {
    var from = a < b ? a : b;
    var to = a < b ? b : a;
    var years = to.getFullYear() - from.getFullYear();
    var months = to.getMonth() - from.getMonth();
    var days = to.getDate() - from.getDate();
    if (days < 0) {
      months -= 1;
      var prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    var totalDays = daysBetween(from, to);
    return {
      years: years,
      months: months,
      days: days,
      totalDays: totalDays,
      weeks: Math.floor(totalDays / 7),
      totalMonths: years * 12 + months,
      hours: totalDays * 24
    };
  }

  function ageOn(birth, on) {
    var ref = on || new Date();
    var parts = diffParts(birth, ref);
    parts.negative = ref < birth;
    var thisYear = addYears(birth, parts.years);
    if (thisYear <= ref) thisYear = addYears(birth, parts.years + 1);
    parts.daysToNextBirthday = daysBetween(startOfDay(ref), startOfDay(thisYear));
    parts.nextBirthday = toISO(thisYear);
    parts.weekdayBorn = WEEKDAYS[birth.getDay()];
    return parts;
  }

  function weekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / DAY + 1) / 7);
  }

  function quarter(date) {
    return Math.floor(date.getMonth() / 3) + 1;
  }

  function formatDate(date, pattern) {
    var p = pattern || "YYYY-MM-DD";
    var map = {
      YYYY: String(date.getFullYear()),
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      DD: String(date.getDate()).padStart(2, "0"),
      HH: String(date.getHours()).padStart(2, "0"),
      mm: String(date.getMinutes()).padStart(2, "0"),
      ss: String(date.getSeconds()).padStart(2, "0"),
      M: String(date.getMonth() + 1),
      D: String(date.getDate())
    };
    return p.replace(/YYYY|MM|DD|HH|mm|ss|M|D/g, function (token) { return map[token]; });
  }

  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // -------------------------------------------------------------------- UI

  function render(mount, api) {
    var data = api.getData();
    var today = toISO(startOfDay(new Date()));

    var tabs = api.el("div", "tb-tabs");
    var panel = api.el("div", "tb-panel");
    var modes = [["age", "Age"], ["diff", "Difference"], ["add", "Add / subtract"]];
    var current = data.tab || "age";
    var buttons = {};

    modes.forEach(function (pair) {
      var b = api.el("button", "tb-tab" + (pair[0] === current ? " is-active" : ""), pair[1]);
      b.type = "button";
      b.addEventListener("click", function () { current = pair[0]; data.tab = current; api.setData(data); build(); });
      buttons[pair[0]] = b;
      tabs.appendChild(b);
    });

    mount.appendChild(tabs);
    mount.appendChild(panel);

    function field(label, value, type) {
      var wrap = api.el("label", "tb-field");
      wrap.appendChild(api.el("span", "tb-field-label", label));
      var input = api.el("input", "tb-input");
      input.type = type || "date";
      input.value = value || "";
      wrap.appendChild(input);
      return { wrap: wrap, input: input };
    }

    function build() {
      Object.keys(buttons).forEach(function (k) { buttons[k].classList.toggle("is-active", k === current); });
      panel.innerHTML = "";
      if (current === "age") buildAge();
      else if (current === "diff") buildDiff();
      else buildAdd();
    }

    function buildAge() {
      var birth = field("Date of birth", data.birth || "2000-01-01");
      var on = field("Age on (default today)", data.on || today);
      panel.appendChild(birth.wrap);
      panel.appendChild(on.wrap);
      var out = api.el("div", "tb-output");
      panel.appendChild(out);

      function update() {
        data.birth = birth.input.value;
        data.on = on.input.value;
        api.setData(data);
        var b = parseDate(birth.input.value);
        var o = parseDate(on.input.value) || new Date();
        if (!b) { out.textContent = "Enter a valid birth date."; return; }
        var a = ageOn(b, o);
        var lines = [];
        lines.push("Age: " + a.years + " years, " + a.months + " months, " + a.days + " days");
        lines.push("That is " + a.totalDays.toLocaleString() + " days (" + a.totalMonths.toLocaleString() + " months)");
        lines.push("Born on a " + a.weekdayBorn + " · next birthday " + a.nextBirthday);
        lines.push("Days until next birthday: " + a.daysToNextBirthday);
        lines.push("In hours: " + a.hours.toLocaleString() + " · in weeks: " + a.weeks.toLocaleString());
        out.textContent = lines.join("\n");
      }
      birth.input.addEventListener("change", update);
      on.input.addEventListener("change", update);
      update();
    }

    function buildDiff() {
      var from = field("From", data.from || today);
      var to = field("To", data.to || today);
      panel.appendChild(from.wrap);
      panel.appendChild(to.wrap);
      var out = api.el("div", "tb-output");
      panel.appendChild(out);
      var milestones = api.el("p", "tb-note", "");
      panel.appendChild(milestones);

      function update() {
        data.from = from.input.value;
        data.to = to.input.value;
        api.setData(data);
        var a = parseDate(from.input.value);
        var b = parseDate(to.input.value);
        if (!a || !b) { out.textContent = "Enter two valid dates."; return; }
        var p = diffParts(a, b);
        out.textContent = [
          p.years + " years, " + p.months + " months, " + p.days + " days",
          "Total days: " + p.totalDays.toLocaleString(),
          "Weeks: " + p.weeks.toLocaleString() + " · Months: " + p.totalMonths.toLocaleString() + " · Hours: " + p.hours.toLocaleString(),
          "Working days (approx): " + Math.round(p.totalDays * 5 / 7).toLocaleString()
        ].join("\n");
        var next = addDays(b, 100);
        milestones.textContent = "100 days after the second date: " + toISO(next);
      }
      from.input.addEventListener("change", update);
      to.input.addEventListener("change", update);
      update();
    }

    function buildAdd() {
      var base = field("Start date", data.base || today);
      var amount = api.el("label", "tb-field");
      amount.appendChild(api.el("span", "tb-field-label", "Amount (negative to subtract)"));
      var amountInput = api.el("input", "tb-input");
      amountInput.type = "number";
      amountInput.value = data.amount == null ? 30 : data.amount;
      amount.appendChild(amountInput);
      var unit = api.el("label", "tb-field");
      unit.appendChild(api.el("span", "tb-field-label", "Unit"));
      var unitSel = api.el("select", "tb-input");
      [["days", "Days"], ["weeks", "Weeks"], ["months", "Months"], ["years", "Years"]].forEach(function (pair) {
        var o = api.el("option", null, pair[1]);
        o.value = pair[0];
        if (data.unit === pair[0]) o.selected = true;
        unitSel.appendChild(o);
      });
      unit.appendChild(unitSel);
      panel.appendChild(base.wrap);
      panel.appendChild(amount);
      panel.appendChild(unit);
      var out = api.el("div", "tb-output tb-big");
      panel.appendChild(out);

      function update() {
        data.base = base.input.value;
        data.amount = amountInput.value;
        data.unit = unitSel.value;
        api.setData(data);
        var d = parseDate(base.input.value);
        if (!d) { out.textContent = "Enter a valid start date."; return; }
        var n = parseInt(amountInput.value, 10);
        if (isNaN(n)) n = 0;
        var result;
        if (unitSel.value === "days") result = addDays(d, n);
        else if (unitSel.value === "weeks") result = addDays(d, n * 7);
        else if (unitSel.value === "months") result = addMonths(d, n);
        else result = addYears(d, n);
        out.textContent = toISO(result) + " (" + WEEKDAYS[result.getDay()] + ")";
      }
      base.input.addEventListener("change", update);
      amountInput.addEventListener("input", update);
      unitSel.addEventListener("change", update);
      update();
    }

    build();
    return function cleanup() {};
  }

  T.tools.dates = {
    parseDate: parseDate,
    toISO: toISO,
    isLeapYear: isLeapYear,
    daysInMonth: daysInMonth,
    addDays: addDays,
    addMonths: addMonths,
    addYears: addYears,
    daysBetween: daysBetween,
    diffParts: diffParts,
    ageOn: ageOn,
    weekNumber: weekNumber,
    quarter: quarter,
    formatDate: formatDate,
    WEEKDAYS: WEEKDAYS,
    MONTHS: MONTHS
  };

  T.register({
    id: "dates",
    name: "Date Tools",
    icon: "📅",
    group: "Time",
    blurb: "Age, date difference, add or subtract days",
    keywords: "date age birthday difference add days calendar week leap",
    render: render
  });
})(typeof window !== "undefined" ? window : this);
