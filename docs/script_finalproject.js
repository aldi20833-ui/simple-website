/**
 * script_modified.js — BLDC Motor Simulation with Theta vs Time Logger (FIXED)
 * Tambahan:
 *  - Grafik theta vs waktu untuk fasa 2 dan 3
 *  - Data logger untuk pencatatan theta setiap interval waktu
 */

/* ══════════════════════════════════════════════════════
   KONSTANTA FISIKA & WARNA
══════════════════════════════════════════════════════ */
const MU0  = 4 * Math.PI * 1e-7;
const WN   = '#ef5350';
const WNL  = '#ffcdd2';
const WS   = '#1e88e5';
const WSL  = '#bbdefb';
const WOFF = '#e0e0e0';
const VMAX = 24;

/* ══════════════════════════════════════════════════════
   POSISI STATOR (rad) — mengikuti jumlah fasa
══════════════════════════════════════════════════════ */
const POS_MAP = {
    1: [-Math.PI / 2],
    2: [-Math.PI / 2, Math.PI / 2],
    3: [-Math.PI / 2,
        -Math.PI / 2 + 2 * Math.PI / 3,
        -Math.PI / 2 + 4 * Math.PI / 3]
};

/* ══════════════════════════════════════════════════════
   TABEL KOMUTASI 3-FASA 6-STEP
   [deg_awal, deg_akhir, fA, fB, fC, label]
   +1=+V, -1=−V, 0=Z
══════════════════════════════════════════════════════ */
const TABEL_KOM = [
    [0,   60,   1, -1,  0, 'A\u207aB\u207b'],
    [60,  120,  1,  0, -1, 'A\u207aC\u207b'],
    [120, 180,  0,  1, -1, 'B\u207aC\u207b'],
    [180, 240, -1,  1,  0, 'B\u207aA\u207b'],
    [240, 300, -1,  0,  1, 'C\u207aA\u207b'],
    [300, 360,  0, -1,  1, 'C\u207aB\u207b']
];

/* ══════════════════════════════════════════════════════
   TABEL KOMUTASI 2-FASA 4-STEP
   [fA, fB, label]
══════════════════════════════════════════════════════ */
const KOM2 = [
    [ 1, -1, 'A\u207aB\u207b'],
    [ 1,  1, 'A\u207aB\u207a'],
    [-1,  1, 'A\u207bB\u207a'],
    [-1, -1, 'A\u207bB\u207b']
];

/* ══════════════════════════════════════════════════════
   STATE MOTOR
══════════════════════════════════════════════════════ */
let M = {
    fasa: 3, pp: 2, f: 1, I: 5, N: 200, L: 0.10, V: 24,
    B: 0, torsi: 0, omega: 0, daya: 0, rpm: 0,
    berjalan: false,
    sudutRotor: 0, sudutRad: 0, sudutOsilasi: 0,
    fase: [0, 0, 0], langkah: 0, labelFase: '\u2014',
    animId: null, wt: 0, t: 0
};

/* ══════════════════════════════════════════════════════
   STATE GAYA EKSTERNAL (F)
══════════════════════════════════════════════════════ */
let F = {
    aktif: false,
    animId: null,
    theta: 0,
    omega: 0,
    wt: 0,
    _rotasiSelesai: false,
    _putaranTotal: 0
};

/*
 * KONSTANTA DINAMIKA GAYA F
 * F_OMEGA0  : frekuensi natural osilasi teredam (rad/s)
 * F_DAMPING : rasio redaman (0 < zeta < 1 → underdamped, muncul osilasi redam)
 *             zeta ~0.35 → agak bergetar dulu sebelum diam (karakteristik motor nyata)
 */
const F_OMEGA0  = 3.0;
const F_DAMPING = 0.35;

/* ══════════════════════════════════════════════════════
   DATA LOGGER — Pencatatan Theta vs Waktu
══════════════════════════════════════════════════════ */
let DataLogger = {
    data: [],           // Array of {time, theta, normalized_theta}
    lastLogTime: 0,
    logInterval: 0.1,   // Catat setiap 0.1 detik
    isActive: false,
    maxDataPoints: 2000 // Batasi jumlah data points
};

function clearDataLogger() {
    DataLogger.data = [];
    DataLogger.lastLogTime = 0;
    DataLogger.isActive = false;
}

function addDataPoint(time, theta) {
    if (!DataLogger.isActive) return;
    
    // Normalisasi theta ke 0-360
    const normalized = ((theta % 360) + 360) % 360;
    
    if (time - DataLogger.lastLogTime >= DataLogger.logInterval && DataLogger.data.length < DataLogger.maxDataPoints) {
        DataLogger.data.push({
            time: time,
            theta: theta,
            normalized_theta: normalized
        });
        DataLogger.lastLogTime = time;
    }
}

function updateDataLoggerDisplay() {
    const textarea = document.getElementById('data-logger');
    if (!textarea) return;
    
    let output = "";
    
    if (DataLogger.data.length === 0) {
        output = "Belum ada data...";
    } else {
        output = "Waktu (s)    |    θ (deg)    |    θ Norm (0-360°)\n";
        output += "─".repeat(55) + "\n";
        
        for (let i = 0; i < DataLogger.data.length; i++) {
            const dp = DataLogger.data[i];
            const timeStr = dp.time.toFixed(2).padStart(8);
            const thetaStr = dp.theta.toFixed(2).padStart(10);
            const normStr = dp.normalized_theta.toFixed(2).padStart(10);
            output += timeStr + "    |    " + thetaStr + "    |    " + normStr + "°\n";
        }
    }
    
    textarea.value = output;
    textarea.scrollTop = textarea.scrollHeight;
}

