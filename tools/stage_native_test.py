"""Stage a verified skin/UI into the existing isolated Windows installation.

Creates a new profile and preserves every replaced companion UI file. Does not
touch the main Winamp installation, DLLs, old WAL or original profile.
"""
import argparse, array, configparser, hashlib, json, math, shutil, wave, zipfile
from pathlib import Path


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--run', type=Path, required=True)
    p.add_argument('--wal', type=Path, required=True)
    p.add_argument('--filename', default='NEOWULF-Hellfire-Reference-20261011.wal')
    args = p.parse_args()
    root, run, wal = args.root.resolve(), args.run.resolve(), args.wal.resolve()
    repo = root / 'repo'
    exe = root / 'winamp-test/winamp.exe'
    assert exe.is_file() and (root/'winamp-profile/neowulf.ini').is_file()
    assert run.is_relative_to(root/'native-output') and not (run/'profile').exists()
    with zipfile.ZipFile(wal) as z:
        assert z.testzip() is None
        assert z.read('SCRIPTS/neowulf-reference.maki') == (repo/'skin/SCRIPTS/neowulf-reference.maki').read_bytes()
        assert z.read('PNG/NEOWULF/approved-reference.png') == (repo/'design/approved-reference.png').read_bytes()
    profile = run/'profile'; profile.mkdir(parents=True)
    # The new isolated profile avoids the previous deck coordinates/cache.
    ini = configparser.RawConfigParser(strict=False); ini.optionxform = str
    ini.read(root/'winamp-profile/neowulf.ini', encoding='utf-8-sig')
    filename = args.filename
    assert Path(filename).name == filename and filename.endswith('.wal')
    for section in ('Winamp', 'WinampReg'):
        if not ini.has_section(section): ini.add_section(section)
        ini.set(section, 'skin', filename)
    ini.set('Winamp', 'SkinDir', str(root/'winamp-test/Skins'))
    ini.set('Winamp', 'volume', '0')
    ini.set('Winamp', 'repeat', '1')
    with (profile/'neowulf.ini').open('w', encoding='utf-8', newline='\n') as f:
        ini.write(f)
    target = root/'winamp-test/Skins'/filename
    assert not target.exists(), 'Prior candidate preserved: ' + str(target)
    shutil.copyfile(wal, target)
    assert target.read_bytes() == wal.read_bytes()
    backup = run/'ui-before'; backup.mkdir()
    ui = root/'winamp-test/Plugins/NEOWULF'; assert ui.is_dir()
    installed = {}
    for source in (repo/'studio/engines').iterdir():
        if source.is_file():
            before = ui/source.name
            if before.exists(): shutil.copyfile(before, backup/source.name)
            shutil.copyfile(source, before)
            assert before.read_bytes() == source.read_bytes()
            installed[source.name] = hashlib.sha256(before.read_bytes()).hexdigest()
    sample = run/'stereo-probe.wav'
    with wave.open(str(sample), 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(44100)
        pcm = array.array('h')
        for i in range(44100 * 12):
            t = i/44100
            amp = .25 * (.55 + .45 * math.sin(t * math.tau * 2))
            pcm.extend((round(32767*amp*math.sin(math.tau*440*t)),
                        round(32767*amp*.7*math.sin(math.tau*660*t))))
        f.writeframes(pcm.tobytes())
    report = dict(wal_sha256=hashlib.sha256(wal.read_bytes()).hexdigest(),
                  installed_wal=str(target), profile=str(profile), exe=str(exe),
                  sample=str(sample), ui_hashes=installed, preserved_ui=str(backup),
                  native_runtime_verified=False)
    (run/'deployment.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
