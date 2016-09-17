/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module hdast:sanitize
 * @fileoverview Sanitize HAST.
 */

'use strict';

/* Dependencies. */
var has = require('has');
var xtend = require('xtend');
var defaults = require('./github');

/* Expose. */
module.exports = wrapper;

/* Schema. */
var NODES = {
  'root': {children: all},
  'element': {
    tagName: handleTagName,
    properties: handleProperties,
    children: all
  },
  'text': {value: handleValue},
  '*': {
    data: allow,
    position: allow
  }
};

/**
 * Sanitize `node`, according to `schema`.
 *
 * @param {Node} node - HAST node to sanitize.
 * @param {Object} [schema] - Schema to use.
 *   Defaults to `github`.
 * @return {Node} - Sanitized HAST node.
 */
function wrapper(node, schema) {
  var ctx = {type: 'root', children: []};
  var replace;

  if (!node || typeof node !== 'object' || !node.type) {
    return ctx;
  }

  replace = one(xtend(defaults, schema || {}), node, []);

  if (!replace) {
    return ctx;
  }

  if ('length' in replace) {
    if (replace.length === 1) {
      return replace[0];
    }

    ctx.children = replace;

    return ctx;
  }

  return replace;
}

/**
 * Sanitize `node`.
 *
 * @param {Object} schema - Configuration.
 * @param {Node} node - HAST node to sanitize.
 * @param {Array.<string>} stack - Element stack.
 * @return {Node?|Array.<Node>} - Clean node(s).
 */
function one(schema, node, stack) {
  var type = node && node.type;
  var replacement = {type: node.type};
  var replace = true;
  var allowed;
  var result;
  var key;

  if (!has(NODES, type)) {
    replace = false;
  } else {
    allowed = xtend(NODES[type], NODES['*']);

    for (key in allowed) {
      result = allowed[key](schema, node[key], node, stack);

      if (result === false) {
        replace = false;

        /* Set the non-safe value. */
        replacement[key] = node[key];
      } else if (result != null) {
        replacement[key] = result;
      }
    }
  }

  if (!replace) {
    if (
      !replacement.children ||
      !replacement.children.length ||
      schema.strip.indexOf(replacement.tagName) !== -1
    ) {
      return null;
    }

    return replacement.children;
  }

  return replacement;
}

/**
 * Sanitize `children`.
 *
 * @param {Object} schema - Configuration.
 * @param {Array.<Node>} children - HAST nodes.
 * @param {Node} node - Parent.
 * @param {Array.<string>} stack - Element stack.
 * @return {Array.<Node>} - Clean nodes.
 */
