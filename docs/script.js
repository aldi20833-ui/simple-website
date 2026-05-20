/**
 * script.js — Simulasi BLDC Motor
 *
 * Konvensi sudut canvas: 0° = kanan (jam 3), positif = searah jarum jam.
 * Tengah kutub N rotor (poles=2) = sudutRad + 90°
 *
 * Tabel target sudut mekanik ujung kutub N (0°=atas/jam12):
 *   A⁺B⁻ → 300°   A⁺C⁻ → 0°   B⁺C⁻ → 120°
 *   B⁺A⁻ → 120°   C⁺A⁻ → 240°  C⁺B⁻ → 240°
 */

/* ══════════════════════════════════════════════════════════
   KONSTANTA FISIKA & WARNA
══════════════════════════════════════════════════════════ */
const MU0  = 4 * Math.PI * 1e-7;
const WN   = '#ef5350';
const WNL  = '#ffcdd2';
const WS   = '#1e88e5';
const WSL  = '#bbdefb';
const WOFF = '#e0e0e0';

/* ══════════════════════════════════════════════════════════
   POSISI STATOR per jumlah fasa (radian, koordinat canvas)
══════════════════════════════════════════════════════════ */
const POS_MAP = {
    1: [-Math.PI / 2],
    2: [-Math.PI / 2,  Math.PI / 2],
    3: [
        -Math.PI / 2,
        -Math.PI / 2 + 2 * Math.PI / 3,
        -Math.PI / 2 + 4 * Math.PI / 3
    ]
};

/* ══════════════════════════════════════════════════════════
   TABEL KOMUTASI 3-FASA (6 langkah)
══════════════════════════════════════════════════════════ */
const TABEL_KOM = [
    [    0,  60,  1, -1,  0, 'A⁺B⁻',  300, 'Ujung N → Jam 10 (300°)',    false ],
    [   60, 120,  1,  0, -1, 'A⁺C⁻',  360, 'Ujung N → Jam 12 (0°/360°)', false ],
    [  120, 180,  0,  1, -1, 'B⁺C⁻',  120, 'Ujung N → Jam 4 (120°)',      false ],
    [  180, 240, -1,  1,  0, 'B⁺A⁻',  120, 'TETAP Jam 4 — Diam',          true  ],
    [  240, 300, -1,  0,  1, 'C⁺A⁻',  240, 'Ujung N → Jam 8 (240°)',      false ],
    [  300, 360,  0, -1,  1, 'C⁺B⁻',  240, 'TETAP Jam 8 — Diam',          true  ]
];

/* ══════════════════════════════════════════════════════════
   PETA SWITCH → fasa & polaritas
══════════════════════════════════════════════════════════ */
const SW_MAP = [
    { fasa:0, pol: 1 }, { fasa:1, pol: 1 }, { fasa:2, pol: 1 },
    { fasa:2, pol:-1 }, { fasa:1, pol:-1 }, { fasa:0, pol:-1 }
];
let SW = [0, 0, 0, 0, 0, 0];

/* ══════════════════════════════════════════════════════════
   STATE MOTOR C2 (animasi otomatis)
══════════════════════════════════════════════════════════ */
let M = {
    fasa:3, pp:1, f:1, I:5, N:200, L:0.10, V:24,
    B:0, torsi:0, omega:0, daya:0, rpm:0,
    berjalan: false,
    sudutRotor:0, sudutRad:0, sudutOsilasi:0,
    fase:[0,0,0], langkah:0, labelFase:'—',
    animId:null, wt:0, t:0
};

/* ══════════════════════════════════════════════════════════
   STATE C3 (canvas manual switch)
══════════════════════════════════════════════════════════ */
let C3 = {
    sudutRotor:0, sudutRad:0,
    fase:[0,0,0], labelFase:'—',
    targetSudutRad: 0,
    animating:false, animId3:null,
    prevStep: -1
};

/* ══════════════════════════════════════════════════════════
   GAYA EKSTERNAL STATE
══════════════════════════════════════════════════════════ */
const F_OMEGA0   = 6.0;
const F_DAMPING  = 0.35;
let F = {
    aktif: false, theta:0, omega:0, wt:0,
    animId: null,
    _rotasiSelesai: false,
    _putaranTotal:  0
};

/* ══════════════════════════════════════════════════════════
   PARSE INPUT
══════════════════════════════════════════════════════════ */
function parseInput() {
    const raw    = document.getElementById('text-input').value;
    const result = {};
    raw.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line[0] === '#') return;
        const idx = line.indexOf('=');
        if (idx < 0) return;
        const key = line.slice(0, idx).trim().toLowerCase();
        const val = parseFloat(line.slice(idx + 1).trim());
        if (!isNaN(val)) result[key] = val;
    });
    return result;
}

