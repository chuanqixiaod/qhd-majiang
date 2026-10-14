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
  var rods=mw.querySelectorAll('g.rod');
  ok('t8 8 bamboo rods',rods.length===8,rods.length+'');
  var rects=mw.querySelectorAll('rect');
  ok('t8 32 rects(2 rod+2 bands x8)',rects.length===32,rects.length+'');
  ok('t8 rod rounded caps r7.77',rects[0].getAttribute('rx')==='7.77'&&rects[0].getAttribute('height')==='15.54');
  ok('t8 rod fills len/cyl',rects[0].getAttribute('fill')==='url(#mwLen)'&&rects[1].getAttribute('fill')==='url(#mwCyl)');
  /* 中间4根斜杆砖红（M/W 各2根），4根竖杆雾蓝 */
  var redRods=mw.querySelectorAll('g.rod-r');
  ok('t8 4 red center rods',redRods.length===4,redRods.length+'');
  ok('t8 red rods are the 4 diagonals',rods[1].classList.contains('rod-r')&&rods[2].classList.contains('rod-r')&&rods[5].classList.contains('rod-r')&&rods[6].classList.contains('rod-r')&&!rods[0].classList.contains('rod-r')&&!rods[3].classList.contains('rod-r'));
  ok('t8 red rod fills lenR/cylR',rects[4].getAttribute('fill')==='url(#mwLenR)'&&rects[5].getAttribute('fill')==='url(#mwCylR)');
  var tr0=rods[0].getAttribute('transform'),tr1=rods[1].getAttribute('transform'),tr2=rods[2].getAttribute('transform');
  ok('t8 rod rotate vert',tr0.indexOf('rotate(-90')>=0,tr0);
  var mAng=parseFloat((tr1.match(/rotate\((-?[\d.]+)/)||[])[1]),mAng2=parseFloat((tr2.match(/rotate\((-?[\d.]+)/)||[])[1]);
  ok('t8 M diag angles +/-42.5',Math.abs(mAng-42.50)<=.03&&Math.abs(mAng2+42.50)<=.03,mAng+'/'+mAng2);
  var gradC=document.getElementById('mwCyl'),gradL=document.getElementById('mwLen'),cStops=gradC?gradC.querySelectorAll('stop'):[],lStops=gradL?gradL.querySelectorAll('stop'):[];
  ok('t8 cyl gradient 6 stops',cStops.length===6,cStops.length+'');
  ok('t8 cyl edge colors deepened',cStops.length===6&&cStops[0].getAttribute('stop-color')==='#384857'&&cStops[5].getAttribute('stop-color')==='#384857');
  ok('t8 cyl 3D contrast(edge>=.66,hi>=.8)',parseFloat(cStops[0].getAttribute('stop-opacity'))>=.66&&parseFloat(cStops[2].getAttribute('stop-opacity'))>=.8,parseFloat(cStops[0].getAttribute('stop-opacity'))+'/'+parseFloat(cStops[2].getAttribute('stop-opacity')));
  ok('t8 len gradient 3 stops',lStops.length===3&&lStops[2].getAttribute('stop-color')==='#566e84',lStops.length+'');
  var gradCR=document.getElementById('mwCylR'),gradLR=document.getElementById('mwLenR'),crStops=gradCR?gradCR.querySelectorAll('stop'):[],lrStops=gradLR?gradLR.querySelectorAll('stop'):[];
  ok('t8 red cyl gradient 6 stops',crStops.length===6&&crStops[0].getAttribute('stop-color')==='#6e3029'&&crStops[5].getAttribute('stop-color')==='#6e3029',crStops.length+'');
  ok('t8 red len gradient',lrStops.length===3&&lrStops[0].getAttribute('stop-color')==='#dd9387'&&lrStops[2].getAttribute('stop-color')==='#973c33');
  ok('t8 whole-figure drop shadow',!!document.getElementById('mwRodSh')&&mw.firstElementChild&&mw.firstElementChild.tagName.toLowerCase()==='g'&&mw.firstElementChild.getAttribute('filter')==='url(#mwRodSh)',mw.firstElementChild?mw.firstElementChild.getAttribute('filter'):'none');
  ok('t8 no old ring lines',mw.querySelectorAll('line').length===0,mw.querySelectorAll('line').length+'');
  var bands=mw.querySelectorAll('rect.band');
  ok('t8 16 bamboo bands(2 per rod)',bands.length===16,bands.length+'');
  ok('t8 band size 3.11x13.46 r2.03',Math.abs(parseFloat(bands[0].getAttribute('width'))-3.11)<.01&&Math.abs(parseFloat(bands[0].getAttribute('height'))-13.46)<.01&&bands[0].getAttribute('rx')==='2.03');
  ok('t8 band positions 29/61%',Math.abs(parseFloat(bands[0].getAttribute('x'))+10.38)<=.02&&Math.abs(parseFloat(bands[1].getAttribute('x'))-3.07)<=.02,bands[0].getAttribute('x')+'/'+bands[1].getAttribute('x'));
  ok('t8 band shadow filter ref',bands[0].getAttribute('filter')==='url(#mwBandSh)'&&!!document.getElementById('mwBandSh'));
  var bandFill=getComputedStyle(bands[0]).fill;
  ok('t8 band paper fill',bandFill.indexOf('236')>=0&&bandFill.indexOf('227')>=0&&bandFill.indexOf('209')>=0,bandFill);
  var redBands=mw.querySelectorAll('rect.band-r'),redFill=redBands.length?getComputedStyle(redBands[0]).fill:'';
  ok('t8 8 red bands warm paper',redBands.length===8&&redFill.indexOf('240')>=0&&redFill.indexOf('222')>=0&&redFill.indexOf('205')>=0,redBands.length+'/'+redFill);
  var br0=bands[0].getBoundingClientRect(),br1=bands[2].getBoundingClientRect();
  ok('t8 bands visible',br0.width>=8&&br0.height>=1.9&&br1.width>=7&&br1.height>=6,br0.width.toFixed(2)+'x'+br0.height.toFixed(2)+' / '+br1.width.toFixed(2)+'x'+br1.height.toFixed(2));
  /* 竹箍渲染像素必须与普通条牌 CSS 竹箍（0.06em×0.26em）一致 */
  var refBar=T.t2.querySelector('.bars i'),refBefore=getComputedStyle(refBar,'::before'),refR=refBar.getBoundingClientRect();
  var mwW=mw.getBoundingClientRect().width;
  var bandTh=3.11*(mwW/100),bandWd=13.46*(mwW/100);
  ok('t8 band thickness ~0.06em',Math.abs(bandTh-parseFloat(refBefore.height))<=0.6,bandTh.toFixed(2)+' vs '+refBefore.height);
  ok('t8 band width ~0.26em',Math.abs(bandWd-parseFloat(refBefore.width))<=1.2,bandWd.toFixed(2)+' vs '+refBefore.width);
  var rodW=15.54*(mwW/100);
  ok('t8 rod width ~0.3em',Math.abs(rodW-refR.width)<=1.2,rodW.toFixed(2)+' vs '+refR.width);
  function unionBB(els){var l=1e9,t=1e9,r=-1e9,b=-1e9;[].forEach.call(els,function(e){var x=e.getBoundingClientRect();l=Math.min(l,x.left);t=Math.min(t,x.top);r=Math.max(r,x.right);b=Math.max(b,x.bottom)});return{left:l,right:r,top:t,bottom:b}}
  var bbM=unionBB([].slice.call(rods,0,4)),bbW=unionBB([].slice.call(rods,4,8));
  ok('t8 M above W',bbM.bottom<=bbW.top+2,bbM.bottom+'/'+bbW.top);
  var mwr=mw.getBoundingClientRect(),barsr=T.t2.querySelector('.bars').getBoundingClientRect();
  ok('t8 box height matches bars',Math.abs(mwr.height-barsr.height)<=1.5,mwr.height.toFixed(1)+' vs '+barsr.height.toFixed(1));
  /* M/W 整体占牌面比例对标九条竹杆列：viewBox meet 缩放后内容区 ≥80%宽/≥92%高（svg 盒瘦高时上下有留白，分母须用内容区而非盒高） */
  var bbAll=unionBB([].slice.call(rods));
  var mwScale=Math.min(mwr.width/100,mwr.height/120);
  ok('t8 fills content width >=80%',(bbAll.right-bbAll.left)>=100*mwScale*0.80,((bbAll.right-bbAll.left)/(100*mwScale)).toFixed(2));
  ok('t8 fills content height >=92%',(bbAll.bottom-bbAll.top)>=120*mwScale*0.92,((bbAll.bottom-bbAll.top)/(120*mwScale)).toFixed(2));
  /* 与九条竹杆列外缘跨度一致（容差8%牌宽，八条横向略宽以补足纵向造型差异） */
  var t9r0=T.t9.querySelectorAll('.bars i:not(.e)')[0].getBoundingClientRect(),t9r8=T.t9.querySelectorAll('.bars i:not(.e)')[8].getBoundingClientRect();
  var t9span=(t9r8.right-t9r0.left)/T.t9.getBoundingClientRect().width,t8span=(bbAll.right-bbAll.left)/T.t8.getBoundingClientRect().width;
  ok('t8 span ~t9 span',Math.abs(t8span-t9span)<=0.08,t8span.toFixed(2)+' vs '+t9span.toFixed(2));
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
