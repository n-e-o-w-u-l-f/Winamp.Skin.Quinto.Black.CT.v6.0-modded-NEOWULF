// Winamp WebView loads a classic script; generate it from the maintained modules.
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'../engines');
const audio=fs.readFileSync(path.join(root,'audio-engine.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'instrument-ui.js'),'utf8');
const first=ui.split('\n')[0];
assert(/^import \{[^}]+\} from '\.\/audio-engine\.js';$/.test(first),'Unexpected module import');
const result=audio.replace(/^export /gm,'')+'\n'+ui.slice(first.length+1);
assert(!/^import |^export /m.test(result),'Unbundled module syntax');
const target=path.join(root,'instrument-app.js');
if(process.argv.includes('--check')){
 assert.equal(fs.readFileSync(target,'utf8'),result,'Winamp instrument bundle is stale');
}else fs.writeFileSync(target,result);
console.log('Winamp instrument bundle '+(process.argv.includes('--check')?'matches source':'built'));
