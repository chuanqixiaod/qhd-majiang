/* 五局整局自走回归（由 run-tests.ps1 注入运行，virtual-time-budget=600000） */
(function(){
var st=document.createElement('style');st.textContent='#qa2{position:fixed;left:8px;top:8px;z-index:2147483647;background:rgba(255,255,255,.95);color:#111;font:13px/1.5 Consolas,monospace;padding:10px 14px;border-radius:8px;border:2px solid #888;max-width:72vw;white-space:pre-wrap}';
document.head.appendChild(st);
window.__errs=[];window.addEventListener('error',function(e){__errs.push(e.message)});
var log=document.createElement('div');log.id='qa2';document.body.appendChild(log);
function say(s){log.textContent=s}
mode='single';startGame();
var rounds=0,actions=0,roundStart=Date.now(),done=false,gangs=0,tipSeen=0;
function idCheck(){
 var seen={},dup=[];
 game.players.forEach(function(p){
  p.hand.forEach(function(t){if(seen[t.id])dup.push(t.id);seen[t.id]=1});
  p.melds.forEach(function(m){m.tiles.forEach(function(t){if(seen[t.id])dup.push(t.id);seen[t.id]=1})});
  (p.discards||[]).forEach(function(t){if(seen[t.id])dup.push(t.id);seen[t.id]=1});
 });
 return dup;
}
var iv=setInterval(function(){
 if(done)return;
 try{
  if(!game)return;
  var ov=document.getElementById('result-overlay');
  if(ov&&ov.style.display!=='none'){
   rounds++;
   if(rounds>=5){report();return}
   closeResult();roundStart=Date.now();return;
  }
  if(startGangKeys&&startGangKeys.length){gangs++;skipStartGang();return}
  var pr=(typeof activePrompt!=='undefined')?activePrompt():null;
  if(pr){
   if(pr.kind==='claim'){sendResp('pass');return}
   if(pr.hu){tipSeen++;var el=document.querySelector('#action-bar .hu-tip');if(el){var g=el.querySelector('.ht-gain').textContent;if(g.indexOf('每家付')<0||g.indexOf('共赢')<0)__errs.push('bad gain text: '+g)}sendResp('hu');return}
  }
  if(game.phase==='discard'&&game.currentSeat===0){
   var h=game.players[0].hand;
   var idx=-1;for(var i=0;i<h.length;i++){if(!game.wanTile||!isSameTile(h[i],game.wanTile)){idx=i;break}}
   if(idx>=0){doDiscard(0,idx);actions++}
  }
  if(Date.now()-roundStart>40000){rounds++;if(rounds>=5){report('timeout')}else{startGame();roundStart=Date.now()}return}
  if(actions>6000){report('cap')}
 }catch(e){__errs.push(String(e.message||e))}
},120);
function report(why){
 done=true;clearInterval(iv);
 var dup=[],err2='';
 try{dup=idCheck()}catch(e){err2=String(e.message||e)}
 var msg='rounds:'+rounds+'  discards:'+actions+'  startGang:'+gangs+'  huTipShows:'+tipSeen+'\n';
 msg+='dupIDs:'+(dup.length?dup.join(','):'none')+'\n';
 msg+='JSerrors:'+(__errs.length?__errs.slice(0,8).join(' | '):'none')+'\n';
 if(err2)msg+='idCheckErr:'+err2+'\n';
 msg+='phase='+game.phase+(why?('\n'+why):'');
 var ok=rounds>=5&&!__errs.length&&!dup.length&&!err2;
 msg=(ok?'PASS 5-round regression\n':'FAIL\n')+msg;
 say(msg);document.title='DONE '+(ok?'PASS':'FAIL');
 document.getElementById('result-overlay').style.display='none';
}
})();
