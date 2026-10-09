#!/usr/bin/env python3
"""Build the canonical design as independent live Winamp Modern components.

The user PNG is immutable. Winamp bitmap regions provide the separate assets;
no frame is tiled or recreated from a generic procedural substitute.
"""
from pathlib import Path
import argparse, hashlib, json, re, shutil, subprocess, zipfile
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE_HASH = 'd926537bd21978d498d9781b15e733bab21ab28da0bf696e1307132d2e6066d1'
CHASSIS = {'main':'main-chassis-v1.png','equalizer':'equalizer-chassis-v1.png','scope':'scope-chassis-v1.png','instrument':'instrument-chassis-v1.png','tower_left':'tower-chassis-v1.png','tower_right':'tower-chassis-v1.png','rear_left':'bookshelf-chassis-v1.png','rear_right':'bookshelf-chassis-v1.png','center':'center-chassis-v1.png','sub':'sub-chassis-v1.png'}

def text(x, y, w, h, value, **attrs):
    fields={'x':x,'y':y,'w':w,'h':h,'text':value,'font':'Arial','fontsize':10,'color':'#dedede',**attrs}
    return '<Text '+' '.join(f'{k}="{v}"' for k,v in fields.items())+'/>'

def layer(image, x, y, w, h, **attrs):
    fields={'image':image,'x':x,'y':y,'w':w,'h':h,**attrs}
    return '<Layer '+' '.join(f'{k}="{v}"' for k,v in fields.items())+'/>'

def black(x,y,w,h): return layer('ref.black',x,y,w,h,ghost=1)

def deck(key, name, inner, regions, ident=None, guid=None, pos=(0,0), visible=0, script=True, speaker_channel=None):
    ident=ident or 'ref.'+key; x,y,w,h=regions[key]
    component=f' component="guid:{{{guid}}}" dynamic="1"' if guid else ''
    base='ref.main.off' if key=='main' else 'ref.'+key
    if key=='tv':
        content=black(0,0,w,h)+layer('ref.tv.top',0,0,w,42,move=1)+layer('ref.tv.bottom',0,h-21,w,21,move=1)+layer('ref.tv.left',0,42,28,h-63,move=1)+layer('ref.tv.right',w-28,42,28,h-63,move=1)+inner
    else: content=layer(base,0,0,w,h,move=1)+inner
    # A small native close hit target sits on the existing corner screw.
    closeid='ref.appclose' if ident=='main' else ('nw.close' if speaker_channel is not None else 'ref.close')
    closeaction=' action="close"' if ident=='main' else ''
    content+=f'<Button id="{closeid}" x="{w-27}" y="9" w="16" h="16" image="ref.transparent"{closeaction} tooltip="Fenster schließen"/>'
    if speaker_channel is not None: content+='<script file="SCRIPTS/neowulf-speaker.maki" param="'+str(speaker_channel)+'"/>'
    elif script: content+='<script file="SCRIPTS/neowulf-reference.maki" param="'+('1' if ident=='main' else '0')+'"/>'
    return f'<groupdef id="{ident}.group">{content}</groupdef>\n<Container id="{ident}" name="{name}"{component} default_x="{pos[0]}" default_y="{pos[1]}" default_w="{w}" default_h="{h}" default_visible="{visible}" droptarget="pldr"><Layout id="normal" w="{w}" h="{h}" alphabackground="ref.{key}"><Group id="{ident}.group" fitparent="1"/></Layout></Container>\n'

def vis(x,y,w,h,channel=3,mode=2,flip=0):
    # Legacy Winamp Vis provides combined/mono data. Its XML cannot select
    # independent PCM channels; true stereo belongs to the DSP/WebView path.
    colors=' '.join(f'colorband{i}="{col}"' for i,col in enumerate(['#fff299','#ffe951','#ffc329','#ff8d13','#ff6110','#f2390b','#cf2008','#ac1006','#890905','#650405','#490303','#390203','#2e0102','#240101','#1b0000','#140000'],1))
    return f'<Vis x="{x}" y="{y}" w="{w}" h="{h}" mode="{mode}" fps="30" oscstyle="lines" fliph="{flip}" colorosc1="#ffeb92" colorosc2="#ff991b" colorosc3="#ff390e" colorosc4="#b00c04" colorosc5="#470200" {colors} ghost="1"/>'

