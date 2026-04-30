var MU0=4*Math.PI*1e-7;
var WN='#ef5350',WNL='#ffcdd2',WS='#1e88e5',WSL='#bbdefb',WOFF='#e0e0e0';
var POS3=[-Math.PI/2,-Math.PI/2+2*Math.PI/3,-Math.PI/2+4*Math.PI/3];
var KOM3=[[1,-1,0],[1,0,-1],[0,1,-1],[-1,1,0],[-1,0,1],[0,-1,1]];

var TABEL_KOM=[
  [0,  60, 1,-1, 0,'A⁺B⁻'],
  [60,120, 1, 0,-1,'A⁺C⁻'],
  [120,180,0, 1,-1,'B⁺C⁻'],
  [180,240,-1,1, 0,'B⁺A⁻'],
  [240,300,-1,0, 1,'C⁺A⁻'],
  [300,360,0,-1, 1,'C⁺B⁻'],
];

var SW=[0,0,0,0,0,0];
var SW_MAP=[
  {fasa:0,pol:1},{fasa:1,pol:1},{fasa:2,pol:1},
  {fasa:2,pol:-1},{fasa:1,pol:-1},{fasa:0,pol:-1},
];

var M={
  fasa:3,pp:2,f:1,I:5,N:200,L:0.10,V:24,
  B:0,torsi:0,rpm:0,omega:0,daya:0,
  berjalan:false,sudutRotor:0,sudutRad:0,
  langkah:0,fase:[0,0,0],labelFase:'A⁺B⁻',
  animId:null,wt:0,t:0
};