function baca() {
    const p = parseInput();
    if (p.v    !== undefined) M.V    = p.v;
    if (p.fasa !== undefined) M.fasa = Math.round(p.fasa);
    if (p.p    !== undefined) M.pp   = Math.round(p.p);
    if (p.f    !== undefined) M.f    = p.f;
    if (p.i    !== undefined) M.I    = p.i;
    if (p.n    !== undefined) M.N    = p.n;
    if (p.l    !== undefined) M.L    = p.l;
    M.fasa = Math.max(1, Math.min(3, M.fasa));
    M.pp   = Math.max(1, Math.min(8, M.pp));
    M.f    = Math.max(0.01, Math.min(100, M.f));
    M.N    = Math.max(1, M.N);
    M.L    = Math.max(0.001, M.L);
}

/* ══════════════════════════════════════════════════════════
   FISIKA MOTOR
══════════════════════════════════════════════════════════ */
function fisika() {
    M.B     = (MU0 * M.N * Math.abs(M.I)) / (2 * M.L);
    M.rpm   = (60 * M.f) / M.pp;
    M.omega = (2 * Math.PI * M.rpm) / 60;
    M.daya  = M.V * Math.abs(M.I);
    M.torsi = M.omega > 1e-6 ? M.daya / M.omega : 0;
}

function getFaseFromSudut(deg) {
    const d = ((deg % 360) + 360) % 360;
    for (let i = 0; i < TABEL_KOM.length; i++) {
        if (d >= TABEL_KOM[i][0] && d < TABEL_KOM[i][1])
            return { fA:TABEL_KOM[i][2], fB:TABEL_KOM[i][3], fC:TABEL_KOM[i][4],
                     label:TABEL_KOM[i][5], idx:i };
    }
    return { fA:TABEL_KOM[5][2], fB:TABEL_KOM[5][3], fC:TABEL_KOM[5][4],
             label:TABEL_KOM[5][5], idx:5 };
}

function mekToSudutRad(mekDeg, poles) {
    const canvasTarget = mekDeg - 90;
    const halfPole     = 180 / poles;
    const sudutDeg     = canvasTarget - halfPole;
    return sudutDeg * Math.PI / 180;
}

function statusMotor() {
    if (M.fasa === 1) return { l:'1 Fasa — Osilasi (tidak berputar)', c:'s0' };
    if (M.fasa === 2) return { l:'2 Fasa — Kurang stabil (bergetar)', c:'s1' };
    return { l:'3 Fasa — Stabil (rotasi penuh)', c:'s2' };
}

/* ══════════════════════════════════════════════════════════
   OUTPUT ke textarea
══════════════════════════════════════════════════════════ */
function output() {
    if (!F.aktif) {
        const si = statusMotor();
        const b  = document.getElementById('sbadge');
        if (b) { b.textContent = si.l; b.className = 'sbadge ' + si.c; }
    }

    const sign = M.I >= 0 ? '+' : '';
    const ta   = document.getElementById('text-output');
    if (!ta) return;

    let txt = '-- Parameter --\n';
    txt += 'Fasa       = ' + M.fasa + '\n';
    txt += 'Pole pairs = ' + M.pp + ' (' + (M.pp * 2) + ' kutub)\n';
    txt += 'Frekuensi  = ' + M.f.toFixed(2) + ' Hz\n';
    txt += 'Arus       = ' + sign + M.I.toFixed(1) + ' A\n';
    txt += 'Lilitan    = ' + M.N + '\n';
    txt += 'Panjang L  = ' + M.L.toFixed(3) + ' m\n\n';
    txt += '-- Hasil Fisika --\n';
    txt += 'B     = ' + M.B.toFixed(6) + ' T\n';
    txt += 'RPM   = ' + M.rpm.toFixed(2) + '\n';
    txt += 'ω     = ' + M.omega.toFixed(3) + ' rad/s\n';
    txt += 'τ     = ' + M.torsi.toFixed(4) + ' N·m\n';
    txt += 'Daya  = ' + M.daya.toFixed(2) + ' W\n';
    ta.value = txt;
}

/* ══════════════════════════════════════════════════════════
   FUNGSI UTAMA
══════════════════════════════════════════════════════════ */
function hitung() { baca(); fisika(); output(); drawC1(); drawC2(); drawC3(); }

function jalankan() {
    if (F.aktif) _stopGaya();
    baca(); fisika(); output();
    M.berjalan = true;
    M.wt = performance.now();
    if (M.animId) cancelAnimationFrame(M.animId);
    loop(performance.now());
}

function hentikan() {
    M.berjalan = false;
    if (M.animId) cancelAnimationFrame(M.animId);
    M.animId = null;
}