def meter(x,y,w,h):
    result=black(x,y,w,h)
    for channel,row in [('l',0),('r',1)]:
        for i in range(48):result+=layer('ref.led.'+str(i),x+i*w/48,y+row*h/2,w/48*.72,h*.32,id='ref.led.'+channel+'.'+str(i),ghost=1)
    return result

def make_skin(base, output, compiler):
    if hashlib.sha256(base.read_bytes()).hexdigest()!=BASE_HASH: raise ValueError('Quinto archive pin changed')
    manifest=json.loads((ROOT/'design/reference-regions.json').read_text()); regions=manifest['regions']
    assets=json.loads((ROOT/'design/assets/manifest.json').read_text())
    regions['sub']=[0,0,240,240]
    for key,name in CHASSIS.items():
        box=assets[name]['bitmap_box'];width=regions[key][2]
        regions[key]=[0,0,width,round(box[3]*width/box[2])]
    regions['tv']=[0,0,615,390]
    reference=ROOT/'design/approved-reference.png'
    if hashlib.sha256(reference.read_bytes()).hexdigest()!=manifest['sha256']: raise ValueError('Canonical design changed')
    stage=output/'skin'
    if stage.exists():shutil.rmtree(stage)
    stage.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(base) as z:
        if z.testzip(): raise ValueError('Archive CRC failure')
        for name in z.namelist():
            target=(stage/name.replace('\\','/')).resolve()
            if not target.is_relative_to(stage.resolve()):raise ValueError('Unsafe archive member')
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(name))
    (stage/'PNG/NEOWULF').mkdir(exist_ok=True)
    shutil.copyfile(reference,stage/'PNG/NEOWULF/approved-reference.png')
    for name,info in assets.items():
        source=ROOT/'design/assets'/name
        if hashlib.sha256(source.read_bytes()).hexdigest()!=info['sha256']:raise ValueError('Asset pin changed: '+name)
        shutil.copyfile(source,stage/'PNG/NEOWULF'/name)
    # New, source-defined UI primitives. The reference image is not edited.
    Image.new('RGBA',(1,1),(0,0,0,255)).save(stage/'PNG/NEOWULF/black.png')
    Image.new('RGBA',(1,1),(0,0,0,0)).save(stage/'PNG/NEOWULF/transparent.png')
    Image.new('RGBA',(1,1),(255,29,4,255)).save(stage/'PNG/NEOWULF/red.png')
    ramp=Image.new('RGBA',(48,1))
    for i in range(48):
        t=i/47;ramp.putpixel((i,0),(round(255-125*t),round(235*(1-t)**2),round(57*(1-t)),255))
    ramp.save(stage/'PNG/NEOWULF/meter-ramp.png')
    needle=Image.new('RGBA',(180,180),(0,0,0,0));nd=ImageDraw.Draw(needle)
    nd.line((90,90,32,59),fill=(255,32,10,255),width=2);nd.ellipse((86,86,94,94),fill=(210,40,20,255));needle.save(stage/'PNG/NEOWULF/needle.png')
    elements=['<elements>']
    for key,(x,y,w,h) in regions.items():
        file='approved-reference.png'
        if key in CHASSIS or key=='tv':
            file=CHASSIS.get(key,'scope-chassis-v1.png');x,y,w,h=assets[file]['bitmap_box']
        elements.append(f'<bitmap id="ref.{key}" file="PNG/NEOWULF/{file}" x="{x}" y="{y}" w="{w}" h="{h}"/>')
    for key in ['black','transparent','red','needle']:elements.append(f'<bitmap id="ref.{key}" file="PNG/NEOWULF/{key}.png"/>')
    for i in range(48):elements.append(f'<bitmap id="ref.led.{i}" file="PNG/NEOWULF/meter-ramp.png" x="{i}" y="0" w="1" h="1"/>')
    off=assets['main-chassis-off-v1.png'];bx,by,bw,bh=assets['main-chassis-v1.png']['bitmap_box']
    on_size=assets['main-chassis-v1.png']['size'];off_size=off['size']
    if abs((off_size[0]/off_size[1])/(on_size[0]/on_size[1])-1)>.02:raise ValueError('Power-state chassis aspect differs')
    bx=round(bx*off_size[0]/on_size[0]);by=round(by*off_size[1]/on_size[1]);bw=round(bw*off_size[0]/on_size[0]);bh=round(bh*off_size[1]/on_size[1])
    elements.append(f'<bitmap id="ref.main.off" file="PNG/NEOWULF/main-chassis-off-v1.png" x="{bx}" y="{by}" w="{bw}" h="{bh}"/>')
    elements.append('<bitmap id="ref.knob.face" file="PNG/NEOWULF/knob-face-v1.png"/>')
    cx,cy,cw,ch=assets['woofer-cone-v1.png']['bitmap_box']
    elements.append(f'<bitmap id="ref.woofer" file="PNG/NEOWULF/woofer-cone-v1.png" x="{cx}" y="{cy}" w="{cw}" h="{ch}"/>')
    # Four actual metal edge regions preserve the corners and header when the
    # larger TV display is resized; the full chassis is never stretched/tiled.
    for key,box in {'top':(35,90,2105,144),'bottom':(35,537,2105,72),'left':(35,234,96,303),'right':(2044,234,96,303)}.items():
        xx,yy,ww,hh=box;elements.append(f'<bitmap id="ref.tv.{key}" file="PNG/NEOWULF/scope-chassis-v1.png" x="{xx}" y="{yy}" w="{ww}" h="{hh}"/>')
    elements.append('<bitmap id="ref.vinyl" file="PNG/NEOWULF/vinyl-texture-flat-v1.png"/>')
    elements.append('<bitmap id="ref.arm" file="PNG/NEOWULF/tonearm-v1.png" x="0" y="0" w="1840" h="768"/>')
    from apply_neowulf_v6_reference_design import fixed_reflection
    fixed_reflection(size=1024).save(stage/'PNG/NEOWULF/reflection.png')
    elements.append('<bitmap id="ref.reflection" file="PNG/NEOWULF/reflection.png"/>')

    # Native slider tracks cover the frozen slider state in the reference.
    elements.append('<bitmap id="ref.track" file="$gradient" gradient_x1="0" gradient_y1="0" gradient_x2="0" gradient_y2="1" points="0.0=255,12,0,255;0.6=255,115,0,255;1.0=255,238,46,255" w="3" h="116"/>')
    elements.append('</elements>');(stage/'XML/reference-elements.xml').write_text('\n'.join(elements),encoding='utf-8')
    main=layer('ref.main',0,0,836,regions['main'][3],id='ref.chassis.on',ghost=1)+black(324,240,360,61)
    main+=text(324,244,330,17,'',display='SONGNAME',fontsize=13,color='#ff2415')
    main+=text(555,249,97,12,'',display='SONGINFO',fontsize=8,color='#ff2415')
    main+=text(581,278,72,25,'',display='TIME',fontsize=23,color='#ff2415')+vis(329,281,248,20,3,1)
    for key,action in [('prev','prev'),('play','play'),('pause','pause'),('stop','stop'),('next','next')]:
        index=['prev','play','pause','stop','next'].index(key)
        main+=f'<Button x="{44+index*55}" y="243" w="53" h="52" image="ref.transparent" action="{action}" tooltip="{action}"/>'
    main+=layer('ref.knob.face',735,241,58,58,id='ref.volume',tooltip='Lautstärke · ziehen oder Mausrad')
    main+=layer('ref.red',742,236,3,7,id='ref.pulse',ghost=1)
    main+=layer('ref.vinyl',140,25,510,140,id='ref.vinyl',ghost=1)
    main+=layer('ref.reflection',140,25,510,140,ghost=1)
    main+=layer('ref.arm',435,-8,289,170,id='ref.arm',ghost=1)
    # Original Quinto uses this native action for Winamp's main/window menu.
    # Keep every named deck reachable after its own close control hides it.
    main+='<Button id="ref.windows" x="9" y="9" w="25" h="25" image="ref.transparent" action="sysmenu" tooltip="Winamp-Menü · Fenster und Einstellungen"/>'
    xml=deck('main','NEOWULF · Main Player',main,regions,ident='main',pos=(20,20),visible=1)
    eq=''
    for i,xx in enumerate([122,161,200,239,278,317,356,395,434,473]):
        eq+=black(xx-8,53,16,119)+layer('ref.track',xx-1,55,3,115,ghost=1)
        eq+=f'<Slider x="{xx-11}" y="50" w="23" h="125" action="eq_band" param="{i+1}" thumb="ref.eq_thumb" orientation="vertical" tooltip="EQ Band {i+1}"/>'
    eq+='<ToggleButton x="49" y="60" w="20" h="20" image="ref.red_led" action="eq_toggle" tooltip="Equalizer ein/aus"/>'
    eq+='<Button id="ref.reset" x="47" y="147" w="24" h="23" image="ref.transparent" tooltip="Equalizer zurücksetzen"/>'
    xml+=deck('equalizer','NEOWULF · Hellfire Equalizer',eq,regions,ident='equalizer',pos=(856,70),visible=1)
    # Distinct real Winamp waveform/spectrum decks, independently movable.
    scope=black(29,43,551,88)+vis(31,44,547,85)
    xml+=deck('scope','NEOWULF · Oszilloskop',scope,regions,ident='ref.oscilloscope',pos=(30,390),visible=1)
    for n in [1,2,3]:
        inner=black(209,49,147,73)
        if n==1:inner+=vis(211,51,143,69)
        elif n==2:inner+=vis(211,51,143,32)+meter(211,88,143,30)
        else:inner+=vis(211,51,143,69,3,1)
        inner+=text(390,12,177,17,'OSCILLATOR '+str(n),fontsize=10)
        xml+=deck('oscillator','NEOWULF · Oscillator '+str(n),inner,regions,ident='ref.oscillator.'+str(n),pos=(210,550),visible=int(n==1))
    # Digital stereo displays cover every frozen pictured meter.
    inner=meter(75,43,407,57)
    xml+=deck('digital','NEOWULF · Digital VU L/R',inner,regions,ident='ref.digital',pos=(860,270),visible=1)
    inner=meter(36,44,381,69)
    xml+=deck('horizontal','NEOWULF · VU Horizontal',inner,regions,ident='ref.horizontal',pos=(1140,400),visible=1)
    # Dedicated analogue needle faces retain the reference chassis. Face data
    # is drawn explicitly, rather than animating a photographed fixed needle.
    inner=black(45,36,356,74)
    for x,channel in [(48,'left'),(230,'right')]:
        for i,label in enumerate(['-20','-10','-7','-5','-3','-1','0','+1','+3']):inner+=text(x+i*17,41-abs(i-4)*-1,22,10,label,fontsize=8,color='#ffa019' if i<7 else '#ff3515')
        inner+=text(x+60,70,55,20,'VU',fontsize=16,color='#ffb526')
        inner+=layer('ref.needle',x-15,6,180,180,id='ref.needle.'+channel,ghost=1)
    xml+=deck('analog','NEOWULF · Analog VU L/R',inner,regions,ident='ref.analog',pos=(663,400),visible=1)
    # WebView2 components are clipped to the body of the supplied chassis.
    for i,(name,key,geometry) in enumerate([
        ('Electribe 2 Synth','instrument',(15,35,635,198)),('Electribe 2 Sampler','instrument',(15,35,635,198)),('EMX-1','instrument',(15,35,635,198)),
        ('Oszillator Studio','scope',(29,42,551,87)),('Fire VU Stereo','digital',(72,42,412,63)),('VU Horizontal Studio','horizontal',(36,43,382,70)),('VU Vertikal','vertical',(39,56,142,251)),('Hellfire Virtualizer','scope',(29,42,551,87))],1):
        guid=f'4E454F{i:02X}-574C-4600-8001-00010000000{i}';x,y,w,h=geometry
        inner=black(x,y,w,h)+f'<Component x="{x}" y="{y}" w="{w}" h="{h}" param="guid:{{{guid}}}"/>'
        xml+=deck(key,'NEOWULF · '+name,inner,regions,ident='nw.deck.'+str(i),guid=guid,pos=(800,550),visible=int(i in [1,7]))
    # Real Winamp visualisation component in an independently dockable TV.
    # A native audio-driven spectrum is visible when no AVS component exists.
    tv=black(29,42,557,327)+vis(29,42,557,327,3,1)
    tv+='<Component x="29" y="42" w="557" h="327" param="guid:{0000000a-000c-0010-ff7b-01014263450c}"/>'
    for x,caption,action in [(32,'PREV','VIS_Prev'),(98,'NEXT','VIS_Next'),(164,'OPTIONS','VIS_CFG'),(476,'FULLSCREEN','VIS_FS')]:
        tv+=text(x,372,100,12,caption,fontsize=8,color='#ff5733')+f'<Button x="{x}" y="370" w="100" h="17" image="ref.transparent" action="{action}" tooltip="{caption}"/>'
    xml+=deck('tv','NEOWULF · Hellfire TV',tv,regions,ident='AVS',guid='0000000a-000c-0010-ff7b-01014263450c',pos=(30,550))
    # The separate cone images move; fixed bezels and cabinet reflections do
    # not. Reuse the source-pinned native speaker runtime already recovered.
    sockets={'tower_left':[(54,99,91),(54,227,91)],'tower_right':[(53,98,90),(53,224,90)],'rear_left':[(45,91,90)],'rear_right':[(46,92,91)],'center':[(59,20,80),(298,20,80)],'sub':[(56,56,128)]}
    for key,name,pos in [('tower_left','Front Links',(20,550)),('tower_right','Front Rechts',(1460,550)),('rear_left','Rear Links',(345,800)),('rear_right','Rear Rechts',(1145,800)),('center','Center',(625,800)),('sub','Subwoofer',(920,800))]:
        inner=''.join(layer('ref.woofer',xx,yy,size,size,id='nw.cone'+str(i),ghost=1) for i,(xx,yy,size) in enumerate(sockets[key],1))
        channel=1 if key.endswith('right') else 0 if key.endswith('left') else 2
        xml+=deck(key,'NEOWULF · Teufel '+name,inner,regions,ident='ref.speaker.'+key,pos=pos,visible=1,speaker_channel=channel)
    (stage/'XML/reference-decks.xml').write_text(xml,encoding='utf-8')
    # Retain the Quinto media library/playlist/video components and author data.
    includes=['accelerators','elements','gammaset','standard-objects','reference-elements','reference-decks','tooltip','media-library','playlist-editor','video','about']
    root='<?xml version="1.0" encoding="UTF-8"?><WinampAbstractionLayer version="1.36"><skininfo><author>PeterK. / NEOWULF</author><name>NEOWULF Hellfire · Reference</name><version>6.0 Reference R2</version><comment>Original Quinto CT 5.1 by PeterK.; canonical Hellfire design, separate live assets.</comment></skininfo>'+''.join(f'<include file="XML/{f}.xml"/>' for f in includes)+'</WinampAbstractionLayer>'
    (stage/'skin.xml').write_text(root,encoding='utf-8')
    scripts=output/'maki';scripts.mkdir(exist_ok=True)
    source=ROOT/'skin/SCRIPTS/neowulf-reference.m';shutil.copyfile(source,scripts/source.name)
    binary=ROOT/'skin/SCRIPTS/neowulf-reference.maki'
    if compiler:
        subprocess.run([str(compiler.resolve()),str((scripts/source.name).resolve())],cwd=compiler.parent,check=True)
        made=scripts/'neowulf-reference.maki'
        if not made.exists():raise ValueError('Compiler did not create output')
        shutil.copyfile(made,binary)
    if not binary.exists():raise ValueError('Compile neowulf-reference.m before packaging')
    shutil.copyfile(binary,stage/'SCRIPTS/neowulf-reference.maki')
    shutil.copyfile(ROOT/'skin/hellfire-runtime/SCRIPTS/neowulf-speaker.maki',stage/'SCRIPTS/neowulf-speaker.maki')
    validate(stage,regions)
    wal=output/'NEOWULF-Hellfire-Reference.wal'
    with zipfile.ZipFile(wal,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in sorted(stage.rglob('*')):
            if p.is_file():
                info=zipfile.ZipInfo(p.relative_to(stage).as_posix(),(2026,10,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
    print(json.dumps({'wal':str(wal),'sha256':hashlib.sha256(wal.read_bytes()).hexdigest(),'design_sha256':manifest['sha256'],'source_base_sha256':BASE_HASH,'native_containers':xml.count('<Container '),'runtime_verified':False}))

def validate(stage,regions):
    for filename in ['skin.xml','XML/reference-elements.xml','XML/reference-decks.xml']:
        raw=(stage/filename).read_text(); ET.fromstring(raw if filename=='skin.xml' else '<root>'+raw+'</root>')
    text=(stage/'XML/reference-decks.xml').read_text()
    if 'tile="1"' in text:raise ValueError('Reference deck chassis must never be tiled')
    if 'nodock="1"' in text:raise ValueError('Deck docking disabled')
    for key,(x,y,w,h) in regions.items():
        if min(x,y)<0 or x+w>1672 or y+h>941:raise ValueError('Region outside reference: '+key)
    scripts=re.findall(r'<script file="([^"]+)"',text)
    if any(not(stage/name).is_file() for name in scripts):raise ValueError('Missing compiled runtime script')
    if any(not(stage/name).read_bytes().startswith(b'FG') for name in scripts):raise ValueError('Invalid compiled MAKI signature')
    elements=ET.fromstring('<root>'+(stage/'XML/reference-elements.xml').read_text()+'</root>')
    bitmaps={}
    for bitmap in elements.iter('bitmap'):
        ident=bitmap.attrib['id']
        if ident in bitmaps:raise ValueError('Duplicate bitmap id: '+ident)
        bitmaps[ident]=bitmap
        filename=bitmap.attrib.get('file','')
        if filename.startswith('$'):continue
        asset=stage/filename
        if not asset.is_file():raise ValueError('Missing bitmap: '+filename)
        with Image.open(asset) as image:
            x=float(bitmap.attrib.get('x',0));y=float(bitmap.attrib.get('y',0))
            w=float(bitmap.attrib.get('w',image.width));h=float(bitmap.attrib.get('h',image.height))
            if min(x,y)<0 or min(w,h)<=0 or x+w>image.width or y+h>image.height:raise ValueError('Bitmap region outside asset: '+ident)
    decks=ET.fromstring('<root>'+text+'</root>')
    containers={c.attrib['id']:c for c in decks.iter('Container')}
    if len(containers)!=len(list(decks.iter('Container'))):raise ValueError('Duplicate container id')
    required={'main','equalizer','AVS','ref.analog','ref.digital','ref.horizontal','ref.oscilloscope'}|{'ref.oscillator.'+str(i) for i in range(1,4)}|{'nw.deck.'+str(i) for i in range(1,9)}|{'ref.speaker.'+key for key in ['tower_left','tower_right','rear_left','rear_right','center','sub']}
    if set(containers)!=required:raise ValueError('Missing/unexpected deck: '+str(set(containers)^required))
    groups={g.attrib['id']:g for g in decks.iter('groupdef')}
    for ident,container in containers.items():
        layout=container.find('Layout');group=groups[layout.find('Group').attrib['id']]
        ids=[n.attrib['id'] for n in group if 'id' in n.attrib]
        if len(ids)!=len(set(ids)):raise ValueError('Duplicate control id in '+ident)
        if not any(n.attrib.get('move')=='1' for n in group):raise ValueError('No independent drag surface: '+ident)
        for node in list(group)+[layout]:
            for field in ['image','hoverImage','downImage','activeImage','thumb','hoverThumb','downThumb','alphabackground']:
                image=node.attrib.get(field,'')
                if image and image not in bitmaps:raise ValueError('Missing control bitmap '+image)
        if ident.startswith('ref.speaker.'):
            cones=[n for n in group if n.attrib.get('id','').startswith('nw.cone')]
            if not cones:raise ValueError('Empty speaker socket: '+ident)
            for cone in cones:
                x,y,w,h=(float(cone.attrib[k]) for k in ['x','y','w','h'])
                if min(x,y)<0 or x+w>float(layout.attrib['w']) or y+h>float(layout.attrib['h']):raise ValueError('Speaker cone outside cabinet: '+ident)
    root=ET.parse(stage/'skin.xml').getroot()
    for include in root.iter('include'):
        if not(stage/include.attrib['file']).is_file():raise ValueError('Missing skin include')
    volume=groups['main.group'].find("Layer[@id='ref.volume']")
    if volume is None or volume.attrib.get('ghost')=='1':raise ValueError('Volume must be interactive')
    if groups['main.group'].find("Button[@action='sysmenu']") is None:raise ValueError('Missing native window menu')
    if any(c.attrib.get('nomenu')=='1' for c in containers.values()):raise ValueError('Reference deck hidden from window menu')
    bands=groups['equalizer.group'].findall("Slider[@action='eq_band']")
    if len(bands)!=10 or {b.attrib['param'] for b in bands}!={str(i) for i in range(1,11)}:raise ValueError('Invalid native equalizer band mapping')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base',type=Path,required=True);p.add_argument('--output',type=Path,default=ROOT/'build/reference');p.add_argument('--compiler',type=Path);args=p.parse_args();make_skin(args.base,args.output,args.compiler)
if __name__=='__main__':main()