var C3={
  sudutRotor:0,sudutRad:0,fase:[0,0,0],labelFase:'—',
  targetSudut:0,animating:false,animId3:null
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
function lbl(s,l,u,d){
  document.getElementById(l).textContent=parseFloat(document.getElementById(s).value).toFixed(d)+u;
}

// Dipanggil tiap slider frekuensi atau pole berubah → RPM ikut update
function onFreqChange(){
  lbl('sldF','lF',' Hz',2);
  syncRPM();
  fisika();output();drawC1();
}

function onPoleChange(){
  hitung(); // hitung ulang semua termasuk RPM
}

function syncRPM(){
  var f=parseFloat(document.getElementById('sldF').value);
  var pp=parseInt(document.getElementById('selPole').value);
  var rpm=(60*f)/pp;
  M.f=f; M.pp=pp; M.rpm=rpm;
  M.omega=(2*Math.PI*rpm)/60;
  document.getElementById('lRPM').textContent=rpm.toFixed(1)+' RPM';
}

function onArusChange(){
  var v=parseFloat(document.getElementById('sldI').value);
  document.getElementById('lI').textContent=(v>=0?'+':'')+v.toFixed(0)+' A';
  M.I=v; M.B=(MU0*M.N*Math.abs(v))/(2*M.L);
  drawC1();
}

// ─── BACA & FISIKA ────────────────────────────────────────────────────────
function baca(){
  M.fasa=parseInt(document.getElementById('selFasa').value);
  M.pp=parseInt(document.getElementById('selPole').value);
  M.f=parseFloat(document.getElementById('sldF').value);
  M.rpm=(60*M.f)/M.pp;   // ← SELALU dihitung dari f dan pp
  M.I=parseFloat(document.getElementById('sldI').value);
  M.N=parseFloat(document.getElementById('sldN').value);
  M.L=parseFloat(document.getElementById('sldL').value);
}

function fisika(){
  M.B=(MU0*M.N*Math.abs(M.I))/(2*M.L);
  M.rpm=(60*M.f)/M.pp;
  M.omega=(2*Math.PI*M.rpm)/60;
  M.daya=M.V*Math.abs(M.I);
  M.torsi=M.omega>1e-6?M.daya/M.omega:0;
}

function getFaseFromSudut(deg){
  var d=((deg%360)+360)%360;
  for(var i=0;i<TABEL_KOM.length;i++){
    if(d>=TABEL_KOM[i][0]&&d<TABEL_KOM[i][1])
      return{faseA:TABEL_KOM[i][2],faseB:TABEL_KOM[i][3],faseC:TABEL_KOM[i][4],label:TABEL_KOM[i][5],idx:i};
  }
  return{faseA:TABEL_KOM[5][2],faseB:TABEL_KOM[5][3],faseC:TABEL_KOM[5][4],label:TABEL_KOM[5][5],idx:5};
}

function status(){
  if(M.fasa===1)return{l:'Tidak berputar (osilasi)',c:'s0'};
  if(M.fasa===2)return{l:'Kurang stabil',c:'s1'};
  return{l:'Stabil (3 Fasa)',c:'s2'};
}

function output(){
  var si=status();
  var b=document.getElementById('sbadge');b.textContent=si.l;b.className='sbadge '+si.c;
  var sign=M.I>=0?'+':'';
  var d=((M.sudutRotor%360)+360)%360;
  document.getElementById('txtOut').value=
    '\n-- Parameter --\n'+
    'Fasa      = '+M.fasa+'\n'+
    'Pole pairs= '+M.pp+' ('+M.pp*2+' kutub)\n'+
    'Frekuensi = '+M.f.toFixed(2)+' Hz\n'+
    'RPM       = '+M.rpm.toFixed(1)+'\n'+
    '  (rumus: 60×f/p)\n'+
    'Arus      = '+sign+M.I.toFixed(1)+' A\n'+
    'Lilitan   = '+M.N+'\n'+
    'Panjang L = '+M.L.toFixed(2)+' m\n'+
    '\n-- Hasil --\n'+
    'B    = '+M.B.toFixed(6)+' T\n'+
    'ω    = '+M.omega.toFixed(3)+' rad/s\n'+
    'τ    = '+M.torsi.toFixed(4)+' N·m\n'+
    'Daya = '+M.daya.toFixed(2)+' W\n'+
    '\n-- C2 Auto --\n'+
    'Sudut = '+d.toFixed(1)+'°\n'+
    'Step  = '+M.langkah+' ('+M.labelFase+')\n'+
    '\n-- C3 Manual --\n'+
    'A = '+(C3.fase[0]===1?'+V':C3.fase[0]===-1?'−V':'OFF')+'\n'+
    'B = '+(C3.fase[1]===1?'+V':C3.fase[1]===-1?'−V':'OFF')+'\n'+
    'C = '+(C3.fase[2]===1?'+V':C3.fase[2]===-1?'−V':'OFF')+'\n'+
    'Rotor C3 = '+((C3.sudutRotor%360+360)%360).toFixed(1)+'°\n'+
    '\nTabel Komutasi:\n'+
    ' 0-60°  : A⁺B⁻\n'+
    ' 60-120°: A⁺C⁻\n'+
    '120-180°: B⁺C⁻\n'+
    '180-240°: B⁺A⁻\n'+
    '240-300°: C⁺A⁻\n'+
    '300-360°: C⁺B⁻';
}

// ─── KONTROL C2 ───────────────────────────────────────────────────────────
function hitung(){baca();fisika();syncRPM();output();drawC1();drawC2();drawC3();}

function jalankan(){
  baca();fisika();syncRPM();
  M.berjalan=true;M.wt=performance.now();
  if(M.animId)cancelAnimationFrame(M.animId);
  loop(performance.now());
}

function hentikan(){
  M.berjalan=false;
  if(M.animId)cancelAnimationFrame(M.animId);
  M.animId=null;
}

function loop(wms){
  var dt=Math.min((wms-M.wt)/1000,0.05);M.wt=wms;
  if(!M.berjalan)return;
  M.t+=dt;

  // Baca slider langsung tiap frame → responsif saat digeser
  var fNow=parseFloat(document.getElementById('sldF').value);
  var ppNow=parseInt(document.getElementById('selPole').value);
  var rpmNow=(60*fNow)/ppNow;
  M.f=fNow; M.pp=ppNow; M.rpm=rpmNow;
  M.omega=(2*Math.PI*rpmNow)/60;
  // Update label RPM live
  document.getElementById('lRPM').textContent=rpmNow.toFixed(1)+' RPM';

  M.sudutRotor+=rpmNow*6*dt;   // 1 RPM = 6 deg/s
  M.sudutRad=M.sudutRotor*Math.PI/180;

  var f=getFaseFromSudut(M.sudutRotor);
  M.fase=[f.faseA,f.faseB,f.faseC];
  M.langkah=f.idx; M.labelFase=f.label;

  if(Math.floor(M.t*2)!==Math.floor((M.t-dt)*2))output();
  drawC2();
  M.animId=requestAnimationFrame(loop);
}

// ─── SWITCH LOGIC C3 ─────────────────────────────────────────────────────
function toggleSw(n){
  var idx=n-1,fasa=SW_MAP[idx].fasa,pol=SW_MAP[idx].pol;
  if(SW[idx]===1){
    SW[idx]=0;
  } else {
    for(var i=0;i<6;i++){if(SW_MAP[i].fasa===fasa)SW[i]=0;}
    var aktifPos=0,aktifNeg=0;
    for(var i=0;i<6;i++){
      if(SW[i]===1){if(SW_MAP[i].pol===1)aktifPos++;else aktifNeg++;}
    }
    if(pol===1&&aktifPos<1)SW[idx]=1;
    else if(pol===-1&&aktifNeg<1)SW[idx]=1;
    else if(pol===1){
      for(var i=0;i<6;i++){if(SW[i]===1&&SW_MAP[i].pol===1)SW[i]=0;}
      SW[idx]=1;
    } else {
      for(var i=0;i<6;i++){if(SW[i]===1&&SW_MAP[i].pol===-1)SW[i]=0;}
      SW[idx]=1;
    }
  }
  updateSwUI();computeC3Fase();animateC3ToTarget();
}

function updateSwUI(){
  for(var i=0;i<6;i++){
    var n=i+1,btn=document.getElementById('sw'+n),box=document.getElementById('swb'+n);
    if(SW[i]===1){
      var pol=SW_MAP[i].pol;
      btn.textContent='ON';
      btn.className='sw-btn '+(pol===1?'active-pos':'active-neg');
      box.className='sw-box '+(pol===1?'on-pos':'on-neg');
    } else {
      btn.textContent='OFF';btn.className='sw-btn';box.className='sw-box off-sw';
    }
  }
}

function computeC3Fase(){
  var fA=0,fB=0,fC=0;
  for(var i=0;i<6;i++){
    if(SW[i]===1){
      var fm=SW_MAP[i].fasa,pm=SW_MAP[i].pol;
      if(fm===0)fA=pm;else if(fm===1)fB=pm;else fC=pm;
    }
  }
  C3.fase=[fA,fB,fC];
  var label='—',targetStep=-1;
  for(var i=0;i<TABEL_KOM.length;i++){
    if(TABEL_KOM[i][2]===fA&&TABEL_KOM[i][3]===fB&&TABEL_KOM[i][4]===fC){
      label=TABEL_KOM[i][5];targetStep=i;break;
    }
  }
  C3.labelFase=label;
  if(targetStep>=0)C3.targetSudut=TABEL_KOM[targetStep][0]+30;
  updateRotorInfo3();output();
}

function updateRotorInfo3(){
  var d=((C3.sudutRotor%360)+360)%360;
  document.getElementById('rotorInfo3').textContent=
    'Sudut: '+d.toFixed(1)+'° | Fasa: '+C3.labelFase+
    ' | A='+(C3.fase[0]===1?'+V':C3.fase[0]===-1?'−V':'OFF')+
    ' B='+(C3.fase[1]===1?'+V':C3.fase[1]===-1?'−V':'OFF')+
    ' C='+(C3.fase[2]===1?'+V':C3.fase[2]===-1?'−V':'OFF');
}

function animateC3ToTarget(){
  if(C3.labelFase==='—')return;
  if(C3.animId3)cancelAnimationFrame(C3.animId3);
  C3.animating=true;stepC3();
}

function stepC3(){
  if(!C3.animating)return;
  var diff=C3.targetSudut-((C3.sudutRotor%360)+360)%360;
  if(diff<-180)diff+=360;if(diff>180)diff-=360;
  if(Math.abs(diff)<0.5){
    C3.sudutRotor=C3.targetSudut;C3.sudutRad=C3.sudutRotor*Math.PI/180;
    C3.animating=false;drawC3();updateRotorInfo3();return;
  }
  var step=diff*0.08;
  if(Math.abs(step)<0.3)step=diff>0?0.3:-0.3;
  C3.sudutRotor+=step;C3.sudutRad=C3.sudutRotor*Math.PI/180;
  drawC3();updateRotorInfo3();
  C3.animId3=requestAnimationFrame(stepC3);
}

function setPreset(idx){
  for(var i=0;i<6;i++)SW[i]=0;
  var fA=TABEL_KOM[idx][2],fB=TABEL_KOM[idx][3],fC=TABEL_KOM[idx][4];
  for(var i=0;i<6;i++){
    var fm=SW_MAP[i].fasa,pm=SW_MAP[i].pol;
    if(fm===0&&pm===fA&&fA!==0)SW[i]=1;
    if(fm===1&&pm===fB&&fB!==0)SW[i]=1;
    if(fm===2&&pm===fC&&fC!==0)SW[i]=1;
  }
  updateSwUI();computeC3Fase();animateC3ToTarget();
}

function rotorStep(dir){
  C3.targetSudut=((C3.sudutRotor+dir*60)%360+360)%360;
  C3.animating=true;stepC3();
}

// ─── ARROW ────────────────────────────────────────────────────────────────
function arrow(ctx,x1,y1,x2,y2,w,lw){
  var d=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));if(d<2)return;
  var a=Math.atan2(y2-y1,x2-x1),h=Math.min(d*0.5,8);
  ctx.strokeStyle=w;ctx.lineWidth=lw;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.fillStyle=w;
  ctx.beginPath();ctx.moveTo(x2,y2);
  ctx.lineTo(x2-h*Math.cos(a-0.45),y2-h*Math.sin(a-0.45));
  ctx.lineTo(x2-h*Math.cos(a+0.45),y2-h*Math.sin(a+0.45));
  ctx.closePath();ctx.fill();
}

