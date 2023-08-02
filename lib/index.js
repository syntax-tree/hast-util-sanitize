/**
 * @typedef {import('hast').Nodes} Nodes
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Properties} Properties
 *
 * @typedef {Properties[string]} PropertyValue
 *   Possible property values.
 * @typedef {string | number | boolean} PrimitivePropertyValue
 *   Possible primitive HTML attribute values.
 *
 * @typedef {Record<string, Array<string | [string, ...Array<PrimitivePropertyValue | RegExp>]>>} Attributes
 *  Map of tag names to allow lists for each property.
 * @typedef {Record<string, Array<PrimitivePropertyValue | RegExp>>} AttributeClean
 *   Normalized input.
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
 *   import deepmerge from 'deepmerge' // You can use `structuredClone` in modern JS.
 *   import {sanitize, defaultSchema} from 'hast-util-sanitize'
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
 * @property {Attributes | null | undefined} [attributes]
 *   Map of tag names to allowed *property names*.
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
 * @property {Record<string, Record<string, PropertyValue>> | null | undefined} [required]
 *   Map of tag names to required *property names* and their default *property
 *   value*.
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
 * @property {Array<string> | null | undefined} [tagNames]
 *   List of allowed tag names.
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
 * @property {Record<string, Array<string>> | null | undefined} [protocols]
 *   Map of *property names* to allowed protocols.
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
 * @property {Record<string, Array<string>> | null | undefined} [ancestors]
 *   Map of tag names to a list of tag names which are required ancestors.
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
 * @property {Array<string> | null | undefined} [clobber]
 *   List of *property names* that clobber (`Array<string>`).
 *
 *   For example:
 *
 *   ```js
 *   clobber: ['name', 'id']
 *   ```
 * @property {string | null | undefined} [clobberPrefix]
 *   Prefix to use before clobbering properties.
 *
 *   For example:
 *
 *   ```js
 *   clobberPrefix: 'user-content-'
 *   ```
 * @property {Array<string> | null | undefined} [strip]
 *   List of tag names to strip from the tree.
 *
 *   By default, unsafe elements are replaced by their children.
 *   Some elements should however be entirely stripped from the tree.
 *
 *   For example:
 *
 *   ```js
 *   strip: ['script']
 *   ```
 * @property {boolean | null | undefined} [allowComments=false]
 *   Whether to allow comment nodes.
 *
 *   For example:
 *
 *   ```js
 *   allowComments: true
 *   ```
 * @property {boolean | null | undefined} [allowDoctypes=false]
 *   Whether to allow doctype nodes.
 *
 *   ```js
 *   allowDoctypes: true
 *   ```
 *
 * @typedef {(schema: Schema, value: any, node: any, stack: Array<string>) => unknown} Handler
 * @typedef {Record<string, Handler>} NodeDefinition
 * @typedef {((schema: Schema, node: Nodes) => NodeDefinition | undefined)} NodeDefinitionGetter
 * @typedef {Record<string, NodeDefinition | NodeDefinitionGetter>} NodeSchema
 */

import {defaultSchema} from './schema.js'

const own = {}.hasOwnProperty

/** @type {NodeSchema} */
const nodeSchema = {
  root: {children: all},
  doctype: handleDoctype,
  comment: handleComment,
  element: {
    tagName: handleTagName,
    properties: handleProperties,
    children: all
  },
  text: {value: handleValue},
  '*': {data: allow, position: allow}
}

/**
 * Sanitize a tree.
 *
 * @param {Nodes} node
 *   Tree to clean.
 * @param {Schema | null | undefined} [schema]
 *   Schema defining how to sanitize.
 * @returns {Nodes}
 *   New, sanitized, tree.
 */
export function sanitize(node, schema) {
  /** @type {Nodes} */
  let ctx = {type: 'root', children: []}

  if (node && typeof node === 'object' && node.type) {
    const replace = one(
      Object.assign({}, defaultSchema, schema || {}),
      node,
      []
    )

    if (replace) {
      if (Array.isArray(replace)) {
        if (replace.length === 1) {
          ctx = replace[0]
        } else {
          // @ts-expect-error Assume `root` is not a child.
          ctx.children = replace
        }
      } else {
        ctx = replace
      }
    }
  }

  return ctx
}

