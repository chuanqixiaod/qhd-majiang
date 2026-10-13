const SUITS = ['w', 'b', 't'];
const SUIT_NAMES = { w: '万', b: '饼', t: '条' };
const FENG_NAMES = ['东', '南', '西', '北'];
const JIAN_NAMES = ['中', '发', '白'];
/* ===== 音效（Web Audio 合成，零外部资源）与中文语音播报 ===== */
let sfxOn=localStorage.getItem('qhd-sfx')!=='0';
let voiceOn=localStorage.getItem('qhd-voice')!=='0';
let sfxVol=parseFloat(localStorage.getItem('qhd-sfx-vol'));if(isNaN(sfxVol))sfxVol=.8;
let voiceRateMul=parseFloat(localStorage.getItem('qhd-voice-rate'));if(isNaN(voiceRateMul))voiceRateMul=1;
const Sound={ctx:null,master:null,
 ensure(){try{if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(AC)this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=sfxVol;this.master.connect(this.ctx.destination)}if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume()}catch(e){}},
 setVolume(v){sfxVol=v;try{if(!this.master)this.ensure();if(this.master)this.master.gain.value=v}catch(e){}},
 tone(freq,dur,type,vol,delay){try{this.ensure();if(!this.ctx)return;const t0=this.ctx.currentTime+(delay||0);const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(freq,t0);g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol||.15,t0+.008);g.gain.exponentialRampToValueAtTime(.001,t0+dur);o.connect(g);g.connect(this.master);o.start(t0);o.stop(t0+dur+.02)}catch(e){}},
 noise(dur,freq,q,vol,delay){try{this.ensure();if(!this.ctx)return;const t0=this.ctx.currentTime+(delay||0);const n=Math.floor(this.ctx.sampleRate*dur);const buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=this.ctx.createBufferSource();s.buffer=buf;const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q||1;const g=this.ctx.createGain();g.gain.value=vol||.2;s.connect(f);f.connect(g);g.connect(this.master);s.start(t0)}catch(e){}},
 clack(){if(!sfxOn)return;const jitter=Math.random()*70;this.noise(.06,2100+jitter,1.2,.16);this.tone(180+Math.random()*50,.08,'triangle',.18);this.noise(.045,2600+jitter,1.4,.08,.018)},
 draw(){if(!sfxOn)return;this.noise(.05,1500,1,.1);this.tone(130+Math.random()*40,.07,'sine',.1)},
 peng(){if(!sfxOn)return;this.clack();setTimeout(()=>this.clack(),90);this.tone(660,.12,'sine',.08,.02);this.tone(990,.16,'sine',.07,.1)},
 gang(){if(!sfxOn)return;this.noise(.09,900,.8,.22);this.tone(90,.22,'triangle',.22);setTimeout(()=>{this.noise(.09,900,.8,.22);this.tone(80,.22,'triangle',.2)},140);this.tone(520,.14,'sine',.07,.05);this.tone(780,.18,'sine',.07,.14)},
 hu(){if(!sfxOn)return;[523,659,784,1047].forEach((f,i)=>this.tone(f,.22,'sine',.12,i*.09));this.tone(1319,.5,'sine',.1,.38)},
 /* 大满贯(总倍率>=12)：上行琶音+高音延展+低锣，区别于普通胡牌 */
 grand(){if(!sfxOn)return;[392,523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.32,'sine',.1,i*.07));this.tone(1568,.8,'sine',.1,.42);this.tone(196,.7,'sine',.09);this.tone(131,.7,'triangle',.15);this.noise(.55,300,.7,.1,.4)},
 liuju(){if(!sfxOn)return;[392,330,262].forEach((f,i)=>this.tone(f,.3,'sine',.11,i*.14))},
 tick(){if(!sfxOn)return;this.tone(880,.05,'square',.04)}};
