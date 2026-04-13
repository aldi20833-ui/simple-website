(() => {
    // Fungsi pembantu untuk mengambil elemen Div dan memberikan styling dasar
    function E(t, n = "320px") {
        let e = document.getElementById(t);
        return e instanceof HTMLDivElement ? (Object.assign(e.style, a), e) : null
    }

    // Deklarasi variabel global untuk data matriks (M), parameter grid, dan palet warna
    var a = {},
        M = [],
        S, U, P, Y, w, ee, I, T, W, X, q, z, V, G,
        te = ["#001b48", "#00245a", "#002d6d", "#003580", "#003e94", "#0047a7", "#0050bb", "#0059ce", "#0062e1", "#0070f4", "#1a80ff", "#4da3ff", "#80c6ff", "#b3e8ff", "#e6f7ff", "#ffffff"],
        L = [],
        K;

    // Fungsi untuk membuat struktur Panel yang berisi elemen Canvas
    function F(t, n = {}) {
        let e = document.createElement("div");
        e.className = "panel panel-row", Object.assign(e.style, n);
        let l = document.createElement("canvas");
        return l.id = t,
            l.style.width = "100%",
            l.style.height = "100%",
            l.style.border = "1px solid var(--muted-border)",
            l.style.display = "block",
            e.append(l),
            e
    }

    // Menyesuaikan resolusi canvas agar tajam (mengatasi blur pada layar retina/high-dpi)
    function ne(t) {
        let n = t.getBoundingClientRect(),
            e = window.devicePixelRatio || 1;
        t.width = n.width * e,
            t.height = n.height * e,
            t.getContext("2d").scale(e, e)
    }

    // Menghapus seluruh gambar yang ada pada canvas tertentu
    function b(t) {
        let n = document.getElementById(t);
        if (!(n instanceof HTMLCanvasElement)) return null;
        let e = n.getBoundingClientRect(),
            l = e.width,
            o = e.height;
        n.getContext("2d").clearRect(0, 0, l, o)
    }

    // Fungsi pembuat panel berisi tombol-tombol kontrol (Wipe, Data, Read, Exec)
    function k(t, n, e = {}, l = le) {
        let o = document.createElement("div");
        o.className = "panel", Object.assign(o.style, e);
        let i = 0;
        for (let r of t) {
            let c = document.createElement("button");
            c.id = r,
                c.disabled = !n[i],
                c.innerHTML = r,
                e.flexDirection == "row" && (c.style.flex = "1"),
                o.append(c),
                i += 1
        }
        return o.addEventListener("click", r => {
            l(r)
        }), o
    }

    // Fungsi untuk mengaktifkan atau menonaktifkan tombol berdasarkan ID
    function f(t, n) {
        let e = document.getElementById(t);
        e.disabled = !n
    }

    // LOGIKA UTAMA: Menangani interaksi klik pada tombol di Panel 1, 2, dan 3
    function le(t) {
        let n = t.target.closest("button");
        // Logika WIPE: Reset data dan input
        if (n.innerHTML == "wipe-1" && (
                document.getElementById("params-1").value = "",
                document.getElementById("grid").value = "",
                f("read-1", !1), f("exec-1", !1), f("data-2", !1), f("read-2", !1),
                f("exec-2", !1), b("map-2"), f("data-3", !1), f("read-3", !1),
                f("exec-3", !1), b("map-3")
            ), n.innerHTML == "data-1") {
            // Mengisi default parameter untuk pembuatan grid
            let e = "";
            e += `COLS 9\n`, e += `ROWS 11\n`, e += `UMIN 0.20\n`, e += `UMAX 0.70\n`, e += `UNUM 11\n`, e += "SEPC ;",
                document.getElementById("params-1").value = e, f("read-1", !0)
        }
        if (n.innerHTML == "read-1") {
            // Membaca parameter dari textarea dan menyimpannya ke variabel global
            let e = document.getElementById("params-1").value;
            ee = g(e, "SEPC"), S = g(e, "ROWS", "int"), U = g(e, "COLS", "int"),
                P = g(e, "UMIN", "float"), Y = g(e, "UMAX", "float"), w = g(e, "UNUM", "int"),
                f("exec-1", !0), f("data-2", !0), f("data-3", !0)
        }
        if (n.innerHTML == "exec-1") {
            // Membuat data grid acak (matriks M) berdasarkan parameter yang dibaca
            let e = (Y - P) / (w - 1);
            M = [], text = "";
            for (let l = 0; l < S; l++) {
                let o = [];
                for (let i = 0; i < U; i++) {
                    let r = Math.floor(Math.random() * w);
                    o.push(r);
                    let c = P + e * r;
                    text += c.toFixed(2).slice(1), i < U - 1 && (text += ";")
                }
                l < S - 1 && (text += `\n`), M.push(o)
            }
            document.getElementById("grid").value = text
        }
        // Logika Panel 2: Menyiapkan palet warna untuk visualisasi
        if (n.innerHTML == "wipe-2" && (
                document.getElementById("params-2").value = "",
                b("map-2"), f("data-2", !1), f("read-2", !1), f("exec-2", !1)
            ), n.innerHTML == "data-2") {
            let e = "";
            e += "CNUM " + w + `\n`;
            for (let l = 0; l < w; l++) e += "CL" + _(l, 2) + " " + te[l], l < w - 1 && (e += `\n`);
            document.getElementById("params-2").value = e, f("read-2", !0)
        }
        if (n.innerHTML == "read-2") {
            let e = document.getElementById("params-2").value;
            K = g(e, "CNUM"), L = [];
            for (let l = 0; l < K; l++) {
                let o = "CL" + _(l, 2),
                    i = g(e, o);
                i != null && L.push(i)
            }
            f("exec-2", !0)
        }
        // Logika EXEC 2: Menggambar heatmap pada canvas map-2
        if (n.innerHTML == "exec-2" && J("map-2", M), n.innerHTML == "wipe-3" && (
                document.getElementById("params-3").value = "",
                b("map-3"), f("data-3", !1), f("read-3", !1), f("exec-3", !1)
            ), n.innerHTML == "data-3") {
            // Logika Panel 3: Input range koordinat X dan Y
            let e = "";
            e += `XMIN 0\n`, e += `YMIN 0\n`, e += "XMAX " + U + `\n`, e += "YMAX " + S,
                document.getElementById("params-3").value = e, f("read-3", !0)
        }
        if (n.innerHTML == "read-3") {
            let e = document.getElementById("params-3").value;
            I = g(e, "XMIN"), T = g(e, "YMIN"), W = g(e, "XMAX"), X = g(e, "YMAX"), f("exec-3", !0)
        }
        // Logika EXEC 3: Menghasilkan koordinat acak dan menandainya di canvas
        n.innerHTML == "exec-3" && (
            q = Math.floor(Math.random() * (W - I) + I),
            z = Math.floor(Math.random() * (X - T) + T),
            V = Math.floor(Math.random() * (W - I) + I),
            G = Math.floor(Math.random() * (X - T) + T),
            b("map-3"), J("map-3", M), Q("map-3", M, [q, z], "#8f8"), Q("map-3", M, [V, G], "rgb(255, 0, 0)")
        )
    }

    // Fungsi untuk menambah angka nol di depan (padding)
    function _(t, n) {
        return String(t).padStart(2, "0")
    }

    // Fungsi pencari nilai (parser) dalam teks parameter berdasarkan kata kunci
    function g(t, n, e = "string") {
        let l = t.split(`\n`),
            o = null;
        for (let i of l)
            if (i.indexOf(n) == 0) return o = i.split(" ")[1], e == "float" ? parseFloat(o) : e == "int" ? parseInt(o) : o
    }

    // Fungsi inti untuk menggambar grid/heatmap pada canvas
    function J(t, n) {
        let e = document.getElementById(t);
        if (!(e instanceof HTMLCanvasElement)) return null;
        let l = e.getBoundingClientRect(),
            o = l.width,
            i = l.height,
            r = n.length,
            c = n[0].length,
            x = o / c,
            m = i / r,
            d = e.getContext("2d");
        for (let p = 0; p < r; p++)
            for (let u = 0; u < c; u++) {
                let y = n[p][u];
                d.beginPath(), d.fillStyle = L[y], d.rect(u * x, p * m, x, m), d.fill(),
                    d.beginPath(), d.lineWidth = "0.2", d.strokeStyle = "#888", d.rect(u * x, p * m, x, m), d.stroke()
            }
    }

    // Fungsi untuk menggambar satu kotak warna di koordinat tertentu (Highlight)
    function Q(t, n, e, l) {
        let o = document.getElementById(t);
        if (!(o instanceof HTMLCanvasElement)) return null;
        let i = o.getBoundingClientRect(),
            r = i.width,
            c = i.height,
            x = n.length,
            m = n[0].length,
            d = r / m,
            p = c / x,
            u = o.getContext("2d"),
            y = e[0],
            A = e[1];
        u.beginPath(), u.fillStyle = l, u.rect(y * d, A * p, d, p), u.fill()
    }

    // Fungsi pembuat elemen Textarea untuk input data teks
    function B(t, n = {}) {
        let e = document.createElement("div");
        e.className = "panel panel-row", Object.assign(e.style, n);
        for (let l of t) {
            let o = document.createElement("textarea");
            o.id = l, o.placeholder = l, o.style.flex = "1", o.style.fontFamily = "monospace",
                o.style.fontSize = "9px", o.style.border = "1px solid var(--muted-border)",
                o.style.minWidth = "0", o.style.boxSizing = "border-box", o.style.resize = "none",
                o.style.overflow = "auto", e.append(o)
        }
        return e
    }

    // Fungsi untuk mengatur proporsi lebar (flex) elemen-elemen di dalam panel
    function h(t, n, e) {
        let l = t.querySelectorAll(n),
            o = Math.min(l.length, e.length);
        for (let i = 0; i < o; i++) l[i].style.flex = e[i]
    }

    // Membangun tampilan UI untuk Panel 1 (Data Grid Generator)
    function oe() {
        let t = document.createElement("div");
        t.className = "panel-main";
        let e = B(["params-1"], {});
        h(e, "textarea", [1]);
        let i = k(["wipe-1", "data-1", "read-1", "exec-1"], [!0, !0, !1, !1], { display: "flex", flexDirection: "column", height: "40%", minHeight: "0" });
        let c = B(["grid"], {});
        return h(c, "textarea", [1]), t.append(e), t.append(i), t.append(c), h(t, "div.panel", [1.5, 1.3, 4]), t
    }

    // Membangun tampilan UI untuk Panel 2 (Heatmap Visualizer)
    function ie() {
        let t = document.createElement("div");
        t.className = "panel-main";
        let e = B(["params-2"], {});
        h(e, "textarea", [1]);
        let i = k(["wipe-2", "data-2", "read-2", "exec-2"], [!0, !1, !1, !1], { display: "flex", flexDirection: "column", height: "40%", minHeight: "0" });
        let c = F("map-2", {});
        return h(c, "canvas", [1]), t.append(e), t.append(i), t.append(c), h(t, "div.panel", [1.5, 1.3, 4]), t
    }

    // Membangun tampilan UI untuk Panel 3 (Coordinate Tracker)
    function ae() {
        let t = document.createElement("div");
        t.className = "panel-main";
        let e = B(["params-3"], {});
        h(e, "textarea", [1]);
        let i = k(["wipe-3", "data-3", "read-3", "exec-3"], [!0, !1, !1, !1], { display: "flex", flexDirection: "column", height: "40%", minHeight: "0" });
        let c = F("map-3", {});
        return h(c, "canvas", [1]), t.append(e), t.append(i), t.append(c), h(t, "div.panel", [1.5, 1.3, 4]), t
    }

    // Membuat panel kosong dengan tombol wipe
    function re() {
        let t = document.createElement("div");
        t.className = "panel-col-full";
        let l = k(["wipe", "", "", "", "", ""], [!0], { display: "flex", flexDirection: "row" });
        return t.append(l), t
    }

    // Fungsi-fungsi mount untuk memasukkan UI ke dalam elemen container di HTML
    function se(t) {
        a = { marginTop: "0.5em", width: "400px", height: "125px", display: "flex", flexDirection: "column", background: "var(--box-bg)", border: "0 solid var(--border)", display: "inline-block", marginRight: "0.9em" };
        let n = E(t, a),
            e = oe();
        n.append(e), D(e)
    }

    function ce(t) {
        a = { marginTop: "0.5em", width: "450px", height: "250px", display: "flex", flexDirection: "column", background: "var(--box-bg)", border: "0 solid var(--border)", display: "inline-block", marginRight: "0.9em" };
        let n = E(t, a),
            e = ie();
        n.append(e), D(e)
    }

    function de(t) {
        a = { marginTop: "0.5em", width: "450px", height: "250px", display: "flex", flexDirection: "column", background: "var(--box-bg)", border: "0 solid var(--border)", display: "inline-block", marginRight: "0.9em" };
        let n = E(t, a),
            e = ae();
        n.append(e), D(e)
    }

    function fe(t) {
        a = { marginTop: "0.5em", width: "420px", height: "250px", display: "flex", flexDirection: "column", background: "var(--box-bg)", border: "0 solid var(--border)", display: "inline-block", marginRight: "0.9em" };
        let n = E(t, a),
            e = re();
        n.append(e), D(e)
    }

    // Expose fungsi ke window object agar bisa diakses dari script lain
    window._26d15 = {
        mount1: t => { se(t) },
        mount2: t => { ce(t) },
        mount3: t => { de(t) },
        mount4: t => { fe(t) },
        mount5: t => { ye(t) },
        mount6: t => { Me(t) }
    };

    console.log("[marker] utssee.js loaded");

    // Mendapatkan arah tetangga (8 arah) untuk algoritma Cellular Automata
    function ue(t) {
        let n = [];
        return t == 0 ? n = [1, 0] : t == 1 ? n = [1, 1] : t == 2 ? n = [0, 1] : t == 3 ? n = [-1, 1] : t == 4 ? n = [-1, 0] : t == 5 ? n = [-1, -1] : t == 6 ? n = [0, -1] : t == 7 && (n = [1, -1]), n
    }

    // Mengambil nilai dari 8 tetangga di sekitar koordinat (n, e)
    function pe(t, n, e) {
        let l = [], o, i;
        for (let r = 0; r < 8; r++) {
            [o, i] = ue(r);
            let c = t[n + o][e + i];
            l.push(c)
        }
        return l
    }

    // FUNGSI INTI SIMULASI: Algoritma pemrosesan sel/erosi
    function me(t) {
        let n = structuredClone(t),
            e = [], l, o = t.length, i = t[0].length;
        for (let r = 1; r < o - 1; r++)
            for (let c = 1; c < i - 1; c++) {
                let x = t[r][c],
                    m = pe(t, r, c),
                    d = m.reduce((y, A) => y + A, 0),
                    p = Math.min(...m),
                    u = Math.max(...m);
                // Logika perubahan status sel (misal: simulasi erosi atau pertumbuhan)
                (d < 8 || d > 9) && x == 1 && p == 0 && u < 9 && (console.log(r, c, d), n[r][c] = 9)
            }
        return n
    }

    // Menangani interaksi tombol pada Panel 5 (Simulasi Matriks Besar)
    function xe(t) {
        let n = t.target.closest("button");
        if (n.innerHTML == "wipe" && (txas[0].value = "", txas[1].value = "", b("can-output"), f("read", !1), f("exec", !1)), n.innerHTML == "data") {
            // Mengisi palet warna simulasi
            let e = "";
            e += `# palette\n`, e += `NUMC 10\n`, e += `COL0 #888\n`, e += `COL1 #22f\n`, e += `COL2 #33f\n`, e += `COL3 #44f\n`, e += `COL4 #55f\n`, e += `COL5 #66f\n`, e += `COL6 #88f\n`, e += `COL7 #aaf\n`, e += `COL8 #ccf\n`, e += "COL9 #eef",
                txas[0].value = e;
            // MATRIKS BESAR Representasi grid awal simulasi
            let l = "";
            l += `9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `1;9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `1;9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `1;1;9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `1;1;1;9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `1;1;1;1;9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `1;1;1;1;1;9;9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `1;1;1;1;1;1;1;9;9;9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `1;1;1;1;1;1;1;1;1;1;9;9;9;9;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0;0\n`,
                l += `1;1;1;1;1;1;1;1;1;1;1;1;1;1;9;9;9;9;0;0;0;0;0;0;0;0;0;0;0;0;0;9;9;0;0;0;0;0;9;9\n`,
                l += `1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;9;0;0;0;0;0;0;0;0;0;0;9;9;1;1;1;0;0;0;1;1;1\n`,
                l += `1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;9;9;9;0;0;0;0;0;0;9;1;1;1;1;1;1;1;1;1;1;1\n`,
                l += `1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;9;9;0;0;0;0;9;1;1;1;1;1;1;1;1;1;1;1;1\n`,
                l += `1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;9;9;9;9;9;1;1;1;1;1;1;1;1;1;1;1;1;1\n`,
                l += `1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1\n`,
                l += `1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1\n`,
                l += `1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1\n`,
                l += `1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1\n`,
                l += "1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1;1",
                txas[1].value = l, txas[1].style.whiteSpace = "pre", txas[1].style.overflowX = "auto", f("read", !0)
        }
        if (n.innerHTML == "read") {
            // Memparse teks matriks besar menjadi array 2D JavaScript
            let e = txas[1].value.split(`\n`);
            agents = [];
            for (let l of e) {
                let o = [],
                    i = l.split(";");
                for (let r of i) o.push(parseInt(r));
                agents.push(o)
            }
            aold = structuredClone(agents), ge("params-input"), b("can-output"), Z("can-output", aold), f("exec", !0)
        }
        if (n.innerHTML == "exec" && (anew = me(aold), b("can-output"), Z("can-output", anew), aold = structuredClone(anew)), n.innerHTML == "info") {
            // Menampilkan dialog info sederhana
            alert("mockup-t4 v0.1");
            let e = !1;
            for (; !e;) e = confirm("Do you want to continue?");
            let l = prompt("Who are you?", "Guest");
            alert("Welcome, " + l)
        }
        n.innerHTML == "none"
    }

    // Fungsi pembantu untuk mengambil data warna dari textarea params-input
    function ge(t) {
        let n = document.getElementById(t);
        if (!(n instanceof HTMLTextAreaElement)) return null;
        let e = n.value.split(`\n`),
            l = 0;
        for (let o of e) o.indexOf("NUMC") == 0 && (l = parseInt(o.split(" ")[1]));
        if (l == 0) return null;
        L = [], j = 0;
        for (let o = 0; o < e.length; o++) e[o].indexOf("COL" + j) == 0 && (L.push(e[o].split(" ")[1]), j += 1)
    }

    // Membangun tampilan UI untuk Panel 5 (Simulation Board)
    function he() {
        let t = document.createElement("div");
        t.className = "panel-sim-main";

        // --- BAGIAN KIRI (Textarea) ---
        let e = B(["params-input", "agents-input"], {});
        e.classList.add("panel-sim-left");
        h(e, "textarea", [0.5, 2.75]);
        txas = e.querySelectorAll("textarea");

        // --- BAGIAN TENGAH (Tombol Vertikal) ---
        let i = k(["wipe", "data", "read", "exec", "none", "info"], [!0, !0, !1, !1, !1, !0], { display: "flex", flexDirection: "column", gap: "2px" }, xe);

        // --- BAGIAN KANAN (Canvas Output) ---
        let c = F("can-output", {});
        c.classList.add("panel-sim-canvas");

        t.append(e);
        t.append(i);
        t.append(c);

        h(t, "div.panel", [5.3, 0.8, 7.5]);
        return t;
    }

    // Melakukan inisialisasi resolusi untuk semua canvas di dalam sebuah elemen
    function D(t) {
        let n = t.querySelectorAll("canvas");
        for (let e of n) ne(e)
    }

    // Mounting Panel 5 ke elemen container
    function ye(t) {
        a = { marginTop: "1.5em", width: "1340px", height: "250px", display: "flex", flexDirection: "column", background: "var(--box-bg)", border: "0 solid var(--border)", display: "inline-block", marginRight: "0.9em"};
        let n = E(t, a),
            e = he();
        n.append(e), D(e)
    }

    // Fungsi khusus menggambar matriks simulasi di Panel 5 (hanya menggambar nilai > 0)
    function Z(t, n) {
        let e = document.getElementById(t);
        if (!(e instanceof HTMLCanvasElement)) return null;
        let l = e.getBoundingClientRect(),
            o = l.width,
            i = l.height,
            r = n.length,
            c = n[0].length,
            x = o / c,
            m = i / r,
            d = e.getContext("2d");
        for (let p = 0; p < r; p++)
            for (let u = 0; u < c; u++) {
                let y = n[p][u];
                y > 0 && (d.beginPath(), d.fillStyle = L[y], d.rect(u * x, p * m, x, m), d.fill()),
                    d.beginPath(), d.lineWidth = "0.2", d.strokeStyle = "#888", d.rect(u * x, p * m, x, m), d.stroke()
            }
    }

    // Variabel global untuk sistem Progress Bar di Panel 6
    var C = [], R = [], H = [], v = [], N = null;

    // Fungsi pembuat elemen Progress Bar dengan tombol start/stop
    function O(t, n = ["start", "stop"], e = $) {
        let l = {};
        R.push(n);
        let o = document.createElement("div");
        o.className = "progress-row";
        let i = document.createElement("button");
        i.innerHTML = n[0], i.id = t, i.style.flex = "1", C.push(i), v.push(!1);
        let r = document.createElement("progress");
        return r.value = "0", r.max = "100", r.style.flex = "7", r.style.margin = "0 0.2em", H.push(r),
            o.append(i), o.append(r), i.addEventListener("click", c => { be(c) }), o
    }

    // Logika kontrol saat tombol progress diklik
    function be(t) {
        let n = t.target,
            e = n.innerHTML,
            l = n.id,
            o = null;
        for (let r = 0; r < C.length; r++)
            if (C[r].id == l) {
                o = r;
                break
            }
        v[o] = !v[o], v[o] ? C[o].innerHTML = R[o][1] : C[o].innerHTML = R[o][0];
        let i = !1;
        for (s of v) i = i || s;
        // Jika ada progress yang jalan, set interval 50ms untuk mengupdate bar
        i ? N == null && (N = setInterval($, 50)) : (clearInterval(N), N = null)
    }

    // Fungsi update nilai progress bar secara berkala
    function $() {
        let t = v.length;
        for (let n = 0; n < t; n++) {
            let e = C[n];
            if (v[n]) {
                let o = parseInt(H[n].value);
                o += 1, H[n].value = o
            }
            // Hentikan jika sudah mencapai maksimal
            H[n].value >= H[n].max && (e.disabled = !0, v[n] = !1, e.innerHTML = R[n][0])
        }
    }

    // Membangun tampilan UI untuk Panel 6 (Status Progress)
    function ve() {
        let t = document.createElement("div");
        t.className = "panel-col-full";
        let n = O("prog-1", ["scan", "stop"]),
            e = O("prog-2", ["filter", "stop"]),
            l = O("prog-3", ["format", "stop"]),
            o = O("prog-4", ["sort", "stop"]),
            i = O("prog-5", ["erase", "stop"]);
        return t.append(n, e, l, o, i), t
    }

    // Mounting Panel 6 ke elemen container
    function Me(t) {
        a = { marginTop: "1.5em", width: "420px", display: "flex", flexDirection: "column", background: "var(--box-bg)", border: "1px solid var(--border)", display: "inline-block", marginRight: "0.5em" };
        let n = E(t, a);
        if (n == null) return null;
        let e = ve();
        n.append(e)
    }
})();
