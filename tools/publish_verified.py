"""Publish an exact reviewed source manifest through ordinary owner Git.

Manifest files use SHA256 of complete bytes. Status uses NUL records without
stripping leading spaces. Concurrent refs and unreviewed paths fail closed.
"""
import argparse, hashlib, json, subprocess
from pathlib import Path


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', type=Path, required=True)
    p.add_argument('--manifest', type=Path, required=True)
    p.add_argument('--predecessor', required=True)
    p.add_argument('--message', required=True)
    args = p.parse_args()
    repo = args.repo.resolve()
    manifest = json.loads(args.manifest.read_text(encoding='utf-8-sig'))

    def raw(*words):
        return subprocess.check_output(['git','-C',str(repo),*words])

    def git(*words):
        return raw(*words).decode('utf-8').rstrip('\r\n')

    allowed = 'https://github.com/n-e-o-w-u-l-f/Winamp.Skin.Quinto.Black.CT.v6.0-modded-NEOWULF'
    assert git('remote','get-url','origin') in (allowed, allowed+'.git')
    assert git('branch','--show-current') == 'main'
    assert git('rev-parse','HEAD') == args.predecessor
    subprocess.run(['git','-C',str(repo),'fetch','origin','main'],check=True)
    assert git('rev-parse','origin/main') == args.predecessor, 'Concurrent ref preserved'
    expected = set(manifest['files'])
    records = raw('status','--porcelain=v1','-z','--untracked-files=all').split(b'\0')
    assert {r[3:].decode('utf-8') for r in records if r} == expected, 'Unreviewed worktree path'
    for name,pin in manifest['files'].items():
        assert hashlib.sha256((repo/name).read_bytes()).hexdigest() == pin, name
    subprocess.run(['git','-C',str(repo),'diff','--check'],check=True)
    assert git('ls-remote','origin','refs/heads/main').split()[0] == args.predecessor
    subprocess.run(['git','-C',str(repo),'add','--',*sorted(expected)],check=True)
    assert set(git('diff','--cached','--name-only').splitlines()) == expected
    subprocess.run(['git','-C',str(repo),'commit','-m',args.message],check=True)
    subprocess.run(['git','-C',str(repo),'push','origin','main'],check=True)
    assert not raw('status','--porcelain=v1')
    head = git('rev-parse','HEAD')
    assert git('ls-remote','origin','refs/heads/main').split()[0] == head
    print(json.dumps({'published_head':head,'files':len(expected),'clean':True,'remote_verified':True}))


if __name__ == '__main__':
    main()
