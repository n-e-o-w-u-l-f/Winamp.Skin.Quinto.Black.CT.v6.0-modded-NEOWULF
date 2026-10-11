# NEOWULF Hellfire

Aktueller Stand: **Hellfire Reference / IN PROGRESS; native Prüfung vom 11. Oktober 2026**. Verbindlich ist `design/approved-reference.png`, die am 5. Oktober 2026 erneut bestätigte Metall-/Fire-LED-Vorlage. Die älteren R4.1/R5-Daten bleiben als Quellgeschichte erhalten.

`tools/build_reference_skin.py` erzeugt daraus individuelle Modern-Skin-Fenster auf der hashgeprüften Quinto-Black-CT-5.1-Grundlage. `design/assets/` enthält getrennte neu erzeugte Produktionsgrafiken mit tatsächlichen Bildabmessungen und SHA256-Hashes. Eine Vergrößerung der ursprünglichen Vorlage wird nicht als neue 4K-Detailzeichnung ausgegeben.

`studio/engines/` enthält die wiederhergestellten eigenen Audio-Instrumente und das an die Vorlage angepasste Frontpanel. Canvas-Anzeigen arbeiten mit einem gemeinsamen 30-Hz-Zeichenbudget, getrennten Stereo-Daten, sanftem Angriff/Abfall und auslesbarer Bildratenmessung. Die Sequencer-Zeitbasis bleibt unabhängig vom Zeichentakt.

Der Build enthält 24 eigenständige Fenster, darunter das native TV-Visualisierungsfenster und sechs Lautsprecher mit neun getrennten Membranelementen. Winamps eigenes Menü ist am linken oberen Schraubpunkt des Hauptfensters erreichbar. Die klassischen Mini-Vis-Anzeigen liefern Mono-Daten; echte getrennte PCM-Wellenformen kommen über DSP und WebView. Fehlt der rechte Kanal, bleibt er stumm.

`node tests/test_signal_contract.cjs` prüft die tatsächlichen JavaScript-Anzeigen mit kontrollierter Zeit und getrennten Testsignalen sowie die drei Instrument-Projektmodelle. `python3 -B tests/test_reference_layout.py BUILD/skin` prüft das tatsächlich erzeugte Skin-Verzeichnis und negative Bitmap-/Membran-/Menüfälle. Simulierte 30 Hz sind kein gemessener Winamp-Bildratennachweis.

Der neue Build ist in der isolierten Winamp-5.9.2-Installation geladen. Schwarze Platte, rotes Wolf-Label, Bewegung und Achsmontage sind nativ geprüft. Der reale Edge-Test besteht für drei Instrumente und fünf Anzeigen bei rund 30 FPS; die vollständige native Bildrate und Audio-/Dockingabnahme bleiben offen. Der volle Umfang steht in [LAST_TASKS.md](LAST_TASKS.md), [Abnahmematrix](docs/HELLFIRE-COVERAGE.md) und [Referenzübertragung](docs/REFERENCE-TRANSFER.md). Die vorhandenen Bridge-DLLs sind hashgesicherte Alt-Binaries; ihr C++-Buildquelltext fehlt derzeit.

`node studio/tools/build_instrument.cjs --check` verhindert einen veralteten geladenen Instrument-Bundle. `tools/run_tracked.py` protokolliert reale Prozessidentität, Fortschritt und Deadline. Die nativen Prüfhelfer starten ausschließlich die vorhandene Testinstallation mit eigenem Profil und bewahren vorherige Dateien.
