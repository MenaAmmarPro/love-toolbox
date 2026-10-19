"use strict";

/*
 * Per-tool unit tests for the love-toolbox harness.
 *
 * Each key is a tool id; each value is `function (tool, t)` where `tool` is the
 * pure-function namespace the tool exposed on `MenaToolbox.tools[<id>]` and
 * `t` provides `{ assert, eq, close, NS }`.
 */

module.exports = {};
