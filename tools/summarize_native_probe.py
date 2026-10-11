"""Summarize real owned Winamp captures without publishing desktop pixels.

Screen sampling is a lower bound on visible changes, never timer telemetry or a
claim about every native deck. Raw full-window captures remain on the test host.
"""
import argparse, datetime, hashlib, json, zipfile
from pathlib import Path
from PIL import Image


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def sample(directory, label_only=False):
    frames = read(directory/'capture-timing.json')
    assert isinstance(frames, list) and len(frames) > 1
    span = (frames[-1]['elapsedMs']-frames[0]['elapsedMs'])/1000
    assert span > 0
    observed = [f['playing'] for f in frames if f['playing'] is not None]
    assert observed and all(value == 1 for value in observed), observed
    hashes = []
    for f in frames:
        with Image.open(directory/f['name']) as image:
            assert image.size == ((120, 46) if label_only else (836, 345))
            label = image.convert('RGB') if label_only else image.crop((334, 59, 454, 105)).convert('RGB')
            hashes.append(hashlib.sha256(label.tobytes()).hexdigest())
    changes = sum(a != b for a, b in zip(hashes, hashes[1:]))
    return dict(frames=len(frames), measured_span_seconds=span,
                sampling_fps=(len(frames)-1)/span, consecutive_visible_label_changes=changes,
                unique_label_images=len(set(hashes)), visible_change_fps_lower_bound=changes/span,
                playing_samples=len(observed), all_measured_playing=True,
                first_label_sha256=hashes[0], last_label_sha256=hashes[-1],
                interpretation='Actual screen pixels of the native vinyl label only; lower bound, not every-deck FPS')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, required=True)
    p.add_argument('--run', type=Path, required=True)
    p.add_argument('--wal', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    root, run, wal = args.root.resolve(), args.run.resolve(), args.wal.resolve()
    repo = root/'repo'
    deployment = read(run/'deployment.json')
    assert sha(wal) == deployment['wal_sha256'] == sha(Path(deployment['installed_wal']))
    windows = read(run/'playing-ready/native-windows.json')
    cadence = read(run/'label-cadence/native-windows.json')
    assert windows['pid'] == cadence['pid'] and windows['playing'] == cadence['playing'] == 1
    main_windows = [w for w in windows['windows'] if w['class'] == 'BaseWindow_RootWnd' and w['visible'] and (w['w'], w['h']) == (836,345)]
    assert len(main_windows) == 1
    lock = read(repo/'skin/maki-lock.json')
    with zipfile.ZipFile(wal) as z:
        assert z.testzip() is None
        stage = wal.parent/'skin'
        assert all(z.read(name) == (stage/name).read_bytes() for name in z.namelist())
        members = len(z.namelist())
        assert z.read('SCRIPTS/neowulf-reference.maki') == (repo/'skin/SCRIPTS/neowulf-reference.maki').read_bytes()
    for entry in lock['scripts']:
        assert sha(repo/entry['source']) == entry['source_sha256']
        assert sha(repo/entry['binary']) == entry['binary_sha256']
    ui = root/'winamp-test/Plugins/NEOWULF'
    assert all(sha(ui/name) == pin == sha(repo/'studio/engines'/name) for name,pin in deployment['ui_hashes'].items())
    sampling = sample(run/'playing-ready')
    label = sample(run/'label-cadence', label_only=True)
    assert sampling['unique_label_images'] > 1 and label['unique_label_images'] > 1
    preserved = root/'winamp-test/Skins/NEOWULF-From-Hell.wal'
    assert sha(preserved) == '249b03cb2845ed4ebc8d1f925b541f6a1e5413726dcb2e430fdab87a50a61243'
    gen = root/'winamp-test/Plugins/gen_neowulf.dll'
    assert sha(gen) == 'b72bae9a09ea4d496b94cc0690b11dabb22b8d905d2a4f10b3085d6c66052de7'
    report = dict(observed_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  environment='BMAX-B6, owned real Winamp 5.9.2 isolated profile, screen capture',
                  pid=windows['pid'], process_started=windows['processStarted'],
                  wal_sha256=sha(wal), installed_wal=deployment['installed_wal'],
                  profile=deployment['profile'], archive_members=members, archive_crc='PASS',
                  archive_member_bytes='PASS', source_binary_lock='PASS', installed_ui_bytes='PASS',
                  original_wal_preserved_sha256=sha(preserved), gen_dll_preserved_sha256=sha(gen),
                  main_layout=[836,345], fixed_spindle=[394,82], vinyl_bounds=[139,12,510,140],
                  spindle_basis='design/mounting.json; immutable production chassis source shaft (927,193)',
                  visible_motion_verified=True, full_window_sampling=sampling, label_sampling=label,
                  native_vinyl_20fps_lower_bound_verified=label['visible_change_fps_lower_bound'] >= 20,
                  native_vinyl_30fps_lower_bound_verified=label['visible_change_fps_lower_bound'] >= 30,
                  limitations=['FPS applies to the captured vinyl label only; other native decks remain open',
                               'Full-window capture cadence includes capture overhead',
                               'Menu inventory is not close/reopen/docking acceptance',
                               'Native WebView/DSP bridge and audible hardware output remain open',
                               'Dynamic album art and full design coverage remain open'],
                  native_menu_items=len(windows['menu']))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes((json.dumps(report,indent=2)+'\n').encode())
    print(json.dumps(report))


if __name__ == '__main__':
    main()
