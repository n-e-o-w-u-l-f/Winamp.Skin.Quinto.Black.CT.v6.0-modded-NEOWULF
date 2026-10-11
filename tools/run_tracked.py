"""Run an owned finite build/check with a real heartbeat and exit evidence.

This wrapper observes its own child only; it never finds or restarts old jobs.
Use the recorded PID/start identity and output acceptance on re-entry.
"""
import argparse, datetime, json, os, signal, subprocess, time
from pathlib import Path


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--status', type=Path, required=True)
    p.add_argument('--log', type=Path, required=True)
    p.add_argument('--label', required=True)
    p.add_argument('--timeout', type=float, default=120)
    p.add_argument('command', nargs=argparse.REMAINDER)
    args = p.parse_args()
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if not command or args.timeout <= 0:
        p.error('A command and positive timeout are required')
    for path in (args.status, args.log):
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            p.error('Existing run evidence is preserved: ' + str(path))
    state = dict(label=args.label, runner_kind='PROCESS', wrapper_pid=os.getpid(),
                 started_at_utc=utc(), state='RUNNING', deadline_seconds=args.timeout,
                 log=str(args.log.resolve()), last_progress_at_utc=utc())

    def save():
        state['heartbeat_at_utc'] = utc()
        tmp = args.status.with_suffix(args.status.suffix + '.tmp')
        tmp.write_text(json.dumps(state, indent=2) + '\n', encoding='utf-8')
        os.replace(tmp, args.status)

    try:
        log = args.log.open('xb')
    except FileExistsError:
        p.error('Existing run evidence is preserved: ' + str(args.log))
    with log:
        try:
            child = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                     start_new_session=os.name != 'nt')
        except OSError as error:
            state.update(state='FAILED', exit_code=127, error=str(error), completed_at_utc=utc())
            save()
            raise SystemExit(127)
        state['child_pid'] = child.pid
        save()
        started, last_size = time.monotonic(), 0
        while child.poll() is None:
            size = args.log.stat().st_size
            if size != last_size:
                state['last_progress_at_utc'] = utc()
                last_size = size
            state['log_bytes'] = size
            if time.monotonic() - started > args.timeout:
                if os.name == 'nt':
                    subprocess.run(['taskkill', '/PID', str(child.pid), '/T', '/F'],
                                   stdout=log, stderr=subprocess.STDOUT, timeout=10)
                else:
                    os.killpg(child.pid, signal.SIGKILL)
                child.wait()
                state.update(state='FAILED', error='Owned child exceeded deadline',
                             exit_code=124, owned_process_tree_terminated=True)
                save()
                raise SystemExit(124)
            save()
            time.sleep(.5)
        state.update(state='DONE' if child.returncode == 0 else 'FAILED',
                     exit_code=child.returncode, completed_at_utc=utc(),
                     log_bytes=args.log.stat().st_size)
        save()
    print(json.dumps(state))
    raise SystemExit(child.returncode)


if __name__ == '__main__':
    main()