// ─── CANVAS 1 ─────────────────────────────────────────────────────────────
function drawC1(){
  var c=document.getElementById('c1');c.width=c.offsetWidth;
  var W=c.width,H=c.height,ctx=c.getContext('2d');
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  var Ival=parseFloat(document.getElementById('sldI').value);
  var N=parseFloat(document.getElementById('sldN').value)||M.N;
  var L=parseFloat(document.getElementById('sldL').value)||M.L;
  var Bval=(MU0*N*Math.abs(Ival))/(2*L);
  var cx=W/2,cy=H/2,pjg=W*0.65,tg=H*0.38;
  var x0=cx-pjg/2,x1=cx+pjg/2;
  var jL=Math.min(Math.floor(N/8)+5,30),lw=pjg/jL;
  var pol=Ival>0?1:(Ival<0?-1:0);
  var wD=pol>0?WN:(pol<0?WS:'#ccc'),wB=pol>0?WNL:(pol<0?WSL:'#eee');
  ctx.fillStyle='#bbb';ctx.fillRect(x0,cy-tg*0.12,pjg,tg*0.24);
  ctx.setLineDash([5,6]);ctx.strokeStyle='#ccc';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x0-24,cy);ctx.lineTo(x1+24,cy);ctx.stroke();ctx.setLineDash([]);
  for(var i=0;i<jL;i++){
    var tx=x0+(i+0.5)*lw;
    ctx.beginPath();ctx.ellipse(tx,cy,lw*0.44,tg/2,0,Math.PI,2*Math.PI);ctx.strokeStyle=wB;ctx.lineWidth=1.5;ctx.stroke();
    ctx.beginPath();ctx.ellipse(tx,cy,lw*0.44,tg/2,0,0,Math.PI);ctx.strokeStyle=wD;ctx.lineWidth=2;ctx.stroke();
  }
  if(pol!==0){
    var jP=Math.min(jL,6),stp=jL/jP;
    for(var k=0;k<jP;k++){
      var id2=Math.floor(k*stp+stp/2),tx2=x0+(id2+0.5)*lw;
      var yA=cy-tg/2-4,yBw=cy+tg/2+4;
      if(pol>0){arrow(ctx,tx2-5,yA,tx2+5,yA,'#388e3c',1.5);arrow(ctx,tx2+5,yBw,tx2-5,yBw,'#c62828',1.5);}
      else{arrow(ctx,tx2+5,yA,tx2-5,yA,'#c62828',1.5);arrow(ctx,tx2-5,yBw,tx2+5,yBw,'#388e3c',1.5);}
    }
    var aB=pol>0?1:-1;
    for(var b=0;b<2;b++){var fy=cy+(b-0.5)*tg*0.28;for(var kl=0;kl<4;kl++){var fx=x0+16+kl*(pjg-32)/3;arrow(ctx,fx,fy,fx+aB*20,fy,'#e65100',2);}}
  }
  ctx.font='bold 13px Arial';ctx.textAlign='center';
  if(pol>0){ctx.fillStyle=WN;ctx.fillText('N',x1+12,cy+5);ctx.fillStyle=WS;ctx.fillText('S',x0-12,cy+5);}
  else if(pol<0){ctx.fillStyle=WS;ctx.fillText('S',x1+12,cy+5);ctx.fillStyle=WN;ctx.fillText('N',x0-12,cy+5);}
  else{ctx.fillStyle='#999';ctx.fillText('—',x1+12,cy+5);ctx.fillText('—',x0-12,cy+5);}
  ctx.font='10px Arial';ctx.fillStyle='#555';ctx.textAlign='left';
  ctx.fillText('N='+Math.round(N)+'  L='+L.toFixed(2)+'m  B='+Bval.toFixed(5)+' T',x0,H-16);
  ctx.fillText('I='+(Ival>=0?'+':'')+Ival.toFixed(0)+'A  →  '+(pol>0?'Normal (+)':pol<0?'Terbalik (−)':'OFF (0A)'),x0,H-4);
}

