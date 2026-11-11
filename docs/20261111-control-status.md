# Hellfire: Funktionen und Animationen — 2026-11-11

Status: **IN_PROGRESS — Browser geprüft, native Winamp-Abnahme offen.**
Dieser Stand schließt den Auftrag zum vollständigen Skin und zur vollständigen Korg-Funktionalität nicht ab.

## Verbindliche Benutzerkorrekturen
- Bestehende Ankerpunkte der Buttons, Drehregler und Knöpfe beibehalten.
- Jeder sichtbare Button muss eine echte Funktion besitzen.
- Die generischen R5-Rahmen und die polygonale Feueranimation wurden verworfen. Die verworfenen R5-Bilder/Layoutänderungen gehören nicht in diesen Quellstand.
- Maßgeblich bleibt design/approved-reference.png, SHA256 c30cbc667325b5c8b2238dafaf54aea6006d0631f0795bb6221554c19a7e02b3.

## Implementierte Korrekturen
| Bedienelement | Tatsächliche Wirkung | Nachweis |
|---|---|---|
| Power | Audio einschalten, ausschalten und wieder aufnehmen | Running/Suspended/Running im Browser |
| Play / Stop / LINK | Sequencer starten/stoppen; Transport zwischen zwei Decks synchronisieren | Zwei unabhängige Browserseiten |
| Pads / Keyboard / ARP | Audio auslösen, Tonhöhe wählen, Arpeggio auslösen | Laufende Stimmen und Trigger geprüft |
| Alle zehn Regler | Parameter ändern; Level/Pan/Filter/Drive/Send/Pitch auch an laufende Stimmen übertragen | Alle Regler je Modell; laufender Filterwert |
| Mute / Solo / Face-Mute | Parts sperren; bereits laufende ausgeschlossene Stimmen ausblenden | Stimmenzahl und Zustandsanzeige |
| Klangwahl | Synth- und Drum-Klänge über das vorhandene Auswahlfeld wählen | Typ/Wellenformwechsel, keine neue Position |
| Record / Motion | Steps und Reglerwerte aufnehmen; ADSR-Motion beim Laden erhalten | Aufnahme und Validierungs-Roundtrip |
| Step / Länge / Seite / Editor | Sequenz bearbeiten; Note 0, Velocity und Gate erhalten | 64 bzw. 128 Steps und Editor |
| Copy / Paste | Klang und Sequenz des Parts kopieren | Unabhängige Kopie geprüft |
| Bank / Pattern | Pattern umschalten; je Pattern eigene Klangeinstellungen speichern | Wechsel und Neuladen |
| Name / Song Chain | Pattern benennen, Kette bearbeiten; beim ersten Ketteneintrag starten | Dialoge und aktives Startpattern |
| SAMPLE / SAMPLE LADEN | Audio-Dateiauswahl und Dekodierung | Beide sichtbaren Tasten mit echter Testdatei |
| Sample Start / End / Reverse / Loop | Ausschnitt begrenzen, denselben Ausschnitt rückwärts und als Loop abspielen | BufferSource-Start/End/Loop geprüft |
| Save / Load | Projekt einschließlich Samples exportieren und wieder laden | Tatsächliche Datei-Downloads und Dateiauswahl |
| WAV Export / Master | Stereo-WAV rendern; Master 0 ergibt Stille | RIFF-Datei, 48 kHz, zwei Kanäle, Energieprüfung |
| MIDI IN | Verbindung aktivieren, Noten/Note-Off verarbeiten, wieder trennen | Simulierter MIDI-Port; kein Hardware-Nachweis |
| MODE (alle fünf Visualizer) | Jeweils drei tatsächlich unterschiedliche Darstellungen | Bilddatenvergleich aller Varianten |
| CRT / Audioquelle | CRT umschalten; beim Quellenwechsel alte Pegel und Spektren verwerfen | Zustand und vollständig leere Signaldaten |

Die Frontgeometrie, CSS-Anker, nativen Layoutdefinitionen und Plattenspieler-Montage wurden in diesem Quellstand nicht verändert.