/* ══════════════════════════════════════════════════════
   PARSE INPUT
══════════════════════════════════════════════════════ */
function parseInput() {
    const raw = document.getElementById('text-input').value;
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

/* ══════════════════════════════════════════════════════
   FISIKA
══════════════════════════════════════════════════════ */
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
            return { fA: TABEL_KOM[i][2], fB: TABEL_KOM[i][3], fC: TABEL_KOM[i][4], label: TABEL_KOM[i][5], idx: i };
    }
    return { fA: TABEL_KOM[5][2], fB: TABEL_KOM[5][3], fC: TABEL_KOM[5][4], label: TABEL_KOM[5][5], idx: 5 };
}

function statusMotor() {
    if (M.fasa === 1) return { l: '1 Fasa \u2014 Osilasi (tidak berputar)', c: 's0' };
    if (M.fasa === 2) return { l: '2 Fasa \u2014 Kurang stabil (bergetar)',  c: 's1' };
    return { l: '3 Fasa \u2014 Stabil (rotasi penuh 6-Step)', c: 's2' };
}

/* ══════════════════════════════════════════════════════
   OUTPUT
══════════════════════════════════════════════════════ */
function output() {
    if (!F.aktif) {
        const si = statusMotor();
        const b  = document.getElementById('sbadge');
        if (b) { b.textContent = si.l; b.className = 'sbadge ' + si.c; }
    }

    const sign = M.I >= 0 ? '+' : '';
    const d    = ((M.sudutRotor % 360) + 360) % 360;

    consolex.clear();
    consolex.log('');
    consolex.log('-- Parameter --');
    consolex.log('Fasa       = ' + M.fasa);
    consolex.log('Pole pairs = ' + M.pp + ' (' + (M.pp * 2) + ' kutub)');
    consolex.log('Frekuensi  = ' + M.f.toFixed(2) + ' Hz');
    consolex.log('Arus       = ' + sign + M.I.toFixed(1) + ' A');
    consolex.log('Lilitan    = ' + M.N);
    consolex.log('Panjang L  = ' + M.L.toFixed(3) + ' m');
    consolex.log('');
    consolex.log('-- Hasil --');
    consolex.log('B     = ' + M.B.toFixed(6) + ' T');
    consolex.log('RPM   = ' + M.rpm.toFixed(2));
    consolex.log('omega = ' + M.omega.toFixed(3) + ' rad/s');
    consolex.log('torsi = ' + M.torsi.toFixed(4) + ' N.m');
    consolex.log('Daya  = ' + M.daya.toFixed(2) + ' W');
    consolex.log('');

    if (F.aktif) {
        consolex.log('');
        consolex.log('-- Gaya Eksternal --');
        consolex.log('theta = ' + (F.theta * 180 / Math.PI).toFixed(2) + 'deg');
        consolex.log('omega = ' + F.omega.toFixed(3) + ' rad/s');
    }
}

/* ══════════════════════════════════════════════════════
   FUNGSI UTAMA
══════════════════════════════════════════════════════ */
function hitung() {
    baca(); fisika(); output();
    clearDataLogger();
    drawC1(); drawC2(); drawGraph(); drawGraphTheta();
}

function jalankan() {
    if (F.aktif) _stopGaya();
    baca(); fisika(); output();
    M.berjalan = true;
    M.wt = performance.now();
    M.t = 0;
    M.sudutRotor = 0;
    clearDataLogger();
    DataLogger.isActive = true;
    if (M.animId) cancelAnimationFrame(M.animId);
    loop(performance.now());
}

function hentikan() {
    M.berjalan = false;
    if (M.animId) { cancelAnimationFrame(M.animId); M.animId = null; }
    DataLogger.isActive = false;
    updateDataLoggerDisplay();
    _stopGaya();
}

/* ══════════════════════════════════════════════════════
   LOOP UTAMA (RUN mode)
══════════════════════════════════════════════════════ */
function loop(wms) {
    const dt = Math.min((wms - M.wt) / 1000, 0.05);
    M.wt = wms;
    if (!M.berjalan) return;
    M.t += dt;

    if (M.fasa === 1) {
        const amp  = 25;
        M.sudutOsilasi = amp * Math.sin(2 * Math.PI * M.f * M.t);
        M.sudutRotor   = M.sudutOsilasi;
        M.sudutRad     = M.sudutRotor * Math.PI / 180;
        const sinVal   = Math.sin(2 * Math.PI * M.f * M.t);
        M.fase         = [sinVal >= 0 ? 1 : -1];
        M.labelFase    = M.fase[0] === 1 ? 'A+' : 'A-';

    } else if (M.fasa === 2) {
        const baseAngle = (M.omega * M.t * 180 / Math.PI);
        const jitter    = 15 * Math.sin(4 * Math.PI * M.f * M.t + 0.5)
                        +  8 * Math.sin(7 * Math.PI * M.f * M.t + 1.2);
        M.sudutRotor    = baseAngle + jitter;
        M.sudutRad      = M.sudutRotor * Math.PI / 180;
        const el        = ((M.sudutRotor * M.pp) % 360 + 360) % 360;
        const lk        = Math.floor(el / 90) % 4;
        M.fase          = [KOM2[lk][0], KOM2[lk][1]];
        M.langkah       = lk;
        M.labelFase     = KOM2[lk][2];

    } else {
        const degPerSec = M.rpm * 6;
        M.sudutRotor   += degPerSec * dt;
        M.sudutRad      = M.sudutRotor * Math.PI / 180;
        const f3        = getFaseFromSudut(M.sudutRotor);
        M.fase          = [f3.fA, f3.fB, f3.fC];
        M.langkah       = f3.idx;
        M.labelFase     = f3.label;
    }

    // Log data theta
    addDataPoint(M.t, M.sudutRotor);

    if (Math.floor(M.t * 2) !== Math.floor((M.t - dt) * 2)) output();
    drawC2(); drawGraph(); drawGraphTheta();
    M.animId = requestAnimationFrame(loop);
}