/**
 * Sanitize `node`.
 *
 * @param {Schema} schema
 * @param {Nodes} node
 * @param {Array<string>} stack
 * @returns {Nodes | Array<Nodes> | undefined}
 */
function one(schema, node, stack) {
  const type = node && node.type
  /** @type {Nodes} */
  // @ts-expect-error rest of props added later.
  const replacement = {type: node.type}
  /** @type {boolean | undefined} */
  let replace

  if (own.call(nodeSchema, type)) {
    /** @type {NodeDefinition | NodeDefinitionGetter | undefined} */
    let definition = nodeSchema[type]

    if (typeof definition === 'function') {
      definition = definition(schema, node)
    }

    if (definition) {
      const allowed = Object.assign({}, definition, nodeSchema['*'])
      /** @type {string} */
      let key

      replace = true

      for (key in allowed) {
        if (own.call(allowed, key)) {
          // @ts-expect-error: fine.
          // type-coverage:ignore-next-line
          const result = allowed[key](schema, node[key], node, stack)

          // eslint-disable-next-line max-depth
          if (result === false) {
            replace = undefined
            // Set the non-safe value.
            // @ts-expect-error: fine.
            // type-coverage:ignore-next-line
            replacement[key] = node[key]
          } else if (result !== undefined && result !== null) {
            // @ts-expect-error: fine.
            // type-coverage:ignore-next-line
            replacement[key] = result
          }
        }
      }
    }
  }

  if (replace) {
    return replacement
  }

  return replacement.type === 'element' &&
    schema.strip &&
    !schema.strip.includes(replacement.tagName)
    ? replacement.children
    : undefined
}

/**
 * Sanitize `children`.
 *
 * @type {Handler}
 * @param {Array<Nodes>} children
 * @param {Nodes} node
 * @returns {Array<Nodes>}
 */
function all(schema, children, node, stack) {
  /** @type {Array<Nodes>} */
  const results = []

  if (Array.isArray(children)) {
    let index = -1

    if (node.type === 'element') {
      stack.push(node.tagName)
    }

    while (++index < children.length) {
      const value = one(schema, children[index], stack)

      if (value) {
        if (Array.isArray(value)) {
          results.push(...value)
        } else {
          results.push(value)
        }
      }
    }

    if (node.type === 'element') {
      stack.pop()
    }
  }

  return results
}

/** @type {NodeDefinitionGetter} */
function handleDoctype(schema) {
  return schema.allowDoctypes ? {name: handleDoctypeName} : undefined
}

/** @type {NodeDefinitionGetter} */
function handleComment(schema) {
  return schema.allowComments ? {value: handleCommentValue} : undefined
}

/**
 * Sanitize `properties`.
 *
 * @type {Handler}
 * @param {Properties} properties
 * @param {Element} node
 * @returns {Properties}
 */
function handleProperties(schema, properties, node, stack) {
  const name = handleTagName(schema, node.tagName, node, stack)
  /* c8 ignore next */
  const attrs = schema.attributes || {}
  /* c8 ignore next */
  const reqs = schema.required || {}
  const props = properties || {}
  const allowed = Object.assign(
    {},
    toPropertyValueMap(attrs['*']),
    toPropertyValueMap(name && own.call(attrs, name) ? attrs[name] : [])
  )
  /** @type {Properties} */
  const result = {}
  /** @type {string} */
  let key

  for (key in props) {
    if (own.call(props, key)) {
      let value = props[key]
      /** @type {AttributeClean[string]} */
      let definition

      if (own.call(allowed, key)) {
        definition = allowed[key]
      } else if (data(key) && own.call(allowed, 'data*')) {
        definition = allowed['data*']
      } else {
        continue
      }

      value = Array.isArray(value)
        ? handlePropertyValues(schema, value, key, definition)
        : handlePropertyValue(schema, value, key, definition)

      if (value !== undefined && value !== null) {
        result[key] = value
      }
    }
  }

  if (name && own.call(reqs, name)) {
    for (key in reqs[name]) {
      if (!own.call(result, key)) {
        result[key] = reqs[name][key]
      }
    }
  }

  return result
}

/**
 * Always return a valid HTML5 doctype.
 *
 * @type {Handler}
 * @returns {string}
 */
function handleDoctypeName() {
  return 'html'
}

