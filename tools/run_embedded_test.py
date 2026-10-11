"""Run the actual companion UI suite in an owned, bounded local Edge session."""
import argparse, datetime, json, os, shutil, socket, subprocess, sys, time
import urllib.request
from pathlib import Path


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def stop_owned(child):
    if child and child.poll() is None:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(child.pid), '/T', '/F'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        else:
            child.terminate()
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=5)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--edge', type=Path, required=True)
    args = p.parse_args()
    repo, output = args.repo.resolve(), args.output.resolve()
    assert args.edge.is_file() and not output.exists(), 'Fresh owned output/profile required'
    node = shutil.which('node')
    assert node and (repo/'studio/tools/test_reference.cjs').is_file()
    output.mkdir(parents=True)
    http_port, debug_port = free_port(), free_port()
    base, debug = f'http://127.0.0.1:{http_port}', f'http://127.0.0.1:{debug_port}'
    server = edge = None
    state = dict(startedUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                 runnerPid=os.getpid(), edge=str(args.edge), node=node,
                 baseUrl=base, debugUrl=debug, environment='owned local companion UI, not native Winamp')
    try:
        with (output/'server.log').open('wb') as server_log, (output/'edge.log').open('wb') as edge_log:
            server = subprocess.Popen([sys.executable, '-m', 'http.server', str(http_port),
                                       '--bind', '127.0.0.1', '--directory', str(repo/'studio/engines')],
                                      stdout=server_log, stderr=subprocess.STDOUT)
            edge = subprocess.Popen([str(args.edge), '--headless=new', '--disable-gpu',
                                     '--remote-debugging-address=127.0.0.1',
                                     f'--remote-debugging-port={debug_port}',
                                     f'--user-data-dir={output / "edge-profile"}',
                                     '--autoplay-policy=no-user-gesture-required',
                                     '--no-first-run', '--no-default-browser-check', 'about:blank'],
                                    stdout=edge_log, stderr=subprocess.STDOUT)
            state.update(serverPid=server.pid, edgePid=edge.pid)
            deadline = time.monotonic() + 15
            while True:
                if server.poll() is not None or edge.poll() is not None:
                    raise RuntimeError('Owned browser/server exited during startup')
                try:
                    with urllib.request.urlopen(debug+'/json/version', timeout=1) as response:
                        state['browserVersion'] = json.load(response)
                    with urllib.request.urlopen(base+'/instrument.html', timeout=1) as response:
                        assert response.status == 200
                    break
                except (OSError, ValueError):
                    if time.monotonic() >= deadline:
                        raise TimeoutError('Owned browser/server startup deadline')
                    time.sleep(.2)
            (output/'owned-processes.json').write_text(json.dumps(state, indent=2)+'\n')
            completed = subprocess.run([node, str(repo/'studio/tools/test_reference.cjs'),
                                        str(output), base, debug], timeout=150)
            state['exitCode'] = completed.returncode
            raise SystemExit(completed.returncode)
    finally:
        stop_owned(edge)
        stop_owned(server)
        state['childrenClosed'] = True
        state['completedUtc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        (output/'owned-processes.json').write_text(json.dumps(state, indent=2)+'\n')


if __name__ == '__main__':
    main()