/* ══════════════════════════════════════════════════════════
   LOOP ANIMASI AUTO (C2)
══════════════════════════════════════════════════════════ */
function loop(wms) {
    const dt = Math.min((wms - M.wt) / 1000, 0.05);
    M.wt = wms;
    if (!M.berjalan) return;
    M.t += dt;

    if (M.fasa === 1) {
        const amp = 25;
        M.sudutOsilasi = amp * Math.sin(2 * Math.PI * M.f * M.t);
        M.sudutRotor   = M.sudutOsilasi;
        M.sudutRad     = M.sudutRotor * Math.PI / 180;
        M.fase         = [Math.sin(2 * Math.PI * M.f * M.t) >= 0 ? 1 : -1];
        M.langkah      = M.fase[0] === 1 ? 0 : 1;
        M.labelFase    = M.fase[0] === 1 ? 'A⁺' : 'A⁻';

    } else if (M.fasa === 2) {
        const baseAngle = (M.omega * M.t * 180 / Math.PI);
        const jitter    = 15 * Math.sin(4 * Math.PI * M.f * M.t + 0.5)
                        +  8 * Math.sin(7 * Math.PI * M.f * M.t + 1.2);
        M.sudutRotor    = baseAngle + jitter;
        M.sudutRad      = M.sudutRotor * Math.PI / 180;
        const KOM2      = [[1,-1],[1,1],[-1,1],[-1,-1]];
        const el        = ((M.sudutRotor * M.pp) % 360 + 360) % 360;
        const lk        = Math.floor(el / 90) % 4;
        M.fase          = [KOM2[lk][0], KOM2[lk][1]];
        M.langkah       = lk;
        M.labelFase     = ['A⁺B⁻','A⁺B⁺','A⁻B⁺','A⁻B⁻'][lk];

    } else {
        const degPerSec = M.rpm * 6;
        M.sudutRotor   += degPerSec * dt;
        M.sudutRad      = M.sudutRotor * Math.PI / 180;
        const f3 = getFaseFromSudut(M.sudutRotor);
        M.fase      = [f3.fA, f3.fB, f3.fC];
        M.langkah   = f3.idx;
        M.labelFase = f3.label;
    }

    if (Math.floor(M.t * 2) !== Math.floor((M.t - dt) * 2)) output();
    drawC2();
    M.animId = requestAnimationFrame(loop);
}

/* ══════════════════════════════════════════════════════════
   GAYA EKSTERNAL (F)
══════════════════════════════════════════════════════════ */
function tekanGaya() {
    if (M.berjalan) hentikan();
    baca(); fisika();

    if (F.aktif) { _stopGaya(); return; }

    F.aktif = true;
    F.wt    = performance.now();
    F._rotasiSelesai = false;
    F._putaranTotal  = 0;

    const btnG = document.getElementById('btn-gaya');
    if (btnG) { btnG.classList.add('aktif'); btnG.textContent = '⏹ STOP (F)'; }

    if (M.fasa === 1) {
        F.theta      = 45 * Math.PI / 180;
        F.omega      = 0;
        M.sudutRotor = 45;
        M.sudutRad   = F.theta;
        M.fase       = [1];
        M.labelFase  = 'A⁺ (Statis N)';

    } else if (M.fasa === 2) {
        F.theta      = 0;
        F.omega      = F_OMEGA0 * 2.8;
        M.sudutRotor = 0;
        M.sudutRad   = 0;
        M.fase       = [1, -1];
        M.labelFase  = 'A⁺(N) B⁻(S) Statis';

    } else {
        F.theta      = 0;
        F.omega      = F_OMEGA0 * 3;
        M.sudutRotor = 0;
        M.sudutRad   = 0;
        const f3 = getFaseFromSudut(0);
        M.fase      = [f3.fA, f3.fB, f3.fC];
        M.labelFase = f3.label;
    }

    loopGaya(performance.now());
}

function _stopGaya() {
    F.aktif = false;
    if (F.animId) { cancelAnimationFrame(F.animId); F.animId = null; }
    const si = statusMotor();
    const b  = document.getElementById('sbadge');
    if (b) { b.textContent = si.l; b.className = 'sbadge ' + si.c; }
    const btnG = document.getElementById('btn-gaya');
    if (btnG) { btnG.classList.remove('aktif'); btnG.textContent = '⚡ GAYA (F)'; }
}

