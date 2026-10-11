/* 断线重连/30秒托管 + 设置面板 断言用例（由 run-tests.ps1 注入真实 index.html 运行；需公网 MQTT broker） */
(function(){
/* 真实时钟模式：用一个不可路由地址的挂起图片阻塞 window.load，无头截图/dump-dom 会等到测试结束放行后才采集 */
var __holdImg;function __hold(){__holdImg=new Image();__holdImg.src='http://10.255.255.1/h.png?t='+Date.now()}
__hold();var __holdIv=setInterval(__hold,10000);
window.__releaseLoad=function(){clearInterval(__holdIv);try{__holdImg.src='about:blank'}catch(e){}};
var st=document.createElement('style');st.textContent='#qa{position:fixed;inset:0;z-index:99999;background:#f5f1e8;color:#222;font:14px/1.55 "Microsoft YaHei",sans-serif;padding:16px 22px;overflow:auto}#qa h2{margin:0 0 8px}#qa li.p{color:#1a7a43;font-weight:700}#qa li.f{color:#c02020;font-weight:700}';document.head.appendChild(st);
window.__errs=[];window.addEventListener('error',function(e){__errs.push(e.message)});
var logs=[];function ok(n,c,x){logs.push([n,!!c,x||''])}
function waitFor(fn,timeout,step){step=step||250;return new Promise(function(res,rej){var t0=Date.now();(function poll(){var v;try{v=fn()}catch(e){v=e}if(v===true)return res();if(v instanceof Error)return rej(v);if(Date.now()-t0>timeout)return rej(new Error('waitFor超时'));setTimeout(poll,step)})()})}
function logText(){var l=document.getElementById('msg-log');return l?l.textContent:''}
async function main(){
 /* ===== 设置面板 ===== */
 try{
  openSettings();
  var so=document.getElementById('settings-overlay');
  ok('设置面板打开',so.style.display==='flex');
  var sel=document.getElementById('set-voice');
  ok('播报音色≥3套',sel.options.length>=3,'options='+sel.options.length);
  setSfxVol(45);ok('音量设置持久化',localStorage.getItem('qhd-sfx-vol')==='0.45',localStorage.getItem('qhd-sfx-vol'));
  setVoiceRate(130);ok('语速设置持久化',localStorage.getItem('qhd-voice-rate')==='1.3',localStorage.getItem('qhd-voice-rate'));
  setAnimSpeed('1.6');ok('动画速度持久化',localStorage.getItem('qhd-anim-speed')==='1.6'&&animSpeed()===1.6);
  var tags=document.querySelectorAll('#set-rules-body .fan-tag');
  ok('规则页番型标签≥10个',tags.length>=10,'tags='+tags.length);
  ok('番型标签含混吊',document.getElementById('set-rules-body').textContent.indexOf('混吊')>=0);
  closeSettings();ok('设置面板关闭',so.style.display==='none');
 }catch(e){ok('设置面板断言异常:'+e.message,false)}
 /* ===== 重连横幅（刷新后找回房间） ===== */
 try{
  sessionStorage.setItem('qhd-mj-sess',JSON.stringify({host:false,code:'654321',id:'gtest123',name:'测友甲'}));
  initReconnBanner();
  var b=document.getElementById('reconn-banner');
  ok('重连横幅显示',!!b&&b.textContent.indexOf('654321')>=0,b?b.textContent:'无横幅');
  ok('房间号自动回填',document.getElementById('join-code').value==='654321');
 }catch(e){ok('重连横幅断言异常:'+e.message,false)}
 /* ===== 联机断线重连/托管 E2E（真实 MQTT broker） ===== */
 var ghosts=[],seatOf={},stage='开始';
 function diag(){try{return JSON.stringify({stage:stage,mqtt:typeof mqtt,curCode:curCode,netOk:!!(net&&net._ok),peers:hostPeers.length,started:gameStarted,phase:game?game.phase:null,lobby:(document.getElementById('lobby-status')||{}).textContent||''})}catch(e){return 'diag失败:'+e.message}}
 try{
  stage='等待MQTT库';
  await waitFor(function(){return typeof mqtt!=='undefined'},30000);
  ok('MQTT库已加载',typeof mqtt!=='undefined');
  stage='主机建房';
  await createRoom();
  await waitFor(function(){return !!(net&&net._ok)},30000);
  ok('主机建房并连上MQTT',!!curCode&&/^\d{6}$/.test(curCode),'room='+curCode);
  var code=curCode;
  var names=['乙家Q','丙家Q','丁家Q'];
  stage='三个客户端加入';
  for(var i=0;i<3;i++){
   var g=new MahjongNet(function(){});
   var gid=await g.joinRoom(code,names[i],null);
   g.name=names[i];g.id=gid;ghosts.push(g);
  }
  stage='等待4人齐';
  await waitFor(function(){return hostPeers.length===4},30000);
  ok('4人齐(含3个重连客户端)',hostPeers.length===4,'peers='+hostPeers.length);
  stage='等待自动开局';
  await waitFor(function(){return gameStarted===true&&!!game&&game.phase==='discard'},30000);
  ok('满员自动开局',gameStarted&&game.phase==='discard','phase='+(game&&game.phase));
  hostPeers.forEach(function(p){seatOf[p.peerId]=p.seat});
  /* A. 秒回：destroy 后用同一 peerId 立即重连，座位不得丢、不得触发托管 */
  stage='秒回重连';
  var g1=ghosts[0],id1=g1.id,t0=Date.now();
  g1.destroy();
  var g1b=new MahjongNet(function(){});await g1b.joinRoom(code,g1.name,id1);g1b.id=id1;g1b.name=g1.name;ghosts[0]=g1b;
  await waitFor(function(){var p=hostPeers.find(function(x){return x.peerId===id1});return p&&p.online===true&&p.lastSeen>=t0},30000);
  var hp1=hostPeers.find(function(x){return x.peerId===id1});
  ok('秒回保留原座位',!!hp1&&hp1.seat===seatOf[id1]&&hp1.online===true,'seat='+(hp1&&hp1.seat));
  await new Promise(function(r){setTimeout(r,600)});
  ok('秒回未触发托管提示',logText().indexOf('乙家Q 掉线')<0);
  /* B. 掉线超过30秒：主机看门狗置离线→系统托管 */
  stage='等待30秒离线托管';
  var g2=ghosts[1],id2=g2.id,seat2=seatOf[id2];
  g2.destroy();
  await waitFor(function(){var p=hostPeers.find(function(x){return x.peerId===id2});return p&&p.online===false},90000);
  var hp2=hostPeers.find(function(x){return x.peerId===id2});
  ok('掉线30秒主机置离线',!!hp2&&hp2.online===false);
  ok('离线座位自动托管(isAI)',isAI(seat2)===true&&seatOnline(seat2)===false);
  ok('全桌收到掉线托管通知',logText().indexOf('掉线')>=0&&logText().indexOf('托管')>=0);
  /* C. 同 peerId 重连：恢复在线、取消托管 */
  stage='重连恢复';
  var g2b=new MahjongNet(function(){});await g2b.joinRoom(code,g2.name,id2);g2b.id=id2;g2b.name=g2.name;ghosts[1]=g2b;
  await waitFor(function(){var p=hostPeers.find(function(x){return x.peerId===id2});return p&&p.online===true},30000);
  ok('重连后恢复本人座位',hostPeers.find(function(x){return x.peerId===id2}).online===true&&isAI(seat2)===false&&seatOnline(seat2)===true);
  ok('全桌收到重连恢复通知',logText().indexOf('已重连')>=0);
 }catch(e){
  ok('联机重连E2E异常['+stage+']:'+e.message+' '+diag(),false);
 }finally{
  ghosts.forEach(function(g){try{g.destroy()}catch(e){}});
 }
 finish();
 setTimeout(function(){try{window.__releaseLoad()}catch(e){}},500);
}
function finish(){
 var h='<h2>断线重连/托管 + 设置面板 断言</h2><ul>';var pass=0;
 logs.forEach(function(l){if(l[1])pass++;h+='<li class="'+(l[1]?'p':'f')+'">'+(l[1]?'✓':'✗')+' '+l[0]+(l[2]&&!l[1]?' → '+l[2]:'')+'</li>'});
 h+='</ul><div>'+pass+'/'+logs.length+' PASS</div>';
 if(__errs.length)h+="<div style='color:#c02020;font-weight:700'>JS错误: "+__errs.join(' || ')+'</div>';else h+="<div style='color:#1a7a43;font-weight:700'>零JS错误</div>";
 var qa=document.createElement('div');qa.id='qa';qa.innerHTML=h;document.body.appendChild(qa);
 document.title='DONE '+pass+'/'+logs.length;
}
setTimeout(main,500);
})();
