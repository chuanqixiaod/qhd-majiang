let game=null,net=null,mode='single',mySeat=0,selIdx=-1,curCode=null;
let hostPeers=[],pending=null,promptSeq=1,onlineStarting=false,gameStarted=false,remotePrompt=null,shownResultId=null;
let animDiscardKey='',animMeldSig={},turnEndAt=0,turnMax=30000;
let wanArmIdx=-1,wanArmTimer=null;
/* 起手风牌暗杠：本人可选手动决定（键为风牌key数组），他人/AI保持自动 */
let startGangKeys=null;
/* 混儿指示牌翻牌揭晓：每局按 wanKey 只播一次 */
let wanRevealKey=null;
/* 胡牌全屏报番演出定时器（点击可跳过） */
let huFxTimers=[];
/* 联机快捷语 */
const QUICK_MSGS=['整把大的！','稳住，咱能胡','哎呀妈呀，这牌','混儿在手，天下我有','快点儿啊～','承让承让'];
let lastQuickAt=0;
/* ===== 跨局累计积分（单机本地持久化；联机主机权威、随state下发） ===== */
function scoreStorageKey(){return mode==='online'&&curCode?('qhd-score-r-'+curCode):'qhd-score-single'}
let scoreSess=[0,0,0,0];
function loadScoreSess(){try{const a=JSON.parse(localStorage.getItem(scoreStorageKey())||'[0,0,0,0]');if(Array.isArray(a)&&a.length===4)scoreSess=a.map(x=>Number(x)||0);else scoreSess=[0,0,0,0]}catch(e){scoreSess=[0,0,0,0]}}
function saveScoreSess(){try{localStorage.setItem(scoreStorageKey(),JSON.stringify(scoreSess))}catch(e){}}
function resetScoreSess(){scoreSess=[0,0,0,0];saveScoreSess();if(game)game.players.forEach((p,i)=>p.scores=0);renderAll()}
function commitScores(){if(!game)return;game.players.forEach((p,i)=>scoreSess[i]=p.scores||0);saveScoreSess()}
function clearScoreClick(){const cur=scoreSess.slice();const sum=cur.reduce((a,b)=>a+Math.abs(b),0);if(sum===0){alert('当前累计积分都是 0');return}if(confirm('确定将本机累计积分清零吗？')){resetScoreSess();alert('积分已清零')}}
function hideWanWarn(){const w=document.getElementById('wan-warn');if(w)w.style.display='none'}
function disarmWan(){wanArmIdx=-1;if(wanArmTimer){clearTimeout(wanArmTimer);wanArmTimer=null}hideWanWarn()}
function setTurnClock(ms){turnEndAt=Date.now()+ms;turnMax=ms}
function clearTurnClock(){turnEndAt=0}
setInterval(function(){const ring=document.getElementById('dial-ring');const clk=document.getElementById('turn-clock');if(!ring||!clk)return;if(!turnEndAt||!game||game.phase==='gameover'){ring.style.display='none';clk.textContent='';return}const remain=Math.max(0,turnEndAt-Date.now());if(remain<=0){ring.style.display='none';clk.textContent='';return}ring.style.display='block';clk.textContent=Math.ceil(remain/1000);ring.style.setProperty('--deg',Math.round(remain/turnMax*360)+'deg')},250);
function setMode(m){mode=m;curCode=null;if(m==='single')loadScoreSess();document.getElementById('btn-single').classList.toggle('active',m==='single');document.getElementById('btn-online').classList.toggle('active',m==='online');document.getElementById('lobby-single').style.display=m==='single'?'block':'none';document.getElementById('lobby-online').style.display=m==='online'?'block':'none';const cb=document.getElementById('btn-chat');if(cb)cb.style.display=m==='online'?'':'none';const cp=document.getElementById('chat-panel');if(cp&&m==='single')cp.classList.remove('on')}
const SC={w:'万',b:'饼',t:'条'};
const FC=['东','南','西','北'];const JC=['中','发','白'];
const NUMCN=['','一','二','三','四','五','六','七','八','九'];
/* 牌面大写数字（仅视觉；语音仍用小写） */
const NUM_BIG=['','壹','貳','叁','肆','伍','陸','柒','捌','玖'];
/* 筒/条 3×3 布局：全部关于中列左右轴对称 */
const DOT_PAT={1:[4],2:[1,7],3:[1,4,7],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8],7:[0,1,2,3,5,6,8],8:[0,1,2,3,5,6,7,8],9:[0,1,2,3,4,5,6,7,8]};
const BAR_PAT={2:[1,7],3:[1,4,7],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8],7:[0,1,2,3,5,6,8],8:[0,1,2,3,5,6,7,8],9:[0,1,2,3,4,5,6,7,8]};
const DOT_RED={5:[4],6:[0,2],7:[1],9:[1,4,7]};
/* 条牌配色位：五条中红、七条顶红、九条中列红右列蓝 */
const BAR_RED={5:[4],7:[1],9:[1,4,7]};
const BAR_BLUE={9:[2,5,8]};
/* 莫兰迪几何·一条：抽象叶芽（茎+双叶+哑金芽心） */
function birdHTML(){return '<svg class="sprout" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><path d="M50 96 C50 82 50 66 50 52" stroke="#6f8f7a" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M50 64 C40 62 33 54 33 45 C43 46 50 53 50 64 Z" fill="#6f8f7a"/><path d="M50 53 C60 51 67 43 67 35 C57 36 50 43 50 53 Z" fill="#6f8f7a" opacity=".72"/><circle cx="50" cy="47" r="5" fill="#c2a36b"/><path d="M50 96 L45 103 M50 96 L55 103" stroke="#6f8f7a" stroke-width="2.4" stroke-linecap="round"/></svg>'}
/* 八条：上 M 下 W 双折线；材质与其他条牌竹杆完全同款（蓝灰圆柱渐变+竹节环） */
function mwHTML(){const D={M:'M31 56 L31 14 L50 42 L69 14 L69 56',W:'M31 64 L31 106 L50 78 L69 106 L69 64'};const R=[[26.5,35,35.5,35],[36.78,25.49,44.22,30.51],[55.78,25.49,63.22,30.51],[64.5,35,73.5,35],[26.5,85,35.5,85],[36.78,89.49,44.22,94.51],[55.78,94.51,63.22,89.49],[64.5,85,73.5,85]];let rings='';R.forEach(r=>{rings+='<line class="ring-sh" x1="'+r[0]+'" y1="'+r[1]+'" x2="'+r[2]+'" y2="'+r[3]+'"/><line class="ring" x1="'+r[0]+'" y1="'+r[1]+'" x2="'+r[2]+'" y2="'+r[3]+'"/>'});return '<svg class="mw8" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><path d="'+D.M+'" fill="none" stroke="url(#mwBamboo)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="'+D.W+'" fill="none" stroke="url(#mwBamboo)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'+rings+'</svg>'}
/* 红中·国旗：长方红框+哑金五角星 */
function flagHTML(){return '<svg class="geo-zhong" viewBox="0 0 100 68" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="92" height="60" rx="7" fill="#c2564a" stroke="#8f3b33" stroke-width="2.6"/><rect x="9" y="8.5" width="82" height="14" rx="5" fill="#ffffff" opacity=".16"/><path d="M0,-1 L0.2245,-0.309 L0.9511,-0.309 L0.3633,0.118 L0.5878,0.809 L0,0.382 L-0.5878,0.809 L-0.3633,0.118 L-0.9511,-0.309 L-0.2245,-0.309 Z" transform="translate(50,35) scale(17)" fill="#f0cf63" stroke="#d8b23f" stroke-width=".05"/></svg>'}
function td(t){if(SUITS.includes(t.suit))return{text:t.value+SC[t.suit]};if(t.suit==='f')return{text:FC[t.value-1]};return{text:JC[t.value-1]}}
/* 风牌·莫兰迪几何罗盘：刻度圈+哑金指针(东0°南90°西180°北270°)+方位字 */
function fengHTML(v){
 const ch=FC[v-1],en=['E','S','W','N'][v-1],ang=[0,90,180,270][v-1];
 let ticks='';
 for(let a=0;a<360;a+=90){const rad=a*Math.PI/180;ticks+='<line x1="'+(50+30*Math.sin(rad))+'" y1="'+(60-30*Math.cos(rad))+'" x2="'+(50+24*Math.sin(rad))+'" y2="'+(60-24*Math.cos(rad))+'" stroke="#3d372f" stroke-width="2.8" stroke-linecap="round"/>';}
 return '<svg class="feng-pai" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="60" r="31" fill="rgba(236,227,209,.22)" stroke="#3d372f" stroke-width="2.8"/>'+ticks+'<g transform="rotate('+ang+' 50 60)"><polygon points="64,60 48,51 48,69" fill="#c2a36b" stroke="#8a6f3e" stroke-width="1.4" stroke-linejoin="round"/><circle cx="50" cy="60" r="3.6" fill="#ece3d1" stroke="#3d372f" stroke-width="2"/></g><text x="50" y="43" text-anchor="middle" font-size="12" font-weight="800" fill="#5a7086" font-family="Outfit,Arial,sans-serif">'+en+'</text><text x="50" y="113" text-anchor="middle" font-size="23" font-weight="800" fill="#3d372f" font-family="STKaiti,KaiTi,serif">'+ch+'</text></svg>';
}
function faceHTML(t){
 if(t.suit==='w')return '<i class="tk-num">'+NUM_BIG[t.value]+'</i><i class="tk-suit">萬</i>';
 if(t.suit==='b'){
  if(t.value===7)return '<span class="dots d7"><i class="dot r top7"></i><span class="g7"><i class="dot"></i><i class="dot"></i><i class="dot"></i><i class="dot"></i><i class="dot"></i><i class="dot"></i></span></span>';
  const on=DOT_PAT[t.value];const v=t.value;const reds=DOT_RED[v]||[];let h='<span class="dots">';for(let i=0;i<9;i++){const has=on.indexOf(i)>=0;const red=reds.indexOf(i)>=0;h+='<i class="'+(has?(red?'dot r':'dot'):'dot e')+'"></i>'}return h+'</span>'}
 if(t.suit==='t'){
  if(t.value===1)return birdHTML();
  if(t.value===8)return mwHTML();
  if(t.value===7)return '<span class="bars t7"><i class="r top7"></i><span class="g7"><i></i><i></i><i></i><i></i><i></i><i></i></span></span>';
  const on=BAR_PAT[t.value],reds=BAR_RED[t.value]||[],blues=BAR_BLUE[t.value]||[];
  let h='<span class="bars">';
  for(let i=0;i<9;i++){if(on.indexOf(i)<0)h+='<i class="e"></i>';else if(reds.indexOf(i)>=0)h+='<i class="r"></i>';else if(blues.indexOf(i)>=0)h+='<i class="b"></i>';else h+='<i></i>'}
  return h+'</span>'}
 if(t.suit==='f')return fengHTML(t.value);
 if(t.value===1)return flagHTML();if(t.value===2)return '<span class="geo-dia"><i>發</i></span>';return '<i class="bai-frame"></i>';
}
function renderTile(t,w=false,f=true){const el=document.createElement('span');el.className='tile';if(!f){el.classList.add('tile-back');return el}el.classList.add('tile-face');if(!t||t.suit==='w')el.classList.add('w');else if(t.suit==='b')el.classList.add('b','b'+t.value);else if(t.suit==='t')el.classList.add('t');else if(t.suit==='f')el.classList.add('feng');else el.classList.add(t.value===1?'j-zhong':t.value===2?'j-fa':'j-bai');el.innerHTML=faceHTML(t);if(w)el.classList.add('wan-tile');return el}
function tryLandscape(){try{if(screen.orientation&&screen.orientation.lock){const p=screen.orientation.lock('landscape');if(p&&p.catch)p.catch(function(){})}}catch(e){}try{if(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches&&document.documentElement.requestFullscreen){const pf=document.documentElement.requestFullscreen();if(pf&&pf.catch)pf.catch(function(){})}}catch(e){}}
function enterTable(){document.getElementById('lobby').style.display='none';document.getElementById('table').style.display='block';tryLandscape()}
/* 以我为中心视角：dom位置 0底 1顶 2左 3右 → 逻辑座位 */
function viewMap(){const m=mySeat||0;return[m,(m+2)%4,(m+3)%4,(m+1)%4]}
function isWanTile(t){return !!(game&&game.wanKey&&t&&tileKey(t)===game.wanKey)}
function renderAll(){if(!game)return;const vm=viewMap();for(let dom=0;dom<4;dom++)renderSeat(dom,vm[dom]);renderWalls();renderCenter();renderActions();observeVoice()}
function renderSeat(dom,seat){const el=document.getElementById('seat-'+dom);const p=game.players[seat];const isMe=seat===mySeat;const isBanker=game.bankerSeat===seat;const isCur=game.phase==='discard'&&game.currentSeat===seat;el.classList.toggle('cur',isCur);el.querySelector('.avatar').textContent=SEATS[seat];const nameEl=el.querySelector('.name');nameEl.textContent=isMe?'我':isBanker?'庄':(p.name||'');nameEl.classList.toggle('host',isBanker);let sb=el.querySelector('.score-badge');if(!sb){sb=document.createElement('span');sb.className='score-badge';nameEl.parentNode.appendChild(sb)}const sc=p.scores||0;sb.textContent=(sc>0?'+':'')+sc;sb.className='score-badge'+(sc>0?' pos':sc<0?' neg':'');const hb=el.querySelector('.hand-back');const hm=el.querySelector('.hand-me');hb.innerHTML='';hm.innerHTML='';if(isMe){const h=p.hand||[];let dIdx=(isCur&&game.drawnTileId!=null&&h.length>=2&&h.length%3===2)?h.findIndex(t=>t.id===game.drawnTileId):-1;const mk=(idx)=>{const t=h[idx];const w=game.wanTile&&tileKey(t)===tileKey(game.wanTile);const te=renderTile(t,w,true);if(isCur&&!p.isGongzhu){te.onclick=()=>selectTile(idx);te.style.cursor='pointer'}if(idx===selIdx){te.classList.add('sel');if(idx===wanArmIdx&&w)te.classList.add('wan-arm')}return te};for(let idx=0;idx<h.length;idx++){if(idx===dIdx)continue;hm.appendChild(mk(idx))}if(dIdx>=0){const gap=document.createElement('span');gap.className='hand-gap';hm.appendChild(gap);const dte=mk(dIdx);dte.classList.add('tile-drawn');hm.appendChild(dte)}hm.style.display='flex';hb.style.display='none'}else{const pc=p.handCount!==undefined?p.handCount:(p.hand?p.hand.length:0);for(let k=0;k<pc;k++)hb.appendChild(renderTile(null,false,false));hm.style.display='none';hb.style.display='flex'}const mEl=el.querySelector('.meld-row');mEl.innerHTML='';const groups=[];(p.melds||[]).forEach(m=>{const g=document.createElement('div');g.className='meld-group';m.tiles.forEach(t=>{const ti=m.tiles.indexOf(t);const showBack=m.isAnGang&&(ti===0||ti===3);g.appendChild(renderTile(t,isWanTile(t)&&!showBack,!showBack))});mEl.appendChild(g);groups.push(g)});const sig=(p.melds||[]).map(m=>m.type+m.tiles.length).join('|');if(animMeldSig[seat]!==undefined&&sig!==animMeldSig[seat]&&groups.length){groups[groups.length-1].classList.add('pop')}animMeldSig[seat]=sig;const dr=el.querySelector('.discard-row');dr.innerHTML='';const arr=(p.discards||[]).slice(-12);arr.forEach((t,i)=>{const te=renderTile(t,isWanTile(t),true);if(game.lastDiscard&&game.lastDiscard.fromSeat===seat&&i===arr.length-1){const key=seat+'_'+t.id;if(key!==animDiscardKey){te.classList.add('just');animDiscardKey=key}}dr.appendChild(te)})}
function renderWalls(){if(!game)return;const rem=Math.max(0,136-(game.drawCursor||0));const top=Math.min(18,Math.round(rem*0.22));const side=Math.min(46,Math.round((rem-top)/2));buildWall('wall-top',top,'h',true);buildWall('wall-left',side,'v',false);buildWall('wall-right',side,'v',false)}
function buildWall(id,n,dir,two){const el=document.getElementById(id);if(!el)return;if(n<=0){el.style.display='none';return}el.style.display='';el.innerHTML='';const mk=(extra)=>{const r=document.createElement('div');r.className='wall-row '+dir+(extra?' '+extra:'');for(let i=0;i<n;i++){const s=document.createElement('span');s.className='mini-back';r.appendChild(s)}return r};el.appendChild(mk(''));if(two)el.appendChild(mk('back-row'))}
function renderCenter(){const g=game;let pt='';switch(g.phase){case'waiting':pt='等待开始';break;case'dealing':pt='发牌中...';break;case'draw':pt=SEATS[g.currentSeat]+'家摸牌';break;case'discard':pt='轮到 '+SEATS[g.currentSeat]+'家 出牌';break;case'action':pt='等待 碰/杠 选择...';break;case'gameover':pt='本局结束';break}document.getElementById('phase-text').textContent=pt;const wi=document.getElementById('wan-info');wi.innerHTML='';if(g.wanTile){const tag=document.createElement('span');tag.className='wan-tag';tag.textContent='混儿';wi.appendChild(tag);const wtEl=renderTile(g.wanTile,true,true);if(wanRevealKey!==g.wanKey){wanRevealKey=g.wanKey;if(animSpeed())wtEl.classList.add('wan-flip-back');Sound.tick();if(mode==='online'&&net&&!net.isHost)speakSeq(['游戏开始','混儿是'+sayTile(g.wanTile)])}wi.appendChild(wtEl);const gg=document.createElement('span');gg.className='wan-gang';gg.textContent=' 杠×'+g.gangCount;wi.appendChild(gg)}
const rc=document.getElementById('remain-chip');if(rc){const ld=liuJuDun(g.gangCount);const left=Math.max(0,136-(g.drawCursor||0)-ld*2);rc.innerHTML='余牌<b>'+left+'</b>张';rc.classList.toggle('low',left>0&&left<=8)}
const dd=document.getElementById('dial-disc');dd.innerHTML='';if(g.lastDiscard){const te=renderTile(g.lastDiscard.tile,isWanTile(g.lastDiscard.tile),true);const key=g.lastDiscard.fromSeat+'_'+g.lastDiscard.tile.id;te.classList.add('float-disc');if(key!==animDiscardKey){te.classList.add('just');animDiscardKey=key}dd.appendChild(te)}}
function commitDiscard(seat,idx){disarmWan();if(mode==='single'||(net&&net.isHost)){doDiscard(seat,idx)}else{if(!net)return;net.broadcast({type:'action',action:{type:'discard',seat:seat,tileIndex:idx}})}}
function selectTile(idx){const seat=game.currentSeat;const p=game.players[seat];if(!p||p.isGongzhu)return;const t=p.hand[idx];if(!t)return;const wild=isWanTile(t);
 if(wild){if(wanArmIdx===idx){commitDiscard(seat,idx);return}
  disarmWan();wanArmIdx=idx;selIdx=idx;Sound.tick();
  document.getElementById('wan-warn').style.display='block';
  wanArmTimer=setTimeout(function(){wanArmIdx=-1;selIdx=-1;hideWanWarn();renderAll()},2400);
  renderAll();return}
 disarmWan();commitDiscard(seat,idx)}
