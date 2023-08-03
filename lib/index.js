/**
 * @typedef {import('hast').Comment} Comment
 * @typedef {import('hast').Doctype} Doctype
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').ElementContent} ElementContent
 * @typedef {import('hast').Nodes} Nodes
 * @typedef {import('hast').Properties} Properties
 * @typedef {import('hast').Root} Root
 * @typedef {import('hast').RootContent} RootContent
 * @typedef {import('hast').Text} Text
 */

/**
 * @typedef {[string, ...Array<Exclude<Properties[keyof Properties], Array<any>> | RegExp>] | string} PropertyDefinition
 *   Definition for a property.
 *
 * @typedef Schema
 *   Schema that defines what nodes and properties are allowed.
 *
 *   The default schema is `defaultSchema`, which follows how GitHub cleans.
 *   If any top-level key is missing in the given schema, the corresponding
 *   value of the default schema is used.
 *
 *   To extend the standard schema with a few changes, clone `defaultSchema`
 *   like so:
 *
 *   ```js
 *   import {h} from 'hastscript'
 *   import deepmerge from 'deepmerge'
 *   import {defaultSchema, sanitize} from 'hast-util-sanitize'
 *
 *   const schema = deepmerge(defaultSchema, {attributes: {'*': ['className']}})
 *
 *   const tree = sanitize(h('div', {className: ['foo']}), schema)
 *
 *   // `tree` still has `className`.
 *   console.log(tree)
 *   // {
 *   //   type: 'element',
 *   //   tagName: 'div',
 *   //   properties: {className: ['foo']},
 *   //   children: []
 *   // }
 *   ```
 * @property {boolean | null | undefined} [allowComments=false]
 *   Whether to allow comment nodes (default: `false`).
 *
 *   For example:
 *
 *   ```js
 *   allowComments: true
 *   ```
 * @property {boolean | null | undefined} [allowDoctypes=false]
 *   Whether to allow doctype nodes (default: `false`).
 *
 *   For example:
 *
 *   ```js
 *   allowDoctypes: true
 *   ```
 * @property {Record<string, Array<string>> | null | undefined} [ancestors]
 *   Map of tag names to a list of tag names which are required ancestors
 *   (default: `defaultSchema.ancestors`).
 *
 *   Elements with these tag names will be ignored if they occur outside of one
 *   of their allowed parents.
 *
 *   For example:
 *
 *   ```js
 *   ancestors: {
 *     li: ['ol', 'ul'],
 *     // …
 *     tr: ['table']
 *   }
 *   ```
 * @property {Record<string, Array<PropertyDefinition>> | null | undefined} [attributes]
 *   Map of tag names to allowed *property names* (default:
 *   `defaultSchema.attributes`).
 *
 *   The special key `'*'` as a tag name defines property names allowed on all
 *   elements.
 *
 *   The special value `'data*'` as a property name can be used to allow all
 *   `data`properties.
 *
 *   For example:
 *
 *   ```js
 *   attributes: {
 *     a: ['href'],
 *     img: ['src', 'longDesc'],
 *     // …
 *     '*': [
 *       'abbr',
 *       'accept',
 *       'acceptCharset',
 *       // …
 *       'vSpace',
 *       'width',
 *       'itemProp'
 *     ]
 *   }
 *   ```
 *
 *   Instead of a single string, which allows any *property value* of that
 *   property name, it’s also possible to provide an array to allow several
 *   values.
 *   For example, `input: ['type']` allows the `type` attribute set to any
 *   value on inputs.
 *   But `input: [['type', 'checkbox', 'radio']]` allows `type` only when set
 *   to one of the allowed values (`'checkbox'` or `'radio'`).
 *
 *   You can also use regexes, so for example `span: [['className', /^hljs-/]]`
 *   allows any class that starts with `hljs-` on `span` elements.
 *
 *   This is how the default GitHub schema allows only disabled checkbox
 *   inputs:
 *
 *   ```js
 *   attributes: {
 *     // …
 *     input: [
 *       ['type', 'checkbox'],
 *       ['disabled', true]
 *     ]
 *     // …
 *   }
 *   ```
 *
 *   Attributes also plays well with properties that accept space- or
 *   comma-separated values, such as `class`.
 *   Say you wanted to allow certain classes on `span` elements for syntax
 *   highlighting, that can be done like this:
 *
 *   ```js
 *   // …
 *   span: [
 *     ['className', 'token', 'number', 'operator']
 *   ]
 *   // …
 *   ```
 * @property {Array<string> | null | undefined} [clobber]
 *   List of *property names* that clobber (default: `defaultSchema.clobber`).
 *
 *   For example:
 *
 *   ```js
 *   clobber: ['name', 'id']
 *   ```
 * @property {string | null | undefined} [clobberPrefix]
 *   Prefix to use before clobbering properties (default:
 *   `defaultSchema.clobberPrefix`).
 *
 *   For example:
 *
 *   ```js
 *   clobberPrefix: 'user-content-'
 *   ```
 * @property {Record<string, Array<string>> | null | undefined} [protocols]
 *   Map of *property names* to allowed protocols (default:
 *   `defaultSchema.protocols`).
 *
 *   The listed property names can be set to URLs that are local (relative to
 *   the current website, such as `this`, `#this`, `/this`, or `?this`) or
 *   remote (such as `https://example.com`), in which case they must have a
 *   protocol that is allowed here.
 *
 *   For example:
 *
 *   ```js
 *   protocols: {
 *     href: ['http', 'https', 'mailto'],
 *     // …
 *     longDesc: ['http', 'https']
 *   }
 *   ```
 * @property {Record<string, Record<string, Properties[keyof Properties]>> | null | undefined} [required]
 *   Map of tag names to required *property names* and their default *property
 *   value* (default: `defaultSchema.required`).
 *
 *   If the defined keys do not exist in an element’s properties, they are added
 *   and set to the specified value.
 *
 *   Note that properties are first checked based on the schema at `attributes`,
 *   so properties could be removed by that step and then added again through
 *   `required`.
 *
 *   For example:
 *
 *   ```js
 *   required: {
 *     input: {type: 'checkbox', disabled: true}
 *   }
 *   ```
 * @property {Array<string> | null | undefined} [strip]
 *   List of tag names to strip from the tree (default: `defaultSchema.strip`).
 *
 *   By default, unsafe elements are replaced by their children.
 *   Some elements should however be entirely stripped from the tree.
 *
 *   For example:
 *
 *   ```js
 *   strip: ['script']
 *   ```
 * @property {Array<string> | null | undefined} [tagNames]
 *   List of allowed tag names (default: `defaultSchema.tagNames`).
 *
 *   For example:
 *
 *   ```js
 *   tagNames: [
 *     'h1',
 *     'h2',
 *     'h3',
 *     // …
 *     'strike',
 *     'summary',
 *     'details'
 *   ]
 *   ```
 *
 * @typedef State
 *   Info passed around.
 * @property {Readonly<Schema>} schema
 *   Schema.
 * @property {Array<string>} stack
 *   Tag names of ancestors.
 */

