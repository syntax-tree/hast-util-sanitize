/**
 * @typedef {import('hast').Parent} Parent
 * @typedef {import('hast').Root} Root
 * @typedef {import('hast').Properties} Properties
 * @typedef {Parent['children'][number]|Root} Node
 *
 * @typedef {Properties[string]} PropertyValue Possible property values
 * @typedef {string|number|boolean} PrimitivePropertyValue Possible primitive HTML attribute values
 * @typedef {string|[string, ...PrimitivePropertyValue[]]} AttributeValue
 * @typedef {Object.<string, Array.<PrimitivePropertyValue>>} AttributeMap
 *
 * @typedef Schema Sanitization configuration
 * @property {Object<string, Array<AttributeValue>>} [attributes] Map of tag names to allowed property names. The special '*' key defines property names allowed on all elements
 * @property {Object<string, Object<string, PropertyValue>>} [required] Map of tag names to required property names and their default property value
 * @property {Array.<string>} [tagNames] List of allowed tag names
 * @property {Object<string, Array.<string>>} [protocols] Map of protocols to allow in property values
 * @property {Object<string, Array.<string>>} [ancestors] Map of tag names to their required ancestor elements
 * @property {Array.<string>} [clobber] List of allowed property names which can clobber
 * @property {string} [clobberPrefix] Prefix to use before potentially clobbering property names
 * @property {Array.<string>} [strip] Names of elements to strip from the tree
 * @property {boolean} [allowComments] Whether to allow comments
 * @property {boolean} [allowDoctypes] Whether to allow doctypes
 *
 * @typedef {(schema: Schema, value: unknown, node: Node, stack: Array.<string>) => unknown} Handler
 * @typedef {Object.<string, Handler>} NodeDefinition
 * @typedef {((schema: Schema, node: Node) => NodeDefinition)} NodeDefinitionGetter
 * @typedef {Object.<string, NodeDefinition|NodeDefinitionGetter>} NodeSchema
 */

import {defaultSchema} from './schema.js'

var own = {}.hasOwnProperty
var push = [].push

