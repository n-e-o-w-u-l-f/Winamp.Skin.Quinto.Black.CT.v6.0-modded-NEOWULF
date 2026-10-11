"""Execute the timeout, failure and duplicate-run guards against real children."""
import json, os, subprocess, sys, tempfile, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    with tempfile.TemporaryDirectory(prefix='hellfire-run-test-') as directory:
        root = Path(directory)

        def run(name, command, expected, timeout=3):
            args = [sys.executable, str(ROOT/'tools/run_tracked.py'), '--status', str(root/(name+'.json')),
                    '--log', str(root/(name+'.log')), '--label', name, '--timeout', str(timeout), '--', *command]
            result = subprocess.run(args, capture_output=True, timeout=15)
            assert result.returncode == expected, result.stderr.decode()
            return args, json.loads((root/(name+'.json')).read_text())

        args, success = run('success', [sys.executable, '-c', "print('real output')"], 0)
        assert success['state'] == 'DONE' and success['log_bytes'] > 0
        assert success['child_pid'] != success['wrapper_pid']
        before = (root/'success.json').read_bytes()
        duplicate = subprocess.run(args, capture_output=True, timeout=5)
        assert duplicate.returncode == 2 and (root/'success.json').read_bytes() == before
        _, failure = run('failure', [sys.executable, '-c', 'raise SystemExit(7)'], 7)
        assert failure['state'] == 'FAILED' and failure['exit_code'] == 7
        _, launch = run('missing', [str(root/'missing-executable')], 127)
        assert launch['state'] == 'FAILED' and 'child_pid' not in launch
        pid_file = root/'grandchild.pid'
        program = ('import subprocess,sys,time;from pathlib import Path;'
                   'p=subprocess.Popen([sys.executable,"-c","import time;time.sleep(60)"]);'
                   f'Path({str(pid_file)!r}).write_text(str(p.pid));time.sleep(60)')
        _, timeout = run('deadline', [sys.executable, '-c', program], 124, .7)
        assert timeout['owned_process_tree_terminated'] and timeout['state'] == 'FAILED'
        if os.name != 'nt':
            pid = int(pid_file.read_text())
            for _ in range(20):
                status = Path(f'/proc/{pid}/stat')
                if not status.exists() or status.read_text().split()[2] == 'Z':
                    break
                time.sleep(.05)
            else:
                raise AssertionError('Owned grandchild survived the deadline')
    print('Tracked execution: success, failure, launch error, duplicate preservation, owned-tree timeout PASS')


if __name__ == '__main__':
    main()