// ─── DRAW MOTOR (reusable) ────────────────────────────────────────────────
function drawMotor(ctx,W,H,sudutRad,faseABC,poles,POS,aktif,labelInfo){
  var cx=W/2,cy=H/2,R=Math.min(W,H)*0.36,rR=R*0.48;
  ctx.beginPath();ctx.arc(cx,cy,R+R*0.11,0,2*Math.PI);
  ctx.strokeStyle='#999';ctx.lineWidth=R*0.08;ctx.stroke();
  if(aktif){
    for(var s=0;s<POS.length;s++){
      if(faseABC[s]===0)continue;
      drawGaya(ctx,cx,cy,R,rR,sudutRad,poles,faseABC[s],POS[s]);
    }
  }
  for(var s2=0;s2<POS.length;s2++)drawStator(ctx,cx,cy,R,POS[s2],faseABC[s2],['A','B','C'][s2]);
  drawRotor(ctx,cx,cy,rR,sudutRad,poles);
  ctx.beginPath();ctx.arc(cx,cy,R*0.07,0,2*Math.PI);
  ctx.fillStyle='#aaa';ctx.fill();ctx.strokeStyle='#666';ctx.lineWidth=1;ctx.stroke();
  if(labelInfo){
    ctx.font='bold '+Math.round(R*0.080)+'px Arial';
    ctx.fillStyle='#222';ctx.textAlign='center';
    ctx.fillText(labelInfo.rpm,cx,cy+R*0.02);
    ctx.font=Math.round(R*0.052)+'px Arial';ctx.fillStyle='#555';
    ctx.fillText(labelInfo.deg,cx,cy+R*0.12);
    ctx.font='bold '+Math.round(R*0.058)+'px Arial';ctx.fillStyle='#333';
    ctx.fillText(labelInfo.step,cx,cy+R*0.22);
  }
  ctx.textAlign='left';
  var ly=H-26;
  ctx.font='10px Arial';
  ctx.fillStyle='#43a047';ctx.fillText('─ TARIK',6,ly);
  ctx.fillStyle='#e53935';ctx.fillText('- TOLAK',60,ly);
  ctx.fillStyle='#555';ctx.fillText('Kutub:'+poles,110,ly);
}