/**
 * Sanitize `tagName`.
 *
 * @param {Schema} schema
 * @param {string} tagName
 * @param {Nodes} _
 * @param {Array<string>} stack
 * @returns {string | false}
 */
function handleTagName(schema, tagName, _, stack) {
  const name = typeof tagName === 'string' ? tagName : ''
  let index = -1

  if (
    !name ||
    name === '*' ||
    (schema.tagNames && !schema.tagNames.includes(name))
  ) {
    return false
  }

  // Some nodes can break out of their context if they don’t have a certain
  // ancestor.
  if (schema.ancestors && own.call(schema.ancestors, name)) {
    while (++index < schema.ancestors[name].length) {
      if (stack.includes(schema.ancestors[name][index])) {
        return name
      }
    }

    return false
  }

  return name
}

/**
 * See <https://html.spec.whatwg.org/multipage/parsing.html#serialising-html-fragments>
 *
 * @type {Handler}
 * @param {unknown} value
 * @returns {string}
 */
function handleCommentValue(_, value) {
  /** @type {string} */
  const result = typeof value === 'string' ? value : ''
  const index = result.indexOf('-->')
  return index < 0 ? result : result.slice(0, index)
}

/**
 * Sanitize `value`.
 *
 * @type {Handler}
 * @param {unknown} value
 * @returns {string}
 */
function handleValue(_, value) {
  return typeof value === 'string' ? value : ''
}

/**
 * Allow `value`.
 *
 * @type {Handler}
 * @param {unknown} value
 */
function allow(_, value) {
  return value
}

/**
 * Sanitize a property value which is a list.
 *
 * @param {Schema} schema
 * @param {Array<unknown>} values
 * @param {string} prop
 * @param {AttributeClean[string]} definition
 * @returns {Array<string | number>}
 */
function handlePropertyValues(schema, values, prop, definition) {
  let index = -1
  /** @type {Array<string | number>} */
  const result = []

  while (++index < values.length) {
    const value = handlePropertyValue(schema, values[index], prop, definition)

    if (value !== undefined && value !== null) {
      // @ts-expect-error Assume no booleans were in arrays.
      result.push(value)
    }
  }

  return result
}

/**
 * Sanitize a property value.
 *
 * @param {Schema} schema
 * @param {unknown} value
 * @param {string} prop
 * @param {AttributeClean[string]} definition
 * @returns {PropertyValue}
 */
function handlePropertyValue(schema, value, prop, definition) {
  if (
    (typeof value === 'boolean' ||
      typeof value === 'number' ||
      typeof value === 'string') &&
    safeProtocol(schema, value, prop) &&
    (definition.length === 0 ||
      definition.some((allowed) =>
        allowed && typeof allowed === 'object' && 'flags' in allowed
          ? allowed.test(String(value))
          : allowed === value
      ))
  ) {
    return schema.clobberPrefix &&
      schema.clobber &&
      schema.clobber.includes(prop)
      ? schema.clobberPrefix + value
      : value
  }
}

/**
 * Check whether `value` is a safe URL.
 *
 * @param {Schema} schema
 * @param {unknown} value
 * @param {string} prop
 * @returns {boolean}
 */
function safeProtocol(schema, value, prop) {
  const protocols =
    schema.protocols && own.call(schema.protocols, prop)
      ? schema.protocols[prop].concat()
      : []

  // Not listed.
  if (protocols.length === 0) {
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
    if (
      colon === protocols[index].length &&
      url.slice(0, protocols[index].length) === protocols[index]
    ) {
      return true
    }
  }

  return false
}

/**
 * Create a map from a list of props or a list of properties and values.
 *
 * @param {Attributes[string]} values
 * @returns {AttributeClean}
 */
function toPropertyValueMap(values) {
  /** @type {AttributeClean} */
  const result = {}
  let index = -1

  while (++index < values.length) {
    const value = values[index]

    if (Array.isArray(value)) {
      result[value[0]] = value.slice(1)
    } else {
      result[value] = []
    }
  }

  return result
}

/**
 * Check if `prop` is a data property.
 *
 * @param {string} prop
 * @returns {boolean}
 */
function data(prop) {
  return prop.length > 4 && prop.slice(0, 4).toLowerCase() === 'data'
}
