/* 全谱牌面视觉断言（70×98px牌桩/34张全谱；由 run-tests.ps1 注入运行） */
(function(){
var st=document.createElement('style');st.textContent='\
#lobby,#table{display:none!important}\
#tkbox{position:static;padding:14px 18px;background:#0a1411;min-height:100vh}\
#tkbox .row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;align-items:flex-end}\
#tkbox .cell{display:flex;flex-direction:column;align-items:center;gap:3px}\
#tkbox .cell span.lab{color:#9fb3a6;font:11px Consolas,monospace}\
#tkbox .tile{width:70px!important;height:98px!important;max-width:none!important;font-size:34px!important;margin:0!important;flex:0 0 auto!important}\
#qa{margin:10px 0 30px;padding:12px 16px;background:#f5f1e8;color:#222;font:13px/1.55 "Microsoft YaHei",sans-serif;border-radius:8px}\
#qa h2{margin:0 0 6px}#qa li.p{color:#1a7a43;font-weight:700}#qa li.f{color:#c02020;font-weight:700}';
document.head.appendChild(st);
window.__errs=[];window.addEventListener('error',function(e){__errs.push(e.message)});
var logs=[];function ok(n,c,x){logs.push([n,!!c,x||''])}
var box=document.createElement('div');box.id='tkbox';document.body.appendChild(box);
var groups=[['w',[1,2,3,4,5,6,7,8,9],'w'],['b',[1,2,3,4,5,6,7,8,9],'b'],['t',[1,2,3,4,5,6,7,8,9],'t'],['f',[1,2,3,4],'f'],['j',[1,2,3],'j']];
var T={};
groups.forEach(function(g){
 var row=document.createElement('div');row.className='row';
 g[1].forEach(function(v){
  var cell=document.createElement('div');cell.className='cell';
  var tl=renderTile({suit:g[0],value:v});
  T[g[0]+v]=tl;cell.appendChild(tl);
  var lab=document.createElement('span');lab.className='lab';lab.textContent=g[2]+v;cell.appendChild(lab);
  row.appendChild(cell);
 });
 box.appendChild(row);
});
function axis(el){var r=el.getBoundingClientRect();return r.left+r.width/2}
function cs(el,p){return parseFloat(getComputedStyle(el)[p])}
function symMax(els,c){var xs=[].map.call(els,axis).sort(function(a,b){return a-b});var m=0;for(var i=0;i<xs.length/2;i++){m=Math.max(m,Math.abs((xs[i]+xs[xs.length-1-i])/2-c))}return m}
setTimeout(function(){
 try{
  var num=T.w1.querySelector('.tk-num'),suit=T.w1.querySelector('.tk-suit');
  var fz=cs(num,'fontSize');ok('wan1 num .68em(23px)',fz>=22&&fz<=24.5,fz+'');
  ok('wan1 suit .68em',cs(suit,'fontSize')>=22&&cs(suit,'fontSize')<=24.5,cs(suit,'fontSize')+'');
  var nr=num.getBoundingClientRect(),sr=suit.getBoundingClientRect();
  ok('wan num/suit no overlap',nr.bottom<sr.top-2,nr.bottom+' vs '+sr.top);
  var d7=T.b7.querySelector('.d7'),topD=T.b7.querySelector('.top7'),gD=T.b7.querySelectorAll('.g7 .dot');
  ok('b7 d7 exists',!!d7);ok('b7 top is red',topD.className.indexOf('r')>=0);
  ok('b7 top centered',Math.abs(axis(topD)-axis(d7))<=1.6);
  ok('b7 six group dots',gD.length===6,gD.length+'');
  var tr=topD.getBoundingClientRect(),gr=T.b7.querySelector('.g7').getBoundingClientRect();
  ok('b7 lone dot gap>=2',gr.top-tr.bottom>=2,(gr.top-tr.bottom).toFixed(1));
  ok('b7 lone dot bigger(.5em)',tr.width>=16&&tr.width<=18,tr.width.toFixed(1));
  ok('b7 six mirror symmetric',symMax(gD,axis(T.b7.querySelector('.g7')))<=1.6,symMax(gD,axis(T.b7.querySelector('.g7'))).toFixed(1));
  var t7=T.t7.querySelector('.t7'),topB=T.t7.querySelector('.top7'),gB=T.t7.querySelectorAll('.g7 i');
  ok('t7 exists',!!t7);ok('t7 top red',topB.className.indexOf('r')>=0);
  ok('t7 top centered',Math.abs(axis(topB)-axis(t7))<=1.6);
  var tbr=topB.getBoundingClientRect(),gbr=T.t7.querySelector('.g7').getBoundingClientRect();
  ok('t7 lone bar gap>=2',gbr.top-tbr.bottom>=2,(gbr.top-tbr.bottom).toFixed(1));
  ok('t7 lone taller .78 vs .6em',tbr.height-gB[0].getBoundingClientRect().height>=4,tbr.height.toFixed(1)+'/'+gB[0].getBoundingClientRect().height.toFixed(1));
  ok('t7 six group bars',gB.length===6);
  ok('t7 six mirror symmetric',symMax(gB,axis(T.t7.querySelector('.g7')))<=1.6,symMax(gB,axis(T.t7.querySelector('.g7'))).toFixed(1));
  var flag=T.j1.querySelector('svg.geo-zhong');
  ok('flag svg',!!flag);
  var rect=flag.querySelector('rect');
  var fw=+rect.getAttribute('width'),fh=+rect.getAttribute('height');
  ok('flag landscape 1.53',Math.abs(fw/fh-1.533)<=.05,fw+'/'+fh);
  ok('flag red #c2564a',rect.getAttribute('fill').toLowerCase()==='#c2564a');
  var star=flag.querySelector('path');
  ok('flag star gold',!!star&&star.getAttribute('fill').toLowerCase()==='#f0cf63');
  ok('flag star R17',star.getAttribute('transform').indexOf('scale(17)')>=0);
  ok('flag no zhong text',T.j1.textContent.indexOf('中')<0);
  var meta={1:['E','0'],2:['S','90'],3:['W','180'],4:['N','270']},han={1:'dong',2:'nan',3:'xi',4:'bei'};
  [1,2,3,4].forEach(function(v){
   var svg=T['f'+v].querySelector('svg');
   var cir=svg.querySelector('circle'),pol=svg.querySelector('g polygon'),texts=svg.querySelectorAll('text');
   ok('f'+v+' ring thick>=2.5',+cir.getAttribute('stroke-width')>=2.5,cir.getAttribute('stroke-width'));
   ok('f'+v+' hanzi size23 w800',texts[1].getAttribute('font-size')==='23'&&texts[1].getAttribute('font-weight')==='800');
   ok('f'+v+' rotate '+meta[v][1],pol.parentNode.getAttribute('transform')==='rotate('+meta[v][1]+' 50 60)');
   ok('f'+v+' letter '+meta[v][0],texts[0].textContent===meta[v][0]);
   ok('f'+v+' hanzi present',texts[1].textContent.length===1);
  });
  var mw=T.t8.querySelector('svg.mw8');
  ok('t8 mw8 svg',!!mw);
  var paths=mw.querySelectorAll('path');
  ok('t8 four strokes',paths.length===4,paths.length+'');
  ok('t8 stroke width9',paths[0].getAttribute('stroke-width')==='9');
  var bbM=paths[0].getBoundingClientRect(),bbW=paths[1].getBoundingClientRect();
  ok('t8 M above W',bbM.bottom<=bbW.top+2,bbM.bottom+'/'+bbW.top);
  ok('t8 color #637a90',paths[0].getAttribute('stroke')==='#637a90'&&paths[1].getAttribute('stroke')==='#637a90');
  var bad=[];
  Object.keys(T).forEach(function(k){
   var f=T[k],fr=f.getBoundingClientRect();
   f.querySelectorAll('*').forEach(function(ch){
    var r=ch.getBoundingClientRect();
    if(r.width===0&&r.height===0)return;
    if(r.left<fr.left-3||r.right>fr.right+3||r.top<fr.top-3||r.bottom>fr.bottom+3){var cn=(ch.className&&ch.className.baseVal!==undefined)?ch.className.baseVal:ch.className;bad.push(k+':'+ch.tagName+'.'+cn)}
   });
  });
  ok('no overflow',bad.length===0,bad.slice(0,4).join(';'));
 }catch(e){ok('EXC:'+e.message,false)}
 var h='<h2>全谱牌面视觉断言</h2><ul>';var pass=0;
 logs.forEach(function(l){if(l[1])pass++;h+='<li class="'+(l[1]?'p':'f')+'">'+(l[1]?'PASS':'FAIL')+' '+l[0]+(l[2]&&!l[1]?' -> '+l[2]:'')+'</li>'});
 h+='</ul><div>'+pass+'/'+logs.length+' PASS</div>';
 if(__errs.length)h+="<div style='color:#c02020;font-weight:700'>JS ERR: "+__errs.join(' || ')+'</div>';else h+="<div style='color:#1a7a43;font-weight:700'>zero JS errors</div>";
 var qa=document.createElement('div');qa.id='qa';qa.innerHTML=h;box.appendChild(qa);
 document.title='DONE '+pass+'/'+logs.length;
},300);
})();