/** @type {NodeSchema} */
var nodeSchema = {
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
 * Utility to sanitize a tree
 *
 * @param {Node} node Hast tree to sanitize
 * @param {Schema} [schema] Schema defining how to sanitize - defaults to Github style sanitation
 */
export function sanitize(node, schema) {
  /** @type {Node} */
  var ctx = {type: 'root', children: []}
  /** @type {Node|Array.<Node>} */
  var replace

  if (node && typeof node === 'object' && node.type) {
    replace = one(Object.assign({}, defaultSchema, schema || {}), node, [])

    if (replace) {
      if (Array.isArray(replace)) {
        if (replace.length === 1) {
          ctx = replace[0]
        } else {
          // @ts-ignore Assume `root` is not a child.
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
 * @param {Node} node
 * @param {Array.<string>} stack
 * @returns {Node|Array.<Node>|null}
 */
function one(schema, node, stack) {
  var type = node && node.type
  /** @type {Node} */
  // @ts-ignore rest of props added later.
  var replacement = {type: node.type}
  /** @type {boolean} */
  var replace
  /** @type {NodeDefinition|NodeDefinitionGetter} */
  var definition
  /** @type {NodeDefinition} */
  var allowed
  /** @type {unknown} */
  var result
  /** @type {string} */
  var key

  if (own.call(nodeSchema, type)) {
    definition = nodeSchema[type]

    if (typeof definition === 'function') {
      definition = definition(schema, node)
    }

    if (definition) {
      replace = true
      allowed = Object.assign({}, definition, nodeSchema['*'])

      for (key in allowed) {
        if (own.call(allowed, key)) {
          result = allowed[key](schema, node[key], node, stack)

          // eslint-disable-next-line max-depth
          if (result === false) {
            replace = null
            // Set the non-safe value.
            replacement[key] = node[key]
          } else if (result !== undefined && result !== null) {
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
    !schema.strip.includes(replacement.tagName)
    ? replacement.children
    : null
}

/**
 * Sanitize `children`.
 *
 * @type {Handler}
 * @param {Array.<Node>} children
 * @returns {Array.<Node>}
 */
function all(schema, children, node, stack) {
  /** @type {Array.<Node>} */
  var results = []
  var index = -1
  /** @type {Node|Array.<Node>} */
  var value

  if (Array.isArray(children)) {
    if (node.type === 'element') {
      stack.push(node.tagName)
    }

    while (++index < children.length) {
      value = one(schema, children[index], stack)

      if (value) {
        if ('length' in value) {
          push.apply(results, value)
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
  return schema.allowDoctypes ? {name: handleDoctypeName} : null
}

/** @type {NodeDefinitionGetter} */
function handleComment(schema) {
  return schema.allowComments ? {value: handleCommentValue} : null
}

/**
 * Sanitize `properties`.
 *
 * @type {Handler}
 * @param {Properties} properties
 * @returns {Properties}
 */
function handleProperties(schema, properties, node, stack) {
  var name = handleTagName(schema, node.tagName, node, stack)
  /* c8 ignore next */
  var reqs = schema.required || {}
  var props = properties || {}
  var allowed = Object.assign(
    {},
    toPropertyValueMap(schema.attributes['*']),
    toPropertyValueMap(
      name && own.call(schema.attributes, name) ? schema.attributes[name] : []
    )
  )
  /** @type {Properties} */
  var result = {}
  /** @type {Array.<PrimitivePropertyValue>} */
  var definition
  /** @type {PropertyValue} */
  var value
  /** @type {string} */
  var key

  for (key in props) {
    if (own.call(props, key)) {
      if (own.call(allowed, key)) {
        definition = allowed[key]
      } else if (data(key) && own.call(allowed, 'data*')) {
        definition = allowed['data*']
      } else {
        continue
      }

      value = props[key]
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
 * @type {Handler}
 * @returns {string|false}
 */
function handleTagName(schema, tagName, _, stack) {
  var name = typeof tagName === 'string' ? tagName : ''
  var index = -1

  if (!name || name === '*' || !schema.tagNames.includes(name)) {
    return false
  }

  // Some nodes can break out of their context if they don’t have a certain
  // ancestor.
  if (own.call(schema.ancestors, name)) {
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
 * @returns {string}
 */
function handleCommentValue(_, value) {
  /** @type {string} */
  var result = typeof value === 'string' ? value : ''
  var index = result.indexOf('-->')
  return index < 0 ? result : result.slice(0, index)
}

/**
 * Sanitize `value`.
 *
 * @type {Handler}
 * @returns {string}
 */
function handleValue(_, value) {
  return typeof value === 'string' ? value : ''
}

/**
 * Allow `value`.
 *
 * @type {Handler}
 */
function allow(_, value) {
  return value
}

/**
 * Sanitize a property value which is a list.
 *
 * @param {Schema} schema
 * @param {Array.<unknown>} values
 * @param {string} prop
 * @param {Array.<PrimitivePropertyValue>} definition
 * @returns {Array.<string|number>}
 */
function handlePropertyValues(schema, values, prop, definition) {
  var index = -1
  /** @type {Array.<string|number>} */
  var result = []
  /** @type {PropertyValue} */
  var value

  while (++index < values.length) {
    value = handlePropertyValue(schema, values[index], prop, definition)

    if (value !== undefined && value !== null) {
      // @ts-ignore Assume no booleans were in arrays.
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
 * @param {Array.<PropertyValue>} definition
 * @returns {PropertyValue}
 */
function handlePropertyValue(schema, value, prop, definition) {
  if (
    (typeof value === 'boolean' ||
      typeof value === 'number' ||
      typeof value === 'string') &&
    safeProtocol(schema, value, prop) &&
    (definition.length === 0 || definition.includes(value))
  ) {
    return schema.clobber.includes(prop) ? schema.clobberPrefix + value : value
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
  var url = String(value)
  var colon = url.indexOf(':')
  var questionMark = url.indexOf('?')
  var numberSign = url.indexOf('#')
  var slash = url.indexOf('/')
  var protocols = own.call(schema.protocols, prop)
    ? schema.protocols[prop].concat()
    : []
  var index = -1

  if (
    protocols.length === 0 ||
    colon < 0 ||
    // If the first colon is after a `?`, `#`, or `/`, it’s not a protocol.
    (slash > -1 && colon > slash) ||
    (questionMark > -1 && colon > questionMark) ||
    (numberSign > -1 && colon > numberSign)
  ) {
    return true
  }

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
 * @param {Array.<AttributeValue>} values
 * @returns {AttributeMap}
 */
function toPropertyValueMap(values) {
  /** @type {AttributeMap} */
  var result = {}
  var index = -1
  /** @type {AttributeValue} */
  var value

  while (++index < values.length) {
    value = values[index]

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