/* ══════════════════════════════════════════════════════
   GAYA EKSTERNAL (F)
══════════════════════════════════════════════════════ */
function tekanGaya() {
    if (M.berjalan) return;
    baca(); fisika();

    if (F.aktif) { _stopGaya(); return; }

    F.aktif = true;
    F.wt    = performance.now();
    F._rotasiSelesai = false;
    F._putaranTotal  = 0;
    clearDataLogger();
    DataLogger.isActive = true;

    if (M.fasa === 1) {
        F.theta = 45 * Math.PI / 180;
        F.omega = 0;
        M.sudutRotor = 45;
        M.sudutRad   = F.theta;
        M.fase       = [1];
        M.labelFase  = 'A+ (Statis)';

    } else if (M.fasa === 2) {
        F.theta = 0;
        F.omega = F_OMEGA0 * 2.5;
        M.sudutRotor = 0;
        M.sudutRad   = 0;
        M.fase    = [1, -1];
        M.labelFase  = 'A+(N) B-(S) Statis';

    } else {
        F.theta = 0; F.omega = F_OMEGA0 * 3;
        M.sudutRotor = 0; M.sudutRad = 0;
        const f3 = getFaseFromSudut(0);
        M.fase = [f3.fA, f3.fB, f3.fC];
        M.labelFase = f3.label;
    }

    loopGaya(performance.now());
}

function _stopGaya() {
    F.aktif = false;
    if (F.animId) { cancelAnimationFrame(F.animId); F.animId = null; }
    DataLogger.isActive = false;
    updateDataLoggerDisplay();
    const si = statusMotor();
    const b  = document.getElementById('sbadge');
    if (b) { b.textContent = si.l; b.className = 'sbadge ' + si.c; }
    const btnG = document.getElementById('btn-gaya');
    if (btnG) { btnG.classList.remove('aktif'); btnG.textContent = '\u26a1 GAYA (F)'; }
}

function hentikanGaya() { _stopGaya(); }

/* ══════════════════════════════════════════════════════
   LOOP GAYA EKSTERNAL
══════════════════════════════════════════════════════ */
function loopGaya(wms) {
    const dt = Math.min((wms - F.wt) / 1000, 0.05);
    F.wt = wms;
    if (!F.aktif) return;

    // Hitung waktu sejak gaya dimulai
    let timeElapsed = 0;
    if (M.fasa === 1) timeElapsed = F.wt / 1000; // simplified time tracking
    else if (M.fasa === 2) timeElapsed = F.wt / 1000;
    else timeElapsed = F.wt / 1000;

    if (M.fasa === 1) {
        const alpha = -F_OMEGA0 * F_OMEGA0 * F.theta - 2 * F_DAMPING * F_OMEGA0 * F.omega;
        F.omega += alpha * dt;
        F.theta += F.omega * dt;
        M.sudutRotor = F.theta * 180 / Math.PI;
        M.sudutRad   = F.theta;
        M.fase       = [1];
        M.labelFase  = 'A+ (Statis)';

        if (Math.abs(F.theta) < 0.003 && Math.abs(F.omega) < 0.005) {
            M.sudutRotor = 0; M.sudutRad = 0;
            M.fase = [1]; M.labelFase = 'A+ (Diam)';
            _stopGaya(); drawC2(); drawGraph(); drawGraphTheta(); output(); return;
        }

    } else if (M.fasa === 2) {
        const thetaEq = Math.PI;

        if (!F._rotasiSelesai) {
            const err    = F.theta - thetaEq;
            const progress = Math.min(Math.abs(F.theta) / thetaEq, 1.0);
            const kSpring  = F_OMEGA0 * F_OMEGA0 * progress * 0.6;
            const kDamp    = 2 * F_DAMPING * F_OMEGA0 * (0.3 + 0.7 * progress);
            const alpha    = -kSpring * err - kDamp * F.omega;
            F.omega += alpha * dt;
            F.theta += F.omega * dt;
            M.sudutRotor = F.theta * 180 / Math.PI;
            M.sudutRad   = F.theta;

            if (F.theta >= thetaEq * 0.85 || F._putaranTotal >= thetaEq) {
                F._rotasiSelesai = true;
                if (F.omega > 0.5) F.omega = 0.5;
            }
            F._putaranTotal += Math.abs(F.omega * dt);

        } else {
            const err   = F.theta - thetaEq;
            const alpha = -F_OMEGA0 * F_OMEGA0 * err - 2 * F_DAMPING * F_OMEGA0 * F.omega;
            F.omega += alpha * dt;
            F.theta += F.omega * dt;
            M.sudutRotor = F.theta * 180 / Math.PI;
            M.sudutRad   = F.theta;

            if (Math.abs(err) < 0.003 && Math.abs(F.omega) < 0.005) {
                M.sudutRotor = thetaEq * 180 / Math.PI;
                M.sudutRad   = thetaEq;
                M.fase = [-1, 1]; M.labelFase = 'A+(N) B-(S) Diam';
                _stopGaya(); drawC2(); drawGraph(); drawGraphTheta(); output(); return;
            }
        }

        M.fase      = [-1, 1];
        M.labelFase = 'A+(N) B-(S) Statis';

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
            const err   = F.theta - snapRad;
            const alpha = -F_OMEGA0 * F_OMEGA0 * err - 2 * F_DAMPING * F.omega;
            F.omega += alpha * dt;
            F.theta += F.omega * dt;
            M.sudutRotor = F.theta * 180 / Math.PI;
            M.sudutRad   = F.theta;

            if (Math.abs(err) < 0.005 && Math.abs(F.omega) < 0.01) {
                M.sudutRotor = snapRad * 180 / Math.PI;
                M.sudutRad   = snapRad;
                _stopGaya(); drawC2(); drawGraph(); drawGraphTheta(); output(); return;
            }
        }

        const f3 = getFaseFromSudut(M.sudutRotor);
        M.fase = [f3.fA, f3.fB, f3.fC]; M.labelFase = f3.label;
    }

    // Log data theta
    addDataPoint(F.wt / 1000, M.sudutRotor);

    const b = document.getElementById('sbadge');
    if (b) {
        const deg = ((M.sudutRotor % 360) + 360) % 360;
        b.textContent = 'F Aktif \u2014 \u03b8=' + deg.toFixed(1) + '\u00b0';
        b.className   = 'sbadge s1';
    }

    drawC2(); drawGraph(); drawGraphTheta();
    if (Math.floor(F.wt / 300) !== Math.floor((F.wt - dt * 1000) / 300)) output();
    F.animId = requestAnimationFrame(loopGaya);
}