function drawC2(){
  var c=document.getElementById('c2');c.width=c.offsetWidth;
  var W=c.width,H=c.height,ctx=c.getContext('2d');
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  var d=((M.sudutRotor%360)+360)%360;
  drawMotor(ctx,W,H,M.sudutRad,M.fase,M.pp*2,POS3,M.berjalan,{
    rpm:M.rpm.toFixed(1)+' RPM',
    deg:d.toFixed(1)+'°',
    step:M.labelFase
  });
}

function drawC3(){
  var c=document.getElementById('c3');c.width=c.offsetWidth;
  var W=c.width,H=c.height,ctx=c.getContext('2d');
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  var d=((C3.sudutRotor%360)+360)%360;
  drawMotor(ctx,W,H,C3.sudutRad,C3.fase,M.pp*2,POS3,C3.fase.some(function(v){return v!==0;}),{
    rpm:'Manual Switch',
    deg:d.toFixed(1)+'°',
    step:C3.labelFase
  });
}

// ─── GARIS GAYA ───────────────────────────────────────────────────────────
function drawGaya(ctx,cx,cy,R,rR,sudutRotor,poles,faseS,posS){
  var dStat=R*0.62;
  var sx=cx+dStat*Math.cos(posS),sy=cy+dStat*Math.sin(posS);
  var isN_stat=(faseS>0);
  for(var p=0;p<poles;p++){
    var st=sudutRotor+(p/poles)*2*Math.PI+(1/poles)*Math.PI;
    var isN_rot=(p%2===0);
    var dAng=Math.abs(Math.atan2(Math.sin(st-posS),Math.cos(st-posS)));
    var thr=Math.PI/Math.max(poles,2)*1.6;
    if(dAng>thr)continue;
    var tarik=(isN_stat!==isN_rot);
    var ins=Math.max(0,1-dAng/thr);
    var warna=tarik?'#43a047':'#e53935';
    var alpha=tarik?(0.5+0.5*ins):(0.35+0.35*ins);
    var angRS=Math.atan2(sy-cy,sx-cx);
    var rpx=cx+rR*Math.cos(angRS),rpy=cy+rR*Math.sin(angRS);
    var frak=tarik?(0.45+0.15*ins):(0.70+0.20*ins);
    var epx=rpx+(sx-rpx)*frak,epy=rpy+(sy-rpy)*frak;
    ctx.save();ctx.globalAlpha=alpha;
    ctx.strokeStyle=warna;ctx.lineWidth=tarik?(1.5+ins*1.5):(1.0+ins*0.8);
    if(!tarik)ctx.setLineDash([4,3]);else ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(rpx,rpy);ctx.lineTo(epx,epy);ctx.stroke();ctx.setLineDash([]);
    var ang=Math.atan2(epy-rpy,epx-rpx),ah=tarik?7:5;
    ctx.fillStyle=warna;
    ctx.beginPath();ctx.moveTo(epx,epy);
    ctx.lineTo(epx-ah*Math.cos(ang-0.4),epy-ah*Math.sin(ang-0.4));
    ctx.lineTo(epx-ah*Math.cos(ang+0.4),epy-ah*Math.sin(ang+0.4));
    ctx.closePath();ctx.fill();
    if(ins>0.5){
      var lx=(rpx+epx)/2+5*Math.sin(angRS),ly2=(rpy+epy)/2-5*Math.cos(angRS);
      ctx.font='bold 7px Arial';ctx.fillStyle=warna;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(tarik?'TARIK':'TOLAK',lx,ly2);
      ctx.textBaseline='alphabetic';ctx.textAlign='left';
    }
    ctx.globalAlpha=0.8;
    ctx.beginPath();ctx.arc(rpx,rpy,3.5,0,2*Math.PI);
    ctx.fillStyle=isN_rot?WN:WS;ctx.fill();
    ctx.restore();
  }
  ctx.save();ctx.globalAlpha=0.85;
  ctx.beginPath();ctx.arc(cx+(R*0.60)*Math.cos(posS),cy+(R*0.60)*Math.sin(posS),5,0,2*Math.PI);
  ctx.fillStyle=isN_stat?WN:WS;ctx.fill();ctx.restore();
}

