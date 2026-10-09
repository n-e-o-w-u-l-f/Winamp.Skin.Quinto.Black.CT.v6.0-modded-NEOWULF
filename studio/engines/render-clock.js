/* 30 Hz paint budget; sequencer/audio scheduling uses its own audio clock. */
class HellfireRenderClock {
  constructor(name, fps = 30) {
    this.name = name; this.targetFps = fps; this.period = 1000 / fps;
    this.next = null; this.samples = []; this.paintTimes = []; this.total = 0;
  }
  due(now) {
    if (document.hidden) { this.next = null; return false; }
    if (this.next === null) this.next = now;
    if (now + .6 < this.next) return false;
    const late = Math.max(0, now - this.next);
    this.next = now + this.period - late % this.period;
    return true;
  }
  record(now, paintMs) {
    this.total++; this.samples.push(now); this.paintTimes.push(paintMs);
    if (this.samples.length > 300) { this.samples.shift(); this.paintTimes.shift(); }
  }
  get stats() {
    const a = this.samples, costs = [...this.paintTimes].sort((x, y) => x - y);
    const span = a.length > 1 ? a[a.length - 1] - a[0] : 0;
    return {renderer:this.name,targetFps:this.targetFps,frames:this.total,
      measuredFps:span ? (a.length - 1) * 1000 / span : 0,
      measuredSpanMs:span,paintP95Ms:costs.length ? costs[Math.floor((costs.length - 1) * .95)] : 0,
      width:document.querySelector('canvas')?.width || 0,height:document.querySelector('canvas')?.height || 0};
  }
}
window.HellfireRenderClock = HellfireRenderClock;