/* ══════════════════════════════════════════════════════
   HELPER — panah
══════════════════════════════════════════════════════ */
function arrow(ctx, x1, y1, x2, y2, w, lw) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 2) return;
    const a = Math.atan2(y2 - y1, x2 - x1), h = Math.min(d * 0.5, 8);
    ctx.strokeStyle = w; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = w;
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45));
    ctx.lineTo(x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill();
}

/* ══════════════════════════════════════════════════════
   CANVAS 1 — Solenoida (jumlah = M.fasa)
══════════════════════════════════════════════════════ */
function drawC1() {
    const c = document.getElementById('c1'); if (!c) return;
    c.width = c.offsetWidth || c.width;
    const W = c.width, H = c.height, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

    const Ival = M.I, N = M.N, L = M.L;
    const Bval = (MU0 * N * Math.abs(Ival)) / (2 * L);
    const pol  = Ival > 0 ? 1 : (Ival < 0 ? -1 : 0);
    const wD   = pol > 0 ? WN  : (pol < 0 ? WS  : '#ccc');
    const wB   = pol > 0 ? WNL : (pol < 0 ? WSL : '#eee');
    const margin = 20;
    const x0 = margin;
    const x1 = W - margin;
    const solW = x1 - x0;
    const cy = H / 2, tg = H * 0.36;

    /* ← TUNGGAL SAJA (SATU SOLENOIDA) */
    const jL = Math.min(Math.floor(N / 8) + 3, 20);
    const lw = solW / jL;

    ctx.fillStyle = '#bbb';
    ctx.fillRect(x0, cy - tg * 0.12, solW, tg * 0.24);

    ctx.setLineDash([4, 5]); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0 - 10, cy); ctx.lineTo(x1 + 10, cy); ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < jL; i++) {
        const tx = x0 + (i + 0.5) * lw;
        ctx.beginPath(); ctx.ellipse(tx, cy, lw * 0.44, tg / 2, 0, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = wB; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(tx, cy, lw * 0.44, tg / 2, 0, 0, Math.PI);
        ctx.strokeStyle = wD; ctx.lineWidth = 2; ctx.stroke();
    }

    if (pol !== 0) {
        const jP = Math.min(jL, 5), stp = jL / jP;
        for (let k = 0; k < jP; k++) {
            const idx2 = Math.floor(k * stp + stp / 2);
            const tx2  = x0 + (idx2 + 0.5) * lw;
            const yA   = cy - tg / 2 - 4, yBw = cy + tg / 2 + 4;
            if (pol > 0) { arrow(ctx, tx2-4, yA,  tx2+4, yA,  '#388e3c', 1.3); arrow(ctx, tx2+4, yBw, tx2-4, yBw, '#c62828', 1.3); }
            else         { arrow(ctx, tx2+4, yA,  tx2-4, yA,  '#c62828', 1.3); arrow(ctx, tx2-4, yBw, tx2+4, yBw, '#388e3c', 1.3); }
        }
        const aB = pol > 0 ? 1 : -1;
        for (let b2 = 0; b2 < 2; b2++) {
            const fy = cy + (b2 - 0.5) * tg * 0.28;
            for (let kol = 0; kol < 3; kol++) {
                const fx = x0 + 10 + kol * (solW - 20) / 2;
                arrow(ctx, fx, fy, fx + aB * 14, fy, '#e65100', 1.8);
            }
        }
    }

    ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    if (pol > 0)      { ctx.fillStyle = WN; ctx.fillText('N', x1+9, cy+5); ctx.fillStyle = WS; ctx.fillText('S', x0-9, cy+5); }
    else if (pol < 0) { ctx.fillStyle = WS; ctx.fillText('S', x1+9, cy+5); ctx.fillStyle = WN; ctx.fillText('N', x0-9, cy+5); }
    else              { ctx.fillStyle = '#aaa'; ctx.fillText('--', x1+9, cy+5); ctx.fillText('--', x0-9, cy+5); }

    ctx.font = '9px Arial'; ctx.fillStyle = '#666'; ctx.textAlign = 'left';
    ctx.fillText('N=' + Math.round(N) + '  B=' + Bval.toFixed(5) + ' T', margin, 11);
}