function loopGaya(wms) {
    const dt = Math.min((wms - F.wt) / 1000, 0.05);
    F.wt = wms;
    if (!F.aktif) return;

    if (M.fasa === 1) {
        const alpha = -F_OMEGA0 * F_OMEGA0 * F.theta - 2 * F_DAMPING * F_OMEGA0 * F.omega;
        F.omega += alpha * dt;
        F.theta += F.omega * dt;
        M.sudutRotor = F.theta * 180 / Math.PI;
        M.sudutRad   = F.theta;
        M.fase       = [1];
        M.labelFase  = 'A⁺ (Statis N)';
        if (Math.abs(F.theta) < 0.003 && Math.abs(F.omega) < 0.005) {
            M.sudutRotor = 0; M.sudutRad = 0;
            M.fase = [1]; M.labelFase = 'A⁺ (Diam — Tarik)';
            _stopGaya(); drawC2(); output(); return;
        }

    } else if (M.fasa === 2) {
        const thetaEq = Math.PI;
        if (!F._rotasiSelesai) {
            const err      = F.theta - thetaEq;
            const progress = Math.min(Math.abs(F.theta) / thetaEq, 1.0);
            const kSpring  = F_OMEGA0 * F_OMEGA0 * progress * 0.5;
            const kDamp    = 2 * F_DAMPING * F_OMEGA0 * (0.2 + 0.8 * progress);
            const alpha    = -kSpring * err - kDamp * F.omega;
            F.omega += alpha * dt;
            F.theta += F.omega * dt;
            M.sudutRotor = F.theta * 180 / Math.PI;
            M.sudutRad   = F.theta;
            F._putaranTotal += Math.abs(F.omega * dt);
            if (F._putaranTotal >= 2 * Math.PI * 0.9 || F.theta >= thetaEq * 1.1) {
                F._rotasiSelesai = true;
                if (F.omega > 1.0) F.omega = 1.0;
            }
        } else {
            const err   = F.theta - thetaEq;
            const alpha = -F_OMEGA0 * F_OMEGA0 * err - 2 * F_DAMPING * F_OMEGA0 * F.omega;
            F.omega += alpha * dt;
            F.theta += F.omega * dt;
            M.sudutRotor = F.theta * 180 / Math.PI;
            M.sudutRad   = F.theta;
            if (Math.abs(err) < 0.003 && Math.abs(F.omega) < 0.005) {
                M.sudutRotor = 180; M.sudutRad = Math.PI;
                M.fase = [-1, 1]; M.labelFase = 'A⁻(S) B⁺(N) Diam — Tarik';
                _stopGaya(); drawC2(); output(); return;
            }
        }
        M.fase      = [-1, 1];
        M.labelFase = 'A⁻(S) B⁺(N) Statis';

    } else {
        if (!F._rotasiSelesai) {
            F.omega += -F_DAMPING * 0.5 * F.omega * dt;
            F.theta += F.omega * dt;
            F._putaranTotal += Math.abs(F.omega * dt);
            M.sudutRotor = F.theta * 180 / Math.PI;
            M.sudutRad   = F.theta;
            if (F._putaranTotal >= 2 * Math.PI) {
                F._rotasiSelesai = true;
                const snap = Math.round(M.sudutRotor / 60) * 60;
                M.sudutRotor = snap; M.sudutRad = snap * Math.PI / 180;
                F.theta = M.sudutRad; F.omega = 1.5;
            }
        } else {
            const snapRad = Math.round(M.sudutRotor / 60) * 60 * Math.PI / 180;
            const err     = F.theta - snapRad;
            const alpha   = -F_OMEGA0 * F_OMEGA0 * err - 2 * F_DAMPING * F.omega;
            F.omega += alpha * dt;
            F.theta += F.omega * dt;
            M.sudutRotor = F.theta * 180 / Math.PI;
            M.sudutRad   = F.theta;
            if (Math.abs(err) < 0.005 && Math.abs(F.omega) < 0.01) {
                M.sudutRotor = snapRad * 180 / Math.PI; M.sudutRad = snapRad;
                _stopGaya(); drawC2(); output(); return;
            }
        }
        const f3 = getFaseFromSudut(M.sudutRotor);
        M.fase = [f3.fA, f3.fB, f3.fC]; M.labelFase = f3.label;
    }

    const b = document.getElementById('sbadge');
    if (b) {
        const deg = ((M.sudutRotor % 360) + 360) % 360;
        b.textContent = 'F Aktif — θ=' + deg.toFixed(1) + '°';
        b.className   = 'sbadge s1';
    }
    drawC2();
    if (Math.floor(F.wt / 300) !== Math.floor((F.wt - dt * 1000) / 300)) output();
    F.animId = requestAnimationFrame(loopGaya);
}

/* ══════════════════════════════════════════════════════════
   FUNGSI GAMBAR — Helper
══════════════════════════════════════════════════════════ */
function arrow(ctx, x1, y1, x2, y2, w, lw) {
    const d = Math.hypot(x2-x1, y2-y1);
    if (d < 2) return;
    const a = Math.atan2(y2-y1, x2-x1), h = Math.min(d*0.5, 8);
    ctx.strokeStyle = w; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.fillStyle = w;
    ctx.beginPath(); ctx.moveTo(x2,y2);
    ctx.lineTo(x2-h*Math.cos(a-0.45), y2-h*Math.sin(a-0.45));
    ctx.lineTo(x2-h*Math.cos(a+0.45), y2-h*Math.sin(a+0.45));
    ctx.closePath(); ctx.fill();
}

