/**
 * bldc-helper.js
 * Helper functions untuk membuat elemen-elemen HTML
 * dan mengelola console output
 */

/* ══════════════════════════════════════════════════════
   HELPER FUNCTIONS — Pembuatan Elemen
══════════════════════════════════════════════════════ */

function getContainer(id) {
    return document.getElementById(id);
}

function createDiv(id) {
    const div = document.createElement('div');
    if (id) div.id = id;
    return div;
}

function createTextarea(id) {
    const textarea = document.createElement('textarea');
    if (id) textarea.id = id;
    return textarea;
}

function createButton(id, text) {
    const button = document.createElement('button');
    if (id) button.id = id;
    if (text) button.textContent = text;
    return button;
}

function createHeading2(text) {
    const h2 = document.createElement('h2');
    h2.textContent = text;
    return h2;
}

function createCanvas(id, width, height) {
    const canvas = document.createElement('canvas');
    if (id) canvas.id = id;
    if (width) canvas.width = width;
    if (height) canvas.height = height;
    return canvas;
}

/* ══════════════════════════════════════════════════════
   FLEX LAYOUT HELPER
══════════════════════════════════════════════════════ */

function changeElementsFlex(...args) {
    for (let i = 0; i < args.length; i += 2) {
        const selector = args[i];
        const flex = args[i + 1];
        const elem = document.getElementById(selector);
        if (elem) {
            elem.style.flex = flex;
        }
    }
}

/* ══════════════════════════════════════════════════════
   CONSOLE OUTPUT HANDLER
══════════════════════════════════════════════════════ */

const consolex = {
    outputElement: null,
    eol: '\n',
    buffer: '',

    setOutput: function(element) {
        this.outputElement = element;
    },

    setEOL: function(eol) {
        this.eol = eol;
    },

    log: function(text) {
        if (!this.outputElement) {
            console.log(text);
            return;
        }
        this.buffer += text + this.eol;
        this.outputElement.value = this.buffer;
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    },

    clear: function() {
        this.buffer = '';
        if (this.outputElement) {
            this.outputElement.value = '';
        }
    }
};

console.log('bldc-helper.js loaded OK');