/* ══════════════════════════════════════════════════════
   GAMBAR GAYA LORENTZ
══════════════════════════════════════════════════════ */
function drawGaya(ctx, cx, cy, R, rR, sudutRotor, poles, faseS, posS) {
    const dStat = R * 0.62;
    const sx = cx + dStat * Math.cos(posS), sy = cy + dStat * Math.sin(posS);
    const isN_stat = (faseS > 0);

    for (let p = 0; p < poles; p++) {
        const sudutTengah = sudutRotor + (p / poles) * 2 * Math.PI + (1 / poles) * Math.PI;
        const isN_rot     = (p % 2 === 0);
        const dAng        = Math.abs(Math.atan2(Math.sin(sudutTengah - posS), Math.cos(sudutTengah - posS)));
        const threshold   = Math.PI / Math.max(poles, 2) * 1.6;
        if (dAng > threshold) continue;

        const tarik     = (isN_stat !== isN_rot);
        const intensitas = Math.max(0, 1 - dAng / threshold);
        const warna     = tarik ? '#43a047' : '#e53935';
        const alpha     = tarik ? (0.5 + 0.5 * intensitas) : (0.35 + 0.35 * intensitas);
        const angRS     = Math.atan2(sy - cy, sx - cx);
        const rpx = cx + rR * Math.cos(angRS), rpy = cy + rR * Math.sin(angRS);
        const fraksi    = tarik ? (0.45 + 0.15 * intensitas) : (0.70 + 0.20 * intensitas);
        const epx = rpx + (sx - rpx) * fraksi, epy = rpy + (sy - rpy) * fraksi;

        ctx.save(); ctx.globalAlpha = alpha;
        ctx.strokeStyle = warna;
        ctx.lineWidth   = tarik ? (1.5 + intensitas * 1.5) : (1.0 + intensitas * 0.8);
        if (!tarik) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(rpx, rpy); ctx.lineTo(epx, epy); ctx.stroke();
        ctx.setLineDash([]);

        const ang = Math.atan2(epy - rpy, epx - rpx), ah = tarik ? 7 : 5;
        ctx.fillStyle = warna;
        ctx.beginPath(); ctx.moveTo(epx, epy);
        ctx.lineTo(epx - ah * Math.cos(ang - 0.4), epy - ah * Math.sin(ang - 0.4));
        ctx.lineTo(epx - ah * Math.cos(ang + 0.4), epy - ah * Math.sin(ang + 0.4));
        ctx.closePath(); ctx.fill();

        if (intensitas > 0.5) {
            ctx.font = 'bold 7px Arial'; ctx.fillStyle = warna;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(tarik ? 'TARIK' : 'TOLAK',
                (rpx + epx) / 2 + 5 * Math.sin(angRS),
                (rpy + epy) / 2 - 5 * Math.cos(angRS));
            ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(rpx, rpy, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = isN_rot ? WN : WS; ctx.fill();
        ctx.restore();
    }

    ctx.save(); ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(cx + (R * 0.60) * Math.cos(posS), cy + (R * 0.60) * Math.sin(posS), 5, 0, 2 * Math.PI);
    ctx.fillStyle = isN_stat ? WN : WS; ctx.fill();
    ctx.restore();
}

/* ══════════════════════════════════════════════════════
   GAMBAR STATOR
══════════════════════════════════════════════════════ */
function drawStator(ctx, cx, cy, R, posS, nilaiF, label) {
    const jarak = R * 0.76, sx = cx + jarak * Math.cos(posS), sy = cy + jarak * Math.sin(posS);
    const lebar = R * 0.16, tinggi = R * 0.27;
    const bgC = nilaiF === 1 ? WNL : (nilaiF === -1 ? WSL : WOFF);
    const brC = nilaiF === 1 ? WN  : (nilaiF === -1 ? WS  : '#999');

    ctx.save(); ctx.translate(sx, sy); ctx.rotate(posS + Math.PI / 2);
    ctx.fillStyle = bgC; ctx.strokeStyle = brC; ctx.lineWidth = nilaiF !== 0 ? 2.5 : 1.2;
    ctx.beginPath(); ctx.rect(-lebar / 2, -tinggi / 2, lebar, tinggi); ctx.fill(); ctx.stroke();

    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.7;
    for (let i = 0; i < 5; i++) {
        const y = -tinggi / 2 + (tinggi / 6) * (i + 1);
        ctx.beginPath(); ctx.moveTo(-lebar / 2 + 3, y); ctx.lineTo(lebar / 2 - 3, y); ctx.stroke();
    }
    if (nilaiF !== 0) {
        ctx.font = 'bold ' + Math.round(tinggi * 0.30) + 'px Arial';
        ctx.fillStyle = nilaiF === 1 ? WN : WS;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(nilaiF === 1 ? 'N' : 'S', 0, 0);
        ctx.textBaseline = 'alphabetic';
    }
    ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#333'; ctx.textAlign = 'center';
    ctx.fillText(label, 0, -tinggi / 2 - 6);
    ctx.restore();
}

/* ══════════════════════════════════════════════════════
   GAMBAR ROTOR
══════════════════════════════════════════════════════ */
function drawRotor(ctx, cx, cy, rR, sudut, poles) {
    for (let p = 0; p < poles; p++) {
        const sM = sudut + (p / poles) * 2 * Math.PI;
        const sA = sudut + ((p + 1) / poles) * 2 * Math.PI;
        const sT = (sM + sA) / 2, isN = (p % 2 === 0);
        ctx.fillStyle = isN ? WNL : WSL; ctx.strokeStyle = isN ? WN : WS; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, rR, sM, sA); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.font = 'bold ' + Math.round(rR * 0.22) + 'px Arial';
        ctx.fillStyle = isN ? WN : WS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isN ? 'N' : 'S', cx + rR * 0.60 * Math.cos(sT), cy + rR * 0.60 * Math.sin(sT));
        ctx.textBaseline = 'alphabetic';
    }
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + rR * Math.cos(sudut), cy + rR * Math.sin(sudut)); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, rR * 0.23, 0, 2 * Math.PI);
    ctx.fillStyle = '#ccc'; ctx.fill(); ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'left';
}