import structuredClone from '@ungap/structured-clone'
import {position} from 'unist-util-position'
import {defaultSchema} from './schema.js'

const own = {}.hasOwnProperty

/**
 * Sanitize a tree.
 *
 * @param {Readonly<Nodes>} node
 *   Unsafe tree.
 * @param {Readonly<Schema> | null | undefined} [options]
 *   Schema defining how to sanitize (default: `defaultSchema`).
 * @returns {Nodes}
 *   New, safe tree.
 */
export function sanitize(node, options) {
  /** @type {Nodes} */
  let ctx = {type: 'root', children: []}

  /** @type {State} */
  const state = {
    schema: options ? {...defaultSchema, ...options} : defaultSchema,
    stack: []
  }
  const replace = transform(state, node)

  if (replace) {
    if (Array.isArray(replace)) {
      if (replace.length === 1) {
        ctx = replace[0]
      } else {
        ctx.children = replace
      }
    } else {
      ctx = replace
    }
  }

  return ctx
}

/**
 * Sanitize `node`.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<unknown>} node
 *   Unsafe node.
 * @returns {Array<ElementContent> | Nodes | undefined}
 *   Safe result.
 */
function transform(state, node) {
  if (node && typeof node === 'object') {
    const unsafe = /** @type {Record<string, Readonly<unknown>>} */ (node)
    const type = typeof unsafe.type === 'string' ? unsafe.type : ''

    switch (type) {
      case 'comment': {
        return comment(state, unsafe)
      }

      case 'doctype': {
        return doctype(state, unsafe)
      }

      case 'element': {
        return element(state, unsafe)
      }

      case 'root': {
        return root(state, unsafe)
      }

      case 'text': {
        return text(state, unsafe)
      }

      default:
    }
  }
}

/**
 * Make a safe comment.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<Record<string, Readonly<unknown>>>} unsafe
 *   Unsafe comment-like value.
 * @returns {Comment | undefined}
 *   Safe comment (if with `allowComments`).
 */
function comment(state, unsafe) {
  if (state.schema.allowComments) {
    // See <https://html.spec.whatwg.org/multipage/parsing.html#serialising-html-fragments>
    const result = typeof unsafe.value === 'string' ? unsafe.value : ''
    const index = result.indexOf('-->')
    const value = index < 0 ? result : result.slice(0, index)

    /** @type {Comment} */
    const node = {type: 'comment', value}

    patch(node, unsafe)

    return node
  }
}

