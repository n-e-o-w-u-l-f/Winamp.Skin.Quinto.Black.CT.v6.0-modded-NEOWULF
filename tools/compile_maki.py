"""Compile with the pinned native MC, accounting for its current-directory output."""
import argparse, hashlib, json, shutil, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def compile_bytes(compiler, source):
    compiler, source = Path(compiler).resolve(), Path(source).resolve()
    lock = json.loads((ROOT/'skin/maki-lock.json').read_text())
    sdk = compiler.parent
    for name, pin in lock['sdk_git_blobs'].items():
        raw = (sdk/name).read_bytes()
        assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest() == pin, name
    with tempfile.TemporaryDirectory(prefix='hellfire-maki-') as temporary:
        work = Path(temporary)
        for name in ('mc.exe', 'nscrt.dll'):
            shutil.copyfile(sdk/name, work/name)
        shutil.copytree(sdk/'lib', work/'lib')
        result = subprocess.run([str(work/'mc.exe'), str(source)], cwd=work,
                                capture_output=True, timeout=30)
        made = work/source.with_suffix('.maki').name
        if result.returncode or not made.is_file():
            raise RuntimeError((result.stdout+result.stderr)[-4000:].decode(errors='replace'))
        raw = made.read_bytes()
        assert raw.startswith(b'FG'), 'Compiler did not produce MAKI'
        return raw


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--compiler', type=Path, required=True)
    p.add_argument('--source', type=Path, action='append', required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    assert not args.output.exists(), 'Prior compilation evidence preserved'
    args.output.mkdir(parents=True)
    report = {}
    for source in args.source:
        first = compile_bytes(args.compiler, source)
        second = compile_bytes(args.compiler, source)
        assert first == second, 'Repeated compilation differs'
        (args.output/source.with_suffix('.maki').name).write_bytes(first)
        report[str(source)] = dict(source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                                  binary_sha256=hashlib.sha256(first).hexdigest(),
                                  bytes=len(first), repeated_compilation_equal=True)
    (args.output/'compilation.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
