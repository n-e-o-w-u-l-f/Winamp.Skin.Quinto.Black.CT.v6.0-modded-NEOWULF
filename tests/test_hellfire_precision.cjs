// Source-level acceptance for the high-detail Hellfire deck baseline.
// Native Winamp, audible sound, and browser/native FPS must be tested separately.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const audioSource = read('studio/engines/audio-engine.js');
const uiSource = read('studio/engines/instrument-ui.js');
const first = uiSource.split('\n')[0];
assert.match(first, /^import \{[^}]+\} from '\.\/audio-engine\.js';$/);
const built = audioSource.replace(/^export /gm, '') + '\n' + uiSource.slice(first.length + 1);
assert.equal(read('studio/engines/instrument-app.js'), built, 'Winamp WebView bundle must match maintained modules');
const context = vm.createContext({ console });
vm.runInContext(audioSource.replace(/^export /gm, '') + ';globalThis.api = { newProject, validateProject, AudioGraph, buildSongPlan };', context);
const { newProject, validateProject, AudioGraph, buildSongPlan } = context.api;
const arrangement = newProject('synth');
arrangement.chain = [7, 2];
arrangement.patterns[7] = { ...arrangement.patterns[0], length: 16 };
arrangement.patterns[2] = { ...arrangement.patterns[0], length: 32 };
arrangement.swing = .25;
const sequence = buildSongPlan(arrangement, 2);
assert.equal(sequence.events.length, 96);
assert.equal(sequence.events[0].patternId, 7, 'Song Chain must start at its FIRST entry');
assert.equal(sequence.events[16].patternId, 2);
assert.equal(sequence.events[48].patternId, 7);
assert.equal(sequence.duration, 11.25);
assert.ok(sequence.events[1].time > sequence.events[0].time, 'Swing timestamps must advance');
assert.ok(sequence.events[16].time > sequence.events[15].time, 'Pattern boundaries must not overlap');
arrangement.chain = Array.from({length:256},(_,i)=>i);
for(const id of arrangement.chain)arrangement.patterns[id] = { ...arrangement.patterns[0], length:128 };
assert.throws(()=>buildSongPlan(arrangement,16),/180 seconds/,'Long chains must fail BEFORE offline allocation');
for (const model of ['synth', 'sampler', 'emx']) {
  const project = newProject(model);
  assert.equal(project.parts[0].filterType, 'lowpass');
  assert.equal(project.parts[0].sustain, .55);
  assert.equal(project.parts[0].lfoRate, 2);
  assert.equal(project.parts[0].lfoDepth, 0);
  project.parts[0].filterType = 'bandpass';
  project.parts[0].lfoRate = 7;
  project.parts[0].lfoDepth = .4;
  project.parts[0].sustain = .7;
  const valid = validateProject(project, model);
  assert.equal(valid.parts[0].filterType, 'bandpass');
  assert.equal(valid.parts[0].sustain, .7);
  valid.parts[0].filterType = 'invalid';
  valid.parts[0].lfoDepth = 200;
  valid.parts[0].lfoRate = -10;
  validateProject(valid, model);
  assert.equal(valid.parts[0].filterType, 'lowpass');
  assert.equal(valid.parts[0].lfoDepth, 1);
  assert.equal(valid.parts[0].lfoRate, .1);
  delete valid.parts[0].sustain;
  validateProject(valid, model);
  assert.equal(valid.parts[0].sustain, .55, 'Old saved projects keep valid defaults');
}
const created = [], started = new Map();
const parameter = (initial = 0) => ({
  value: initial, calls: [],
  setValueAtTime(...a) { this.calls.push(['set', ...a]); },
  linearRampToValueAtTime(...a) { this.calls.push(['linear', ...a]); },
  exponentialRampToValueAtTime(...a) { this.calls.push(['exp', ...a]); },
  setTargetAtTime(...a) { this.calls.push(['target', ...a]); },
  cancelScheduledValues(...a) { this.calls.push(['cancel', ...a]); }
});
function node(kind) {
  const n = {
    kind, type: kind, gain: parameter(), frequency: parameter(), Q: parameter(),
    threshold: parameter(), knee: parameter(), ratio: parameter(),
    delayTime: parameter(), pan: parameter(), playbackRate: parameter(),
    connect() { return this; }, disconnect() {},
    start() { const count = started.get(n) || 0; assert.equal(count, 0, kind + ' started twice'); started.set(n, count + 1); },
    stop() {}, getChannelData: () => new Float32Array(16)
  };
  created.push(n);
  return n;
}
const ctx = {
  sampleRate: 48000, currentTime: 0, destination: node('destination'),
  createGain: () => node('gain'), createDynamicsCompressor: () => node('compressor'),
  createAnalyser: () => node('analyser'), createChannelSplitter: () => node('splitter'),
  createDelay: () => node('delay'), createBiquadFilter: () => node('biquad'),
  createWaveShaper: () => node('shaper'), createStereoPanner: () => node('panner'),
  createOscillator: () => node('oscillator'), createBufferSource: () => node('bufferSource'),
  createBuffer: () => node('buffer')
};
const graph = new AudioGraph(ctx);
const part = { ...newProject('synth').parts[0], filterType: 'highpass', lfoRate: 3.5, lfoDepth: .5, sustain: .8 };
graph.trigger(part, { note: 48, velocity: 1, gate: .8, lock: null }, .1, .2, null);
const filters = created.filter(n => n.kind === 'biquad');
assert.equal(filters.length, 1);
assert.equal(filters[0].type, 'highpass');
const oscillators = created.filter(n => n.kind === 'oscillator');
assert.equal(oscillators.length, 2, 'Carrier plus running LFO');
assert.equal(oscillators.filter(n => n.frequency.value === 3.5).length, 1);
for (const oscillator of oscillators) assert.equal(started.get(oscillator), 1);
const envelope = created.filter(n => n.kind === 'gain')
  .flatMap(n => n.gain.calls).find(a => a[0] === 'exp');
