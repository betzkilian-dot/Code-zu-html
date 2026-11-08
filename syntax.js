/* Kleine Syntax-Hervorhebung für HTML, CSS und JavaScript, ohne Bibliothek.
   Syntax.highlight(code, lang) liefert fertiges, maskiertes HTML mit <span class="t-...">. */
(function (global) {
  'use strict';

  var MAX_CHARS = 400000; // darüber wird nur maskiert, damit das Tippen flüssig bleibt

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function span(cls, s) {
    return '<span class="t-' + cls + '">' + esc(s) + '</span>';
  }

  /* ---------- JavaScript ---------- */
  var JS_KEYWORDS = {};
  ('break case catch class const continue debugger default delete do else export extends finally for ' +
   'function if import in instanceof let new of return super switch this throw try typeof var void while ' +
   'with yield async await static get set from as').split(' ').forEach(function (k) { JS_KEYWORDS[k] = 1; });
  var JS_LITERALS = { 'true': 1, 'false': 1, 'null': 1, 'undefined': 1, 'NaN': 1, 'Infinity': 1 };

  var JS_RE = new RegExp(
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|$))' +                                   // 1 Kommentar
    '|("(?:\\\\[\\s\\S]|[^"\\\\\\n])*"?|\'(?:\\\\[\\s\\S]|[^\'\\\\\\n])*\'?|`(?:\\\\[\\s\\S]|[^`\\\\])*`?)' + // 2 String
    '|(\\b0[xX][\\da-fA-F]+\\b|\\b\\d[\\d_]*\\.?\\d*(?:[eE][+-]?\\d+)?\\b)' +             // 3 Zahl
    '|([A-Za-z_$][\\w$]*)' +                                                           // 4 Name
    '|([^\\w$"\'`\\/]+|[\\s\\S])',                                                     // 5 Rest
    'g'
  );

  function highlightJS(code) {
    var out = '', m, last;
    JS_RE.lastIndex = 0;
    while ((m = JS_RE.exec(code)) !== null) {
      if (m[1] !== undefined) out += span('cmt', m[1]);
      else if (m[2] !== undefined) out += span('str', m[2]);
      else if (m[3] !== undefined) out += span('num', m[3]);
      else if (m[4] !== undefined) {
        var w = m[4];
        if (JS_LITERALS[w] === 1) out += span('lit', w);
        else if (JS_KEYWORDS[w] === 1) out += span('kw', w);
        else {
          last = JS_RE.lastIndex;
          if (code.charAt(last) === '(') out += span('fn', w);
          else out += esc(w);
        }
      } else out += esc(m[5]);
    }
    return out;
  }

  /* ---------- CSS ---------- */
  var CSS_RE = new RegExp(
    '(\\/\\*[\\s\\S]*?(?:\\*\\/|$))' +                                                 // 1 Kommentar
    '|("(?:\\\\[\\s\\S]|[^"\\\\\\n])*"?|\'(?:\\\\[\\s\\S]|[^\'\\\\\\n])*\'?)' +          // 2 String
    '|(@[\\w-]+)' +                                                                    // 3 @-Regel
    '|(#[\\da-fA-F]{3,8}\\b)' +                                                        // 4 Hexfarbe oder ID
    '|(-?\\d*\\.?\\d+(?:%|[a-zA-Z]+)?)' +                                              // 5 Zahl mit Einheit
    '|(-{0,2}[A-Za-z_][\\w-]*)' +                                                      // 6 Name
    '|([{}();:,])' +                                                                   // 7 Zeichen
    '|([^\\w@#{}();:,"\'\\/-]+|[\\s\\S])',                                             // 8 Rest
    'g'
  );
  var DELIM_RE = /[{};]/g;

  function nextDelim(code, from) {
    DELIM_RE.lastIndex = from;
    var d = DELIM_RE.exec(code);
    return d ? d[0] : '';
  }

  function highlightCSS(code) {
    var out = '', m, t;
    var stmt = null;      // 'sel' | 'decl' | 'at'
    var inValue = false;
    CSS_RE.lastIndex = 0;
    while ((m = CSS_RE.exec(code)) !== null) {
      t = m[0];
      if (m[1] !== undefined) { out += span('cmt', t); continue; }

      if (stmt === null && /\S/.test(t)) {
        stmt = m[3] !== undefined ? 'at' : (nextDelim(code, m.index) === '{' ? 'sel' : 'decl');
        inValue = false;
      }

      if (m[2] !== undefined) out += span('str', t);
      else if (m[3] !== undefined) out += span('at', t);
      else if (m[4] !== undefined) out += stmt === 'sel' ? span('sel', t) : span('num', t);
      else if (m[5] !== undefined) out += stmt === 'sel' ? esc(t) : span('num', t);
      else if (m[6] !== undefined) {
        if (stmt === 'sel') out += span('sel', t);
        else if (stmt === 'decl' && !inValue) out += span('prop', t);
        else if (t.slice(0, 2) === '--') out += span('var', t);
        else if (code.charAt(CSS_RE.lastIndex) === '(') out += span('fn', t);
        else out += esc(t);
      } else if (m[7] !== undefined) {
        out += esc(t);
        if (t === '{' || t === '}' || t === ';') { stmt = null; inValue = false; }
        else if (t === ':' && stmt === 'decl') inValue = true;
      } else {
        // Rest: Punkt, Stern, Pfeile usw. gehören bei Selektoren zur Auswahl
        out += (stmt === 'sel' && /[.*>+~[\]=|^$]/.test(t) && !/^\s+$/.test(t)) ? span('sel', t) : esc(t);
      }
    }
    return out;
  }

  /* ---------- HTML ---------- */
  var HTML_RE = new RegExp(
    '<!--[\\s\\S]*?(?:-->|$)' +                                                         // Kommentar
    '|<![a-zA-Z][^>]*>' +                                                              // Doctype
    '|<(script|style)\\b((?:"[^"]*"|\'[^\']*\'|[^\'">])*)>([\\s\\S]*?)(?=<\\/\\1\\s*>|$)' + // script/style samt Inhalt
    '|<\\/?[a-zA-Z][\\w:-]*(?:"[^"]*"|\'[^\']*\'|[^\'">])*>',                           // normales Tag
    'gi'
  );
  var ATTR_RE = /("[^"]*"|'[^']*')|([^\s"'=\/>]+)|([\s\S])/g;

  function renderTag(t) {
    var m = /^(<\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(\/?>)$/.exec(t);
    if (!m) return esc(t);
    var out = span('punc', m[1]) + span('tag', m[2]);
    var a, rest = m[3];
    ATTR_RE.lastIndex = 0;
    while ((a = ATTR_RE.exec(rest)) !== null) {
      if (a[1] !== undefined) out += span('str', a[1]);
      else if (a[2] !== undefined) out += span('attr', a[2]);
      else out += esc(a[3]);
    }
    return out + span('punc', m[4]);
  }

  function highlightHTML(code) {
    var out = '', pos = 0, m;
    HTML_RE.lastIndex = 0;
    while ((m = HTML_RE.exec(code)) !== null) {
      if (m[0] === '') { HTML_RE.lastIndex++; continue; }
      if (m.index > pos) out += esc(code.slice(pos, m.index));
      var t = m[0];
      if (t.slice(0, 4) === '<!--') out += span('cmt', t);
      else if (t.slice(0, 2) === '<!') out += span('tag', t);
      else if (m[1] !== undefined) {
        var openLen = 2 + m[1].length + m[2].length;
        out += renderTag(t.slice(0, openLen));
        out += m[1].toLowerCase() === 'script' ? highlightJS(m[3]) : highlightCSS(m[3]);
      } else out += renderTag(t);
      pos = m.index + t.length;
    }
    if (pos < code.length) out += esc(code.slice(pos));
    return out;
  }

  function highlight(code, lang) {
    if (code.length > MAX_CHARS) return esc(code);
    if (lang === 'html') return highlightHTML(code);
    if (lang === 'js') return highlightJS(code);
    if (lang === 'css') return highlightCSS(code);
    return esc(code);
  }

  global.Syntax = { highlight: highlight };
})(window);
