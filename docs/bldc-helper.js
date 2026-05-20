/**
 * bldc-helper.js
 * Helper functions untuk pembuatan elemen UI simulasi BLDC Motor
 */

/* ── consolex: redirect console output ke textarea ── */
const consolex = (function() {
    let _output = null;
    let _eol    = '\n';
    return {
        setOutput(el) { _output = el; },
        setEOL(s)     { _eol = s; },
        log(...args) {
            if (_output) _output.value += args.join(' ') + _eol;
        },
        clear() { if (_output) _output.value = ''; }
    };
})();

/* ── DOM helpers ── */
function getContainer(id) {
    const el = document.getElementById(id);
    if (!el) { console.error('Container not found:', id); return document.body; }
    return el;
}

function createDiv(id) {
    const el = document.createElement('div');
    if (id) el.id = id;
    return el;
}

function createTextarea(id) {
    const el = document.createElement('textarea');
    if (id) el.id = id;
    return el;
}

function createButton(id, label) {
    const el = document.createElement('button');
    if (id)    el.id          = id;
    if (label) el.textContent = label;
    return el;
}

function createCanvas(id, w, h) {
    const el = document.createElement('canvas');
    if (id) el.id = id;
    el.width  = w || 340;
    el.height = h || 300;
    return el;
}

function createHeading2(text) {
    const el = document.createElement('h2');
    el.textContent = text;
    return el;
}

/**
 * changeElementsFlex(["id1","val1"], ["id2","val2"], ...)
 * Mengatur flex value pada elemen berdasarkan id
 */
function changeElementsFlex(...pairs) {
    pairs.forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.style.flex = val;
    });
}
