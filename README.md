# NEOWULF Hellfire

Aktueller Stand: **Reference R2 / IN PROGRESS**. Verbindlich ist `design/approved-reference.png`, die am 5. Oktober 2026 erneut bestätigte Metall-/Fire-LED-Vorlage. Die älteren R4.1/R5-Daten bleiben als Quellgeschichte erhalten.

`tools/build_reference_skin.py` erzeugt daraus individuelle Modern-Skin-Fenster auf der hashgeprüften Quinto-Black-CT-5.1-Grundlage. `design/assets/` enthält getrennte neu erzeugte Produktionsgrafiken mit tatsächlichen Bildabmessungen und SHA256-Hashes. Eine Vergrößerung der ursprünglichen Vorlage wird nicht als neue 4K-Detailzeichnung ausgegeben.

`studio/engines/` enthält die wiederhergestellten eigenen Audio-Instrumente und das an die Vorlage angepasste Frontpanel. Canvas-Anzeigen arbeiten mit einem gemeinsamen 30-Hz-Zeichenbudget, getrennten Stereo-Daten, sanftem Angriff/Abfall und auslesbarer Bildratenmessung. Die Sequencer-Zeitbasis bleibt unabhängig vom Zeichentakt.

Der Build enthält 24 eigenständige Fenster, darunter das native TV-Visualisierungsfenster und sechs Lautsprecher mit neun getrennten Membranelementen. Winamps eigenes Menü ist am linken oberen Schraubpunkt des Hauptfensters erreichbar. Die klassischen Mini-Vis-Anzeigen liefern Mono-Daten; echte getrennte PCM-Wellenformen kommen über DSP und WebView. Fehlt der rechte Kanal, bleibt er stumm.

`node tests/test_signal_contract.cjs` prüft die tatsächlichen JavaScript-Anzeigen mit kontrollierter Zeit und getrennten Testsignalen sowie die drei Instrument-Projektmodelle. `python3 -B tests/test_reference_layout.py BUILD/skin` prüft das tatsächlich erzeugte Skin-Verzeichnis und negative Bitmap-/Membran-/Menüfälle. Simulierte 30 Hz sind kein gemessener Winamp-Bildratennachweis.

Build, Archiv-/XML-Prüfung, echte Winamp-Laufzeit und Audio-/Dockingprüfung sind getrennte Abnahmeschritte. Der volle Umfang und die konkreten Restarbeiten stehen in [LAST_TASKS.md](LAST_TASKS.md), [Abnahmematrix](docs/HELLFIRE-COVERAGE.md) und [Referenzübertragung](docs/REFERENCE-TRANSFER.md). Die vorhandenen nativen Bridge-DLLs sind hashgesicherte Alt-Binaries; ihr C++-Buildquelltext fehlt derzeit. Das Gesamtpaket ist noch nicht vollständig abgenommen. Der neue Build wurde bisher nicht in der isolierten Windows-Installation geladen.
