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
    p.add_argument('--suite', default='test_reference.cjs')
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
                 baseUrl=base, debugUrl=debug, environment='owned local Chromium companion UI, not native Winamp')
    try:
        with (output/'server.log').open('wb') as server_log, (output/'edge.log').open('wb') as edge_log:
            server = subprocess.Popen([sys.executable, '-m', 'http.server', str(http_port),
                                       '--bind', '127.0.0.1', '--directory', str(repo)],
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
                if server.poll() is not None or edge.poll() not in (None, 0):
                    raise RuntimeError(f'Owned browser/server exited during startup: browser={edge.poll()} server={server.poll()}')
                try:
                    with urllib.request.urlopen(debug+'/json/version', timeout=1) as response:
                        state['browserVersion'] = json.load(response)
                        state['launcherExitCode'] = edge.poll()
                    with urllib.request.urlopen(base+'/studio/engines/instrument.html', timeout=1) as response:
                        assert response.status == 200
                    break
                except (OSError, ValueError):
                    if time.monotonic() >= deadline:
                        raise TimeoutError('Owned browser/server startup deadline')
                    time.sleep(.2)
            (output/'owned-processes.json').write_text(json.dumps(state, indent=2)+'\n')
            completed = subprocess.run([node, str(repo/'studio/tools'/args.suite),
                                        str(output), base+'/studio/engines', debug], timeout=240)
            state['exitCode'] = completed.returncode
            raise SystemExit(completed.returncode)
    finally:
        # Modern Chromium may relaunch unelevated and exit its launcher with 0.
        # Close the dedicated browser through its own loopback CDP endpoint.
        close_js = '''
const endpoint=process.argv[1];
const timer=setTimeout(()=>process.exit(1),7000);
fetch(endpoint+'/json/version').then(r=>r.json()).then(v=>{
 const ws=new WebSocket(v.webSocketDebuggerUrl);
 ws.onopen=()=>ws.send(JSON.stringify({id:1,method:'Browser.close'}));
 let opened=false;
 const verify=async()=>{if(!opened){clearTimeout(timer);process.exit(1);}for(let i=0;i<10;i++){try{await fetch(endpoint+'/json/version');}catch{clearTimeout(timer);process.exit(0);}await new Promise(r=>setTimeout(r,100));}clearTimeout(timer);process.exit(1);};
 ws.onopen=()=>{opened=true;ws.send(JSON.stringify({id:1,method:'Browser.close'}));};
 ws.onclose=verify;
 ws.onerror=verify;
}).catch(()=>{clearTimeout(timer);process.exit(1);});
'''
        closed=subprocess.run([node,'-e',close_js,debug],capture_output=True,timeout=10)
        state['browserClosedViaCdp'] = closed.returncode == 0
        stop_owned(edge)
        stop_owned(server)
        state['childrenClosed'] = state['browserClosedViaCdp']
        state['completedUtc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        (output/'owned-processes.json').write_text(json.dumps(state, indent=2)+'\n')


if __name__ == '__main__':
    main()