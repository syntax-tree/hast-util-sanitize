/**
 * @typedef {import('hast').Root} Root
 */

import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {ariaAttributes} from 'aria-attributes'
import {h} from 'hastscript'
import {fromHtml} from 'hast-util-from-html'
import {toHtml} from 'hast-util-to-html'
import {htmlElementAttributes} from 'html-element-attributes'
import {htmlTagNames} from 'html-tag-names'
import {visit} from 'unist-util-visit'
import {defaultSchema} from '../index.js'

const schemaAncestors = defaultSchema.ancestors
const schemaAttributes = defaultSchema.attributes
const schemaClobber = defaultSchema.clobber
const schemaTagNames = defaultSchema.tagNames

assert(schemaAncestors, 'should have `defaultSchema.ancestors`')
assert(schemaAttributes, 'should have `defaultSchema.attributes`')
assert(schemaClobber, 'should have `defaultSchema.clobber`')
assert(schemaTagNames, 'should have `defaultSchema.tagNames`')

const root = h()

root.children.push({
  type: 'comment',
  value:
    'This file is generated. Did it change? Please paste it into a Gist on GH, and copy/paste the inside of GHs `<article>` into `github.html`.'
})

/** @type {Set<string>} */
let allAttributes = new Set()
/** @type {string} */
let tagName

// To do: aria.
for (tagName in htmlElementAttributes) {
  if (Object.hasOwn(htmlElementAttributes, tagName)) {
    for (const key of htmlElementAttributes[tagName]) {
      allAttributes.add(key)
    }
  }
}

for (const key of ariaAttributes) {
  allAttributes.add(key)
}

// Check whether GH allows weird things in other places.
allAttributes.add('dataFootnoteRef') // On the `a` of footnote calls.
allAttributes.add('dataFootnotes') // On the `section` of footnotes.
allAttributes.add('dataFootnoteBackref') // On the `a` of footnote backreferences.

allAttributes = new Set([...allAttributes].sort())

for (const name of htmlTagNames) {
  /** @type {Record<string, string>} */
  const props = {}

  for (const attribute of allAttributes) {
    props[attribute] = 'x'
  }

  delete props.type

  if (root.children.length > 0) {
    root.children.push({type: 'text', value: '\n\n'})
  }

  let element = h(name, props, [])

  if (Object.hasOwn(schemaAncestors, name)) {
    const ancestor = schemaAncestors[name][0]
    element = h(ancestor, element)
  }

  root.children.push(element)
}

// Some other combinations to check.
// Things that GH generates, but might not be possible to author by hand.
/** @type {Array<[string, string, string]>} */
const extras = [
  ['a', 'className', 'data-footnote-backref'],
  ['code', 'className', 'language-javascript'],
  ['code', 'className', 'language-js'],
  ['code', 'className', 'language-markdown'],
  ['h2', 'id', 'footnote-label'],
  ['h2', 'className', 'sr-only'],
  ['input', 'disabled', 'disabled'],
  ['input', 'type', 'checkbox'],
  ['li', 'className', 'task-list-item'],
  ['ol', 'className', 'contains-task-list'],
  ['section', 'className', 'footnotes'],
  ['section', 'dataFootnotes', 'x'],
  ['ul', 'className', 'contains-task-list']
]

for (const [tagName, key, value] of extras) {
  root.children.push({type: 'text', value: '\n\n'}, h(tagName, {[key]: value}))
}

// Final EOL.
root.children.push({type: 'text', value: '\n'})

// @ts-expect-error: remove when `to-html` is released.
const document = toHtml(root)

await fs.writeFile(new URL('input.html', import.meta.url), document)

const githubReferenceHtml = String(
  await fs.readFile(new URL('github.html', import.meta.url))
)

/** @type {Root} */
// @ts-expect-error: remove when `from-html` is released.
const tree = fromHtml(githubReferenceHtml, {fragment: true})

/** @type {Set<string>} */
const tagNamesSeen = new Set()
/** @type {Set<string>} */
const propertyNamesSeen = new Set()

const schemaPropertyNames = Object.values(schemaAttributes)
  .flat()
  .map((d) => (typeof d === 'string' ? d : d[0]))
  .sort()

visit(tree, function (node) {
  if (node.type === 'element') {
    // Ignore this custom element they use to wrap `<picture>`.
    if (node.tagName === 'themed-picture') {
      return
    }

    assert(
      schemaTagNames.includes(node.tagName),
      'tag name `' +
        node.tagName +
        '` was found in GH response but not defined in schema'
    )

    tagNamesSeen.add(node.tagName)

    const entries = new Set(
      [
        ...(schemaAttributes[node.tagName] || []),
        ...(schemaAttributes['*'] || [])
      ]
        .map((d) => (typeof d === 'string' ? d : d[0]))
        .sort()
    )

    /** @type {string} */
    let prop

    for (prop in node.properties) {
      if (Object.hasOwn(node.properties, prop)) {
        let value = node.properties[prop]

        if (prop === 'dir' && value === 'auto') {
          continue
        }

        if (
          node.tagName === 'img' &&
          prop === 'style' &&
          value === 'max-width: 100%;'
        ) {
          continue
        }

        propertyNamesSeen.add(prop)

        assert(
          entries.has(prop),
          'property `' +
            prop +
            '` was found in GH response (on `' +
            node.tagName +
            '`) but not defined in `schema.attributes` (global or specific to the element)'
        )

        if (Array.isArray(value)) {
          value = value[0]
        }

        if (value === 'user-content-x') {
          assert(
            schemaClobber.includes(prop),
            'property `' +
              prop +
              '` was found in GH response (on `' +
              node.tagName +
              '`) with a clobber prefix, but not defined in `schema.clobber`'
          )
        }

        if (
          // Boolean.
          value === true ||
          // Value we set it to.
          value === 'x' ||
          // Value GH sets it to with a clobber prefix.
          value === 'user-content-x' ||
          // Wrapper for images.
          (node.tagName === 'a' && prop === 'target' && value === '_blank') ||
          (node.tagName === 'a' && prop === 'rel' && value === 'noopener') ||
          // Footnotes.
          (node.tagName === 'a' &&
            prop === 'ariaDescribedBy' &&
            value === 'footnote-label') ||
          (node.tagName === 'a' &&
            prop === 'href' &&
            String(value).startsWith('x-')) ||
          (node.tagName === 'a' &&
            prop === 'id' &&
            String(value).startsWith('user-content-x-')) ||
          (node.tagName === 'a' &&
            prop === 'className' &&
            value === 'data-footnote-backref') ||
          (node.tagName === 'section' &&
            prop === 'className' &&
            value === 'footnotes') ||
          (node.tagName === 'h2' &&
            prop === 'id' &&
            (value === 'footnote-label' ||
              value === 'user-content-footnote-label')) ||
          (node.tagName === 'h2' && prop === 'className' && value === 'sr-only')
        ) {
          continue
        }

        console.log(
          'Unexpected key `%s` (`%s`) on <%s>',
          prop,
          value,
          node.tagName
        )
      }
    }
  }
})

for (const name of schemaTagNames) {
  // Not normally allowed when manually authoring markdown.
  if (name === 'input') continue

  assert(
    tagNamesSeen.has(name),
    'tag name `' + name + '` was not found in GH response'
  )
}

for (const name of schemaPropertyNames) {
  // Used by us for task lists.
  if (name === 'className') continue
  // Used by us for inputs.
  if (name === 'type') continue

  assert(
    propertyNamesSeen.has(name),
    'property name `' + name + '` was not found in GH response'
  )
}
