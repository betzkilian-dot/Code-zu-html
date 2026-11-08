# Code zu HTML

Eine kleine Web-App, die aus eingefügtem oder geladenem Code eine fertige `.html`-Datei macht.
Sie läuft komplett im Browser, braucht keinen Server und keine Installation, und funktioniert nach dem ersten Laden auch offline.

## Funktionen

- Code einfügen (auch per Knopf aus der Zwischenablage), aus einer Datei laden oder ins Feld ziehen
- Automatische Erkennung von HTML, JavaScript, CSS und anderem Code, oder manuelle Auswahl
- Farbige Darstellung mit Zeilennummern, im Eingabefeld und im Ergebnis
- Vorschau der fertigen Seite
- Download als `.html`, Kopieren, auf dem iPad zusätzlich Teilen und in „Dateien“ sichern
- Hell und Dunkel, Textgröße und Kontrast folgen den Systemeinstellungen
- Als App auf dem Home-Bildschirm installierbar, offline nutzbar

## Dateien

| Datei | Zweck |
| --- | --- |
| `index.html` | Die Seite |
| `style.css` | Aussehen, Schriften, Farben der Hervorhebung |
| `app.js` | Funktionen der App |
| `syntax.js` | Eigene kleine Farbhervorhebung für HTML, CSS und JavaScript |
| `sw.js` | Service Worker für den Offline-Betrieb |
| `manifest.webmanifest` | Angaben für die Installation als App |
| `favicon.svg`, `icons/` | Symbole |
| `fonts/` | Schriften Familjen Grotesk und JetBrains Mono (SIL Open Font License, Lizenztexte liegen dabei) |

## Lokal ausprobieren

Doppelklick auf `index.html` zeigt die Seite. Der Offline-Betrieb und der Zugriff auf die Zwischenablage brauchen aber `https` oder `localhost`. Zum Testen im Ordner einen kleinen Server starten:

```
python -m http.server 8000
```

Danach `http://localhost:8000` im Browser öffnen.

## Auf GitHub veröffentlichen (GitHub Pages)

Die App besteht nur aus statischen Dateien, deshalb reicht GitHub Pages. Alle Pfade sind relativ, die Seite läuft also auch unter `https://NAME.github.io/REPO/`.

### Variante A: im Browser hochladen

1. Auf github.com einloggen, oben rechts **+ → New repository**, Namen vergeben (zum Beispiel `code-zu-html`), **Public** wählen, **Create repository**.
2. Im neuen Repository **uploading an existing file** wählen und den **Inhalt** dieses Ordners hineinziehen (nicht den Ordner selbst). Die Ordner `fonts` und `icons` müssen mit hoch. Das geht am PC per Ziehen und Ablegen. Dann **Commit changes**.
3. **Settings → Pages**: bei „Build and deployment“ als Source **Deploy from a branch** wählen, Branch `main`, Ordner `/ (root)`, **Save**.
4. Nach ein bis zwei Minuten steht die Adresse oben auf der Pages-Seite.

### Variante B: mit Git

```
git init
git add .
git commit -m "Code zu HTML"
git branch -M main
git remote add origin https://github.com/NAME/REPO.git
git push -u origin main
```

Danach wie oben unter Settings → Pages einschalten.

## Auf dem iPad als App

1. Die veröffentlichte Adresse in Safari öffnen.
2. Teilen-Symbol, dann **Zum Home-Bildschirm**.
3. Einmal online öffnen. Danach funktioniert die App auch ohne Internet.

## Änderungen veröffentlichen

Wenn du Dateien änderst, in `sw.js` die Zeile `const VERSION = 'v1';` hochzählen (`'v2'`, `'v3'` ...). Sonst behalten installierte Geräte die alten Dateien aus dem Zwischenspeicher.

## Hinweis zur Vorschau

Die Vorschau läuft in einem abgeschotteten Rahmen. Skripte werden ausgeführt, die Seite kann aber nicht auf diese App zugreifen.
