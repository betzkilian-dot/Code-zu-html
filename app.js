(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var CLOSE_SCRIPT = '<' + '/script>';
  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var EXAMPLE = '<h1>Hallo Welt</h1>\n<p>Dieser Text steht in einer HTML-Datei.</p>\n<button onclick="this.textContent = \'Geklickt!\'">Klick mich</button>';

  var codeEl = $('code'), outEl = $('out'), fnEl = $('fn'), modeEl = $('mode');
  var dlBtn = $('download'), cpBtn = $('copy'), shareBtn = $('share'), pasteBtn = $('paste');
  var openBtn = $('open'), fileEl = $('file');
  var statusEl = $('status'), statusInEl = $('status-in');
  var previewEl = $('preview'), tabCode = $('tab-code'), tabPrev = $('tab-preview');
  var showPreview = false;
  var current = { html: '', file: 'index.html' };
  var outTimer = null;

  var MODE_LABEL = {
    document: 'fertiges HTML-Dokument, wird unverändert gespeichert',
    fragment: 'HTML-Ausschnitt, wird in eine vollständige Seite gesetzt',
    js: 'JavaScript, wird in ein script-Element eingebettet',
    css: 'CSS, wird in ein style-Element eingebettet',
    text: 'anderer Code, wird als Text in einer Seite angezeigt'
  };

  /* ---------- Editor: durchsichtiges Textfeld über farbigem <pre> ---------- */
  function Editor(root) {
    var ta = root.querySelector('textarea');
    var hl = root.querySelector('.hl');
    var gut = root.querySelector('.gut');
    var lastLines = 0;

    function sync() {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
      gut.scrollTop = ta.scrollTop;
    }
    function countLines(s) {
      var n = 1, i = -1;
      while ((i = s.indexOf('\n', i + 1)) !== -1) n++;
      return n;
    }
    function update(lang) {
      var code = ta.value;
      hl.innerHTML = Syntax.highlight(code, lang) + '\n';
      var n = countLines(code);
      if (n !== lastLines) {
        var nums = new Array(n);
        for (var i = 0; i < n; i++) nums[i] = i + 1;
        gut.textContent = nums.join('\n');
        lastLines = n;
      }
      sync();
    }
    ta.addEventListener('scroll', sync, { passive: true });
    ta.addEventListener('focus', function () { root.classList.add('focus'); });
    ta.addEventListener('blur', function () { root.classList.remove('focus'); });
    return { root: root, ta: ta, update: update, sync: sync };
  }

  var inEd = Editor($('ed-in'));
  var outEd = Editor($('ed-out'));

  /* ---------- Erkennung und Umwandlung ---------- */
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function detect(code) {
    var t = code.trim().slice(0, 4000);
    if (/^<(!doctype|html)/i.test(t)) return 'document';
    if (t.charAt(0) === '<') return 'fragment';
    if (/\b(function|const|let|var|console\.|document\.|window\.)|=>/.test(t)) return 'js';
    if (/[.#@a-z][^{}]*\{[^{}]*:[^{}]*\}/i.test(t)) return 'css';
    return 'text';
  }

  function resolveKind(code) {
    var m = modeEl.value;
    if (m === 'html') return /^<(!doctype|html)/i.test(code.trim()) ? 'document' : 'fragment';
    if (m === 'js' || m === 'css' || m === 'text') return m;
    return detect(code);
  }

  function langOf(kind) {
    if (kind === 'document' || kind === 'fragment') return 'html';
    return kind;
  }

  function fileInfo() {
    var raw = fnEl.value.trim().replace(/[\\\/:*?"<>|]+/g, '');
    var stem = raw.replace(/\.(html?|HTML?)$/, '').trim() || 'index';
    return { stem: stem, file: stem + '.html' };
  }

  function build(code, kind, title) {
    var head = '<!DOCTYPE html>\n<html lang="de">\n<head>\n<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + esc(title) + '</title>\n';
    if (kind === 'document') return code.replace(/^\s+/, '').replace(/\s*$/, '\n');
    if (kind === 'fragment') return head + '</head>\n<body>\n' + code.trim() + '\n</body>\n</html>\n';
    if (kind === 'js') {
      return head + '</head>\n<body>\n<script>\n' + code.replace(/<\/script/gi, '<\\/script').trim() + '\n' + CLOSE_SCRIPT + '\n</body>\n</html>\n';
    }
    if (kind === 'css') {
      return head + '<style>\n' + code.replace(/<\/style/gi, '<\\/style').trim() + '\n</style>\n</head>\n<body>\n</body>\n</html>\n';
    }
    return head + '<style>\nbody { margin: 1.5rem; }\npre { font: 14px/1.55 ui-monospace, Menlo, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }\n</style>\n</head>\n<body>\n<pre><code>' + esc(code.replace(/\s+$/, '')) + '</code></pre>\n</body>\n</html>\n';
  }

  function fmtBytes(n) {
    return n < 1024 ? n + ' B' : (n / 1024).toFixed(1).replace('.', ',') + ' KB';
  }

  function say(el, msg, cls) {
    el.textContent = msg || '';
    el.className = 'status' + (cls ? ' ' + cls : '');
  }
  function clearStatus() { say(statusEl, ''); say(statusInEl, ''); }

  /* ---------- Anzeige ---------- */
  function updatePreview() {
    tabCode.setAttribute('aria-pressed', showPreview ? 'false' : 'true');
    tabPrev.setAttribute('aria-pressed', showPreview ? 'true' : 'false');
    outEd.root.hidden = showPreview;
    previewEl.hidden = !showPreview;
    if (showPreview) {
      previewEl.srcdoc = current.html || '<p style="font:14px sans-serif;color:#666;padding:1rem">Noch kein Code eingefügt.</p>';
    } else {
      outEd.sync();
    }
  }

  function setActionsEnabled(on) {
    dlBtn.disabled = !on;
    cpBtn.disabled = !on;
    shareBtn.disabled = !on;
  }

  /* Eingabefeld sofort neu färben (sonst wäre der Text kurz unsichtbar). */
  function renderInput() {
    var code = codeEl.value;
    $('count').textContent = code.length.toLocaleString('de-DE') + ' Zeichen';
    var kind = code.trim() ? resolveKind(code) : 'text';
    inEd.update(langOf(kind));
    return kind;
  }

  /* Ergebnis, Vorschau und Größe. */
  function renderOutput(kind) {
    var code = codeEl.value;
    var info = fileInfo();
    current.file = info.file;
    dlBtn.textContent = 'Als ' + info.file + ' herunterladen';
    if (!code.trim()) {
      current.html = '';
      outEl.value = '';
      outEd.update('html');
      updatePreview();
      $('size').textContent = '–';
      $('detect').textContent = 'Noch kein Code eingefügt.';
      setActionsEnabled(false);
      return;
    }
    current.html = build(code, kind, info.stem);
    outEl.value = current.html;
    outEd.update('html');
    updatePreview();
    $('size').textContent = fmtBytes(new Blob([current.html]).size);
    $('detect').textContent = (modeEl.value === 'auto' ? 'Erkannt: ' : 'Gewählt: ') + MODE_LABEL[kind] + '.';
    setActionsEnabled(true);
  }

  function renderAll() {
    clearTimeout(outTimer);
    renderOutput(renderInput());
  }

  function onType() {
    clearStatus();
    var kind = renderInput();
    clearTimeout(outTimer);
    outTimer = setTimeout(function () { renderOutput(kind); }, 150);
  }

  codeEl.addEventListener('input', onType);
  fnEl.addEventListener('input', function () { clearStatus(); renderAll(); });
  modeEl.addEventListener('change', function () { clearStatus(); renderAll(); });
  tabCode.addEventListener('click', function () { showPreview = false; updatePreview(); });
  tabPrev.addEventListener('click', function () { showPreview = true; updatePreview(); });
  $('example').addEventListener('click', function () { codeEl.value = EXAMPLE; clearStatus(); renderAll(); });
  $('clear').addEventListener('click', function () { codeEl.value = ''; clearStatus(); renderAll(); codeEl.focus(); });

  /* ---------- Datei laden ---------- */
  var EXT_MODE = {
    html: 'html', htm: 'html',
    js: 'js', mjs: 'js',
    css: 'css',
    txt: 'auto'
  };

  function loadFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      say(statusInEl, 'Die Datei ist größer als 5 MB.', 'bad');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      say(statusInEl, 'Die Datei konnte nicht gelesen werden.', 'bad');
    };
    reader.onload = function () {
      var text = String(reader.result || '');
      if (text.slice(0, 2000).indexOf('\u0000') !== -1) {
        say(statusInEl, 'Das sieht nach keiner Textdatei aus.', 'bad');
        return;
      }
      var dot = file.name.lastIndexOf('.');
      var ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '';
      var stem = (dot > 0 ? file.name.slice(0, dot) : file.name).replace(/[\\\/:*?"<>|]+/g, '').trim();
      codeEl.value = text;
      modeEl.value = Object.prototype.hasOwnProperty.call(EXT_MODE, ext) ? EXT_MODE[ext] : 'text';
      if (stem) fnEl.value = stem + '.html';
      renderAll();
      codeEl.scrollTop = 0;
      codeEl.scrollLeft = 0;
      inEd.sync();
      say(statusEl, '');
      say(statusInEl, '„' + file.name + '“ geladen (' + fmtBytes(file.size) + ').', 'ok');
    };
    reader.readAsText(file);
  }

  openBtn.addEventListener('click', function () { fileEl.click(); });
  fileEl.addEventListener('change', function () {
    loadFile(fileEl.files && fileEl.files[0]);
    fileEl.value = '';
  });

  var dropRoot = inEd.root;
  ['dragenter', 'dragover'].forEach(function (ev) {
    dropRoot.addEventListener(ev, function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1) {
        e.preventDefault();
        dropRoot.classList.add('drop');
      }
    });
  });
  ['dragleave', 'dragend'].forEach(function (ev) {
    dropRoot.addEventListener(ev, function () { dropRoot.classList.remove('drop'); });
  });
  dropRoot.addEventListener('drop', function (e) {
    dropRoot.classList.remove('drop');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      e.preventDefault();
      loadFile(e.dataTransfer.files[0]);
    }
  });

  /* ---------- Zwischenablage ---------- */
  if (!(navigator.clipboard && navigator.clipboard.readText)) {
    pasteBtn.hidden = true;
  }
  pasteBtn.addEventListener('click', function () {
    var manual = 'Der Browser hat den Zugriff nicht erlaubt. Halte den Finger im Code-Feld gedrückt und wähle „Einfügen“.';
    try {
      navigator.clipboard.readText().then(function (t) {
        if (!t || !t.trim()) { say(statusInEl, 'Die Zwischenablage ist leer.', ''); return; }
        codeEl.value = t;
        renderAll();
        say(statusInEl, 'Aus der Zwischenablage eingefügt.', 'ok');
      }, function () { say(statusInEl, manual, 'bad'); });
    } catch (e) { say(statusInEl, manual, 'bad'); }
  });

  cpBtn.addEventListener('click', function () {
    var text = current.html;
    if (!text) return;
    var fallback = function () {
      showPreview = false;
      updatePreview();
      outEl.focus();
      outEl.select();
      say(statusEl, 'Text markiert. Mit Strg/Cmd + C kopieren.', '');
    };
    try {
      navigator.clipboard.writeText(text).then(function () {
        say(statusEl, 'In die Zwischenablage kopiert.', 'ok');
      }, fallback);
    } catch (e) { fallback(); }
  });

  /* ---------- Speichern ---------- */
  dlBtn.addEventListener('click', function () {
    if (!current.html) return;
    try {
      var blob = new Blob([current.html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = current.file;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
      say(statusEl, 'Download gestartet: ' + current.file + '. Auf dem iPad liegt die Datei in der Dateien-App unter „Downloads“.', 'ok');
    } catch (e) {
      say(statusEl, 'Der Download hat nicht funktioniert. Nutze „Kopieren“ und speichere den Text als ' + current.file + '.', 'bad');
    }
  });

  /* Teilen-Menü: auf dem iPad der sicherste Weg, die Datei in „Dateien“ abzulegen. */
  function canShareFiles() {
    try {
      var f = new File(['x'], 'a.html', { type: 'text/html' });
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [f] }));
    } catch (e) { return false; }
  }
  if (canShareFiles()) shareBtn.hidden = false;

  shareBtn.addEventListener('click', function () {
    if (!current.html) return;
    var file = new File([current.html], current.file, { type: 'text/html' });
    navigator.share({ files: [file], title: current.file }).then(function () {
      say(statusEl, 'Geteilt: ' + current.file + '.', 'ok');
    }, function (err) {
      if (err && err.name === 'AbortError') say(statusEl, 'Teilen abgebrochen.', '');
      else say(statusEl, 'Teilen hat nicht funktioniert. Nutze „Herunterladen“ oder „Kopieren“.', 'bad');
    });
  });

  /* ---------- Offline und Installation ---------- */
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  var isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isApple && !standalone) $('install').hidden = false;

  var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    navigator.serviceWorker.register('sw.js').then(function () {
      return navigator.serviceWorker.ready;
    }).then(function () {
      $('offline').hidden = false;
    }, function () { /* ohne Service Worker läuft die App normal weiter */ });
  }

  renderAll();
})();