function mkId(){return Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36)}
function isAI(s){if(mode==='single')return s!==mySeat;if(net&&net.isHost)return !seatOnline(s);return false}
/* 联机主机侧：座位是否在线（主机自己恒在线；掉线30秒未回由系统托管） */
function seatOnline(s){if(mode!=='online'||!net||!net.isHost)return true;if(s===mySeat)return true;const p=hostPeers.find(x=>x.seat===s);return p?p.online!==false:true}
const hostedTimers={};
function armHostedSeat(seat){
 if(hostedTimers[seat]!=null)return;
 hostedTimers[seat]=setTimeout(()=>{delete hostedTimers[seat];if(seatOnline(seat)||!game)return;
  if(pending&&pending.kind==='self'&&pending.seat===seat)aiSelfAction();
  else if(pending&&pending.kind==='claim'&&pending.offers[seat]&&!pending.responses[seat])claimAnswer(seat,aiClaimChoice(pending.offers[seat]),pending.id)},700);
}
function markPeerOnline(peerId,online){
 const hp=hostPeers.find(p=>p.peerId===peerId);if(!hp)return;
 if(online){const was=hp.online===false;hp.online=true;hp.lastSeen=Date.now();if(was){if(hostedTimers[hp.seat]){clearTimeout(hostedTimers[hp.seat]);clearInterval(hostedTimers[hp.seat]);delete hostedTimers[hp.seat]}sendNotice('✅ '+hp.name+' 已重连，恢复本人操作');setTimeout(()=>flushBroadcast(),300)}}
 else if(hp.online!==false){hp.online=false;sendNotice('📵 '+hp.name+' 掉线，系统自动托管（30秒内重连可恢复座位）');if(gameStarted)armHostedSeat(hp.seat)}
}
let hostWatchT=null;
function startHostWatch(){if(hostWatchT)return;hostWatchT=setInterval(()=>{try{if(mode!=='online'||!net||!net.isHost||!gameStarted)return;const now=Date.now();hostPeers.forEach(p=>{if(p.peerId===net.myId)return;if(p.online===false)return;if(now-(p.lastSeen||0)>30000)markPeerOnline(p.peerId,false)})}catch(e){}},5000)}
/* ===== 主机仲裁：出牌后的碰/杠请求 ===== */
function doDiscard(seat,idx){const p=game.players[seat];if(!p||idx<0||idx>=p.hand.length)return;if(pending&&pending.kind==='self'&&pending.seat===seat){clearTimeout(pending.timer);pending=null}const fromRect=fxSourceRect(seat,idx);const d=game.discard(seat,idx);if(!d)return;selIdx=-1;disarmWan();clearTurnClock();renderAll();flyDiscard(seat,d,fromRect);broadcastFull();afterDiscard()}
/* 出牌飞行 + 碰杠来源指示（动画速度受设置面板 qhd-anim-speed 控制，0=关闭） */
function animSpeed(){try{const v=parseFloat(localStorage.getItem('qhd-anim-speed'));return isNaN(v)?1:v}catch(e){return 1}}
function fxSourceRect(seat,idx){const vm=viewMap();const seatEl=document.getElementById('seat-'+vm.indexOf(seat));if(!seatEl)return null;if(seat===mySeat){const tiles=seatEl.querySelectorAll('.hand-me .tile');if(tiles[idx])return tiles[idx].getBoundingClientRect()}const hb=seatEl.querySelector('.hand-back');if(hb){const r=hb.getBoundingClientRect();if(r.width)return r}return seatEl.getBoundingClientRect()}
function flyDiscard(seat,tile,fromRect){const sp=animSpeed();if(!sp||!fromRect)return;const vm=viewMap();const seatEl=document.getElementById('seat-'+vm.indexOf(seat));if(!seatEl)return;const target=seatEl.querySelector('.discard-row .tile:last-child');if(!target)return;const tr=target.getBoundingClientRect();if(!tr.width)return;target.classList.remove('just');target.style.visibility='hidden';const fs=parseFloat(getComputedStyle(target).fontSize)||14;const clone=renderTile(tile,isWanTile(tile),true);const w=tr.width,h=tr.height;const sx=fromRect.left+fromRect.width/2,sy=fromRect.top+fromRect.height/2,tx=tr.left+tr.width/2,ty=tr.top+tr.height/2;const s0=Math.max(.5,Math.min(1.4,fromRect.height/h));clone.style.cssText='position:fixed;z-index:9999;left:0;top:0;width:'+w+'px;height:'+h+'px;font-size:'+fs+'px;margin-left:'+(-w/2)+'px;margin-top:'+(-h/2)+'px;pointer-events:none;will-change:transform;box-shadow:0 6px 14px rgba(0,0,0,.45)';document.body.appendChild(clone);const done=()=>{clone.remove();target.style.visibility='';void target.offsetWidth;target.classList.add('just')};try{const anim=clone.animate([{transform:'translate('+sx+'px,'+sy+'px) scale('+s0+')',opacity:.95},{transform:'translate('+tx+'px,'+(ty-4)+'px) scale(1.04)',offset:.82},{transform:'translate('+tx+'px,'+ty+'px) scale(1)',opacity:1}],{duration:280/sp,easing:'cubic-bezier(.3,.65,.35,1)',fill:'forwards'});anim.onfinish=done;anim.oncancel=done}catch(e){done()}}
function flashClaim(toSeat,fromSeat,text){const sp=animSpeed();if(!sp)return;const vm=viewMap();const toEl=document.getElementById('seat-'+vm.indexOf(toSeat));const fromEl=document.getElementById('seat-'+vm.indexOf(fromSeat));if(!toEl||!fromEl)return;const tr=toEl.getBoundingClientRect(),fr=fromEl.getBoundingClientRect();const ang=Math.atan2((fr.top+fr.height/2)-(tr.top+tr.height/2),(fr.left+fr.width/2)-(tr.left+tr.width/2))*180/Math.PI;const mGroups=toEl.querySelectorAll('.meld-row .meld-group');const ar=mGroups.length?mGroups[mGroups.length-1].getBoundingClientRect():null;const ax=ar?ar.left+ar.width/2:tr.left+tr.width/2,ay=ar?ar.top+ar.height/2:tr.top+tr.height*.32;const box=document.createElement('div');box.className='claim-fx';box.style.left=ax+'px';box.style.top=ay+'px';box.innerHTML='<span class="cf-arrow" style="transform:rotate('+ang.toFixed(1)+'deg)">&#10148;</span><b></b><span class="cf-from">'+SEATS[fromSeat]+'家出牌</span>';box.querySelector('b').textContent=text+'！';document.body.appendChild(box);setTimeout(()=>{box.classList.add('cf-out');setTimeout(()=>box.remove(),360)},1000/sp)}
/* ===== 设置面板 ===== */
function openSettings(){
 const o=document.getElementById('settings-overlay');
 const vol=document.getElementById('set-vol');vol.value=Math.round(sfxVol*100);
 document.getElementById('set-vol-v').textContent=vol.value+'%';
 const rate=document.getElementById('set-rate');rate.value=Math.round(voiceRateMul*100);
 document.getElementById('set-rate-v').textContent=(rate.value/100).toFixed(1)+'×';
 document.getElementById('set-anim').value=String(animSpeed());
 document.getElementById('set-talk').value=localTalk?'1':'0';
 const sel=document.getElementById('set-voice');sel.innerHTML='';
 let menu=[];try{menu=voiceMenu()}catch(e){}
 if(!menu.length){const op=document.createElement('option');op.value='';op.textContent='系统默认语音';sel.appendChild(op)}
 menu.forEach(m=>{const op=document.createElement('option');op.value=m.uri;op.textContent=m.name+(m.local?'':'（在线）');if(m.uri===voiceURI)op.selected=true;sel.appendChild(op)});
 renderRulesBody();
 o.style.display='flex';
}
function closeSettings(){document.getElementById('settings-overlay').style.display='none'}
function setSfxVol(v){v=Math.max(0,Math.min(100,+v))/100;Sound.setVolume(v);try{localStorage.setItem('qhd-sfx-vol',String(v))}catch(e){}document.getElementById('set-vol-v').textContent=Math.round(v*100)+'%';if(sfxOn)Sound.tick()}
function setVoiceRate(v){v=Math.max(60,Math.min(160,+v))/100;voiceRateMul=v;try{localStorage.setItem('qhd-voice-rate',String(v))}catch(e){}document.getElementById('set-rate-v').textContent=v.toFixed(1)+'×'}
function setAnimSpeed(v){try{localStorage.setItem('qhd-anim-speed',v)}catch(e){}}
function setTalkMode(v){localTalk=v==='1';try{localStorage.setItem('qhd-local-talk',localTalk?'1':'0')}catch(e){}if(voiceOn)speak(localTalk?'中，本地话报牌：混儿吊，杠上开花':'已切换为普通话播报')}
function setVoicePick(uri){voiceURI=uri;try{localStorage.setItem('qhd-voice-uri',uri)}catch(e){}pickZhVoice();syncSndBtns();if(!voiceOn){voiceOn=true;try{localStorage.setItem('qhd-voice','1')}catch(e){}}speak('已切换语音')}
function testVoicePick(){if(!sfxOn){sfxOn=true;try{localStorage.setItem('qhd-sfx','1')}catch(e){}}Sound.ensure();Sound.hu();if(!voiceOn){voiceOn=true;try{localStorage.setItem('qhd-voice','1')}catch(e){}syncSndBtns()}speak('秦皇岛麻将，语音试听')}
function renderRulesBody(){
 const fanItems=[FAN_CONFIG.pinghu,FAN_CONFIG.tianhu,FAN_CONFIG.dihu,FAN_CONFIG.pengpeng,FAN_CONFIG.dadiaoche,FAN_CONFIG.gangshanghua,FAN_CONFIG.haidilaoyue,FAN_CONFIG.menqing,FAN_CONFIG.suhu,FAN_CONFIG.hundiao,FAN_CONFIG.hundiaohun];
 const fanHtml=fanItems.map(f=>'<span class="fan-tag">'+f.name+' <b>×'+f.m+'</b></span>').join('')+FAN_CONFIG.qiduiNames.map((n,i)=>'<span class="fan-tag">'+n+'</span>').join('');
 document.getElementById('set-rules-body').innerHTML=
 '<div class="rb-sec">基本规则</div><ul>'+
 '<li>仅自摸胡，不能吃；可以碰、明杠、暗杠、补杠。</li>'+
 '<li>混儿由牌墙指示牌决定（指示牌+1，箭牌循环），可顶替任意牌；混儿牌有金光标记。</li>'+
 '<li>主动打出混儿算“拱猪”，本局不能再胡牌、碰牌或开杠。</li>'+
 '<li>中-發-白 组成一副顺子；东/南/西/北 起手四张可暗杠（补牌后进入首巡）。</li>'+
 '<li>牌墙剩余到墩数流局（无人得分）。</li></ul>'+
 '<div class="rb-sec">胡牌番型倍率</div><div class="fan-grid">'+fanHtml+'</div>'+
 '<ul style="margin-top:6px"><li>混吊：4组副露单吊，将牌凑对时任一方是混儿即算（手里留混摸真牌、或留真牌摸到混儿，均×2）；两张都是混儿为混钓混（×4）。</li>'+
 '<li>七对：普通七对/豪华/双豪华/三豪华按龙七对倍率计。</li>'+
 '<li>各番相乘叠加，自摸由其余三家各付总倍数分。</li></ul>';
}
function afterDiscard(){const ds=game.lastDiscard.fromSeat;const offers={};for(let i=1;i<=3;i++){const s=(ds+i)%4;const ch=[];if(game.canMingGang(ds,s))ch.push('gang');if(game.canPong(ds,s))ch.push('pong');if(ch.length)offers[s]=ch}const seats=Object.keys(offers).map(Number);if(!seats.length){game.passAction();renderAll();broadcastFull();nextSeatDraw();return}const id=promptSeq++;pending={id:id,kind:'claim',ds:ds,offers:offers,responses:{},timer:null};seats.forEach(s=>{if(isAI(s))setTimeout(()=>claimAnswer(s,aiClaimChoice(offers[s]),id),400+Math.random()*500)});pending.timer=setTimeout(()=>{if(!pending||pending.id!==id)return;seats.forEach(s=>{if(!pending.responses[s])pending.responses[s]='pass'});resolveClaim(id)},18000);setTurnClock(18000);renderAll();broadcastFull()}
function aiClaimChoice(ch){if(ch.indexOf('gang')>=0&&Math.random()<0.5)return 'gang';if(ch.indexOf('pong')>=0&&Math.random()<0.5)return 'pong';return 'pass'}
function claimAnswer(seat,choice,id){if(!pending||pending.kind!=='claim'||pending.id!==id)return;if(pending.responses[seat])return;if(pending.offers[seat].indexOf(choice)<0&&choice!=='pass')return;pending.responses[seat]=choice;const seats=Object.keys(pending.offers).map(Number);renderAll();broadcastFull();if(seats.every(s=>pending.responses[s])){clearTimeout(pending.timer);resolveClaim(id)}}
function resolveClaim(id){if(!pending||pending.id!==id)return;const pp=pending;pending=null;clearTurnClock();let winner=-1,choice=null;for(let i=1;i<=3;i++){const s=(pp.ds+i)%4;const c=pp.responses[s];if(c==='gang'){winner=s;choice='gang';break}if(c==='pong'&&winner<0){winner=s;choice='pong'}}if(winner<0){game.passAction();renderAll();broadcastFull();nextSeatDraw();return}if(choice==='gang'){game.executeMingGang(winner);sendNotice('▶ '+SEATS[winner]+'家 明杠')}else{game.executePong(winner);sendNotice('▶ '+SEATS[winner]+'家 碰')}renderAll();flashClaim(winner,pp.ds,choice==='gang'?'杠':'碰');broadcastFull();beginSelfTurn(winner,choice==='gang')}
/* ===== 摸牌后的自摸/暗杠/补杠/出牌 ===== */
function nextSeatDraw(){if(!game.canDraw()){const r=game.settleLiuJu();r._id=mkId();game.result=r;sendNotice('🚫 流局');shownResultId=r._id;clearTurnClock();renderAll();showResult(r);flushBroadcast();return}const ns=game.currentSeat;game.drawTile(ns);renderAll();broadcastFull();beginSelfTurn(ns)}
/* 30秒出牌超时：随机出牌机制本就存在，这里只补气泡+日志反馈 */
function onTurnTimeout(seat){const txt='⏰ 超时啦，系统帮你出牌';if(mode==='online'&&net&&net.isHost){sendNotice('⏰ '+SEATS[seat]+'家出牌超时，系统自动出牌');try{net.broadcast({type:'quickmsg',from:net.myId,seat:seat,text:txt,sys:true})}catch(e){}showQuickBubble(seat,txt,false)}else{logMsg('⏰ 出牌超时，系统自动出牌');showQuickBubble(seat,txt,true)}}
function beginSelfTurn(seat,drawn){if(drawn===undefined)drawn=true;const hu=drawn?game.checkZiMoHu(seat):null;const ak=drawn?game.findAnGangKeys(seat):[];const bk=drawn?game.findBuKongMelds(seat):[];const id=promptSeq++;pending={id:id,kind:'self',seat:seat,huInfo:hu,angangKeys:ak,bukong:bk,timer:null};if(isAI(seat)){clearTurnClock();setTimeout(aiSelfAction,550+Math.random()*450)}else{pending.timer=setTimeout(()=>{if(!pending||pending.id!==id)return;const h=game.players[seat].hand;if(h.length){onTurnTimeout(seat);doDiscard(seat,Math.floor(Math.random()*h.length))}},30000);setTurnClock(30000)}renderAll();broadcastFull()}
function aiSelfAction(){if(!pending||pending.kind!=='self')return;const s=pending.seat;if(pending.huInfo&&Math.random()<0.92){selfAnswer(s,'hu',null,pending.id);return}if(pending.angangKeys.length&&Math.random()<0.35){selfAnswer(s,'angang',pending.angangKeys[0],pending.id);return}if(pending.bukong.length&&Math.random()<0.3){selfAnswer(s,'bukong',pending.bukong[0].mi,pending.id);return}const h=game.players[s].hand;doDiscard(s,Math.floor(Math.random()*h.length))}
function selfAnswer(seat,choice,payload,id){if(!pending||pending.kind!=='self'||pending.id!==id||pending.seat!==seat)return;const rearm=()=>{pending.timer=setTimeout(()=>{if(pending&&pending.id===id){const h=game.players[seat].hand;if(h.length){onTurnTimeout(seat);doDiscard(seat,Math.floor(Math.random()*h.length))}}},30000)};if(choice==='hu'){if(!pending.huInfo){rearm();return}const hi=pending.huInfo;pending=null;handleZiMoHu(seat,hi);return}if(choice==='angang'){if(!game.executeAnGang(seat,payload)){rearm();return}sendNotice('▶ '+SEATS[seat]+'家 暗杠');pending=null;renderAll();broadcastFull();beginSelfTurn(seat);return}if(choice==='bukong'){if(!game.executeBuKong(seat,payload|0)){rearm();return}sendNotice('▶ '+SEATS[seat]+'家 补杠');pending=null;renderAll();broadcastFull();beginSelfTurn(seat);return}}
function handleZiMoHu(s,hi){const r=game.settle(s,hi);commitScores();r._id=mkId();game.result=r;shownResultId=r._id;clearTurnClock();sendNotice('🎉 '+SEATS[s]+'家自摸胡！'+r.totalMultiplier+'倍');renderAll();showResult(r);flushBroadcast()}
function scoreTotalsHTML(){return game.players.map(p=>{const s=p.scores||0;return '<span class="st-item'+(s>0?' pos':s<0?' neg':'')+'">'+SEATS[p.seat]+' '+(s>0?'+':'')+s+'</span>'}).join('')}
function rvTile(t,isWan,isHu){const el=renderTile(t,isWan);el.classList.add('rv-tile');if(isHu)el.classList.add('rv-hu');return el}
function rvLab(text,t,isWan,isHu){const lab=document.createElement('span');lab.className='rv-lab';const s=document.createElement('span');s.textContent=text;lab.appendChild(s);lab.appendChild(rvTile(t,isWan,isHu));return lab}
/* ===== 胡牌全屏报番演出：暗场→逐番打出→总倍率→落结算面板（animSpeed=0 时跳过） ===== */
function clearHuFx(){huFxTimers.forEach(clearTimeout);huFxTimers=[]}
function playHuFanfare(r,next){
 clearHuFx();
 const el=document.getElementById('hu-show');
 const tot=r.totalMultiplier;
 /* 点击跳过=人主动中止，语音也停；自然播完不打断语音 */
 const finish=function(manual){el.classList.remove('on','big','grand');el.onclick=null;clearHuFx();if(manual){try{cancelSpeech()}catch(e){}}if(next)next()};
 Sound.ensure();if(tot>=12)Sound.grand();else Sound.hu();
 try{speakSeq(huSpeakLines(r,localTalk))}catch(e){}
 const sp=animSpeed();
 if(!sp){finish(false);return}
 el.classList.toggle('grand',tot>=12);el.classList.toggle('big',tot>=6&&tot<12);
 el.querySelector('.hs-who').textContent=SEATS[r.winnerSeat]+'家 自摸！';
 el.querySelector('.hs-grade').textContent=tot>=12?'大 胡 满 贯':'番 型 大 胡';
 const box=el.querySelector('.hs-fans');box.innerHTML='';
 const totalEl=el.querySelector('.hs-total');totalEl.classList.remove('show');
 totalEl.innerHTML='<small>总番</small>'+tot+'<small>倍</small>';
 el.onclick=function(){finish(true)};
 el.classList.add('on');
 /* 番型越多节拍越紧：标准速度整段视觉约6秒封顶（4番以内保持原640ms节奏） */
 const n=r.fenpai.fans.length;
 const step=Math.min(640,Math.max(240,3800/Math.max(1,n)))/sp;
 r.fenpai.fans.forEach((f,i)=>{const c=document.createElement('span');c.className='hs-fan'+(f.m<=1?' f1':'');c.textContent=f.name;if(f.m>1){const b=document.createElement('b');b.textContent='×'+f.m;c.appendChild(b)}box.appendChild(c);huFxTimers.push(setTimeout(function(){c.classList.add('show');Sound.tick()},360+i*step))});
 const tAll=360+n*step+280/sp;
 huFxTimers.push(setTimeout(function(){totalEl.classList.add('show')},tAll));
 huFxTimers.push(setTimeout(function(){finish(false)},tAll+1500/sp));
}
function showResult(r){renderAll();const o=document.getElementById('result-overlay');const t=document.getElementById('result-title');const tot=document.getElementById('result-total');const d=document.getElementById('result-detail');const rv=document.getElementById('result-reveal');const totals='<div class="score-total">累计积分：'+scoreTotalsHTML()+'</div>';if(r.liuju){t.textContent='🚫 流局';tot.textContent='无人得分';rv.innerHTML='';d.innerHTML='本局无人加减分'+totals;Sound.liuju();speak('流局')}else{t.textContent='🎉 '+SEATS[r.winnerSeat]+'家 自摸胡！';tot.textContent=r.totalMultiplier+' 倍 · 共赢 '+(r.totalMultiplier*3)+' 分';rv.innerHTML='';const isW=x=>!!(game.wanKey&&x&&tileKey(x)===game.wanKey);
 const meta=document.createElement('div');meta.className='rv-meta';
 if(r.wanTile)meta.appendChild(rvLab('混儿',r.wanTile,true,false));
 if(r.huTile)meta.appendChild(rvLab('胡牌',r.huTile,isW(r.huTile),true));
 rv.appendChild(meta);
 if(r.winnerMelds&&r.winnerMelds.length){const sec=document.createElement('div');sec.className='rv-section';r.winnerMelds.forEach(m=>{const g=document.createElement('span');g.className='rv-meld';m.tiles.forEach(tl=>g.appendChild(rvTile(tl,isW(tl),false)));const tag=document.createElement('span');tag.className='rv-mtag';tag.textContent=m.type==='pong'?'碰':m.type==='darkKong'?'暗杠':m.type==='kong'?'明杠':'补杠';g.appendChild(tag);sec.appendChild(g)});rv.appendChild(sec)}
 const hh=document.createElement('div');hh.className='rv-hand';(r.winnerHand||[]).forEach(tl=>hh.appendChild(rvTile(tl,isW(tl),r.huTile&&tl.id===r.huTile.id)));rv.appendChild(hh);
 const fc=document.createElement('div');fc.className='rv-fans';r.fenpai.fans.forEach(f=>{const c=document.createElement('span');c.className='rv-fan';c.textContent=f.name+(f.m>1?' ×':'');if(f.m>1){const b=document.createElement('b');b.textContent=f.m;c.appendChild(b)}fc.appendChild(c)});rv.appendChild(fc);
 d.innerHTML='本局自摸：赢家 +'+(r.totalMultiplier*3)+' 分，其余三家各 -'+r.totalMultiplier+' 分'+totals;playHuFanfare(r,function(){o.style.display='flex'});return}o.style.display='flex'}