/* ══════════════════════════════════════════════════════
   CANVAS 2 — Motor + Gaya
══════════════════════════════════════════════════════ */
function drawMotor(ctx, W, H, sudutRad, faseArr, nFasa, poles, hasForce, info) {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.36, rR = R * 0.48;
    const POS = POS_MAP[nFasa] || POS_MAP[3];

    ctx.beginPath(); ctx.arc(cx, cy, R + R * 0.11, 0, 2 * Math.PI);
    ctx.strokeStyle = '#999'; ctx.lineWidth = R * 0.08; ctx.stroke();

    if (hasForce) {
        for (let s = 0; s < nFasa; s++) {
            if ((faseArr[s] || 0) === 0) continue;
            drawGaya(ctx, cx, cy, R, rR, sudutRad, poles, faseArr[s], POS[s]);
        }
    }
    for (let s = 0; s < nFasa; s++)
        drawStator(ctx, cx, cy, R, POS[s], faseArr[s] || 0, ['A', 'B', 'C'][s]);

    drawRotor(ctx, cx, cy, rR, sudutRad, poles);

    ctx.beginPath(); ctx.arc(cx, cy, R * 0.07, 0, 2 * Math.PI);
    ctx.fillStyle = '#aaa'; ctx.fill(); ctx.strokeStyle = '#666'; ctx.lineWidth = 1; ctx.stroke();

    if (info) {
        ctx.font = 'bold ' + Math.round(R * 0.080) + 'px Arial';
        ctx.fillStyle = '#222'; ctx.textAlign = 'center';
        ctx.fillText(info.line1, cx, cy + R * 0.02);
        ctx.font = Math.round(R * 0.052) + 'px Arial'; ctx.fillStyle = '#555';
        ctx.fillText(info.line2, cx, cy + R * 0.12);
        ctx.font = 'bold ' + Math.round(R * 0.055) + 'px Arial'; ctx.fillStyle = '#333';
        ctx.fillText(info.line3, cx, cy + R * 0.22);
    }

    ctx.textAlign = 'left'; ctx.font = '9px Arial';
    ctx.fillStyle = '#43a047'; ctx.fillText('-- TARIK', 5, H - 15);
    ctx.fillStyle = '#e53935'; ctx.fillText('- TOLAK', 55, H - 15);
    ctx.fillStyle = '#666'; ctx.fillText('Kutub:' + poles + '  ' + nFasa + 'Fasa', 110, H - 15);
}

function drawC2() {
    const c = document.getElementById('c2'); if (!c) return;
    c.width = c.offsetWidth || c.width;
    const W = c.width, H = c.height, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

    const poles = M.pp * 2;
    const d     = ((M.sudutRotor % 360) + 360) % 360;
    let line1, line2, line3;

    if      (M.fasa === 1) { line1 = F.aktif ? 'GAYA F' : 'OSILASI'; line2 = d.toFixed(1) + 'deg'; line3 = M.labelFase; }
    else if (M.fasa === 2) { line1 = F.aktif ? 'GAYA F' : 'GETAR';   line2 = d.toFixed(1) + 'deg'; line3 = M.labelFase; }
    else                   { line1 = F.aktif ? 'GAYA F' : M.rpm.toFixed(1) + ' RPM'; line2 = d.toFixed(1) + 'deg'; line3 = M.labelFase; }

    const hasFasa = M.berjalan || F.aktif || M.fase.some(v => (v || 0) !== 0);
    drawMotor(ctx, W, H, M.sudutRad, M.fase, M.fasa, poles, hasFasa, { line1, line2, line3 });
}