/* Canvas 1 — Solenoida */
function drawC1() {
    const c = document.getElementById('c1');
    if (!c) return;
    c.width = c.offsetWidth || c.width;
    const W = c.width, H = c.height, ctx = c.getContext('2d');
    ctx.clearRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);

    const Ival=M.I, N=M.N, L=M.L, fasa=M.fasa;
    const Bval=(MU0*N*Math.abs(Ival))/(2*L);
    const pol=Ival>0?1:(Ival<0?-1:0);
    const wD=pol>0?WN:(pol<0?WS:'#ccc');
    const wB=pol>0?WNL:(pol<0?WSL:'#eee');
    const nSol=fasa, margin=10;
    const totalW=W-2*margin;
    const solW=totalW/nSol-6;
    const cy=H/2, tg=H*0.36;

    for (let sf=0; sf<nSol; sf++) {
        const x0=margin+sf*(totalW/nSol)+3, x1=x0+solW, cx=(x0+x1)/2;
        const jL=Math.min(Math.floor(N/8)+3,20), lw=solW/jL;
        ctx.fillStyle='#bbb'; ctx.fillRect(x0,cy-tg*0.12,solW,tg*0.24);
        ctx.setLineDash([4,5]); ctx.strokeStyle='#ddd'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(x0-10,cy); ctx.lineTo(x1+10,cy); ctx.stroke();
        ctx.setLineDash([]);
        for (let i=0;i<jL;i++) {
            const tx=x0+(i+0.5)*lw;
            ctx.beginPath(); ctx.ellipse(tx,cy,lw*0.44,tg/2,0,Math.PI,2*Math.PI);
            ctx.strokeStyle=wB; ctx.lineWidth=1.5; ctx.stroke();
            ctx.beginPath(); ctx.ellipse(tx,cy,lw*0.44,tg/2,0,0,Math.PI);
            ctx.strokeStyle=wD; ctx.lineWidth=2; ctx.stroke();
        }
        if (pol!==0) {
            const jP=Math.min(jL,5), stp=jL/jP;
            for (let k=0;k<jP;k++) {
                const idx2=Math.floor(k*stp+stp/2), tx2=x0+(idx2+0.5)*lw;
                const yA=cy-tg/2-4, yBw=cy+tg/2+4;
                if(pol>0){arrow(ctx,tx2-4,yA,tx2+4,yA,'#388e3c',1.3);arrow(ctx,tx2+4,yBw,tx2-4,yBw,'#c62828',1.3);}
                else{arrow(ctx,tx2+4,yA,tx2-4,yA,'#c62828',1.3);arrow(ctx,tx2-4,yBw,tx2+4,yBw,'#388e3c',1.3);}
            }
            const aB=pol>0?1:-1;
            for (let b2=0;b2<2;b2++) {
                const fy=cy+(b2-0.5)*tg*0.28;
                for (let kol=0;kol<3;kol++){const fx=x0+10+kol*(solW-20)/2;arrow(ctx,fx,fy,fx+aB*14,fy,'#e65100',1.8);}
            }
        }
        ctx.font='bold 12px Arial'; ctx.textAlign='center';
        if(pol>0){ctx.fillStyle=WN;ctx.fillText('N',x1+9,cy+5);ctx.fillStyle=WS;ctx.fillText('S',x0-9,cy+5);}
        else if(pol<0){ctx.fillStyle=WS;ctx.fillText('S',x1+9,cy+5);ctx.fillStyle=WN;ctx.fillText('N',x0-9,cy+5);}
        else{ctx.fillStyle='#aaa';ctx.fillText('—',x1+9,cy+5);ctx.fillText('—',x0-9,cy+5);}
        ctx.font='bold 11px Arial'; ctx.fillStyle='#333';
        ctx.fillText(['A','B','C'][sf],cx,H-2);
    }
    ctx.font='9px Arial'; ctx.fillStyle='#666'; ctx.textAlign='left';
    ctx.fillText('N='+Math.round(N)+'  B='+Bval.toFixed(5)+' T  I='+(Ival>=0?'+':'')+Ival.toFixed(0)+'A',margin,11);
}