/**
 * Make a safe doctype.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<Record<string, Readonly<unknown>>>} unsafe
 *   Unsafe doctype-like value.
 * @returns {Doctype | undefined}
 *   Safe doctype (if with `allowDoctypes`).
 */
function doctype(state, unsafe) {
  if (state.schema.allowDoctypes) {
    /** @type {Doctype} */
    const node = {type: 'doctype'}

    patch(node, unsafe)

    return node
  }
}

/**
 * Make a safe element.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<Record<string, Readonly<unknown>>>} unsafe
 *   Unsafe element-like value.
 * @returns {Array<ElementContent> | Element | undefined}
 *   Safe element.
 */
function element(state, unsafe) {
  const name = typeof unsafe.tagName === 'string' ? unsafe.tagName : ''

  state.stack.push(name)

  const content = /** @type {Array<ElementContent>} */ (
    children(state, unsafe.children)
  )
  const props = properties(state, unsafe.properties)

  state.stack.pop()

  let safeElement = false
  let index = -1

  if (
    name.length > 0 &&
    name !== '*' &&
    (!state.schema.tagNames || state.schema.tagNames.includes(name))
  ) {
    safeElement = true

    // Some nodes can break out of their context if they don’t have a certain
    // ancestor.
    if (state.schema.ancestors && own.call(state.schema.ancestors, name)) {
      const ancestors = state.schema.ancestors[name]
      safeElement = false

      while (++index < ancestors.length) {
        if (state.stack.includes(ancestors[index])) {
          safeElement = true
        }
      }
    }
  }

  if (!safeElement) {
    return state.schema.strip && !state.schema.strip.includes(name)
      ? content
      : undefined
  }

  /** @type {Element} */
  const node = {
    type: 'element',
    tagName: name,
    properties: props,
    children: content
  }

  patch(node, unsafe)

  return node
}

/**
 * Make a safe root.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<Record<string, Readonly<unknown>>>} unsafe
 *   Unsafe root-like value.
 * @returns {Root}
 *   Safe root.
 */
function root(state, unsafe) {
  const content = /** @type {Array<RootContent>} */ (
    children(state, unsafe.children)
  )

  /** @type {Root} */
  const node = {type: 'root', children: content}

  patch(node, unsafe)

  return node
}

/**
 * Make a safe text.
 *
 * @param {State} _
 *   Info passed around.
 * @param {Readonly<Record<string, Readonly<unknown>>>} unsafe
 *   Unsafe text-like value.
 * @returns {Text}
 *   Safe text.
 */
function text(_, unsafe) {
  const value = typeof unsafe.value === 'string' ? unsafe.value : ''
  /** @type {Text} */
  const node = {type: 'text', value}

  patch(node, unsafe)

  return node
}

/**
 * Make children safe.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<unknown>} children
 *   Unsafe value.
 * @returns {Array<Nodes>}
 *   Safe children.
 */
function children(state, children) {
  /** @type {Array<Nodes>} */
  const results = []

  if (Array.isArray(children)) {
    const childrenUnknown = /** @type {Array<Readonly<unknown>>} */ (children)
    let index = -1

    while (++index < childrenUnknown.length) {
      const value = transform(state, childrenUnknown[index])

      if (value) {
        if (Array.isArray(value)) {
          results.push(...value)
        } else {
          results.push(value)
        }
      }
    }
  }

  return results
}

/**
 * Make element properties safe.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<unknown>} properties
 *   Unsafe value.
 * @returns {Properties}
 *   Safe value.
 */
function properties(state, properties) {
  const tagName = state.stack[state.stack.length - 1]
  const attributes = state.schema.attributes
  const required = state.schema.required
  const specific =
    attributes && own.call(attributes, tagName)
      ? attributes[tagName]
      : undefined
  const defaults =
    attributes && own.call(attributes, '*') ? attributes['*'] : undefined
  const props = /** @type {Readonly<Record<string, Readonly<unknown>>>} */ (
    properties && typeof properties === 'object' ? properties : {}
  )
  /** @type {Properties} */
  const result = {}
  /** @type {string} */
  let key

  for (key in props) {
    if (own.call(props, key)) {
      /** @type {Readonly<PropertyDefinition> | undefined} */
      let definition

      if (specific) definition = findDefinition(specific, key)
      if (!definition && defaults) definition = findDefinition(defaults, key)

      if (definition) {
        const unsafe = props[key]
        const safe = Array.isArray(unsafe)
          ? propertyValues(state, definition, key, unsafe)
          : propertyValue(state, definition, key, unsafe)

        if (safe !== null && safe !== undefined) {
          result[key] = safe
        }
      }
    }
  }

  if (required && own.call(required, tagName)) {
    const properties = required[tagName]

    for (key in properties) {
      if (own.call(properties, key) && !own.call(result, key)) {
        result[key] = properties[key]
      }
    }
  }

  return result
}