## Darstellungsänderung
Das Feuer verwendet ein WebGL-Dichtefeld in tatsächlicher Canvas-Auflösung einschließlich Geräte-Pixeldichte. Flammenenergie bleibt an getrennte L/R-Pegel gebunden. FLAME, FLOW und EMBERS ändern die Darstellung. Ohne WebGL existiert ein separat geprüfter Canvas-Pfad mit Bézier-Konturen und Partikeln. Dies ist kein aus einer kleinen Bitmap hochskaliertes Animationsband.

Horizontale und vertikale VU-Anzeigen besitzen nun SEGMENTS, CONTINUOUS und PEAK HOLD. Die Änderung der MODE-Beschriftung allein gilt nicht als Funktionsnachweis.

## Verifikation
- 19 Funktionsgruppen pro Synth/Sampler/EMX, insgesamt 57 Gruppen; darin alle zehn Regler pro Modell.
- Jede sichtbare HTML-Taste besitzt einen Handler oder ist die native Abbrechen-Taste des Formulars.
- Gemeinsamer Transport zwischen zwei Instrumentseiten bestanden.
- Fünf Visualizer, je drei Modi, DPR 2 / 744 × 232 CSS-Pixel: ungefähr 30 FPS im realen Chrome-Browser auf Legion.
- Separater Canvas-Fallback: drei Varianten, ungefähr 30 FPS.
- Node-Signalprüfungen: Kanaltrennung, fehlender rechter Kanal, Stop/Stale-Fade, Extremwerte, pausiertes Zeichnen bei unsichtbarem Dokument.
- Der vom HTML geladene klassische Bundle-Quelltext entspricht den gepflegten Modulen; git diff --check besteht.
- Die Testdaten sind ausdrücklich synthetisch; Browser-FPS sind kein Beweis für native Winamp-FPS oder hörbare Hardware-Ausgabe.

Evidenz: docs/verification/20261111-controls.json, 20261111-visual-controls.json, 20261111-canvas-fallback.json und 20261111-signal-contract.json.

## Noch offen
- Vollständige Original-Korg-Funktionen: insbesondere vollständiger IFX/MFX-Algorithmusbestand, sämtliche Motion-/Groove-/Polyphonie-Funktionen, Sampling/Resampling und komplette externe MIDI-/Clock-Anbindung. Die eigene Engine ist kein vollständiger Ersatz der Korg-Firmware oder Werksklangbibliothek.
- Native Windows-Prüfung aller sichtbaren Bedienelemente, tatsächlich eingebettete WebViews, Winamp-DSP-PCM und hörbare Audioausgabe.
- Native EQ-, TV-, VU-, Lautsprecher- und Fenster-/Docking-Prüfungen aus HELLFIRE-COVERAGE.md.
- Vorlagentreue des gesamten Gehäuses und Abnahme der Animationen.
- Reproduzierbarer Native-Bridge-Build: der C++-Quelltext der vorhandenen DLLs fehlt weiterhin.

## Hindernisse und Wiederaufnahme
BMAX-B6: native IPC-Prüfung endete mit Deadline 281; danach scheiterte die Remote-Befehlsprüfung mehrfach an PowerShell-Zeitlimits (5/15 Sekunden). Dateischreibvorgänge dauerten zeitweise über fünf Minuten. Keine automatische Freigabe oder Änderung der Sicherheitsregeln wurde versucht. Legion führte die getrennten Browser-/Signalprüfungen aus.

Nächster Schritt: BMAX-Verfügbarkeit prüfen, getestetes UI-Bundle ausschließlich in der erhaltenen separaten Winamp-Testinstallation bereitstellen und die tatsächlichen Plugin-Fenster/Audio-Datenwege prüfen. Verworfenen R5-Rahmen nicht als fertigen Skin veröffentlichen. Vorhandene DLLs unverändert lassen, bis ihr Quelltext und Buildweg wiederhergestellt sind.

## Primärquellen für den Korg-Abgleich
- https://www.korg.com/us/support/download/product/0/367/
- https://www.korg.com/us/support/download/product/0/368/
- https://cdn.korg.com/us/support/download/files/18e1fc0dd60cac3f50433a89f7811208.pdf
- https://cdn.korg.com/us/support/download/files/39d238e0f840ee25e68f1618517b4731.pdf
- https://cdn.korg.com/us/support/download/files/e2eb4fe383a49b45cc7a4b5e593d5b10.pdf