// ─── STATOR & ROTOR ───────────────────────────────────────────────────────
function drawStator(ctx,cx,cy,R,posS,nilaiF,label){
  var jarak=R*0.76,sx=cx+jarak*Math.cos(posS),sy=cy+jarak*Math.sin(posS);
  var lebar=R*0.16,tinggi=R*0.27;
  var bgC=nilaiF===1?WNL:(nilaiF===-1?WSL:WOFF);
  var brC=nilaiF===1?WN:(nilaiF===-1?WS:'#999');
  ctx.save();ctx.translate(sx,sy);ctx.rotate(posS+Math.PI/2);
  ctx.fillStyle=bgC;ctx.strokeStyle=brC;ctx.lineWidth=nilaiF!==0?2.5:1.2;
  ctx.beginPath();ctx.rect(-lebar/2,-tinggi/2,lebar,tinggi);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#aaa';ctx.lineWidth=0.7;
  for(var i=0;i<5;i++){var y=-tinggi/2+(tinggi/6)*(i+1);ctx.beginPath();ctx.moveTo(-lebar/2+3,y);ctx.lineTo(lebar/2-3,y);ctx.stroke();}
  if(nilaiF!==0){
    ctx.font='bold '+Math.round(tinggi*0.30)+'px Arial';
    ctx.fillStyle=nilaiF===1?WN:WS;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(nilaiF===1?'N':'S',0,0);ctx.textBaseline='alphabetic';
  }
  ctx.font='bold 10px Arial';ctx.fillStyle='#333';ctx.textAlign='center';
  ctx.fillText(label,0,-tinggi/2-6);ctx.restore();
}

