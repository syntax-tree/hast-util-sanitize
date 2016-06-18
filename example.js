// Dependencies:
var h = require('hastscript');
var u = require('unist-builder');
var sanitize = require('./index.js');
var toHTML = require('hast-util-to-html');

// Transform:
var tree = h('div', {
    onmouseover: 'alert("alpha")'
}, [
    h('a', {
        href: 'jAva script:alert("bravo")',
        onclick: 'alert("charlie")'
    }, 'delta'),
    u('text', '\n'),
    h('script', 'alert("charlie")'),
    u('text', '\n'),
    h('img', {src: 'x', onerror: 'alert("delta")'}),
    u('text', '\n'),
    h('iframe', {src: 'javascript:alert("echo")'}),
    u('text', '\n'),
    h('math', h('mi', {
        'xlink:href': 'data:x,<script>alert("foxtrot")</script>'
    }))
]);

// Compile:
var unsanitized = toHTML(tree);
var sanitized = toHTML(sanitize(tree));

// Unsanitized:
console.log('html', unsanitized);

// Sanitized:
console.log('html', sanitized);