function closeResult(){document.getElementById('result-overlay').style.display='none';if(mode==='single'&&game.phase==='gameover')startGame();else if(mode==='online'&&net&&net.isHost&&game.phase==='gameover')sendNotice('本局结束，主机可退出重建房间开始下一局')}
function logMsg(m){const l=document.getElementById('msg-log');const d=document.createElement('div');d.textContent=m;l.appendChild(d);l.scrollTop=l.scrollHeight}
function sendNotice(t){logMsg(t);if(mode==='online'&&net&&net.isHost)net.broadcast({type:'notice',from:net.myId,text:t})}
/* ===== 联机快捷语气泡（仅联机使用；2.5秒限频，每座位最多挂3条） ===== */
function showQuickBubble(seat,text,mine){try{const vm=viewMap();const dom=vm.indexOf(seat);if(dom<0)return;const seatEl=document.getElementById('seat-'+dom);if(!seatEl)return;let box=seatEl.querySelector('.chat-bubbles');if(!box){box=document.createElement('div');box.className='chat-bubbles';seatEl.appendChild(box)}const b=document.createElement('div');b.className='chat-bubble'+(mine?' mine':'');b.textContent=String(text).slice(0,24);box.appendChild(b);while(box.children.length>3)box.removeChild(box.firstChild);setTimeout(function(){if(b.parentNode)b.parentNode.removeChild(b)},3900)}catch(e){}}
function toggleChat(){if(mode!=='online'||!gameStarted)return;document.getElementById('chat-panel').classList.toggle('on')}
function sendQuick(i){const text=QUICK_MSGS[i];if(!text)return;const now=Date.now();if(now-lastQuickAt<2500)return;lastQuickAt=now;showQuickBubble(mySeat,text,true);if(net){try{net.broadcast({type:'quickmsg',from:net.myId,seat:mySeat,i:i})}catch(e){}}document.getElementById('chat-panel').classList.remove('on')}
function initQuickChat(){const p=document.getElementById('chat-panel');if(!p||p.dataset.inited)return;p.dataset.inited='1';QUICK_MSGS.forEach(function(m,i){const b=document.createElement('button');b.textContent=m;b.onclick=function(){sendQuick(i)};p.appendChild(b)});const cb=document.getElementById('btn-chat');if(cb)cb.style.display='none'}
/* ===== 碰/杠/胡 选择按钮 ===== */
function promptFor(seat){if(!pending)return null;if(pending.kind==='claim'){if(pending.offers[seat]&&!pending.responses[seat])return{id:pending.id,kind:'claim',choices:pending.offers[seat]};return null}if(pending.kind==='self'&&pending.seat===seat)return{id:pending.id,kind:'self',canHu:!!pending.huInfo,hu:pending.huInfo?{fans:pending.huInfo.fenpai.fans.map(f=>({name:f.name,m:f.m})),mult:pending.huInfo.fenpai.totalMultiplier}:null,angangKeys:pending.angangKeys,bukong:pending.bukong};return null}
function activePrompt(){if(mode==='online'&&net&&!net.isHost)return remotePrompt;return promptFor(mySeat)}
function keyTile(k){return{suit:k[0],value:parseInt(k.slice(1),10)}}
function renderActions(){const b=document.getElementById('action-bar');b.innerHTML='';const mk=(txt,cls,fn)=>{const x=document.createElement('button');x.className=cls+' pop-in';x.textContent=txt;x.onclick=fn;b.appendChild(x);setTimeout(()=>{x.classList.remove('pop-in')},420)};if(startGangKeys&&startGangKeys.length){b.style.display='flex';startGangKeys.forEach(k=>{const vi=parseInt(k.slice(1),10);mk('起手暗杠·'+FC[vi-1],'b-gang',()=>doStartGang(k))});mk('不杠','b-pass',skipStartGang);return}const pr=game?activePrompt():null;if(!pr){b.style.display='none';return}b.style.display='flex';if(pr.kind==='claim'){if(pr.choices.indexOf('gang')>=0)mk('杠','b-gang',()=>sendResp('gang'));if(pr.choices.indexOf('pong')>=0)mk('碰','b-peng',()=>sendResp('pong'));mk('过','b-pass',()=>sendResp('pass'))}else{if(pr.canHu){mk('胡！','b-hu',()=>sendResp('hu'));if(pr.hu){const tip=document.createElement('div');tip.className='hu-tip pop-in';const mult=pr.hu.mult,gain=mult*3;const fanTxt=pr.hu.fans.map(f=>f.name+(f.m>1?'×'+f.m:'')).join('、');tip.innerHTML='<div class="ht-title">自摸 '+mult+' 倍</div><div class="ht-fans">'+fanTxt+'</div><div class="ht-gain">每家付 '+mult+' 分 · 共赢 '+gain+' 分</div>';b.appendChild(tip);setTimeout(()=>tip.classList.remove('pop-in'),420)}}pr.angangKeys.forEach(k=>mk('暗杠·'+td(keyTile(k)).text,'b-gang',()=>sendResp('angang',k)));pr.bukong.forEach(o=>mk('补杠·'+td(keyTile(o.key)).text,'b-gang',()=>sendResp('bukong',o.mi)));if(!pr.canHu){const h=document.createElement('div');h.className='action-hint';h.textContent='也可以直接点击手牌打出';b.appendChild(h)}}}
function sendResp(choice,payload){const pr=activePrompt();if(!pr)return;if(mode==='single'||(net&&net.isHost)){if(pr.kind==='claim')claimAnswer(mySeat,choice,pr.id);else selfAnswer(mySeat,choice,payload,pr.id)}else net.broadcast({type:'action',action:{type:'respond',kind:pr.kind,promptId:pr.id,choice:choice,payload:payload==null?null:payload}})}
// ============ 单机模式 ============
function startGame(){mode='single';mySeat=0;pending=null;remotePrompt=null;shownResultId=null;gameStarted=false;animDiscardKey='';animMeldSig={};wanArmIdx=-1;wanRevealKey=null;clearTurnClock();Sound.ensure();syncSndBtns();hideWait();enterTable();hostStartGame()}
function hostStartGame(){game=new QHDMahjongGame();game.players.forEach((p,i)=>p.scores=scoreSess[i]||0);const ws=Math.floor(Math.random()*34);const deck=shuffle(buildFullDeck());const wi=Math.floor(Math.random()*deck.length);const wt={suit:deck[wi].suit,value:deck[wi].value};const nw=nextTile(wt);const aw=findTile(deck,nw.suit,nw.value);game.newRound();resetVoiceObs();game.dealTiles(ws,aw);sendNotice('🎮 游戏开始');speakSeq(['游戏开始','混儿是'+sayTile(aw)]);startGangKeys=null;const dk=game.findStartDarkGang();for(const it of dk){if(it.seat===mySeat)continue;sendNotice(SEATS[it.seat]+'家起手风牌暗杠');game.executeStartDarkGang(it.seat,it.fengKeys[0])}const selfDK=dk.find(it=>it.seat===mySeat);game.phase='discard';renderAll();if(selfDK){startGangKeys=selfDK.fengKeys.slice();renderActions()}if(mode==='single'){setTimeout(()=>{if(!startGangKeys&&game.phase==='discard')beginSelfTurn(game.currentSeat)},600)}}
/* 本人起手风牌暗杠：逐组确认；全部处理完（或选不杠）才进入首巡 */
function doStartGang(k){if(!startGangKeys||startGangKeys.indexOf(k)<0)return;startGangKeys=startGangKeys.filter(x=>x!==k);sendNotice('▶ '+SEATS[mySeat]+'家起手风牌暗杠');game.executeStartDarkGang(mySeat,k);flushBroadcast();if(startGangKeys.length){renderAll()}else{startGangKeys=null;renderAll();beginSelfTurn(game.currentSeat)}}
function skipStartGang(){if(!startGangKeys)return;startGangKeys=null;renderAll();beginSelfTurn(game.currentSeat)}
// ============ 联机模式（主机仲裁） ============
function rosterPeople(){return hostPeers.slice().sort((a,b)=>a.seat-b.seat).map(p=>({name:p.name,me:p.peerId===net.myId}))}
function broadcastRoster(started){net.broadcast({type:'roster',from:net.myId,data:{roomCode:curCode,peers:rosterPeople(),count:hostPeers.length,started:!!started}})}
function showWait(people,code){const w=document.getElementById('room-wait');w.style.display='flex';document.getElementById('rw-code').textContent=code||curCode||'------';const box=document.getElementById('rw-seats');box.innerHTML='';for(let i=0;i<4;i++){const p=people&&people[i];const d=document.createElement('div');d.className='rw-seat'+(p?' on':'');const nm=document.createElement('div');nm.textContent=p?p.name:'虚位以待';d.appendChild(nm);if(p&&p.me){const who=document.createElement('div');who.className='rw-who';who.textContent='（我）';d.appendChild(who)}box.appendChild(d)}const st=document.getElementById('rw-status');const n=people?people.filter(x=>x).length:0;st.textContent=n>=4?'人齐，即将开局…':'已加入 '+n+'/4 人，等待队友…'}
function hideWait(){document.getElementById('room-wait').style.display='none'}
async function createRoom(){mode='online';const lb=document.getElementById('lobby-status');lb.textContent='连接 MQTT 服务器...';net=new MahjongNet((t,d)=>netMsg(t,d));try{const code=MahjongNet.genRoomCode();const myId=await net.createRoom(code);curCode=code;try{history.replaceState(null,'','?room='+code)}catch(e){}scoreSess=[0,0,0,0];saveScoreSess();onlineStarting=false;gameStarted=false;hostPeers=[{peerId:net.myId,seat:0,name:'你(主机)',joined:true,online:true,lastSeen:Date.now()}];saveSess({host:true,code:code,id:myId,name:'主机'});startHostWatch();lb.textContent='✅ 房间已创建，进入等待';enterTable();showWait(rosterPeople(),code);broadcastRoster()}catch(e){lb.textContent='❌ 连接失败：'+e.message}}
function guestName(){try{let s=JSON.parse(sessionStorage.getItem('qhd-mj-sess')||'null');if(s&&s.name)return s.name}catch(e){}return'玩家'+Math.floor(Math.random()*90+10)}
async function joinRoom(){const code=document.getElementById('join-code').value.trim();if(!code){document.getElementById('lobby-status').textContent='请输入邀请码';return}const lb=document.getElementById('lobby-status');lb.textContent='连接服务器...';await joinRoomAs(code,guestName(),null)}
async function joinRoomAs(code,name,keepId){return joinRoomAsX(code,name,keepId,false)}
async function joinRoomAsX(code,name,keepId,isReconn){const old=net;net=new MahjongNet((t,d)=>netMsg(t,d));try{const myId=await net.joinRoom(code,name,keepId);curCode=code;try{history.replaceState(null,'','?room='+code)}catch(e){}saveSess({host:false,code:code,id:myId,name:name});const wasStarted=isReconn&&gameStarted;if(!wasStarted)onlineStarting=false,gameStarted=false;const lb=document.getElementById('lobby-status');if(lb)lb.textContent='✅ 已连接，进入房间';enterTable();if(!gameStarted){if(isReconn){showWait([],code);const st=document.getElementById('rw-status');if(st)st.textContent='正在恢复牌局数据…'}else showWait([{name:name+'（你）',me:true}],code)}hideReconn();return true}catch(e){net=old;const lb=document.getElementById('lobby-status');if(lb)lb.textContent='❌ 连接失败：'+e.message;return false}}
function beginOnlineGame(){const arr=hostPeers.slice();for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}arr.forEach((p,i)=>{p.seat=i;p.online=true;p.lastSeen=Date.now()});const mine=hostPeers.find(p=>p.peerId===net.myId);gameStarted=true;hostStartGame();arr.forEach(p=>{game.players[p.seat].name=p.name});const players=arr.slice().sort((a,b)=>a.seat-b.seat).map(p=>({seat:p.seat,name:p.name}));hostPeers.forEach(p=>{net.broadcast({type:'start-game',from:net.myId,to:p.peerId,players:players,mySeat:p.seat})});hideWait();mySeat=mine.seat;selIdx=-1;sendNotice('🎮 开局！混儿是「'+td(game.wanTile).text+'」');renderAll();setTimeout(broadcastFull,400);setTimeout(()=>{broadcastFull();if(!startGangKeys)beginSelfTurn(game.currentSeat)},1600)}
function netMsg(t,d){console.log('[NET]',t,d);switch(t){
case'peer-join':if(!net.isHost)break;{const ex=hostPeers.find(p=>p.peerId===d.peerId);if(ex){if(ex.online===false)markPeerOnline(ex.peerId,true);ex.lastSeen=Date.now();if(gameStarted){setTimeout(()=>flushBroadcast(),150)}break}if(gameStarted){broadcastRoster(true);break}const ns=hostPeers.length;if(ns<4){hostPeers.push({peerId:d.peerId,seat:ns,name:d.name||('玩家'+(ns+1)),joined:true,online:true,lastSeen:Date.now()});sendNotice('👥 '+(d.name||'玩家')+' 加入房间');showWait(rosterPeople(),curCode);broadcastRoster();if(hostPeers.length>=4&&!onlineStarting){onlineStarting=true;showWait(rosterPeople(),curCode);setTimeout(beginOnlineGame,1400)}}}break;
case'peer-leave':if(!net.isHost)break;{const li=hostPeers.findIndex(p=>p.peerId===d.peerId);if(li<0)break;if(gameStarted){markPeerOnline(d.peerId,false)}else if(li>0){sendNotice('👋 '+hostPeers[li].name+' 离开');hostPeers.splice(li,1);showWait(rosterPeople(),curCode);broadcastRoster()}}break;
case'ping':if(net.isHost){const hp=hostPeers.find(p=>p.peerId===d.peerId);if(hp){if(hp.online===false)markPeerOnline(hp.peerId,true);hp.lastSeen=Date.now()}}break;
case'roster':if(gameStarted)break;if(d.started){document.getElementById('rw-status').textContent='牌局已开始，请等待下一局';break}showWait(d.peers,d.roomCode);break;
case'start-game':enterTable();hideWait();gameStarted=true;remotePrompt=null;mySeat=d.mySeat;game=new QHDMahjongGame();game.phase='waiting';resetVoiceObs();Sound.ensure();syncSndBtns();wanArmIdx=-1;wanRevealKey=null;for(let i=0;i<4;i++){if(d.players[i])game.players[i].name=d.players[i].name}logMsg('🎮 游戏开始');break;
case'state':applyRemoteState(d);break;
case'notice':logMsg(d.text);break;
case'quickmsg':{const qtxt=(d.i!=null&&QUICK_MSGS[d.i])||d.text||'';if(qtxt&&d.seat!=null)showQuickBubble(d.seat,qtxt,false)}break;
case'disconnected':if(net&&net.isHost){logMsg('❌ 主机网络断开：本机为房主，刷新后需重建房间')}else if(!reconnGoing){onGuestDisconnected()}break;
case'action':if(net.isHost)handlePeerAction(d);break}}
function applyRemoteState(s){if(!game)game=new QHDMahjongGame();if(!gameStarted){gameStarted=true;hideWait()}const st=s.state;Object.assign(game,{deck:st.deck,drawCursor:st.drawCursor,wanTile:st.wanTile,wanKey:st.wanKey,bankerSeat:st.bankerSeat,currentSeat:st.currentSeat,phase:st.phase,lastDiscard:st.lastDiscard,gangCount:st.gangCount,handStartSeat:st.handStartSeat,isFirstDraw:st.isFirstDraw,gangAfterDraw:st.gangAfterDraw,drawnTileId:st.drawnTileId!=null?st.drawnTileId:null,result:st.result||null});game.players=st.players;remotePrompt=st.prompt||null;if(st.result&&st.result._id&&st.result._id!==shownResultId){shownResultId=st.result._id;showResult(st.result)}renderAll()}
function handlePeerAction(d){if(!game||game.phase==='gameover')return;const a=d.action;const hp=hostPeers.find(p=>p.peerId===d.fromPeerId);const seat=hp?hp.seat:-1;if(a.type==='discard'){if(seat===a.seat)doDiscard(a.seat,a.tileIndex);return}if(a.type==='respond'){if(seat<0)return;if(a.kind==='claim')claimAnswer(seat,a.choice,a.promptId);else if(a.kind==='self')selfAnswer(seat,a.choice,a.payload,a.promptId)}}
function serializeForClient(forPeerId){const hp=hostPeers.find(p=>p.peerId===forPeerId);const peerSeat=hp?hp.seat:-1;const players=game.players.map(p=>({seat:p.seat,name:p.name,scores:p.scores||0,hand:peerSeat===p.seat?p.hand:[],handCount:p.hand.length,melds:p.melds,discards:p.discards||[],isGongzhu:p.isGongzhu}));return{state:{players:players,deck:[],drawCursor:game.drawCursor,wanTile:game.wanTile,wanKey:game.wanKey,bankerSeat:game.bankerSeat,currentSeat:game.currentSeat,phase:game.phase,lastDiscard:game.lastDiscard,gangCount:game.gangCount,handStartSeat:game.handStartSeat,isFirstDraw:game.isFirstDraw,gangAfterDraw:game.gangAfterDraw,drawnTileId:game.drawnTileId!=null?game.drawnTileId:null,result:game.result||null,prompt:peerSeat>=0?promptFor(peerSeat):null}}}
let bcTimer=null;
function doBroadcast(){if(!net||!net.isHost||!game)return;hostPeers.forEach(p=>{net.broadcast({type:'state',from:net.myId,to:p.peerId,data:serializeForClient(p.peerId)})})}
function broadcastFull(){if(!net||!net.isHost||!game)return;if(bcTimer)return;bcTimer=setTimeout(()=>{bcTimer=null;doBroadcast()},150)}
function flushBroadcast(){if(bcTimer){clearTimeout(bcTimer);bcTimer=null}doBroadcast()}
/* ===== 断线重连（客户端身份持久化 + 主机座位保留30秒自动托管） ===== */
function saveSess(o){try{sessionStorage.setItem('qhd-mj-sess',JSON.stringify(o))}catch(e){}}
function loadSess(){try{return JSON.parse(sessionStorage.getItem('qhd-mj-sess')||'null')}catch(e){return null}}
function clearSess(){try{sessionStorage.removeItem('qhd-mj-sess')}catch(e){}}
let reconnGoing=false,reconnTimer=null,reconnAttempts=0;
function setReconnMsg(t){const el=document.getElementById('rc-msg');if(el)el.textContent=t}
function hideReconn(){const o=document.getElementById('reconn-overlay');if(o)o.style.display='none'}
function onGuestDisconnected(){reconnGoing=true;reconnAttempts=0;const o=document.getElementById('reconn-overlay');if(o)o.style.display='flex';setReconnMsg('网络连接中断，正在自动重连…（30秒内座位为你保留）');scheduleReconnect(1000)}
function scheduleReconnect(ms){if(reconnTimer)clearTimeout(reconnTimer);reconnTimer=setTimeout(doReconnect,ms)}
async function manualReconnect(){if(reconnTimer)clearTimeout(reconnTimer);await doReconnect()}
async function doReconnect(){
 const s=loadSess();
 if(!s||s.host){setReconnMsg('没有可恢复的房间信息，请退出后重新加入。');reconnGoing=false;return}
 reconnAttempts++;setReconnMsg('正在重连房间 '+s.code+'（第 '+reconnAttempts+' 次）…');
 try{if(net)net.destroy()}catch(e){}
 const ok=await joinRoomAsX(s.code,s.name,s.id,true);
 if(ok){reconnGoing=false;if(reconnTimer)clearTimeout(reconnTimer);hideReconn();logMsg('✅ 已重连房间，恢复原座位')}
 else if(reconnAttempts>=6){setReconnMsg('多次重连失败，请检查网络后点「立即重连」，或退出房间。');reconnGoing=false}
 else{setReconnMsg('第 '+reconnAttempts+' 次重连失败，'+(reconnAttempts>=3?'5':'2')+' 秒后重试…');scheduleReconnect(reconnAttempts>=3?5000:2000)}
}
function abandonReconnect(){reconnGoing=false;if(reconnTimer)clearTimeout(reconnTimer);clearSess();hideReconn();try{net&&net.destroy()}catch(e){}net=null;curCode=null;mode='single';setMode('single');logMsg('已退出联机房间')}
function initReconnBanner(){
 const s=loadSess();const box=document.getElementById('lobby-online');
 if(!box)return;
 const old=document.getElementById('reconn-banner');if(old)old.remove();
 const codeInput=document.getElementById('join-code');
 if(s&&!s.host){if(codeInput)codeInput.value=s.code}
 if(!s)return;
 const b=document.createElement('div');b.id='reconn-banner';
 b.style.cssText='margin:8px 0;padding:8px 10px;border:1px solid rgba(201,162,79,.5);border-radius:8px;background:rgba(201,162,79,.1);font-size:13px;color:#f3e3c0;display:flex;align-items:center;justify-content:space-between;gap:8px';
 const sp=document.createElement('span');sp.innerHTML='上次房间 <b style="color:#ffd76a">'+s.code+'</b> · '+(s.host?'房主（不可恢复，需重建）':s.name);
 const btn=document.createElement('button');btn.className='lobby-btn';btn.style.cssText='padding:6px 14px;font-size:13px;flex:0 0 auto';btn.textContent=s.host?'清空记录':'一键重连';
 btn.onclick=function(){if(s.host){clearSess();b.remove()}else{setMode('online');document.getElementById('join-code').value=s.code;doRecover(s)}};
 b.appendChild(sp);b.appendChild(btn);box.insertBefore(b,box.firstChild);
}
async function doRecover(s){setMode('online');const lb=document.getElementById('lobby-status');lb.textContent='正在恢复房间 '+s.code+' …';await joinRoomAsX(s.code,s.name,s.id,true)}
function onlineHostStart(){}
setMode('single');
loadScoreSess();
syncSndBtns();
initQuickChat();
initReconnBanner();
/* 分享链接/小程序卡片直达房间：地址栏带 ?room=123456 时自动切到联机页 */
(function(){try{var m=/[?&]room=([A-Za-z0-9]{6,12})/.exec(location.search);if(!m)return;setMode('online');var inp=document.getElementById('join-code');if(inp)inp.value=m[1];var st=document.getElementById('lobby-status');if(st)st.textContent='好友邀请你加入房间 '+m[1]+'，点「🚪 加入房间」进入'}catch(e){}})();