assert.ok(envelope && Math.abs(envelope[1] - .2016) < .00001, 'Sustain parameter must change real gain envelope');
const xml = read('skin/hellfire-runtime/XML/neowulf-decks.xml');
for (const id of [4, 5, 8]) {
  const group = xml.match(new RegExp('<Container id="nw\\.deck\\.' + id + '"[^>]+>'));
  assert.ok(group, 'Missing native deck ' + id);
  assert.match(group[0], /default_w="638" default_h="246"/);
  assert.match(xml, new RegExp('<Layout id="normal" w="638" h="246" minimum_w="638" minimum_h="246"[^>]*><Group id="nw\\.deck\\.' + id + '"'));
}
const eq = read('skin/hellfire-runtime/XML/equalizer.xml');
for (const kind of ['layer.bar', 'slider']) {
  const tag = kind === 'slider' ? 'Slider' : 'Layer';
  const max = kind === 'slider' ? 445 : 435;
  const expr = new RegExp('<' + tag + '[^>]*\\bid="eq\\.' + kind.replace('.', '\\.') + '[^"]*"[^>]*>', 'g');
  const members = [...eq.matchAll(expr)];
  assert.equal(members.length, 11);
  for (const match of members) {
    const x = Number(match[0].match(/\bx="(\d+)"/)[1]);
    const w = Number(match[0].match(/\bw="(\d+)"/)[1]);
    assert.ok(x >= 0 && x + w <= max - 8, 'EQ thumb exceeds safe display boundary');
  }
}
const visualHtml = read('studio/engines/visualizer.html');
assert.match(visualHtml, /\.display\{isolation:isolate;contain:paint;overflow:hidden\}/);
assert.match(visualHtml, /id="peakGain"/);
const visualSrc = read('studio/engines/visualizer.js');
const renderClock = read('studio/engines/render-clock.js');
let now = 0, frame;
const control = { value: '1.5', callbacks: {}, addEventListener(name, fn) { this.callbacks[name] = fn; } };
const canvas = { clientWidth: 547, clientHeight: 87, width: 0, height: 0 };
const ctx2 = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) }, {
  get: (target, prop) => prop in target ? target[prop] : (...args) => {
    for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), 'Nonfinite drawing data');
  }
});
canvas.getContext = () => ctx2;
const elements = { visual: canvas, source: { value: 'winamp' }, title: {}, variant: {}, crt: {}, meter: {}, peakGain: control };
const document = { hidden: false, title: '', body: { classList: { add() {}, toggle() {} } }, getElementById: key => elements[key], querySelector: () => canvas };
const page = vm.createContext({ document, location: { search: '?mode=fire' }, URLSearchParams, performance: { now: () => now }, devicePixelRatio: 2, requestAnimationFrame: fn => frame = fn, console });
page.window = page;
vm.runInContext(renderClock, page);
vm.runInContext(visualSrc, page);
assert.equal(page.neowulfVisualizer.peakGain, 1.5);
control.value = '4'; control.callbacks.input();
assert.equal(page.neowulfVisualizer.peakGain, 4);
control.value = '0'; control.callbacks.input();
assert.equal(page.neowulfVisualizer.peakGain, 1);
control.value = '2.5'; control.callbacks.input();
for (let i = 0; i < 120; i++) {
  now += 1000 / 60;
  page.neowulfVisualizer.receive({ playing: true, left: 255, right: 255, spectrum: Array(75).fill(16) });
  frame(now);
}
assert.ok(page.neowulfVisualizer.stats.measuredFps > 29);
console.log(JSON.stringify({
  evidence: 'Node VM / mocked AudioContext / geometry source invariants only; not native Winamp',
  verdict: 'PASS', models: 3, songChainFirstPattern: 7, songChainWavEvents: 96, exportDurationLimited: true, audioFilter: 'highpass', lfoStartedOnce: true,
  sustainAudibleGraphParameter: true, eqTracksContained: 11, equalDisplayDecks: 4,
  paintGain: page.neowulfVisualizer.peakGain,
  simulatedFps: page.neowulfVisualizer.stats.measuredFps
}));
