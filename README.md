# 🎨 Malen nach Zahlen - Paint by Numbers

Eine interaktive Web-Anwendung zum Malen nach Zahlen, entwickelt mit HTML, CSS und JavaScript.

## Features

- **Interaktive Farbpalette**: 6 verschiedene Farben mit nummerierten Bereichen
- **Echtzeit-Fortschrittsanzeige**: Verfolgen Sie Ihren Fortschritt mit einer visuellen Fortschrittsleiste
- **Intelligente Validierung**: Das Spiel überprüft, ob Sie die richtige Farbe für jeden Bereich verwenden
- **Hinweis-System**: Wenn Sie nicht weiterkommen, können Sie einen Hinweis anfordern
- **Responsives Design**: Funktioniert auf Desktop und mobilen Geräten
- **Visuelle Effekte**: Animationen und Feedback für ein besseres Spielerlebnis

## Installation

1. Klonen Sie das Repository:
```bash
git clone <repository-url>
cd Test
```

2. Öffnen Sie die `index.html` Datei in Ihrem Browser:
   - Doppelklick auf die Datei, oder
   - Starten Sie einen lokalen Webserver:
   ```bash
   python -m http.server 8000
   ```
   Dann öffnen Sie `http://localhost:8000` in Ihrem Browser

## Spielanleitung

1. **Farbe auswählen**: Klicken Sie auf eine Farbe in der Palette auf der rechten Seite
2. **Bereich ausfüllen**: Klicken Sie auf einen nummerierten Bereich auf dem Canvas
3. **Richtige Farbe**: Wenn die Farbe mit der Nummer übereinstimmt, wird der Bereich ausgefüllt
4. **Falsche Farbe**: Wenn die Farbe nicht passt, erhalten Sie eine Fehlermeldung
5. **Fortschritt**: Beobachten Sie Ihren Fortschritt in der Fortschrittsanzeige
6. **Fertigstellung**: Wenn alle Bereiche ausgefüllt sind, erscheint eine Glückwunsch-Nachricht

## Bedienelemente

- **Neu starten**: Setzt das Spiel zurück und startet von vorne
- **Hinweis**: Hebt einen zufälligen unausgefüllten Bereich hervor

## Technologie-Stack

- **HTML5**: Struktur der Anwendung
- **CSS3**: Styling und Animationen
- **JavaScript (Vanilla)**: Spiellogik und Interaktivität
- **SVG**: Vektorgrafiken für das Canvas

## Dateistruktur

```
Test/
├── index.html      # Haupt-HTML-Datei
├── style.css       # Styling und Layout
├── app.js          # Spiellogik
└── README.md       # Diese Datei
```

## Features im Detail

### Farbpalette
- 6 verschiedene Farben mit eindeutigen Nummern
- Visuelle Anzeige der ausgewählten Farbe
- Markierung von vollständig ausgefüllten Farben

### Canvas
- SVG-basiertes Zeichnen für scharfe Grafiken
- Verschiedene geometrische Formen (Rechtecke und Kreise)
- Nummerierte Bereiche für einfache Zuordnung

### Fortschrittsverfolgung
- Echtzeit-Prozentanzeige
- Visuelle Fortschrittsleiste
- Vollständigkeitsprüfung

## Zukünftige Erweiterungen

Mögliche Verbesserungen für die Zukunft:
- Mehrere Schwierigkeitsstufen
- Verschiedene Bilder zur Auswahl
- Timer für Wettbewerbsmodus
- Speicherfunktion für den Spielfortschritt
- Bildupload für eigene Malen-nach-Zahlen Vorlagen
- Multiplayer-Modus

## Browser-Kompatibilität

Die App funktioniert in allen modernen Browsern:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Lizenz

Dieses Projekt ist Open Source und kann frei verwendet werden.

## Autor

Erstellt mit Claude Code

---

Viel Spaß beim Malen! 🎨