/* Gaya elektromagnetik */
function drawGaya(ctx,cx,cy,R,rR,sudutRotor,poles,faseS,posS) {
    const dStat=R*0.62, sx=cx+dStat*Math.cos(posS), sy=cy+dStat*Math.sin(posS);
    const isN_stat=(faseS>0);
    for (let p=0;p<poles;p++) {
        const sudutTengah=sudutRotor+(p/poles)*2*Math.PI+(1/poles)*Math.PI;
        const isN_rot=(p%2===0);
        const dAng=Math.abs(Math.atan2(Math.sin(sudutTengah-posS),Math.cos(sudutTengah-posS)));
        const threshold=Math.PI/Math.max(poles,2)*1.6;
        if(dAng>threshold) continue;
        const tarik=(isN_stat!==isN_rot);
        const intensitas=Math.max(0,1-dAng/threshold);
        const warna=tarik?'#43a047':'#e53935';
        const alpha=tarik?(0.5+0.5*intensitas):(0.35+0.35*intensitas);
        const angRS=Math.atan2(sy-cy,sx-cx);
        const rpx=cx+rR*Math.cos(angRS), rpy=cy+rR*Math.sin(angRS);
        const fraksi=tarik?(0.45+0.15*intensitas):(0.70+0.20*intensitas);
        const epx=rpx+(sx-rpx)*fraksi, epy=rpy+(sy-rpy)*fraksi;
        ctx.save(); ctx.globalAlpha=alpha;
        ctx.strokeStyle=warna; ctx.lineWidth=tarik?(1.5+intensitas*1.5):(1.0+intensitas*0.8);
        if(!tarik) ctx.setLineDash([4,3]); else ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(rpx,rpy); ctx.lineTo(epx,epy); ctx.stroke(); ctx.setLineDash([]);
        const ang=Math.atan2(epy-rpy,epx-rpx), ah=tarik?7:5;
        ctx.fillStyle=warna;
        ctx.beginPath(); ctx.moveTo(epx,epy);
        ctx.lineTo(epx-ah*Math.cos(ang-0.4),epy-ah*Math.sin(ang-0.4));
        ctx.lineTo(epx-ah*Math.cos(ang+0.4),epy-ah*Math.sin(ang+0.4));
        ctx.closePath(); ctx.fill();
        if(intensitas>0.5){
            ctx.font='bold 7px Arial'; ctx.fillStyle=warna;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(tarik?'TARIK':'TOLAK',(rpx+epx)/2+5*Math.sin(angRS),(rpy+epy)/2-5*Math.cos(angRS));
            ctx.textBaseline='alphabetic'; ctx.textAlign='left';
        }
        ctx.globalAlpha=0.8;
        ctx.beginPath(); ctx.arc(rpx,rpy,3.5,0,2*Math.PI);
        ctx.fillStyle=isN_rot?WN:WS; ctx.fill();
        ctx.restore();
    }
    ctx.save(); ctx.globalAlpha=0.85;
    ctx.beginPath(); ctx.arc(cx+(R*0.60)*Math.cos(posS),cy+(R*0.60)*Math.sin(posS),5,0,2*Math.PI);
    ctx.fillStyle=isN_stat?WN:WS; ctx.fill();
    ctx.restore();
}

/* Stator */
function drawStator(ctx,cx,cy,R,posS,nilaiF,label) {
    const jarak=R*0.76, sx=cx+jarak*Math.cos(posS), sy=cy+jarak*Math.sin(posS);
    const lebar=R*0.16, tinggi=R*0.27;
    const bgC=nilaiF===1?WNL:(nilaiF===-1?WSL:WOFF);
    const brC=nilaiF===1?WN:(nilaiF===-1?WS:'#999');
    ctx.save(); ctx.translate(sx,sy); ctx.rotate(posS+Math.PI/2);
    ctx.fillStyle=bgC; ctx.strokeStyle=brC; ctx.lineWidth=nilaiF!==0?2.5:1.2;
    ctx.beginPath(); ctx.rect(-lebar/2,-tinggi/2,lebar,tinggi); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#aaa'; ctx.lineWidth=0.7;
    for(let i=0;i<5;i++){const y=-tinggi/2+(tinggi/6)*(i+1);ctx.beginPath();ctx.moveTo(-lebar/2+3,y);ctx.lineTo(lebar/2-3,y);ctx.stroke();}
    if(nilaiF!==0){
        ctx.font='bold '+Math.round(tinggi*0.30)+'px Arial';
        ctx.fillStyle=nilaiF===1?WN:WS; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(nilaiF===1?'N':'S',0,0); ctx.textBaseline='alphabetic';
    }
    ctx.font='bold 10px Arial'; ctx.fillStyle='#333'; ctx.textAlign='center';
    ctx.fillText(label,0,-tinggi/2-6);
    ctx.restore();
}

/* Rotor */
function drawRotor(ctx,cx,cy,rR,sudutRad,poles) {
    for(let p=0;p<poles;p++){
        const sM=sudutRad+(p/poles)*2*Math.PI;
        const sA=sudutRad+((p+1)/poles)*2*Math.PI;
        const sT=(sM+sA)/2, isN=(p%2===0);
        ctx.fillStyle=isN?WNL:WSL; ctx.strokeStyle=isN?WN:WS; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,rR,sM,sA); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.font='bold '+Math.round(rR*0.22)+'px Arial';
        ctx.fillStyle=isN?WN:WS; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(isN?'N':'S', cx+rR*0.60*Math.cos(sT), cy+rR*0.60*Math.sin(sT));
        ctx.textBaseline='alphabetic';
    }
    ctx.save(); ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1.5; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+rR*Math.cos(sudutRad),cy+rR*Math.sin(sudutRad)); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    ctx.beginPath(); ctx.arc(cx,cy,rR*0.23,0,2*Math.PI);
    ctx.fillStyle='#ccc'; ctx.fill(); ctx.strokeStyle='#888'; ctx.lineWidth=1; ctx.stroke();
    ctx.textAlign='left';
}

