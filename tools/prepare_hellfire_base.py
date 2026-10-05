#!/usr/bin/env python3
"""Prepare a hash-verified Quinto 5.1 build input and pinned MAKI compiler."""
from pathlib import Path
import argparse, hashlib, json, base64, zipfile, urllib.request, xml.etree.ElementTree as ET

BASE_SHA256 = "d926537bd21978d498d9781b15e733bab21ab28da0bf696e1307132d2e6066d1"
SDK_BLOBS = {
    "mc.exe":"b1f34e3ea047c42a808802f7082fa85b4f90091e",
    "nscrt.dll":"b369695870c03bc0f915e86918a07c8932dff777",
    "lib/std.mi":"352e0a2f2a199ecce938fee3c1e78e709fe84935",
}
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",type=Path,required=True)
    p.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[1])
    args=p.parse_args()
    root=args.root.resolve(); data=args.base.read_bytes()
    if hashlib.sha256(data).hexdigest()!=BASE_SHA256:
        raise ValueError("Original input differs from the independently verified Quinto 5.1 archive")
    base=root/"build"/"quinto-5.1"
    with zipfile.ZipFile(args.base) as z:
        if z.testzip() is not None: raise ValueError("Archive CRC failure")
        info=ET.fromstring(z.read("skin.xml")).find("skininfo")
        if info.findtext("version")!="5.1" or info.findtext("author")!="PeterK.":
            raise ValueError("Unexpected upstream identity")
        for name in z.namelist():
            path=(base/name.replace("\\","/")).resolve()
            if not path.is_relative_to(base.resolve()): raise ValueError("Unsafe archive path")
            if name.endswith("/"): path.mkdir(parents=True,exist_ok=True); continue
            raw=z.read(name)
            if path.exists() and path.read_bytes()!=raw: raise ValueError("Preserve changed build input: "+name)
            path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(raw)
    sdk=root/"build"/"maki-sdk"
    for name,sha in SDK_BLOBS.items():
        path=sdk/name; path.parent.mkdir(parents=True,exist_ok=True)
        if path.exists(): raw=path.read_bytes()
        else:
            req=urllib.request.Request("https://api.github.com/repos/captbaritone/webamp/git/blobs/"+sha,headers={"User-Agent":"NEOWULF-build"})
            with urllib.request.urlopen(req,timeout=30) as response: meta=json.load(response)
            raw=base64.b64decode(meta["content"])
        gitsha=hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
        if gitsha!=sha: raise ValueError("SDK blob differs: "+name)
        path.write_bytes(raw)
    report={"base_sha256":BASE_SHA256,"base_author":"PeterK.","base_version":"5.1","entries":140,"sdk_blobs":SDK_BLOBS}
    (root/"build"/"verified-inputs.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"result":"PREPARED","base":str(base),"sdk":str(sdk),**report}))
if __name__=="__main__": main()