/* ===== 音色库：自动识别设备已安装的授权中文音色（Edge/Win 多为微软在线自然音，如晓晓/云希；iOS 为婷婷），按优先级成单循环 ===== */
let voiceURI=localStorage.getItem('qhd-voice-uri')||'';
const VOICE_PRESETS=[
 {re:/yunxi|云希/i,short:'希',name:'云希·清亮男声',pitch:.98,rate:1.12},
 {re:/yunyang|云扬/i,short:'扬',name:'云扬·磁性男声',pitch:.9,rate:1.1},
 {re:/yunjian|云健/i,short:'健',name:'云健·浑厚男声',pitch:.92,rate:1.08},
 {re:/yunfeng|云枫/i,short:'峰',name:'云枫男声',pitch:.95,rate:1.1},
 {re:/xiaoxiao|晓晓/i,short:'晓',name:'晓晓·甜美女主播',pitch:1.12,rate:1.08},
 {re:/xiaoyi|晓伊/i,short:'伊',name:'晓伊·温柔女声',pitch:1.06,rate:1.1},
 {re:/xiaomeng|晓梦/i,short:'梦',name:'晓梦·知性女声',pitch:1.04,rate:1.1},
 {re:/xiaoxuan|晓萱/i,short:'萱',name:'晓萱·活泼女声',pitch:1.15,rate:1.12},
 {re:/xiaorui|晓睿/i,short:'睿',name:'晓睿·大方女声',pitch:1.0,rate:1.1},
 {re:/xiaohan|晓涵/i,short:'涵',name:'晓涵女声',pitch:1.05,rate:1.1},
 {re:/xiaoshuang|晓双/i,short:'双',name:'晓双女声',pitch:1.08,rate:1.1},
 {re:/huihui|慧慧/i,short:'慧',name:'慧慧女声',pitch:1.05,rate:1.12},
 {re:/kangkang|康康/i,short:'康',name:'康康男声',pitch:.95,rate:1.1},
 {re:/yaoyao|瑶瑶/i,short:'瑶',name:'瑶瑶女声',pitch:1.1,rate:1.1},
 {re:/tingting|婷婷/i,short:'婷',name:'婷婷女声',pitch:1.08,rate:1.1},
 {re:/meijia|mei-jia|美嘉/i,short:'嘉',name:'美嘉女声（台湾）',pitch:1.05,rate:1.08},
 {re:/sin-?ji|粤语/i,short:'粤',name:'Sinji粤语',pitch:1.0,rate:1.05},
 {re:/zh|cmn|chinese|mandarin|中文|普通话/i,short:'中',name:'系统中文语音',pitch:1.08,rate:1.12}
];
function getZhVoices(){try{if(!window.speechSynthesis)return[];return speechSynthesis.getVoices().filter(v=>/zh|cmn|chinese|mandarin|中文|普通话/i.test(v.lang+'|'+v.name))}catch(e){return[]}}
function presetOfVoice(v){for(let i=0;i<VOICE_PRESETS.length;i++)if(VOICE_PRESETS[i].re.test(v.name+'|'+v.lang))return VOICE_PRESETS[i];return null}
/* 可用音色菜单：已安装音色匹配预设去重，末位始终为系统默认 */
function voiceMenu(){const list=[];const seen={};getZhVoices().forEach(v=>{const p=presetOfVoice(v);if(!p)return;if(seen[p.short]){const ex=list.find(m=>m.short===p.short);if(v.localService&&!ex.local)ex.uri=v.voiceURI;return}seen[p.short]=1;list.push({uri:v.voiceURI,short:p.short,name:p.name,pitch:p.pitch,rate:p.rate,local:!!v.localService})});list.sort((a,b)=>VOICE_PRESETS.findIndex(p=>p.short===a.short)-VOICE_PRESETS.findIndex(p=>p.short===b.short));list.push({uri:'',short:'默',name:'系统默认语音',pitch:1.08,rate:1.12,local:true});if(voiceURI&&!list.some(m=>m.uri===voiceURI))voiceURI='';return list}
let zhVoice=null,zhMeta=null;
function pickZhVoice(){try{if(!window.speechSynthesis)return;const menu=voiceMenu();let m=menu.find(x=>x.uri===voiceURI);if(!m)m=menu[0];zhMeta=m||null;zhVoice=null;if(m&&m.uri){const v=speechSynthesis.getVoices().find(x=>x.voiceURI===m.uri);if(v)zhVoice=v}}catch(e){}}
if(window.speechSynthesis){try{pickZhVoice();speechSynthesis.onvoiceschanged=pickZhVoice}catch(e){}}
/* 报牌口吻：0=普通话 1=本地话（秦皇岛口风；同为TTS，口语用词不同）。
   方言真人录音包接口：把 mp3 放入 audio/dialect/ 并在 DIALECT_FILES 登记文件名，
   playCue 即优先播录音；未登记或加载失败自动回退 TTS。 */