/* ══════════════════════════════════════════════════════
   CANVAS GRAPH TEGANGAN — Terpisah per Fasa
══════════════════════════════════════════════════════ */
function drawGraph() {
    const c = document.getElementById('graph'); if (!c) return;
    c.width = c.offsetWidth || c.width;
    const W = c.width, H = c.height, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, W, H);

    const nF         = M.fasa;
    const ALL_LABELS = ['A', 'B', 'C'];
    const ALL_COLORS = ['#388e3c', '#ff9800', '#7c3aed'];  /* ← HIJAU, ORANGE, UNGU */

    const marginLeft   = 38;
    const marginRight  = 10;
    const marginTop    = 12;
    const marginBottom = 18;
    const totalH = H - marginTop - marginBottom;
    const rowH   = totalH / nF;
    const gW     = W - marginLeft - marginRight;

    const currentDeg = ((M.sudutRotor % 360) + 360) % 360;
    const gridDiv    = nF === 2 ? 4 : 6;

    for (let fi = 0; fi < nF; fi++) {
        const gy       = marginTop + fi * rowH;
        const midY     = gy + rowH / 2;
        const rowInner = rowH * 0.72;
        const yTop     = midY - rowInner / 2;
        const yMid     = midY;
        const yBot     = midY + rowInner / 2;

        ctx.fillStyle = fi % 2 === 0 ? '#f9f9f9' : '#f4f4f4';
        ctx.fillRect(marginLeft, gy, gW, rowH - 1);

        ctx.save();
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.5; ctx.setLineDash([3, 3]);
        for (let i = 0; i <= gridDiv; i++) {
            const x = marginLeft + (i / gridDiv) * gW;
            ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + rowH - 1); ctx.stroke();
        }
        ctx.setLineDash([]); ctx.restore();

        ctx.save();
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(marginLeft, midY); ctx.lineTo(marginLeft + gW, midY); ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 10px Arial'; ctx.fillStyle = ALL_COLORS[fi];
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText('Ph ' + ALL_LABELS[fi], marginLeft - 3, midY);
        ctx.textBaseline = 'alphabetic'; ctx.restore();

        ctx.save(); ctx.font = '7px Arial'; ctx.fillStyle = '#999'; ctx.textAlign = 'right';
        ctx.fillText('+', marginLeft - 3, yTop + 3);
        ctx.fillText(nF === 3 ? 'Z' : '0', marginLeft - 3, yMid + 3);
        ctx.fillText('-', marginLeft - 3, yBot + 3);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = ALL_COLORS[fi]; ctx.lineWidth = 2;
        ctx.beginPath();
        let prevY = null, prevX = marginLeft, isFirst = true;

        if (F.aktif && nF === 1) {
            ctx.moveTo(marginLeft, yTop);
            ctx.lineTo(marginLeft + gW, yTop);

        } else if (F.aktif && nF === 2) {
            const yVal = fi === 0 ? yTop : yBot;
            ctx.moveTo(marginLeft, yVal);
            ctx.lineTo(marginLeft + gW, yVal);

        } else if (nF === 1) {
            for (let deg = 0; deg <= 360; deg += 2) {
                const sinV = Math.sin(deg * Math.PI / 180);
                const xPos = marginLeft + (deg / 360) * gW;
                const yPos = midY - sinV * (rowInner / 2);
                if (isFirst) { ctx.moveTo(xPos, yPos); isFirst = false; }
                else ctx.lineTo(xPos, yPos);
                prevX = xPos; prevY = yPos;
            }

        } else if (nF === 2) {
            for (let deg = 0; deg <= 360; deg += 1) {
                const el   = ((deg * M.pp) % 360 + 360) % 360;
                const lk   = Math.floor(el / 90) % 4;
                const fVal = fi === 0 ? KOM2[lk][0] : KOM2[lk][1];
                const yVal = fVal === 1 ? yTop : (fVal === -1 ? yBot : yMid);
                const xPos = marginLeft + (deg / 360) * gW;
                if (isFirst) { ctx.moveTo(xPos, yVal); prevY = yVal; isFirst = false; }
                else { if (yVal !== prevY) ctx.lineTo(prevX, yVal); ctx.lineTo(xPos, yVal); }
                prevX = xPos; prevY = yVal;
            }

        } else {
            for (let deg = 0; deg <= 360; deg += 1) {
                const fi3  = getFaseFromSudut(deg);
                const fVal = fi === 0 ? fi3.fA : (fi === 1 ? fi3.fB : fi3.fC);
                const yVal = fVal === 1 ? yTop : (fVal === -1 ? yBot : yMid);
                const xPos = marginLeft + (deg / 360) * gW;
                if (isFirst) { ctx.moveTo(xPos, yVal); prevY = yVal; isFirst = false; }
                else { if (yVal !== prevY) ctx.lineTo(prevX, yVal); ctx.lineTo(xPos, yVal); }
                prevX = xPos; prevY = yVal;
            }
        }
        ctx.stroke(); ctx.restore();

        if (F.aktif && nF === 1) {
            ctx.save(); ctx.font = 'bold 8px Arial';
            ctx.fillStyle = ALL_COLORS[0]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('+V (Statis)', marginLeft + gW * 0.5, yTop + 8);
            ctx.textBaseline = 'alphabetic'; ctx.restore();

        } else if (F.aktif && nF === 2) {
            ctx.save(); ctx.font = 'bold 8px Arial';
            ctx.fillStyle = ALL_COLORS[fi]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const yVal = fi === 0 ? yTop : yBot;
            const lbl  = fi === 0 ? '+V (N Statis)' : '-V (S Statis)';
            ctx.fillText(lbl, marginLeft + gW * 0.5, yVal + (fi === 0 ? 8 : -8));
            ctx.textBaseline = 'alphabetic'; ctx.restore();

        } else if (nF === 1) {
            ctx.save(); ctx.font = 'bold 8px Arial';
            ctx.fillStyle = ALL_COLORS[0]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('+V', marginLeft + gW * 0.25, yTop + 6);
            ctx.fillText('-V', marginLeft + gW * 0.75, yBot - 6);
            ctx.textBaseline = 'alphabetic'; ctx.restore();

        } else if (nF === 2) {
            for (let step = 0; step < 4; step++) {
                const degMid = (step + 0.5) * 90;
                const lk     = step % 4;
                const fVal   = fi === 0 ? KOM2[lk][0] : KOM2[lk][1];
                const xMid   = marginLeft + (degMid / 360) * gW;
                const yVal   = fVal === 1 ? yTop : yBot;
                const lbl    = fVal === 1 ? '+' : '-';
                ctx.save(); ctx.font = 'bold 8px Arial'; ctx.fillStyle = ALL_COLORS[fi];
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(lbl, xMid, yVal + (fVal === 1 ? 5 : -5));
                ctx.textBaseline = 'alphabetic'; ctx.restore();
            }

        } else {
            for (let step = 0; step < 6; step++) {
                const degMid = TABEL_KOM[step][0] + 30;
                const fVal   = fi === 0 ? TABEL_KOM[step][2] : (fi === 1 ? TABEL_KOM[step][3] : TABEL_KOM[step][4]);
                const xMid   = marginLeft + (degMid / 360) * gW;
                const yVal   = fVal === 1 ? yTop : (fVal === -1 ? yBot : yMid);
                const lbl    = fVal === 1 ? '+' : (fVal === -1 ? '-' : 'Z');
                ctx.save(); ctx.font = 'bold 8px Arial';
                ctx.fillStyle = fVal !== 0 ? ALL_COLORS[fi] : '#aaa';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(lbl, xMid, yVal + (fVal === 1 ? 5 : fVal === -1 ? -5 : 0));
                ctx.textBaseline = 'alphabetic'; ctx.restore();
            }
        }

        const xCurr = marginLeft + (currentDeg / 360) * gW;
        ctx.save();
        ctx.strokeStyle = 'rgba(50,50,50,0.35)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(xCurr, gy + 1); ctx.lineTo(xCurr, gy + rowH - 2); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
    }

    ctx.save(); ctx.font = '9px Arial'; ctx.fillStyle = '#666'; ctx.textAlign = 'center';
    for (let i = 0; i <= gridDiv; i++) {
        const x   = marginLeft + (i / gridDiv) * gW;
        const deg = Math.round(i * (360 / gridDiv));
        ctx.fillText(deg + 'deg', x, H - 4);
    }
    ctx.restore();

    const xCurr = marginLeft + (currentDeg / 360) * gW;
    ctx.save(); ctx.font = 'bold 8px Arial'; ctx.fillStyle = '#333'; ctx.textAlign = 'center';
    ctx.fillText(currentDeg.toFixed(0) + 'deg', xCurr, marginTop - 1);
    ctx.restore();
}

