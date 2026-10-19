"use strict";

/*
 * Tool: Text Tools — counts, case conversion, cleanup, lines and slugs.
 */

(function (global) {
  var T = global.MenaToolbox;
  if (!T) return;

  var WORDS_MIN = 2;

  function stats(text) {
    var s = String(text == null ? "" : text);
    var trimmed = s.trim();
    var words = trimmed ? trimmed.split(/\s+/).length : 0;
    var chars = s.length;
    var noSpaces = s.replace(/\s/g, "").length;
    var lines = s === "" ? 0 : s.split(/\r\n|\r|\n/).length;
    var sentences = trimmed ? (trimmed.match(/[^.!?…]+[.!?…]+(\s|$)|[^.!?…]+$/g) || []).length : 0;
    var paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length : 0;
    var readingMinutes = words / 200;
    var speakingMinutes = words / 130;
    return {
      words: words,
      characters: chars,
      charactersNoSpaces: noSpaces,
      lines: lines,
      sentences: sentences,
      paragraphs: paragraphs,
      readingMinutes: Math.max(0, Math.round(readingMinutes * 10) / 10),
      speakingMinutes: Math.max(0, Math.round(speakingMinutes * 10) / 10),
      uniqueWords: uniqueWordCount(trimmed)
    };
  }

  function uniqueWordCount(text) {
    var found = {};
    String(text || "").toLowerCase().match(/[a-z0-9']+/g)?.forEach(function (w) { found[w] = true; });
    return Object.keys(found).length;
  }

  function wordFrequency(text, min, limit) {
    var counts = {};
    (String(text || "").toLowerCase().match(/[a-z0-9']+/g) || []).forEach(function (w) {
      counts[w] = (counts[w] || 0) + 1;
    });
    var floor = min == null ? 1 : min;
    var list = Object.keys(counts)
      .filter(function (w) { return counts[w] >= floor && w.length >= WORDS_MIN; })
      .map(function (w) { return { word: w, count: counts[w] }; })
      .sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); });
    return limit ? list.slice(0, limit) : list;
  }

  function toWords(text) {
    return String(text == null ? "" : text)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);
  }

  function titleCase(text) {
    return String(text == null ? "" : text).replace(/\w\S*/g, function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  }

  function sentenceCase(text) {
    var s = String(text == null ? "" : text).toLowerCase();
    return s.replace(/(^\s*\w|[.!?…]\s+\w|\n\s*\w)/g, function (m) { return m.toUpperCase(); });
  }

  function capitalize(text) {
    return String(text == null ? "" : text).replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
  }

  function camelCase(text) {
    return toWords(text).map(function (w, i) {
      w = w.toLowerCase();
      return i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1);
    }).join("");
  }

  function pascalCase(text) {
    return toWords(text).map(function (w) {
      w = w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join("");
  }

  function snakeCase(text) {
    return toWords(text).map(function (w) { return w.toLowerCase(); }).join("_");
  }

  function kebabCase(text) {
    return toWords(text).map(function (w) { return w.toLowerCase(); }).join("-");
  }

  function constantCase(text) {
    return toWords(text).map(function (w) { return w.toUpperCase(); }).join("_");
  }

  function dotCase(text) {
    return toWords(text).map(function (w) { return w.toLowerCase(); }).join(".");
  }

  function reverseText(text) {
    return Array.from(String(text == null ? "" : text)).reverse().join("");
  }

  function reverseLines(text) {
    return String(text == null ? "" : text).split(/\r\n|\r|\n/).reverse().join("\n");
  }

  function sortLines(text, descending) {
    var lines = String(text == null ? "" : text).split(/\r\n|\r|\n/);
    lines.sort(function (a, b) { return a.localeCompare(b); });
    if (descending) lines.reverse();
    return lines.join("\n");
  }

  function uniqueLines(text) {
    var seen = {};
    return String(text == null ? "" : text).split(/\r\n|\r|\n/).filter(function (line) {
      if (seen[line]) return false;
      seen[line] = true;
      return true;
    }).join("\n");
  }

  function trimLines(text) {
    return String(text == null ? "" : text).split(/\r\n|\r|\n/).map(function (l) { return l.trim(); }).join("\n");
  }

  function removeEmptyLines(text) {
    return String(text == null ? "" : text).split(/\r\n|\r|\n/).filter(function (l) { return l.trim() !== ""; }).join("\n");
  }

  function collapseSpaces(text) {
    return String(text == null ? "" : text).replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
  }

  function removeLineBreaks(text) {
    return String(text == null ? "" : text).replace(/\s*\r?\n\s*/g, " ").trim();
  }

  function numberLines(text, start) {
    var n = start == null ? 1 : start;
    var pad = String(n + String(text || "").split("\n").length).length;
    return String(text == null ? "" : text).split(/\r\n|\r|\n/).map(function (line) {
      var num = String(n++);
      while (num.length < pad) num = " " + num;
      return num + ". " + line;
    }).join("\n");
  }

  function shuffleLines(text, rand) {
    var rng = rand || Math.random;
    var lines = String(text == null ? "" : text).split(/\r\n|\r|\n/);
    for (var i = lines.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = lines[i]; lines[i] = lines[j]; lines[j] = tmp;
    }
    return lines.join("\n");
  }

  function slugify(text) {
    var s = String(text == null ? "" : text);
    if (s.normalize) s = s.normalize("NFKD");
    return s
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['"]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function unescapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");
  }

  function stripTags(text) {
    return String(text == null ? "" : text).replace(/<[^>]*>/g, "");
  }

  function wrapText(text, width) {
    var w = Math.max(1, parseInt(width, 10) || 80);
    return String(text == null ? "" : text).split("\n").map(function (paragraph) {
      var words = paragraph.split(/\s+/).filter(Boolean);
      var lines = [];
      var line = "";
      words.forEach(function (word) {
        if (!line) line = word;
        else if ((line + " " + word).length <= w) line += " " + word;
        else { lines.push(line); line = word; }
      });
      if (line) lines.push(line);
      return lines.join("\n");
    }).join("\n");
  }

  function findReplace(text, find, replace, caseSensitive) {
    if (!find) return String(text == null ? "" : text);
    var escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return String(text == null ? "" : text).replace(new RegExp(escaped, caseSensitive ? "g" : "gi"), replace);
  }

  function extractEmails(text) {
    return (String(text == null ? "" : text).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []);
  }

  function extractUrls(text) {
    return (String(text == null ? "" : text).match(/https?:\/\/[^\s<>"']+/g) || []);
  }

  function extractNumbers(text) {
    return (String(text == null ? "" : text).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  }

  // -------------------------------------------------------------------- UI

  function render(mount, api) {
    var panel = api.el("div", "tb-panel");
    var input = api.el("textarea", "tb-textarea");
    input.rows = 8;
    input.placeholder = "Paste or type your text here…";
    panel.appendChild(input);

    var statsOut = api.el("div", "tb-kv");
    var actions = api.el("div", "tb-btn-row");

    var toolbar = api.el("div", "tb-btn-row");
    var findRow = api.el("div", "tb-row");
    var findInput = api.el("input", "tb-input");
    findInput.placeholder = "Find";
    var replaceInput = api.el("input", "tb-input");
    replaceInput.placeholder = "Replace";
    findRow.appendChild(findInput);
    findRow.appendChild(replaceInput);

    var out = api.el("textarea", "tb-textarea");
    out.rows = 8;
    out.readOnly = true;
    out.placeholder = "Result appears here";

    function setOut(value) { out.value = value == null ? "" : value; }

    function updateStats() {
      var s = stats(input.value);
      statsOut.innerHTML = "";
      [["Words", s.words], ["Characters", s.characters], ["Without spaces", s.charactersNoSpaces],
       ["Lines", s.lines], ["Sentences", s.sentences], ["Paragraphs", s.paragraphs],
       ["Unique words", s.uniqueWords], ["Reading", s.readingMinutes + " min"], ["Speaking", s.speakingMinutes + " min"]
      ].forEach(function (pair) {
        statsOut.appendChild(api.el("dt", null, pair[0]));
        statsOut.appendChild(api.el("dd", null, String(pair[1])));
      });
    }

    function addAction(label, fn) {
      var b = api.el("button", "tb-btn", label);
      b.type = "button";
      b.addEventListener("click", function () { setOut(fn(input.value)); });
      actions.appendChild(b);
    }

    [
      ["UPPER", function (t) { return t.toUpperCase(); }],
      ["lower", function (t) { return t.toLowerCase(); }],
      ["Title Case", titleCase],
      ["Sentence", sentenceCase],
      ["Capitalise", capitalize],
      ["camelCase", camelCase],
      ["PascalCase", pascalCase],
      ["snake_case", snakeCase],
      ["kebab-case", kebabCase],
      ["CONSTANT", constantCase],
      ["dot.case", dotCase],
      ["Reverse", reverseText],
      ["Reverse lines", reverseLines],
      ["Sort lines ↑", function (t) { return sortLines(t, false); }],
      ["Sort lines ↓", function (t) { return sortLines(t, true); }],
      ["Unique lines", uniqueLines],
      ["Trim lines", trimLines],
      ["Remove blank lines", removeEmptyLines],
      ["Collapse spaces", collapseSpaces],
      ["Join lines", removeLineBreaks],
      ["Number lines", function (t) { return numberLines(t); }],
      ["Slug", slugify],
      ["Wrap 80", function (t) { return wrapText(t, 80); }],
      ["Escape HTML", escapeHtml],
      ["Unescape HTML", unescapeHtml],
      ["Strip tags", stripTags],
      ["Replace all", function (t) { return findReplace(t, findInput.value, replaceInput.value, false); }],
      ["Extract emails", function (t) { return extractEmails(t).join("\n"); }],
      ["Extract URLs", function (t) { return extractUrls(t).join("\n"); }],
      ["Extract numbers", function (t) { return extractNumbers(t).join(", "); }]
    ].forEach(function (pair) { addAction(pair[0], pair[1]); });

    var copyBtn = api.el("button", "tb-btn", "⧉ Copy result");
    copyBtn.type = "button";
    copyBtn.addEventListener("click", function () { api.copy(out.value); api.toast("Copied"); });

    var useBtn = api.el("button", "tb-btn", "↑ Use result as input");
    useBtn.type = "button";
    useBtn.addEventListener("click", function () { input.value = out.value; updateStats(); });

    panel.appendChild(statsOut);
    panel.appendChild(api.el("p", "tb-note", "Transformations:"));
    panel.appendChild(actions);
    panel.appendChild(api.el("p", "tb-note", "Find & replace:"));
    panel.appendChild(findRow);
    panel.appendChild(api.el("p", "tb-note", "Output:"));
    panel.appendChild(out);
    var outRow = api.el("div", "tb-btn-row");
    outRow.appendChild(copyBtn);
    outRow.appendChild(useBtn);
    panel.appendChild(outRow);
    mount.appendChild(panel);

    input.addEventListener("input", updateStats);
    updateStats();

    // word frequency table
    var freq = api.el("div", "tb-panel");
    freq.appendChild(api.el("h2", "tb-panel-title", "Most common words"));
    var freqOut = api.el("div", "tb-kv");
    freq.appendChild(freqOut);
    function updateFreq() {
      freqOut.innerHTML = "";
      wordFrequency(input.value, 2, 15).forEach(function (entry) {
        freqOut.appendChild(api.el("dt", null, entry.word));
        freqOut.appendChild(api.el("dd", null, String(entry.count)));
      });
    }
    input.addEventListener("input", updateFreq);
    updateFreq();
    mount.appendChild(freq);

    return function cleanup() {};
  }

  T.tools.text = {
    stats: stats,
    wordFrequency: wordFrequency,
    titleCase: titleCase,
    sentenceCase: sentenceCase,
    capitalize: capitalize,
    camelCase: camelCase,
    pascalCase: pascalCase,
    snakeCase: snakeCase,
    kebabCase: kebabCase,
    constantCase: constantCase,
    dotCase: dotCase,
    reverseText: reverseText,
    reverseLines: reverseLines,
    sortLines: sortLines,
    uniqueLines: uniqueLines,
    trimLines: trimLines,
    removeEmptyLines: removeEmptyLines,
    collapseSpaces: collapseSpaces,
    removeLineBreaks: removeLineBreaks,
    numberLines: numberLines,
    shuffleLines: shuffleLines,
    slugify: slugify,
    escapeHtml: escapeHtml,
    unescapeHtml: unescapeHtml,
    stripTags: stripTags,
    wrapText: wrapText,
    findReplace: findReplace,
    extractEmails: extractEmails,
    extractUrls: extractUrls,
    extractNumbers: extractNumbers
  };

  T.register({
    id: "text",
    name: "Text Tools",
    icon: "✍️",
    group: "Text",
    blurb: "Case, cleanup, counts and line tools",
    keywords: "text case upper lower title camel snake kebab slug word count lines sort unique wrap html escape",
    render: render
  });
})(typeof window !== "undefined" ? window : this);
