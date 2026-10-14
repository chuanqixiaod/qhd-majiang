/* 规则断言用例（由 run-tests.ps1 注入真实 index.html 运行，非独立页面） */
(function(){
var st=document.createElement('style');st.textContent='#qa{position:fixed;inset:0;z-index:99999;background:#f5f1e8;color:#222;font:14px/1.55 "Microsoft YaHei",sans-serif;padding:16px 22px;overflow:auto}#qa h2{margin:0 0 8px}#qa li.p{color:#1a7a43;font-weight:700}#qa li.f{color:#c02020;font-weight:700}';document.head.appendChild(st);
window.__errs=[];window.addEventListener('error',function(e){__errs.push(e.message)});
var logs=[];function ok(n,c,x){logs.push([n,!!c,x||''])}
var _id=0;function mk(s,v){return{suit:s,value:v,id:'q'+(_id++)}}
function k2t(a){return a.map(function(k){return mk(k[0],parseInt(k.slice(1),10))})}
function meld(k,n){var a=[];for(var i=0;i<(n||3);i++)a.push(mk(k[0],+k.slice(1)));return{type:n===4?'kong':'pong',tiles:a}}
function newG(wk){var g=new QHDMahjongGame();g.newRound();g.wanTile=wk?{suit:wk[0],value:+wk.slice(1)}:null;g.wanKey=wk||null;g.phase='discard';g.drawnTileId=null;g.isFirstDraw=[false,false,false,false];return g}
function huOf(arr,wk,meldsArr,drawnKey){
 var g=newG(wk);var p=g.players[0];p.melds=meldsArr||[];p.hand=sortHand(k2t(arr));
 if(drawnKey){var d=p.hand.find(function(t){return tileKey(t)===drawnKey});g.drawnTileId=d?d.id:null}
 return g.checkZiMoHu(0);
}
/* 中发白成顺 */
ok('中发白成顺可胡',huOf(['w1','w2','w3','b4','b5','b6','t7','t8','t9','j1','j2','j3','f1','f1'],null)!==null);
var r1=huOf(['w1','w2','w3','b4','b5','b6','t7','t8','t9','j1','j2','j3','f1','f1'],null);
ok('中发白胡型normal',r1.huResult.type==='normal');
ok('缺白板不胡',huOf(['w1','w2','w3','b4','b5','b6','t7','t8','t9','j1','j2','f1','f1','f3'],null)===null);
ok('混儿顶發胡',huOf(['w1','w2','w3','b4','b5','b6','t7','t8','t9','j1','j3','b9','f1','f1'],'b9')!==null);
ok('中刻风刻常规胡',huOf(['w1','w2','w3','b4','b5','b6','t7','t8','t9','f2','f2','f2','j1','j1','j1','f1','f1'],null)!==null);
/* 混吊/混钓混 */
var ms3=[meld('b2'),meld('b3'),meld('b4'),meld('b5')];
var rHD=huOf(['w9','w5'],'w9',ms3,'w5');
ok('混吊仍判: 留混摸真牌',rHD&&rHD.opts.isHunDiao===true&&!rHD.opts.isHunDiaoHun);
ok('混吊倍率24(混吊2×碰碰3×吊车4)',rHD&&rHD.fenpai.totalMultiplier===24,rHD&&rHD.fenpai.totalMultiplier+'');
ok('混吊番名含混吊',rHD&&rHD.fenpai.fans.some(function(f){return f.name==='混吊'}));
var rHH=huOf(['w9','w9'],'w9',ms3,'w9');
ok('混钓混仍判: 留混摸混',rHH&&rHH.opts.isHunDiaoHun===true);
ok('混钓混倍率48(混钓混4×碰碰3×吊车4)',rHH&&rHH.fenpai.totalMultiplier===48,rHH&&rHH.fenpai.totalMultiplier+'');
var rHM=huOf(['w5','w9'],'w9',ms3,'w9');
ok('留真摸混也算混吊',rHM&&rHM.opts.isHunDiao===true&&!rHM.opts.isHunDiaoHun);
ok('留真摸混倍率24(混吊2×碰碰3×吊车4)',rHM&&rHM.fenpai.totalMultiplier===24,rHM&&rHM.fenpai.totalMultiplier+'');
ok('留真摸混番名含混吊',rHM&&rHM.fenpai.fans.some(function(f){return f.name==='混吊'}));
var rHN=huOf(['w9','w9'],'w9',ms3);
ok('drawnTileId缺失双混兜底混钓混',rHN&&rHN.opts.isHunDiaoHun===true);
var rHS=huOf(['w5','w9'],'w9',ms3);
ok('drawnTileId缺失单混兜底混吊',rHS&&rHS.opts.isHunDiao===true);
/* 双混吊已移除 */
var ms2=[meld('b2'),meld('b3'),meld('b4')];
var rSH=huOf(['w1','w1','w9','w9','w2'],'w9',ms2,'w2');
ok('原双混吊牌形仍能胡',rSH!==null);
ok('opts无isShuangHunDiao标记',rSH&&(rSH.opts.isShuangHunDiao===undefined));
ok('番型列表无双混吊',rSH&&!rSH.fenpai.fans.some(function(f){return f.name.indexOf('双混吊')>=0}));
ok('原双混吊牌形无混吊番(倍率仅碰碰3)',rSH&&rSH.fenpai.totalMultiplier===3,rSH&&rSH.fenpai.totalMultiplier+'');
ok('番名=平胡+碰碰胡',rSH&&rSH.fenpai.fans.length===2&&rSH.fenpai.fans[0].name==='平胡'&&rSH.fenpai.fans[1].name==='碰碰胡');
/* FAN_CONFIG 集中配置 */
ok('FAN_CONFIG存在',typeof FAN_CONFIG==='object');
['pengpeng','dadiaoche','gangshanghua','haidilaoyue','menqing','suhu','hundiao','hundiaohun'].forEach(function(k){
 ok('FAN_CONFIG.'+k+'有名称倍率',FAN_CONFIG[k]&&FAN_CONFIG[k].name&&FAN_CONFIG[k].m>0);
});
ok('碰碰胡倍率配置=3',FAN_CONFIG.pengpeng.m===3);
ok('七对名表4档',FAN_CONFIG.qiduiNames&&FAN_CONFIG.qiduiNames.length===4);
/* P0/P1：逐番语音队列、口语番名、录音包接口 */
ok('speakSeq顺播函数',typeof speakSeq==='function');
ok('cancelSpeech函数',typeof cancelSpeech==='function');
ok('huSpeakLines函数',typeof huSpeakLines==='function');
ok('playCue录音回退函数',typeof playCue==='function');
ok('DIALECT_FILES录音包表',typeof DIALECT_FILES==='object');
ok('sayMul(2)口语=两倍',sayMul(2)==='两倍',sayMul(2));
ok('calcFenpai每项fan携带say',rHD.fenpai.fans.every(function(f){return typeof f.say==='string'&&f.say.length>0}));
ok('混吊口语番名=混儿吊',FAN_CONFIG.hundiao.say==='混儿吊');
ok('杠上花口语番名=杠上开花',FAN_CONFIG.gangshanghua.say==='杠上开花');
(function(){var fake={winnerSeat:0,fenpai:rHD.fenpai};
 var lines=huSpeakLines(fake,false);
 ok('普通话逐番词数>=4',lines.length>=4,lines.join(' / '));
 ok('普通话逐念混儿吊两倍',lines.some(function(l){return l.indexOf('混儿吊')>=0&&l.indexOf('两倍')>=0}),lines.join(' / '));
 ok('普通话尾句总倍数二十四倍',lines[lines.length-1].indexOf('二十四倍')>=0,lines[lines.length-1]);
 var lo=huSpeakLines(fake,true);
 ok('本地话开场含自摸嘞',lo[0].indexOf('自摸嘞')>=0,lo[0]);
 ok('本地话尾句含每家掏',lo[lo.length-1].indexOf('每家掏')>=0,lo[lo.length-1]);
})();
/* P0/P1：UI层新能力节点（真实index.html注入） */
ok('playHuFanfare函数',typeof playHuFanfare==='function');
ok('setTalkMode函数',typeof setTalkMode==='function');
ok('showQuickBubble函数',typeof showQuickBubble==='function');
ok('QUICK_MSGS>=4条',typeof QUICK_MSGS!=='undefined'&&QUICK_MSGS.length>=4);
ok('#hu-show全屏层',!!document.getElementById('hu-show'));
ok('#chat-panel面板',!!document.getElementById('chat-panel'));
ok('#set-talk口吻选择',!!document.getElementById('set-talk'));
ok('#btn-chat快捷语按钮',!!document.getElementById('btn-chat'));
showQuickBubble(0,'测试气泡',true);
ok('气泡可挂载到座位',document.querySelectorAll('#seat-0 .chat-bubble').length===1);
/* 动画速度=0：演出立即结束直接落结算面板（音效/语音仍触发，不抛错） */
var fxNext=false,fxErr=null;
try{localStorage.setItem('qhd-anim-speed','0');
 playHuFanfare({winnerSeat:0,totalMultiplier:8,fenpai:{fans:[{name:'平胡',say:'平胡',m:1}],totalMultiplier:8}},function(){fxNext=true});
}catch(e){fxErr=e.message}
ok('动画关闭立即落面板',fxNext===true&&!fxErr,fxErr||'');
ok('动画关闭演出层不留on',document.getElementById('hu-show').className.indexOf('on')<0,document.getElementById('hu-show').className);
localStorage.removeItem('qhd-anim-speed');
/* 第一档打磨：点击跳过立即落面板并清空定时器；大满贯走grand音效分支 */
ok('Sound.grand大满贯音效存在',typeof Sound.grand==='function');
var skipNext=false,skipErr=null;
try{
 playHuFanfare({winnerSeat:0,totalMultiplier:8,fenpai:{fans:[{name:'平胡',say:'平胡',m:1},{name:'门清',say:'门清',m:2}],totalMultiplier:8}},function(){skipNext=true});
 var shown=document.getElementById('hu-show').className.indexOf('on')>=0;
 var earlyChips=[].map.call(document.querySelectorAll('#hu-show .hs-fan'),function(c){return getComputedStyle(c).opacity});
 var earlyTotal=getComputedStyle(document.querySelector('#hu-show .hs-total')).opacity;
 document.getElementById('hu-show').click();
}catch(e){skipErr=e.message}
ok('演出默认显示',shown===true);
ok('未到揭示时刻番条全部隐藏',earlyChips.length===2&&earlyChips.every(function(o){return o==='0'}),earlyChips.join(','));
ok('未到揭示时刻总倍率隐藏',earlyTotal==='0',earlyTotal);
ok('点击跳过立即落面板',skipNext===true&&!skipErr,skipErr||'');
ok('点击跳过后演出层关闭',document.getElementById('hu-show').className.indexOf('on')<0);
ok('点击跳过后无残留定时器',huFxTimers.length===0,String(huFxTimers.length));
(function(){var grandHit=0,huHit=0;var og=Sound.grand,oh=Sound.hu;Sound.grand=function(){grandHit++};Sound.hu=function(){huHit++};
 playHuFanfare({winnerSeat:0,totalMultiplier:48,fenpai:{fans:[{name:'平胡',say:'平胡',m:1}],totalMultiplier:48}},function(){});
 document.getElementById('hu-show').click();
 Sound.grand=og;Sound.hu=oh;
 ok('48倍大满贯播grand音效',grandHit===1&&huHit===0,'grand='+grandHit+' hu='+huHit);})();
/* 快捷语：每条非空；同座位气泡最多挂3条 */
ok('QUICK_MSGS共6条且均非空',QUICK_MSGS.length===6&&QUICK_MSGS.every(function(m){return typeof m==='string'&&m.length>0}));
for(var qi=0;qi<5;qi++)showQuickBubble(0,'压栈气泡'+qi,false);
ok('气泡上限3条',document.querySelectorAll('#seat-0 .chat-bubble').length===3);
/* MQTT quickmsg 分发：不依赖连接，直接驱动 _h */
(function(){var got=[];var fc=Object.create(MahjongNet.prototype);
 fc.onMsg=function(t,d){got.push([t,d])};
 fc._h({type:'quickmsg',from:'p1',seat:3,i:2});
 fc._h({type:'quickmsg',from:'p1',seat:1,text:'你好',sys:true});
 fc._h({type:'unknown-xyz',from:'p1'});
 ok('quickmsg分发2条且未知类型忽略',got.length===2&&got[0][0]==='quickmsg'&&got[1][0]==='quickmsg');
 ok('quickmsg载荷seat/i/sys',got[0][1].seat===3&&got[0][1].i===2&&got[0][1].sys===false&&got[1][1].sys===true&&got[1][1].text==='你好');
})();
/* 胡牌提示卡 UI */
setTimeout(function(){
 try{
  mode='single';mySeat=0;enterTable();
  game=new QHDMahjongGame();game.newRound();
  game.wanTile={suit:'w',value:9};game.wanKey='w9';
  game.isFirstDraw=[false,false,false,false];
  game.players[0].melds=[meld('b2'),meld('b3'),meld('b4'),meld('b5')];
  var hun=mk('w',9),real=mk('w',5);
  game.players[0].hand=sortHand([hun,real]);
  game.drawnTileId=real.id;game.currentSeat=0;game.phase='discard';game.gangAfterDraw=false;
  beginSelfTurn(0);renderActions();
  var bar=document.getElementById('action-bar');
  var huBtn=[].slice.call(bar.querySelectorAll('button')).find(function(b){return b.textContent==='胡！'});
  ok('胡牌按钮存在',!!huBtn);
  var tip=bar.querySelector('.hu-tip');
  ok('胡按钮旁提示卡存在',!!tip);
  ok('提示标题[自摸 24 倍]',!!tip&&tip.querySelector('.ht-title').textContent==='自摸 24 倍',tip&&tip.querySelector('.ht-title').textContent);
  var ft=tip?tip.querySelector('.ht-fans').textContent:'';
  ok('提示含番名[平胡][混吊×2]',ft.indexOf('平胡')>=0&&ft.indexOf('混吊×2')>=0,ft);
  var gn=tip?tip.querySelector('.ht-gain').textContent:'';
  ok('提示积分[每家付24分·共赢72分]',gn==='每家付 24 分 · 共赢 72 分',gn);
  game.gangAfterDraw=true;
  beginSelfTurn(0);renderActions();
  var tip2=document.querySelector('#action-bar .hu-tip');
  ok('杠上花叠加提示[自摸 48 倍]',!!tip2&&tip2.querySelector('.ht-title').textContent==='自摸 48 倍',tip2&&tip2.querySelector('.ht-title').textContent);
  var gn2=tip2?tip2.querySelector('.ht-gain').textContent:'';
  ok('叠加积分[每家付48分·共赢144分]',gn2==='每家付 48 分 · 共赢 144 分',gn2);
  var ft2=tip2?tip2.querySelector('.ht-fans').textContent:'';
  ok('叠加番名含杠上花',ft2.indexOf('杠上花')>=0,ft2);
  /* settle 新契约（v20 移除 payments）：结算面板直接渲染不抛错 */
  var sr=null,setErr=null,detailTxt='';
  try{
   localStorage.setItem('qhd-anim-speed','0');
   var hi2=game.checkZiMoHu(0);
   sr=game.settle(0,hi2);game.result=sr;
   showResult(sr);
   detailTxt=document.getElementById('result-detail').textContent;
  }catch(e){setErr=e.message}
  ok('settle不再返回payments',sr&&sr.payments===undefined&&sr.totalMultiplier===48,setErr||(sr&&String(sr.totalMultiplier))||'');
  ok('结算面板按新契约渲染',!setErr&&detailTxt.indexOf('赢家 +144')>=0&&detailTxt.indexOf('各 -48')>=0,setErr||detailTxt);
  localStorage.removeItem('qhd-anim-speed');
  document.getElementById('result-overlay').style.display='none';
  /* ===== v21 第一档5项 ===== */
  /* 1.庄家轮换：胡牌者连庄、流局下家庄 */
  ok('胡牌后pendingBanker=赢家(连庄)',pendingBanker===0,'pendingBanker='+pendingBanker);
  game.bankerSeat=2;
  showResult({liuju:true});
  ok('流局后pendingBanker=下家庄',pendingBanker===3,'pendingBanker='+pendingBanker);
  var eb=new QHDMahjongGame();
  eb.newRound(2);
  ok('引擎newRound接受庄家位',eb.bankerSeat===2);
  ok('引擎nextBanker胡牌连庄',eb.nextBanker(2)===2);
  ok('引擎nextBanker流局下庄',eb.nextBanker(null)===3);
  document.getElementById('result-overlay').style.display='none';
  huangWarned=true;
  hostStartGame();
  startGangKeys=[];pending=null;clearTurnClock();
  ok('新一局庄家=流局下家(3)',game.bankerSeat===3,'banker='+game.bankerSeat);
  ok('hostStartGame清空pendingBanker',pendingBanker===null);
  ok('hostStartGame重置黄牌标记',huangWarned===false);
  game.bankerSeat=0;renderAll();
  ok('本人坐庄名称显示[我·庄]',document.querySelector('#seat-0 .name').textContent==='我·庄',document.querySelector('#seat-0 .name').textContent);
  /* 3.牌墙/余牌同口径：liuJuDun(0)=13墩即26张流局墩，开局可摸110张 */
  ok('remainTiles初始110(扣除26张流局墩)',remainTiles({drawCursor:0,gangCount:0})===110);
  ok('remainTiles随摸牌减少',remainTiles({drawCursor:10,gangCount:0})===100);
  ok('remainTiles每杠减2墩(gang1墩数7)',remainTiles({drawCursor:0,gangCount:1})===136-7*2);
  /* 4.黄牌预警：余牌<=8语音一次，不重复 */
  game.gangCount=0;game.drawCursor=102;
  var said=[];var _speak=speak;speak=function(t){said.push(t)};
  renderCenter();
  var chipTxt=document.getElementById('remain-chip').textContent;
  ok('余牌芯片显示8张且变红',chipTxt.indexOf('8')>=0&&document.getElementById('remain-chip').classList.contains('low'),chipTxt);
  ok('黄牌语音播报一次',said.length===1&&said[0].indexOf('黄牌')>=0,JSON.stringify(said));
  renderCenter();
  ok('黄牌不重复播报',said.length===1);
  speak=_speak;
  /* 2.托管角标：主机视角+state序列化online+客人视角 */
  mode='online';net={isHost:true,myId:'h1'};mySeat=0;
  hostPeers=[
   {peerId:'h1',seat:0,name:'你(主机)',online:true},
   {peerId:'g1',seat:1,name:'甲',online:true},
   {peerId:'g2',seat:2,name:'乙',online:false},
   {peerId:'g3',seat:3,name:'丙',online:true}
  ];
  renderAll();
  ok('主机端掉线座位显示托管角标',!!document.querySelector('#seat-'+viewMap().indexOf(2)+' .hosted-badge'));
  ok('主机端在线座位无角标',!document.querySelector('#seat-'+viewMap().indexOf(1)+' .hosted-badge'));
  var serOwn=serializeForClient('g2').state;
  ok('序列化:掉线者本人收到online=true',serOwn.players.find(p=>p.seat===2).online===true);
  var serOther=serializeForClient('g1').state;
  ok('序列化:他人看到掉线者online=false',serOther.players.find(p=>p.seat===2).online===false);
  ok('序列化:在线者online=true',serOther.players.find(p=>p.seat===1).online===true);
  net={isHost:false,myId:'g1'};mySeat=1;game.players=serOther.players;
  renderAll();
  ok('客人端看到他人托管角标',!!document.querySelector('#seat-'+viewMap().indexOf(2)+' .hosted-badge'));
  ok('客人端自己无托管角标',!document.querySelector('#seat-'+viewMap().indexOf(1)+' .hosted-badge'));
  mode='single';net=null;hostPeers=[];mySeat=0;
  /* 5.震动：仅触屏设备调用navigator.vibrate */
  var vibs=[];var origMM=window.matchMedia;
  Object.defineProperty(navigator,'vibrate',{configurable:true,writable:true,value:function(p){vibs.push(p)}});
  window.matchMedia=function(q){return{matches:q.indexOf('coarse')>=0}};
  buzz(10);
  ok('触屏设备震动被调用',vibs.length===1&&vibs[0]===10,JSON.stringify(vibs));
  window.matchMedia=function(q){return{matches:false}};
  buzz(20);
  ok('非触屏设备不震动',vibs.length===1);
  window.matchMedia=origMM;delete navigator.vibrate;
  pending=null;
 }catch(e){ok('UI断言异常:'+e.message,false)}
 finish();
},400);
function finish(){
 var h='<h2>规则+番型配置+胡牌提示 断言</h2><ul>';var pass=0;
 logs.forEach(function(l){if(l[1])pass++;h+='<li class="'+(l[1]?'p':'f')+'">'+(l[1]?'✓':'✗')+' '+l[0]+(l[2]&&!l[1]?' → '+l[2]:'')+'</li>'});
 h+='</ul><div>'+pass+'/'+logs.length+' PASS</div>';
 if(__errs.length)h+="<div style='color:#c02020;font-weight:700'>JS错误: "+__errs.join(' || ')+'</div>';else h+="<div style='color:#1a7a43;font-weight:700'>零JS错误</div>";
 var qa=document.createElement('div');qa.id='qa';qa.innerHTML=h;document.body.appendChild(qa);
 document.title='DONE '+pass+'/'+logs.length;
}
})();