/* Frame motor lengkap */
function drawMotor(ctx,W,H,sudutRad,faseArr,nFasa,poles,hasForce,info) {
    const cx=W/2, cy=H/2, R=Math.min(W,H)*0.36, rR=R*0.48;
    const POS=POS_MAP[nFasa];
    ctx.beginPath(); ctx.arc(cx,cy,R+R*0.11,0,2*Math.PI);
    ctx.strokeStyle='#999'; ctx.lineWidth=R*0.08; ctx.stroke();
    if(hasForce) {
        for(let s=0;s<nFasa;s++){
            if(faseArr[s]===0) continue;
            drawGaya(ctx,cx,cy,R,rR,sudutRad,poles,faseArr[s],POS[s]);
        }
    }
    for(let s=0;s<nFasa;s++) drawStator(ctx,cx,cy,R,POS[s],faseArr[s],['A','B','C'][s]);
    drawRotor(ctx,cx,cy,rR,sudutRad,poles);
    ctx.beginPath(); ctx.arc(cx,cy,R*0.07,0,2*Math.PI);
    ctx.fillStyle='#aaa'; ctx.fill(); ctx.strokeStyle='#666'; ctx.lineWidth=1; ctx.stroke();
    if(info) {
        ctx.font='bold '+Math.round(R*0.080)+'px Arial';
        ctx.fillStyle='#222'; ctx.textAlign='center';
        ctx.fillText(info.line1, cx, cy+R*0.02);
        ctx.font=Math.round(R*0.052)+'px Arial'; ctx.fillStyle='#555';
        ctx.fillText(info.line2, cx, cy+R*0.12);
        ctx.font='bold '+Math.round(R*0.055)+'px Arial'; ctx.fillStyle='#333';
        ctx.fillText(info.line3, cx, cy+R*0.22);
    }
    ctx.textAlign='left'; ctx.font='9px Arial';
    ctx.fillStyle='#43a047'; ctx.fillText('─ TARIK',5,H-15);
    ctx.fillStyle='#e53935'; ctx.fillText('- TOLAK',55,H-15);
    ctx.fillStyle='#666'; ctx.fillText('Kutub:'+poles+'  '+nFasa+'Fasa',110,H-15);
}

/* Canvas 2 */
function drawC2() {
    const c=document.getElementById('c2'); if(!c)return;
    c.width=c.offsetWidth||c.width;
    const W=c.width, H=c.height, ctx=c.getContext('2d');
    ctx.clearRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
    const poles=M.pp*2, d=((M.sudutRotor%360)+360)%360;
    let line1,line2,line3;
    if(M.fasa===1){line1='OSILASI';line2=d.toFixed(1)+'°';line3=M.labelFase;}
    else if(M.fasa===2){line1='GETAR';line2=d.toFixed(1)+'°';line3=M.labelFase;}
    else{line1=M.rpm.toFixed(1)+' RPM';line2=d.toFixed(1)+'°';line3=M.labelFase;}
    const hasFasa=M.berjalan||F.aktif||M.fase.some(v=>v!==0);
    drawMotor(ctx,W,H,M.sudutRad,M.fase,M.fasa,poles,hasFasa,{line1,line2,line3});
}

/* Canvas 3 */
function drawC3() {
    const c=document.getElementById('c3'); if(!c)return;
    c.width=c.offsetWidth||c.width;
    const W=c.width, H=c.height, ctx=c.getContext('2d');
    ctx.clearRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
    const poles=M.pp*2, d=((C3.sudutRotor%360)+360)%360;
    const hasFase=C3.fase.some(v=>v!==0);
    drawMotor(ctx,W,H,C3.sudutRad,C3.fase,3,poles,hasFase,
        {line1:'Manual Switch', line2:d.toFixed(1)+'°', line3:C3.labelFase});
}

/* ══════════════════════════════════════════════════════════
   KONTROL SWITCH MANUAL C3
══════════════════════════════════════════════════════════ */
function toggleSw(n) {
    const idx=n-1, fasa=SW_MAP[idx].fasa, pol=SW_MAP[idx].pol;
    if(SW[idx]===1) {
        SW[idx]=0;
    } else {
        for(let i=0;i<6;i++){if(SW_MAP[i].fasa===fasa) SW[i]=0;}
        for(let i=0;i<6;i++){if(SW[i]===1&&SW_MAP[i].pol===pol) SW[i]=0;}
        SW[idx]=1;
    }
    updateSwUI(); computeC3Fase(); animateC3ToTarget();
}