/**
 * Sanitize a property value which is a list.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<PropertyDefinition>} definition
 *   Definition.
 * @param {string} key
 *   Field name.
 * @param {Readonly<Array<Readonly<unknown>>>} values
 *   Unsafe value (but an array).
 * @returns {Array<number | string>}
 *   Safe value.
 */
function propertyValues(state, definition, key, values) {
  let index = -1
  /** @type {Array<number | string>} */
  const result = []

  while (++index < values.length) {
    const value = propertyValue(state, definition, key, values[index])

    if (typeof value === 'number' || typeof value === 'string') {
      result.push(value)
    }
  }

  return result
}

/**
 * Sanitize a property value.
 *
 * @param {State} state
 *   Info passed around.
 * @param {Readonly<PropertyDefinition>} definition
 *   Definition.
 * @param {string} key
 *   Field name.
 * @param {Readonly<unknown>} value
 *   Unsafe value (but not an array).
 * @returns {boolean | number | string | undefined}
 *   Safe value.
 */
function propertyValue(state, definition, key, value) {
  if (
    typeof value !== 'boolean' &&
    typeof value !== 'number' &&
    typeof value !== 'string'
  ) {
    return
  }

  if (!safeProtocol(state, key, value)) {
    return
  }

  // Just a string, or only one item in an array, means all values are OK.
  // More than one item means an allow list.
  if (typeof definition === 'object' && definition.length > 1) {
    let ok = false
    let index = 0 // Ignore `key`, which is the first item.

    while (++index < definition.length) {
      const allowed = definition[index]

      // Expression.
      if (allowed && typeof allowed === 'object' && 'flags' in allowed) {
        if (allowed.test(String(value))) {
          ok = true
          break
        }
      }
      // Primitive.
      else if (allowed === value) {
        ok = true
        break
      }
    }

    if (!ok) return
  }

  return state.schema.clobber &&
    state.schema.clobberPrefix &&
    state.schema.clobber.includes(key)
    ? state.schema.clobberPrefix + value
    : value
}

/**
 * Check whether `value` is a safe URL.
 *
 * @param {State} state
 *   Info passed around.
 * @param {string} key
 *   Field name.
 * @param {Readonly<unknown>} value
 *   Unsafe value.
 * @returns {boolean}
 *   Whether it’s a safe value.
 */
function safeProtocol(state, key, value) {
  const protocols =
    state.schema.protocols && own.call(state.schema.protocols, key)
      ? state.schema.protocols[key]
      : undefined

  // No protocols defined? Then everything is fine.
  if (!protocols || protocols.length === 0) {
    return true
  }

  const url = String(value)
  const colon = url.indexOf(':')
  const questionMark = url.indexOf('?')
  const numberSign = url.indexOf('#')
  const slash = url.indexOf('/')

  if (
    colon < 0 ||
    // If the first colon is after a `?`, `#`, or `/`, it’s not a protocol.
    (slash > -1 && colon > slash) ||
    (questionMark > -1 && colon > questionMark) ||
    (numberSign > -1 && colon > numberSign)
  ) {
    return true
  }

  let index = -1

  while (++index < protocols.length) {
    const protocol = protocols[index]

    if (
      colon === protocol.length &&
      url.slice(0, protocol.length) === protocol
    ) {
      return true
    }
  }

  return false
}

/**
 * Add data and position.
 *
 * @param {Nodes} node
 *   Node to patch safe data and position on.
 * @param {Readonly<Record<string, Readonly<unknown>>>} unsafe
 *   Unsafe node-like value.
 * @returns {undefined}
 *   Nothing.
 */
function patch(node, unsafe) {
  const cleanPosition = position(
    // @ts-expect-error: looks like a node.
    unsafe
  )

  if (unsafe.data) {
    node.data = structuredClone(unsafe.data)
  }

  if (cleanPosition) node.position = cleanPosition
}

/**
 *
 * @param {Readonly<Array<PropertyDefinition>>} definitions
 * @param {string} key
 * @returns {Readonly<PropertyDefinition> | undefined}
 */
function findDefinition(definitions, key) {
  /** @type {PropertyDefinition | undefined} */
  let dataDefault
  let index = -1

  while (++index < definitions.length) {
    const entry = definitions[index]
    const name = typeof entry === 'string' ? entry : entry[0]

    if (name === key) {
      return entry
    }

    if (name === 'data*') dataDefault = entry
  }

  if (key.length > 4 && key.slice(0, 4).toLowerCase() === 'data') {
    return dataDefault
  }
}