function drawRotor(ctx,cx,cy,rR,sudut,poles){
  for(var p=0;p<poles;p++){
    var sM=sudut+(p/poles)*2*Math.PI,sA=sudut+((p+1)/poles)*2*Math.PI,sT=(sM+sA)/2;
    var isN=(p%2===0);
    ctx.fillStyle=isN?WNL:WSL;ctx.strokeStyle=isN?WN:WS;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,rR,sM,sA);ctx.closePath();ctx.fill();ctx.stroke();
    var lx=cx+rR*0.60*Math.cos(sT),ly=cy+rR*0.60*Math.sin(sT);
    ctx.font='bold '+Math.round(rR*0.22)+'px Arial';
    ctx.fillStyle=isN?WN:WS;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(isN?'N':'S',lx,ly);ctx.textBaseline='alphabetic';
  }
  ctx.save();ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+rR*Math.cos(sudut),cy+rR*Math.sin(sudut));ctx.stroke();
  ctx.setLineDash([]);ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,rR*0.23,0,2*Math.PI);
  ctx.fillStyle='#ccc';ctx.fill();ctx.strokeStyle='#888';ctx.lineWidth=1;ctx.stroke();
  ctx.textAlign='left';
}

window.onload=function(){hitung();setPreset(0);};
window.onresize=function(){drawC1();drawC2();drawC3();};