function updateSwUI() {
    for(let i=0;i<6;i++){
        const n=i+1, btn=document.getElementById('sw'+n), box=document.getElementById('swb'+n);
        if(!btn||!box) continue;
        const pol=SW_MAP[i].pol;
        if(SW[i]===1){
            btn.textContent='ON';
            btn.className=pol===1?'sw-btn active-pos':'sw-btn active-neg';
            box.className =pol===1?'sw-box on-pos':'sw-box on-neg';
        } else {
            btn.textContent='OFF';
            btn.className='sw-btn';
            box.className='sw-box off-sw';
        }
    }
}

function computeC3Fase() {
    let fA=0, fB=0, fC=0;
    for(let i=0;i<6;i++){
        if(SW[i]===1){
            const f=SW_MAP[i].fasa, p=SW_MAP[i].pol;
            if(f===0)fA=p; else if(f===1)fB=p; else fC=p;
        }
    }
    C3.fase=[fA,fB,fC];

    let label='—', targetStep=-1;
    for(let i=0;i<TABEL_KOM.length;i++){
        if(TABEL_KOM[i][2]===fA && TABEL_KOM[i][3]===fB && TABEL_KOM[i][4]===fC)
            { label=TABEL_KOM[i][5]; targetStep=i; break; }
    }
    C3.labelFase = label;

    if(targetStep >= 0) {
        const row    = TABEL_KOM[targetStep];
        const isDiam = row[8];
        if (!isDiam) {
            const mekDeg = row[6];
            const poles  = M.pp * 2;
            C3.targetSudutRad = mekToSudutRad(mekDeg, poles);
        }
    }

    updateRotorInfo3(); output();
}

function updateRotorInfo3() {
    const canvasDeg  = ((C3.sudutRotor % 360) + 360) % 360;
    const poles      = M.pp * 2;
    const halfPole   = 180 / poles;
    const ujungN_canvas = (canvasDeg + halfPole + 360) % 360;
    const mekDeg     = (ujungN_canvas + 90 + 360) % 360;

    const el = document.getElementById('rotorInfo3');
    if(el) el.textContent =
        'Ujung N: ' + mekDeg.toFixed(1) + '° (mek) | Fasa: ' + C3.labelFase +
        ' | A='+(C3.fase[0]===1?'+V':C3.fase[0]===-1?'−V':'OFF')+
        ' B='+(C3.fase[1]===1?'+V':C3.fase[1]===-1?'−V':'OFF')+
        ' C='+(C3.fase[2]===1?'+V':C3.fase[2]===-1?'−V':'OFF');
}

function animateC3ToTarget() {
    if(C3.labelFase==='—'){drawC3();return;}
    let isDiam = false;
    for(let i=0;i<TABEL_KOM.length;i++){
        if(TABEL_KOM[i][5]===C3.labelFase){ isDiam=TABEL_KOM[i][8]; break; }
    }
    if(isDiam){ drawC3(); return; }
    if(C3.animId3) cancelAnimationFrame(C3.animId3);
    C3.animating=true; stepC3();
}

function stepC3() {
    if(!C3.animating) return;
    const target  = C3.targetSudutRad;
    const cur     = C3.sudutRad;
    let   diff    = target - cur;
    while(diff >  Math.PI) diff -= 2*Math.PI;
    while(diff < -Math.PI) diff += 2*Math.PI;
    if(Math.abs(diff) < 0.005){
        C3.sudutRad   = target;
        C3.sudutRotor = target * 180 / Math.PI;
        C3.animating  = false;
    } else {
        C3.sudutRad   += diff * 0.12;
        C3.sudutRotor  = C3.sudutRad * 180 / Math.PI;
    }
    updateRotorInfo3(); drawC3();
    if(C3.animating) C3.animId3=requestAnimationFrame(stepC3);
}

function setPreset(idx) {
    for(let i=0;i<6;i++) SW[i]=0;
    const t=TABEL_KOM[idx];
    if(t[2]=== 1) SW[0]=1;
    if(t[2]===-1) SW[5]=1;
    if(t[3]=== 1) SW[1]=1;
    if(t[3]===-1) SW[4]=1;
    if(t[4]=== 1) SW[2]=1;
    if(t[4]===-1) SW[3]=1;
    updateSwUI(); computeC3Fase(); animateC3ToTarget();
}

function rotorStep(dir) {
    C3.targetSudutRad = C3.sudutRad + dir * (Math.PI / 3);
    C3.sudutRad = C3.targetSudutRad;
    C3.sudutRotor = C3.sudutRad * 180 / Math.PI;
    updateRotorInfo3(); drawC3();
}
