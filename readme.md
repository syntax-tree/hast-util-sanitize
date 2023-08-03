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
    *   [`defaultSchema`](#defaultschema)
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
In Node.js (version 14.14+ and 16.0+), install with [npm][]:

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

This package exports the identifiers [`defaultSchema`][defaultschema] and
[`sanitize`][sanitize].
There is no default export.

### `sanitize(tree[, schema])`

Sanitize a tree.

###### Parameters

*   `tree` ([`Node`][node])
    — tree to clean
*   `schema` ([`Schema`][schema], optional)
    — schema defining how to sanitize

###### Returns

New, sanitized, tree ([`Node`][node]).

### `defaultSchema`

Default schema ([`Schema`][schema]).

Follows GitHub style sanitation.

### `Schema`

Schema that defines what nodes and properties are allowed (TypeScript type).

The default schema is [`defaultSchema`][defaultschema], which follows how
[GitHub][] cleans.
If any top-level key is missing in the given schema, the corresponding value
of the default schema is used.

To extend the standard schema with a few changes, clone `defaultSchema` like so:

```js
import {h} from 'hastscript'
import deepmerge from 'deepmerge'
import {defaultSchema, sanitize} from 'hast-util-sanitize'

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

##### Fields

###### `attributes`

Map of tag names to allowed [*property names*][name]
(`Record<string, Array<string | [string, ...Array<string | number | boolean | RegExp>]>`,
optional).

The special key `'*'` as a tag name defines property names allowed on all
elements.

The special value `'data*'` as a property name can be used to allow all `data`
properties.

For example:

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

Instead of a single string, which allows any [*property value*][value] of that
property name, it’s also possible to provide an array to allow several values.
For example, `input: ['type']` allows the `type` attribute set to any value on
inputs.
But `input: [['type', 'checkbox', 'radio']]` allows `type` only when set to one
of the allowed values (`'checkbox'` or `'radio'`).

You can also use regexes, so for example `span: [['className', /^hljs-/]]`
allows any class that starts with `hljs-` on `span` elements.

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

Attributes also plays well with properties that accept space- or
comma-separated values, such as `class`.
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
[*property value*][value] (`Record<string, Record<string, unknown>>`,
optional).

If the defined keys do not exist in an element’s properties, they are added and
set to the specified value.

Note that properties are first checked based on the schema at `attributes`,
so properties could be removed by that step and then added again through
`required`.

For example:

```js
required: {
  input: {type: 'checkbox', disabled: true}
}
```

###### `tagNames`

List of allowed tag names (`Array<string>`, optional).

For example:

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

Map of [*property names*][name] to allowed protocols
(`Record<string, Array<string>>`, optional).

The listed property names can be set to URLs that are local (relative to the
current website, such as `this`, `#this`, `/this`, or `?this`) or remote (such
as `https://example.com`), in which case they must have a protocol that is
allowed here.

For example:

```js
protocols: {
  href: ['http', 'https', 'mailto'],
  // …
  longDesc: ['http', 'https']
}
```

###### `ancestors`

Map of tag names to a list of tag names which are required ancestors
(`Record<string, Array<string>>`, optional).

Elements with these tag names will be ignored if they occur outside of one of
their allowed parents.

For example:

```js
ancestors: {
  li: ['ol', 'ul'],
  // …
  tr: ['table']
}
```

###### `clobber`

List of [*property names*][name] that clobber (`Array<string>`, optional).

For example:

```js
clobber: ['name', 'id']
```

###### `clobberPrefix`

Prefix to use before clobbering properties (`string`, optional).

For example:

```js
clobberPrefix: 'user-content-'
```

###### `strip`

List of tag names to strip from the tree (`Array<string>`, optional).

By default, unsafe elements are replaced by their children.
Some elements should however be entirely stripped from the tree.

For example:

```js
strip: ['script']
```

###### `allowComments`

Whether to allow comment nodes (`boolean`, default: `false`).

For example:

```js
allowComments: true
```

###### `allowDoctypes`

Whether to allow doctype nodes (`boolean`, default: `false`).

```js
allowDoctypes: true
```

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Schema`][schema].

## Compatibility

Projects maintained by the unified collective are compatible with all maintained
versions of Node.js.
As of now, that is Node.js 14.14+ and 16.0+.
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

[hast]: https://github.com/syntax-tree/hast

[node]: https://github.com/syntax-tree/hast#nodes

[name]: https://github.com/syntax-tree/hast#propertyname

[value]: https://github.com/syntax-tree/hast#propertyvalue

[github]: https://github.com/jch/html-pipeline/blob/HEAD/lib/html/pipeline/sanitization_filter.rb

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[rehype-sanitize]: https://github.com/rehypejs/rehype-sanitize

[defaultschema]: #defaultschema

[sanitize]: #sanitizetree-schema

[schema]: #schema