/* ══════════════════════════════════════════════════════
   CANVAS GRAPH THETA vs WAKTU
   Menampilkan sudut rotor (theta) seiring waktu
══════════════════════════════════════════════════════ */
function drawGraphTheta() {
    const c = document.getElementById('graph-theta'); if (!c) return;
    c.width = c.offsetWidth || c.width;
    const W = c.width, H = c.height, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, W, H);

    const marginLeft   = 40;
    const marginRight  = 15;
    const marginTop    = 15;
    const marginBottom = 25;
    const gW = W - marginLeft - marginRight;
    const gH = H - marginTop - marginBottom;

    // Draw grid background
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(marginLeft, marginTop, gW, gH);

    // Draw grid lines vertikal (waktu)
    ctx.save();
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 0.5;
    const timeGridDiv = 5;
    for (let i = 0; i <= timeGridDiv; i++) {
        const x = marginLeft + (i / timeGridDiv) * gW;
        ctx.beginPath(); ctx.moveTo(x, marginTop); ctx.lineTo(x, marginTop + gH); ctx.stroke();
    }
    ctx.restore();

    // Draw grid lines horizontal (sudut)
    ctx.save();
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 0.5;
    const angleGridDiv = 6;
    for (let i = 0; i <= angleGridDiv; i++) {
        const y = marginTop + (i / angleGridDiv) * gH;
        ctx.beginPath(); ctx.moveTo(marginLeft, y); ctx.lineTo(marginLeft + gW, y); ctx.stroke();
    }
    ctx.restore();

    // Draw axis lines
    ctx.save();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(marginLeft, marginTop + gH); ctx.lineTo(marginLeft, marginTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(marginLeft, marginTop + gH); ctx.lineTo(marginLeft + gW, marginTop + gH); ctx.stroke();
    ctx.restore();

    // Tentukan range waktu dan sudut dari data
    let maxTime = 5;
    if (DataLogger.data.length > 0) {
        maxTime = Math.max(5, DataLogger.data[DataLogger.data.length - 1].time + 0.5);
    }

    // Plot data theta vs time
    if (DataLogger.data.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#FFC107'; ctx.lineWidth = 2;  /* ← KUNING */
        ctx.beginPath();
        
        let isFirst = true;
        for (let i = 0; i < DataLogger.data.length; i++) {
            const dp = DataLogger.data[i];
            const xPos = marginLeft + (dp.time / maxTime) * gW;
            const yPos = marginTop + gH - (dp.normalized_theta / 360) * gH;
            
            if (isFirst) {
                ctx.moveTo(xPos, yPos);
                isFirst = false;
            } else {
                ctx.lineTo(xPos, yPos);
            }
        }
        ctx.stroke();
        ctx.restore();

        // Draw data points
        ctx.save();
        ctx.fillStyle = '#FFB300'; ctx.strokeStyle = '#fff';  /* ← KUNING GELAP */
        ctx.lineWidth = 1.5;
        for (let i = 0; i < DataLogger.data.length; i += Math.max(1, Math.floor(DataLogger.data.length / 20))) {
            const dp = DataLogger.data[i];
            const xPos = marginLeft + (dp.time / maxTime) * gW;
            const yPos = marginTop + gH - (dp.normalized_theta / 360) * gH;
            ctx.beginPath(); ctx.arc(xPos, yPos, 2.5, 0, 2 * Math.PI);
            ctx.fill(); ctx.stroke();
        }
        ctx.restore();
    }

    // Label Y-axis (Sudut)
    ctx.save();
    ctx.font = '8px Arial'; ctx.fillStyle = '#666'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= angleGridDiv; i++) {
        const angle = 360 - (i / angleGridDiv) * 360;
        const y = marginTop + (i / angleGridDiv) * gH;
        ctx.fillText(Math.round(angle) + '°', marginLeft - 5, y);
    }
    ctx.restore();

    // Label X-axis (Waktu)
    ctx.save();
    ctx.font = '8px Arial'; ctx.fillStyle = '#666'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= timeGridDiv; i++) {
        const time = (i / timeGridDiv) * maxTime;
        const x = marginLeft + (i / timeGridDiv) * gW;
        ctx.fillText(time.toFixed(1) + 's', x, marginTop + gH + 5);
    }
    ctx.restore();

    // Label axis
    ctx.save();
    ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('Waktu (detik)', marginLeft + gW / 2, H - 3);
    ctx.save(); ctx.translate(8, marginTop + gH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Sudut Rotor θ (derajat)', 0, 0);
    ctx.restore();
    ctx.restore();

    // Info text
    const dataCount = DataLogger.data.length;
    ctx.save();
    ctx.font = '9px Arial'; ctx.fillStyle = '#999'; ctx.textAlign = 'left';
    if (dataCount > 0) {
        const lastData = DataLogger.data[dataCount - 1];
        ctx.fillText('Data: ' + dataCount + ' poin | Waktu: ' + lastData.time.toFixed(2) + 's | θ: ' + lastData.normalized_theta.toFixed(1) + '°', marginLeft, marginTop - 3);
    } else {
        ctx.fillText('Belum ada data...', marginLeft, marginTop - 3);
    }
    ctx.restore();
}

console.log("script_modified.js loaded OK — dengan Theta vs Time Logger");
