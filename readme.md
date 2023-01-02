# hast-util-sanitize

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[hast][] utility to make trees safe.

## Contents

*   [What is this?](#what-is-this)
*   [When should I use this?](#when-should-i-use-this)
*   [Install](#install)
*   [Use](#use)
*   [API](#api)
    *   [`sanitize(tree[, schema])`](#sanitizetree-schema)
    *   [`Schema`](#schema)
*   [Types](#types)
*   [Compatibility](#compatibility)
*   [Security](#security)
*   [Related](#related)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This package is a utility that can make a tree that potentially contains
dangerous user content safe for use.
It defaults to what GitHub does to clean unsafe markup, but you can change that.

## When should I use this?

This package is needed whenever you deal with potentially dangerous user
content.

The plugin [`rehype-sanitize`][rehype-sanitize] wraps this utility to also
sanitize HTML at a higher-level (easier) abstraction.

## Install

This package is [ESM only][esm].
In Node.js (version 12.20+, 14.14+, 16.0+, or 18.0+), install with [npm][]:

```sh
npm install hast-util-sanitize
```

In Deno with [`esm.sh`][esmsh]:

```js
import {sanitize} from 'https://esm.sh/hast-util-sanitize@4'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {sanitize} from 'https://esm.sh/hast-util-sanitize@4?bundle'
</script>
```

## Use

```js
import {u} from 'unist-builder'
import {h} from 'hastscript'
import {sanitize} from 'hast-util-sanitize'
import {toHtml} from 'hast-util-to-html'

const tree = h('div', {onmouseover: 'alert("alpha")'}, [
  h(
    'a',
    {href: 'jAva script:alert("bravo")', onclick: 'alert("charlie")'},
    'delta'
  ),
  u('text', '\n'),
  h('script', 'alert("charlie")'),
  u('text', '\n'),
  h('img', {src: 'x', onerror: 'alert("delta")'}),
  u('text', '\n'),
  h('iframe', {src: 'javascript:alert("echo")'}),
  u('text', '\n'),
  h('math', h('mi', {'xlink:href': 'data:x,<script>alert("foxtrot")</script>'}))
])

const unsanitized = toHtml(tree)
const sanitized = toHtml(sanitize(tree))

console.log(unsanitized)
console.log(sanitized)
```

Unsanitized:

```html
<div onmouseover="alert(&#x22;alpha&#x22;)"><a href="jAva script:alert(&#x22;bravo&#x22;)" onclick="alert(&#x22;charlie&#x22;)">delta</a>
<script>alert("charlie")</script>
<img src="x" onerror="alert(&#x22;delta&#x22;)">
<iframe src="javascript:alert(&#x22;echo&#x22;)"></iframe>
<math><mi xlink:href="data:x,<script>alert(&#x22;foxtrot&#x22;)</script>"></mi></math></div>
```

Sanitized:

```html
<div><a>delta</a>

<img src="x">

</div>
```

## API

This package exports the identifiers `sanitize` and `defaultSchema`.
There is no default export.

### `sanitize(tree[, schema])`

Sanitize a tree.

###### Parameters

*   `tree` ([`Node`][node]) — [*tree*][tree] to sanitize
*   `schema` ([`Schema`][schema], optional) — schema defining how to sanitize

###### Returns

A new, sanitized, tree ([`Node`][node]).

### `Schema`

Sanitation schema that defines if and how nodes and properties should be
cleaned.
The default schema is exported as `defaultSchema`, which defaults to [GitHub][]
style sanitation.
If any top-level key isn’t given, it defaults to GitHub’s style too.

For a thorough sample, see the code for [`defaultSchema`][default-schema].

To extend the standard schema with a few changes, clone `defaultSchema` like so:

```js
import {h} from 'hastscript'
import deepmerge from 'deepmerge' // You can use `structuredClone` in modern JS.
import {sanitize, defaultSchema} from 'hast-util-sanitize'

const schema = deepmerge(defaultSchema, {attributes: {'*': ['className']}})

const tree = sanitize(h('div', {className: ['foo']}), schema)

// `tree` still has `className`.
console.log(tree)
// {
//   type: 'element',
//   tagName: 'div',
//   properties: {className: ['foo']},
//   children: []
// }
```

###### `attributes`

Map of tag names to allowed [*property names*][name]
(`Record<string, Array<string>>`).

The special `'*'` key defines [*property names*][name] allowed on all
[*elements*][element].

One special value, `'data*'`, can be used to allow all `data` properties.

```js
attributes: {
  a: ['href'],
  img: ['src', 'longDesc'],
  // …
  '*': [
    'abbr',
    'accept',
    'acceptCharset',
    // …
    'vSpace',
    'width',
    'itemProp'
  ]
}
```

Instead of a single string (such as `type`), which allows any [*property
value*][value] of that [*property name*][name], it’s also possible to provide
an array (such as `['type', 'checkbox']` or `['className', /^hljs-/]`),
where the first entry is the *property name*, and all other entries are
*property values* allowed (or regular expressions that are tested with values).
This is how the default GitHub schema allows only disabled checkbox inputs:

```js
attributes: {
  // …
  input: [
    ['type', 'checkbox'],
    ['disabled', true]
  ]
  // …
}
```

This also plays well with properties that accept space- or comma-separated
values, such as `class`.
Say you wanted to allow certain classes on `span` elements for syntax
highlighting, that can be done like this:

```js
// …
span: [
  ['className', 'token', 'number', 'operator']
]
// …
```

###### `required`

Map of tag names to required [*property names*][name] and their default
[*property value*][value] (`Record<string, Record<string, *>>`).
If the defined keys do not exist in an [*element*][element]’s
[*properties*][properties], they are added and set to the specified value.

Note that properties are first checked based on the schema at `attributes`,
so *properties* could be removed by that step and then added again through
`required`.

```js
required: {
  input: {type: 'checkbox', disabled: true}
}
```

###### `tagNames`

List of allowed tag names (`Array<string>`).

```js
tagNames: [
  'h1',
  'h2',
  'h3',
  // …
  'strike',
  'summary',
  'details'
]
```

###### `protocols`

Map of protocols to allow in [*property values*][value]
(`Record<string, Array<string>>`).

```js
protocols: {
  href: ['http', 'https', 'mailto'],
  // …
  longDesc: ['http', 'https']
}
```

###### `ancestors`

Map of tag names to their required [*ancestor*][ancestor] [*elements*][element]
(`Record<string, Array<string>>`).

```js
ancestors: {
  li: ['ol', 'ul'],
  // …
  tr: ['table']
}
```

###### `clobber`

List of allowed [*property names*][name] which can clobber (`Array<string>`).

```js
clobber: ['name', 'id']
```

###### `clobberPrefix`

Prefix to use before potentially clobbering [*property names*][name] (`string`).

```js
clobberPrefix: 'user-content-'
```

###### `strip`

Names of [*elements*][element] to strip from the [*tree*][tree]
(`Array<string>`).

By default, unsafe *elements* are replaced by their [*children*][child].
Some *elements*, should however be entirely stripped from the *tree*.

```js
strip: ['script']
```

###### `allowComments`

Whether to allow [*comments*][comment] (`boolean`, default: `false`).

```js
allowComments: true
```

###### `allowDoctypes`

Whether to allow [*doctypes*][doctype] (`boolean`, default: `false`).

```js
allowDoctypes: true
```

## Types

This package is fully typed with [TypeScript][].
It exports the additional type `Schema`.

## Compatibility

Projects maintained by the unified collective are compatible with all maintained
versions of Node.js.
As of now, that is Node.js 12.20+, 14.14+, 16.0+, and 18.0+.
Our projects sometimes work with older versions, but this is not guaranteed.

## Security

By default, `hast-util-sanitize` will make everything safe to use.
But when used incorrectly, deviating from the defaults can open you up to a
[cross-site scripting (XSS)][xss] attack.

Use `hast-util-sanitize` after the last unsafe thing: everything after it could
be unsafe (but is fine if you do trust it).

## Related

*   [`rehype-sanitize`](https://github.com/rehypejs/rehype-sanitize)
    — rehype plugin

## Contribute

See [`contributing.md`][contributing] in [`syntax-tree/.github`][health] for
ways to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/syntax-tree/hast-util-sanitize/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/hast-util-sanitize/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/hast-util-sanitize.svg

[coverage]: https://codecov.io/github/syntax-tree/hast-util-sanitize

[downloads-badge]: https://img.shields.io/npm/dm/hast-util-sanitize.svg

[downloads]: https://www.npmjs.com/package/hast-util-sanitize

[size-badge]: https://img.shields.io/bundlephobia/minzip/hast-util-sanitize.svg

[size]: https://bundlephobia.com/result?p=hast-util-sanitize

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[typescript]: https://www.typescriptlang.org

[license]: license

[author]: https://wooorm.com

[health]: https://github.com/syntax-tree/.github

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[tree]: https://github.com/syntax-tree/unist#tree

[child]: https://github.com/syntax-tree/unist#child

[ancestor]: https://github.com/syntax-tree/unist#ancestor

[hast]: https://github.com/syntax-tree/hast

[node]: https://github.com/syntax-tree/hast#nodes

[element]: https://github.com/syntax-tree/hast#element

[doctype]: https://github.com/syntax-tree/hast#doctype

[comment]: https://github.com/syntax-tree/hast#comment

[properties]: https://github.com/syntax-tree/hast#properties

[name]: https://github.com/syntax-tree/hast#propertyname

[value]: https://github.com/syntax-tree/hast#propertyvalue

[github]: https://github.com/jch/html-pipeline/blob/HEAD/lib/html/pipeline/sanitization_filter.rb

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[default-schema]: lib/schema.js

[schema]: #schema

[rehype-sanitize]: https://github.com/rehypejs/rehype-sanitize
