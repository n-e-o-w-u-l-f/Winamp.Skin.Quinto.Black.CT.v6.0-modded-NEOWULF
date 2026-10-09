"""Negative acceptance tests against the actual built skin (not a mock skin)."""
from pathlib import Path
import importlib.util,json,sys
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reference_builder',root/'tools/build_reference_skin.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
stage=Path(sys.argv[1]);regions=json.loads((root/'design/reference-regions.json').read_text())['regions']
module.validate(stage,regions)
def rejected(filename,old,new,message):
    target=stage/filename;original=target.read_text();assert old in original
    try:
        target.write_text(original.replace(old,new),encoding='utf-8')
        try:module.validate(stage,regions)
        except ValueError as error:assert message in str(error),str(error)
        else:raise AssertionError('Invalid actual skin was accepted')
    finally:target.write_text(original,encoding='utf-8')
rejected('XML/reference-elements.xml','id="ref.woofer"','id="ref.woofer.missing"','Missing control bitmap')
rejected('XML/reference-elements.xml','id="ref.eq_thumb"','id="ref.eq_thumb.missing"','Missing control bitmap')
rejected('XML/reference-elements.xml','x="46" y="44"','x="999999" y="44"','Bitmap region outside asset')
rejected('XML/reference-decks.xml','id="nw.cone1"','id="nw.missing"','Empty speaker socket')
rejected('XML/reference-decks.xml','action="sysmenu"','action="missing"','Missing native window menu')
module.validate(stage,regions)
print('reference layout and negative asset/socket acceptance checks PASS')