function all(schema, children, node, stack) {
  var nodes = children || [];
  var length = nodes.length || 0;
  var results = [];
  var index = -1;
  var result;

  stack = stack.concat(node.tagName);

  while (++index < length) {
    result = one(schema, nodes[index], stack);

    if (result) {
      if ('length' in result) {
        results = results.concat(result);
      } else {
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * Sanitize `properties`.
 *
 * @param {Object} schema - Configuration.
 * @param {Object} properties - Element `properties`.
 * @param {Node} node - Context.
 * @param {Array.<string>} stack - Element stack.
 * @return {Object} - Clean properties.
 */
function handleProperties(schema, properties, node, stack) {
  var name = handleTagName(schema, node.tagName, node, stack);
  var attrs = schema.attributes;
  var props = properties || {};
  var result = {};
  var allowed;
  var prop;
  var value;

  allowed = has(attrs, name) ? attrs[name] : [];
  allowed = [].concat(allowed, attrs['*']);

  for (prop in props) {
    value = props[prop];

    if (
      allowed.indexOf(prop) === -1 &&
      !(data(prop) && allowed.indexOf('data*') !== -1)
    ) {
      continue;
    }

    if (value && typeof value === 'object' && 'length' in value) {
      value = handlePropertyValues(schema, value, prop);
    } else {
      value = handlePropertyValue(schema, value, prop);
    }

    if (value != null) {
      result[prop] = value;
    }
  }

  return result;
}

/**
 * Sanitize a property value which is a list.
 *
 * @param {Object} schema - Configuration.
 * @param {Array.<*>} values - List of values.
 * @param {string} prop - Key at which `values` live.
 * @return {Array.<number|boolean|string>} - Clean values.
 */
function handlePropertyValues(schema, values, prop) {
  var length = values.length;
  var result = [];
  var index = -1;
  var value;

  while (++index < length) {
    value = handlePropertyValue(schema, values[index], prop);

    if (value != null) {
      result.push(value);
    }
  }

  return result;
}

/**
 * Sanitize a property value.
 *
 * @param {Object} schema - Configuration.
 * @param {*} value - Value.
 * @param {string} prop - Key at which `value` live.
 * @return {number|boolean|string?} - Clean value.
 */
function handlePropertyValue(schema, value, prop) {
  if (
    typeof value !== 'boolean' &&
    typeof value !== 'number' &&
    typeof value !== 'string'
  ) {
    return null;
  }

  if (!handleProtocol(schema, value, prop)) {
    return null;
  }

  if (schema.clobber.indexOf(prop) !== -1) {
    value = schema.clobberPrefix + value;
  }

  return value;
}

/**
 * Check whether `value` is a safe URL.
 *
 * @param {Object} schema - Configuration.
 * @param {*} value - Value.
 * @param {string} prop - Key at which `value` live.
 * @return {boolean} - Whether `value` is safe.
 */
function handleProtocol(schema, value, prop) {
  var protocols = schema.protocols;
  var protocol;
  var first;
  var colon;
  var length;
  var index;

  protocols = has(protocols, prop) ? protocols[prop].concat() : [];

  if (!protocols.length) {
    return true;
  }

  value = String(value);
  first = value.charAt(0);

  if (first === '#' || first === '/') {
    return true;
  }

  colon = value.indexOf(':');

  if (colon === -1) {
    return true;
  }

  length = protocols.length;
  index = -1;

  while (++index < length) {
    protocol = protocols[index];

    if (
      colon === protocol.length &&
      value.slice(0, protocol.length) === protocol
    ) {
      return true;
    }
  }

  index = value.indexOf('?');

  if (index !== -1 && colon > index) {
    return true;
  }

  index = value.indexOf('#');

  if (index !== -1 && colon > index) {
    return true;
  }

  return false;
}

/**
 * Sanitize `tagName`.
 *
 * @param {Object} schema - Configuration.
 * @param {*} tagName - Tag-name of element.
 * @param {Node} node - HAST node to sanitize.
 * @param {Array.<string>} stack - Element stack.
 * @return {string|boolean?} - `false`, if `tagName`
 *   represents an unsage element, a string to use
 *   as a tag-name otherwise.
 */
function handleTagName(schema, tagName, node, stack) {
  var name = typeof tagName === 'string' ? tagName : null;
  var ancestors = schema.ancestors;
  var length;
  var index;

  if (!name || name === '*' || schema.tagNames.indexOf(name) === -1) {
    return false;
  }

  ancestors = has(ancestors, name) ? ancestors[name] : [];

  /* Some nodes can break out of their context if they
   * don’t have a certain ancestor. */
  if (ancestors.length) {
    length = ancestors.length + 1;
    index = -1;

    while (++index < length) {
      if (!ancestors[index]) {
        return false;
      }

      if (stack.indexOf(ancestors[index]) !== -1) {
        break;
      }
    }
  }

  return name;
}

/* Sanitize `value`. */
function handleValue(schema, value) {
  return typeof value === 'string' ? value : '';
}

/* Allow `value`. */
function allow(schema, value) {
  return value;
}

/* Check if `prop` is a data property. */
function data(prop) {
  return prop.length > 4 && prop.slice(0, 4).toLowerCase() === 'data';
}
