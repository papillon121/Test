# 🧪 BioDefense: Zombie Outbreak (Web Edition)

Eine spielbare Browser-Version im Stil des alten iOS-Spiels **BioDefense: Zombie Outbreak** – modernisiert mit klarer UX, responsivem Layout und direkter Steuerung.

## Features

- Tower-Defense Gameplay mit Zombie-Wellen
- Drei Turmtypen (Säure, EMP, Flammen)
- Upgrade- und Verkaufssystem für gesetzte Türme
- Wellenstart per Knopf, Pause, Geschwindigkeitsmodus (1x/2x)
- Ressourcen-Management (Leben, Credits, Kills)
- Runde endet bei 0 Leben oder Sieg nach Welle 10

## Start

```bash
python -m http.server 8000
```

Dann im Browser öffnen:

- `http://localhost:8000`

## Steuerung

1. Turmtyp rechts auswählen.
2. Auf einen freien Turm-Slot im Spielfeld klicken.
3. Bereits platzierten Turm anklicken, um Upgrade/Verkauf zu nutzen.
4. "Nächste Welle starten" drücken.

## Tech Stack

- HTML5 Canvas
- CSS3
- Vanilla JavaScript

Viel Spaß beim Verteidigen des Labors! 🧬