let localTalk=localStorage.getItem('qhd-local-talk')==='1';
const DIALECT_FILES={
 /* peng:'peng.mp3',gang:'gang.mp3',angang:'angang.mp3',bukong:'bukong.mp3',hu:'hu.mp3',liuju:'liuju.mp3' */
};
const cueAudioCache={};
function playCue(cue,text){try{if(localTalk&&DIALECT_FILES[cue]){const f=DIALECT_FILES[cue];if(!cueAudioCache[cue]){const a=new Audio('audio/dialect/'+f);a.preload='none';cueAudioCache[cue]=a}const a=cueAudioCache[cue];a.onerror=function(){speak(text)};a.play().catch(function(){speak(text)});return}}catch(e){}speak(text)}
/* 中文数字口语读法（倍数最大到32；2倍口语说“两倍”） */
function cnNum(n){if(n<=0)return'';if(n<10)return NUMCN[n];if(n===10)return'十';if(n<20)return'十'+NUMCN[n-10];const t=Math.floor(n/10),u=n%10;return NUMCN[t]+'十'+(u?NUMCN[u]:'')}
function sayMul(m){return m===2?'两倍':cnNum(m)+'倍'}
/* 胡牌逐番解说词（普通话/本地话两版）；r={winnerSeat,fenpai:{fans,totalMultiplier}} */
function huSpeakLines(r,local){const s=(typeof SEATS!=='undefined'?SEATS:['北','东','南','西'])[r.winnerSeat];const fs=r.fenpai.fans;const lines=[local?(s+'家，自摸嘞'):(s+'家，自摸')];fs.forEach(f=>{if(f.m>1)lines.push((f.say||f.name)+'，'+sayMul(f.m))});const tot=r.fenpai.totalMultiplier;if(local)lines.push('整了'+sayMul(tot)+'，每家掏'+cnNum(tot)+'分');else lines.push('一共'+sayMul(tot)+'倍');return lines}
/* 顺播：把多句语音排队依次念完（胡牌报番用）；单事件仍用 speak() 打断式 */
let _sqBusy=false,_sqQueue=[];
function makeUtt(text){pickZhVoice();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=Math.min(2,(zhMeta?zhMeta.rate:1.12)*voiceRateMul);u.pitch=zhMeta?zhMeta.pitch:1.08;u.volume=Math.max(0,Math.min(1,sfxVol));if(zhVoice)u.voice=zhVoice;return u}
function speakSeq(texts){if(!voiceOn||!window.speechSynthesis||!texts||!texts.length)return;try{speechSynthesis.cancel();_sqQueue=texts.slice();_sqNext()}catch(e){}}
function _sqNext(){if(!_sqQueue.length){_sqBusy=false;return}const t=_sqQueue.shift();try{const u=makeUtt(t);u.onend=u.onerror=function(){_sqBusy=false;_sqNext()};_sqBusy=true;speechSynthesis.speak(u)}catch(e){_sqBusy=false}}
function cancelSpeech(){try{_sqQueue=[];_sqBusy=false;if(window.speechSynthesis)speechSynthesis.cancel()}catch(e){}}
function speak(text){if(!voiceOn||!window.speechSynthesis||!text)return;try{const u=makeUtt(text);speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
function sayTile(t){if(SUITS.includes(t.suit))return NUMCN[t.value]+SUIT_NAMES[t.suit];if(t.suit==='f')return FENG_NAMES[t.value-1]+'风';return['红中','发财','白板'][t.value-1]||''}
function syncSndBtns(){const a=document.getElementById('btn-sfx'),b=document.getElementById('btn-voice');if(a){a.textContent=sfxOn?'🔊':'🔇';a.classList.toggle('off',!sfxOn)}if(b){b.textContent=voiceOn?'🗣':'🔈';b.classList.toggle('off',!voiceOn)}const c=document.getElementById('btn-voice-pick');if(c){let label='默',title='选择播报音色';try{const menu=voiceMenu();const m=menu.find(x=>x.uri===voiceURI)||menu[0];if(m){label=m.short;title=m.name}}catch(e){}c.textContent=label;c.title=title;c.classList.toggle('off',!voiceOn)}}
function toggleSfx(){sfxOn=!sfxOn;localStorage.setItem('qhd-sfx',sfxOn?'1':'0');syncSndBtns();if(sfxOn){Sound.ensure();Sound.tick()}}
function toggleVoice(){voiceOn=!voiceOn;localStorage.setItem('qhd-voice',voiceOn?'1':'0');syncSndBtns();if(voiceOn)speak('语音播报已开启')}
function cycleVoice(){try{Sound.ensure();const menu=voiceMenu();const i=menu.findIndex(m=>m.uri===voiceURI);const m=menu[(i+1)%menu.length];voiceURI=m.uri;localStorage.setItem('qhd-voice-uri',m.uri);if(!voiceOn){voiceOn=true;localStorage.setItem('qhd-voice','1')}syncSndBtns();speak('已切换，'+m.name)}catch(e){}}
/* 牌局事件声音/语音观察：renderAll 后做状态 diff，主机与远端统一走这里 */
const voiceObs={init:false,discardKey:'',meldSig:[],cursor:-1};
function resetVoiceObs(){voiceObs.init=false;voiceObs.discardKey='';voiceObs.meldSig=[];voiceObs.cursor=-1}
function observeVoice(){if(!game)return;const meldSig=game.players.map(p=>(p.melds||[]).map(m=>m.type+m.tiles.length).join('|'));
 if(!voiceObs.init){voiceObs.init=true;voiceObs.meldSig=meldSig;voiceObs.cursor=game.drawCursor;voiceObs.discardKey=game.lastDiscard?game.lastDiscard.fromSeat+'_'+game.lastDiscard.tile.id:'';return}
 for(let s=0;s<4;s++){if(meldSig[s]!==voiceObs.meldSig[s]){const old=voiceObs.meldSig[s]?voiceObs.meldSig[s].split('|'):[];const now=meldSig[s].split('|');if(now.length>old.length){const ty=now[now.length-1];if(ty.indexOf('pong')===0){Sound.peng();playCue('peng',localTalk?'碰一个':'碰')}else{Sound.gang();playCue('gang',localTalk?(ty.indexOf('darkKong')===0?'暗杠一个':'杠一个'):(ty.indexOf('darkKong')===0?'暗杠':'杠'))}}else{Sound.gang();playCue('bukong',localTalk?'补个杠':'补杠')}}}
 voiceObs.meldSig=meldSig;
 if(game.drawCursor!==voiceObs.cursor){voiceObs.cursor=game.drawCursor;Sound.draw()}
 const dk=game.lastDiscard?game.lastDiscard.fromSeat+'_'+game.lastDiscard.tile.id:'';
 if(dk&&dk!==voiceObs.discardKey){voiceObs.discardKey=dk;Sound.clack();speak(sayTile(game.lastDiscard.tile))}}
function buildFullDeck(){const d=[];let id=0;for(const s of SUITS)for(let v=1;v<=9;v++)for(let k=0;k<4;k++)d.push({id:id++,suit:s,value:v});for(let v=1;v<=4;v++)for(let k=0;k<4;k++)d.push({id:id++,suit:'f',value:v});for(let v=1;v<=3;v++)for(let k=0;k<4;k++)d.push({id:id++,suit:'j',value:v});return d}
function shuffle(d){const a=d.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function tileKey(t){return t.suit+t.value}
function isSameTile(a,b){return a.suit===b.suit&&a.value===b.value}
function nextTile(t){if(SUITS.includes(t.suit))return{suit:t.suit,value:t.value===9?1:t.value+1};if(t.suit==='f')return{suit:'f',value:t.value===4?1:t.value+1};if(t.suit==='j')return{suit:'j',value:t.value===3?1:t.value+1};throw new Error('未知牌型 '+t.suit)}
function findTile(deck,suit,value){return deck.find(t=>t.suit===suit&&t.value===value)}
function countTiles(ts){const m=new Map();for(const t of ts){const k=tileKey(t);m.set(k,(m.get(k)||0)+1)}return m}
function sortHand(h){const o={w:0,b:1,t:2,f:3,j:4};return h.slice().sort((a,b)=>{if(o[a.suit]!==o[b.suit])return o[a.suit]-o[b.suit];return a.value-b.value})}
function checkHu(hand,melds,wanTile){const q=checkQiDui(hand,wanTile);if(q)return{type:'qidui',details:q};const n=checkNormalHu(hand,melds,wanTile);if(n)return{type:'normal',details:n};return null}
function checkQiDui(hand,wanTile){const cnt=countTiles(hand);const wKey=wanTile?tileKey(wanTile):null;let wCnt=wKey?(cnt.get(wKey)||0):0;let npc=0,nsc=0;for(const[k,c]of cnt){if(k===wKey)continue;npc+=Math.floor(c/2);nsc+=c%2}if(wCnt<nsc)return null;const rw=wCnt-nsc;if(rw%2!==0)return null;const tp=npc+nsc+rw/2;if(tp!==7)return null;let rf=0;for(const[k,c]of cnt){if(k===wKey)continue;if(c>=4)rf++}const lv=rf>=3?3:rf>=2?2:rf>=1?1:0;const mp=[4,8,16,32][lv];return{level:lv,realFours:rf,multiplier:mp}}
function checkNormalHu(hand,melds,wanTile){const wKey=wanTile?tileKey(wanTile):null;const rc=countTiles(hand);let wCnt=wKey?(rc.get(wKey)||0):0;const cm=new Map();for(const[k,c]of rc){if(k!==wKey)cm.set(k,c)}const nk=[...cm.keys()];for(const key of nk){const cnt=cm.get(key);if(cnt>=2){cm.set(key,cnt-2);const ok=canFormAllSets(cm,wCnt);cm.set(key,cnt);if(ok)return{jiang:key}}}if(wCnt>=1){for(const key of nk){const cnt=cm.get(key);if(cnt>=1){cm.set(key,cnt-1);const ok=canFormAllSets(cm,wCnt-1);cm.set(key,cnt);if(ok)return{jiang:key+'+wan'}}}}if(wCnt>=2){if(canFormAllSets(cm,wCnt-2))return{jiang:'wan'}}return null}
function checkPengPengHu(hand,melds,wanTile){
 /* 严格碰碰胡：副露全为刻/杠，手牌只能分解为剩余刻子(混儿可顶)+一对将，不允许顺子 */
 if(!melds.every(m=>m.type==='pong'||m.type==='kong'||m.type==='buKong'||m.type==='darkKong'))return false;
 const groupsLeft=4-melds.length;
 if(groupsLeft<0)return false;
 const wKey=wanTile?tileKey(wanTile):null;
 const cnt=countTiles(hand);
 let wL=wKey?(cnt.get(wKey)||0):0;
 const real=new Map();
 for(const[k,c]of cnt){if(k!==wKey)real.set(k,c)}
 const groupsOK=(map,wild)=>{
   let need=0,realTiles=0;
   for(const[k,c]of map){if(c>0){realTiles+=c;const r=c%3;if(r===1)need+=2;else if(r===2)need+=1}}
   if(wild<need)return false;
   const left=wild-need;
   return left%3===0 && (realTiles+wild)===groupsLeft*3;
 };
 /* 将为两张混儿 */
 if(wL>=2&&groupsOK(real,wL-2))return true;
 for(const k of real.keys()){
   const c=real.get(k);
   if(c>=2){real.set(k,c-2);if(groupsOK(real,wL)){real.set(k,c);return true}real.set(k,c)}
   if(c>=1&&wL>=1){real.set(k,c-1);if(groupsOK(real,wL-1)){real.set(k,c);return true}real.set(k,c)}
 }
 return false;
}
function canFormAllSets(cm,wL){let fk=null;for(const[k,c]of cm){if(c>0){fk=k;break}}if(!fk)return wL%3===0;const cnt=cm.get(fk);const suit=fk[0];const val=parseInt(fk.slice(1),10);if(cnt>=3){cm.set(fk,cnt-3);if(canFormAllSets(cm,wL)){cm.set(fk,cnt);return true}cm.set(fk,cnt)}if(cnt>=2&&wL>=1){cm.set(fk,cnt-2);if(canFormAllSets(cm,wL-1)){cm.set(fk,cnt);return true}cm.set(fk,cnt)}if(cnt>=1&&wL>=2){cm.set(fk,cnt-1);if(canFormAllSets(cm,wL-2)){cm.set(fk,cnt);return true}cm.set(fk,cnt)}/* 中发白(j1中/j2發/j3白)可成顺子：仅 中-發-白 一副 */
if(['w','b','t','j'].includes(suit)&&val<=(suit==='j'?1:7)){const k2=suit+(val+1),k3=suit+(val+2);const c2=cm.get(k2)||0,c3=cm.get(k3)||0;for(let m=0;m<4;m++){const wn=(m&1?1:0)+(m&2?1:0);if(wn>wL)continue;const nrK2=(m&1)?0:1,nrK3=(m&2)?0:1;if(c2<nrK2||c3<nrK3)continue;cm.set(fk,cnt-1);if(!(m&1))cm.set(k2,c2-1);if(!(m&2))cm.set(k3,c3-1);if(canFormAllSets(cm,wL-wn)){cm.set(fk,cnt);cm.set(k2,c2);cm.set(k3,c3);return true}cm.set(fk,cnt);cm.set(k2,c2);cm.set(k3,c3)}}return false}
/* 番型倍率配置（调整规则只改本表） */
const FAN_CONFIG={
 pinghu:{name:'平胡',m:1},
 tianhu:{name:'天胡',m:10},dihu:{name:'地胡',m:10},
 qiduiNames:['七对','豪华七对','双豪华七对','三豪华七对'],
 pengpeng:{name:'碰碰胡',m:3},dadiaoche:{name:'大吊车',m:4},
 gangshanghua:{name:'杠上花',say:'杠上开花',m:2},haidilaoyue:{name:'海底捞月',m:2},
 menqing:{name:'门清',m:2},suhu:{name:'素胡',m:2},
 hundiao:{name:'混吊',say:'混儿吊',m:2},hundiaohun:{name:'混钓混',say:'混钓混',m:4}
};
function calcFenpai(huResult,hand,melds,wanTile,opts={}){const fans=[];let total=1;const add=k=>{const f=FAN_CONFIG[k];fans.push({name:f.name,say:f.say||f.name,m:f.m});total*=f.m};add('pinghu');if(opts.isTian){add('tianhu')}else if(opts.isDi){add('dihu')}if(huResult.type==='qidui'){const m=huResult.details.multiplier;const qn=FAN_CONFIG.qiduiNames[huResult.details.level]||FAN_CONFIG.qiduiNames[0];fans.push({name:qn,say:qn,m});total*=m}if(opts.isPengPeng)add('pengpeng');if(opts.isDaDiaoChe)add('dadiaoche');if(opts.isGangShangHua)add('gangshanghua');if(opts.isHaiDiLaoYue)add('haidilaoyue');const om=melds.some(x=>x.type==='pong'||x.type==='kong'||x.type==='buKong');if(!om&&!opts.isTian&&!opts.isDi)add('menqing');if(wanTile){const wk=tileKey(wanTile);if(!hand.some(t=>tileKey(t)===wk))add('suhu')}else{add('suhu')}if(opts.isHunDiaoHun){add('hundiaohun')}else if(opts.isHunDiao){add('hundiao')}return{fans,totalMultiplier:total,desc:fans.map(f=>f.name).join(' × ')}}
function liuJuDun(g){const t={0:13,1:7,2:8,3:13};return g>=4?0:(t[g]!=null?t[g]:13)}
function findDarkGangFeng(hand){const cnt=countTiles(hand);const r=[];for(const[k,c]of cnt)if(c===4&&k[0]==='f')r.push(k);return r}
function canPongOrKong(tile,wanTile){if(!wanTile)return true;return!isSameTile(tile,wanTile)}
