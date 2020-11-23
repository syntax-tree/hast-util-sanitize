'use strict'

var test = require('tape')
var html = require('hast-util-to-html')
var h = require('hastscript')
var s = require('hastscript/svg')
var u = require('unist-builder')
var merge = require('deepmerge')
var gh = require('./lib/github')
var sanitize = require('.')

/* eslint-disable no-script-url, max-params */

test('sanitize()', function (t) {
  t.test('non-node', function (t) {
    t.equal(html(sanitize(true)), '', 'should ignore non-nodes (#1)')
    t.equal(html(sanitize(null)), '', 'should ignore non-nodes (#2)')
    t.equal(html(sanitize(1)), '', 'should ignore non-nodes (#3)')
    t.equal(html(sanitize([])), '', 'should ignore non-nodes (#4)')

    t.end()
  })

  t.test('unknown nodes', function (t) {
    t.equal(
      html(sanitize(u('unknown', '<xml></xml>'))),
      '',
      'should ignore unknown nodes'
    )

    t.end()
  })

  t.test('ignored nodes', function (t) {
    t.equal(html(sanitize(u('raw', '<xml></xml>'))), '', 'should ignore `raw`')

    t.equal(
      html(sanitize(u('directive', {name: '!alpha'}, '!alpha bravo'))),
      '',
      'should ignore declaration `directive`s'
    )

    t.equal(
      html(sanitize(u('directive', {name: '?xml'}, '?xml version="1.0"'))),
      '',
      'should ignore processing instruction `directive`s'
    )

    t.equal(
      html(sanitize(u('characterData', 'alpha'))),
      '',
      'should ignore `characterData`s'
    )

    t.end()
  })

  t.test('`comment`', function (t) {
    t.equal(
      html(sanitize(u('comment', 'alpha'))),
      '',
      'should ignore `comment`s by default'
    )

    t.equal(
      html(sanitize(u('comment', 'alpha'), {allowComments: true})),
      '<!--alpha-->',
      'should allow `comment`s with `allowComments: true`'
    )

    t.equal(
      html(sanitize(u('comment', {toString: toString}), {allowComments: true})),
      '<!---->',
      'should ignore non-string `value`s with `allowComments: true`'
    )

    t.equal(
      html(
        sanitize(u('comment', 'alpha--><script>alert(1)</script><!--bravo'), {
          allowComments: true
        })
      ),
      '<!--alpha-->',
      'should not break out of comments with `allowComments: true`'
    )

    t.end()
  })

  t.test('`doctype`', function (t) {
    t.equal(
      html(sanitize(u('doctype', {name: 'html'}, 'alpha'))),
      '',
      'should ignore `doctype`s by default'
    )

    t.equal(
      html(
        sanitize(u('doctype', {name: 'html'}, 'alpha'), {allowDoctypes: true})
      ),
      '<!doctype html>',
      'should allow `doctype`s with `allowDoctypes: true`'
    )

    t.end()
  })

  t.test('`text`', function (t) {
    t.deepEqual(
      sanitize({
        type: 'text',
        tagName: 'div',
        value: 'alert(1)',
        unknown: 'alert(1)',
        properties: {href: 'javascript:alert(1)'},
        children: [h('script', 'alert(1)')],
        data: {href: 'alert(1)'},
        position: {
          start: {line: 1, column: 1},
          end: {line: 2, column: 1}
        }
      }),
      {
        type: 'text',
        value: 'alert(1)',
        data: {href: 'alert(1)'},
        position: {
          start: {line: 1, column: 1},
          end: {line: 2, column: 1}
        }
      },
      'should allow known properties'
    )

    t.equal(
      html(sanitize(u('text', 'alert(1)'))),
      'alert(1)',
      'should allow `text`'
    )

    t.equal(
      html(sanitize(u('text', {toString: toString}))),
      '',
      'should ignore non-string `value`s'
    )

    t.equal(
      html(sanitize(h('script', u('text', 'alert(1)')))),
      '',
      'should ignore `text` in `script` elements'
    )

    t.equal(
      html(sanitize(h('style', u('text', 'alert(1)')))),
      'alert(1)',
      'should show `text` in `style` elements'
    )

    t.end()
  })

  t.test('`element`', function (t) {
    t.deepEqual(
      sanitize({
        type: 'element',
        tagName: 'div',
        value: 'alert(1)',
        unknown: 'alert(1)',
        properties: {href: 'javascript:alert(1)'},
        children: [h('script', 'alert(1)')],
        data: {href: 'alert(1)'},
        position: {
          start: {line: 1, column: 1},
          end: {line: 2, column: 1}
        }
      }),
      {
        type: 'element',
        tagName: 'div',
        properties: {},
        children: [],
        data: {href: 'alert(1)'},
        position: {
          start: {line: 1, column: 1},
          end: {line: 2, column: 1}
        }
      },
      'should allow known properties'
    )

    t.deepEqual(
      sanitize(h('unknown', u('text', 'alert(1)'))),
      u('text', 'alert(1)'),
      'should ignore unknown elements'
    )

    t.deepEqual(
      sanitize({
        type: 'element',
        properties: {},
        children: [u('text', 'alert(1)')]
      }),
      u('text', 'alert(1)'),
      'should ignore elements without name'
    )

    t.deepEqual(
      sanitize({type: 'element', tagName: 'div'}),
      h(),
      'should support elements without children / properties'
    )

    t.deepEqual(
      sanitize(h('unknown', [])),
      u('root', []),
      'should always return a valid node (#1)'
    )

    t.deepEqual(
      sanitize(h('script', [])),
      u('root', []),
      'should always return a valid node (#2)'
    )

    t.deepEqual(
      sanitize(h('div', h('style', [u('text', '1'), u('text', '2')]))),
      h('div', [u('text', '1'), u('text', '2')]),
      'should always return a valid node (#3)'
    )

    t.deepEqual(
      sanitize(h('unknown', [u('text', 'value')])),
      u('text', 'value'),
      'should always return a valid node (#4)'
    )

    t.deepEqual(
      sanitize(h('unknown', [u('text', '1'), u('text', '2')])),
      u('root', [u('text', '1'), u('text', '2')]),
      'should always return a valid node (#5)'
    )

    t.deepEqual(
      sanitize(h('div', {alt: 'alpha'})),
      h('div', {alt: 'alpha'}),
      'should allow known generic properties'
    )

    t.deepEqual(
      sanitize(h('a', {href: '#heading'})),
      h('a', {href: '#heading'}),
      'should allow specific properties'
    )

    t.deepEqual(
      sanitize(h('img', {href: '#heading'})),
      h('img'),
      'should ignore mismatched specific properties'
    )

    t.deepEqual(
      sanitize(h('div', {dataFoo: 'bar'})),
      h('div'),
      'should ignore unspecified properties'
    )

    t.deepEqual(
      sanitize(h('div', {dataFoo: 'bar'})),
      h('div'),
      'should ignore unspecified properties'
    )

    t.deepEqual(
      sanitize(
        h('div', {dataFoo: 'bar'}),
        merge(gh, {attributes: {'*': ['data*']}})
      ),
      h('div', {dataFoo: 'bar'}),
      'should allow `data*`'
    )

    t.deepEqual(
      sanitize(h('img', {alt: 'hello'})),
      h('img', {alt: 'hello'}),
      'should allow `string`s'
    )

    t.deepEqual(
      sanitize(h('img', {alt: true})),
      h('img', {alt: true}),
      'should allow `boolean`s'
    )

    t.deepEqual(
      sanitize(h('img', {alt: 1})),
      h('img', {alt: 1}),
      'should allow `number`s'
    )

    t.deepEqual(
      sanitize(u('element', {tagName: 'img', properties: {alt: null}})),
      h('img'),
      'should ignore `null`'
    )

    t.deepEqual(
      sanitize(u('element', {tagName: 'img', properties: {alt: undefined}})),
      h('img'),
      'should ignore `undefined`'
    )

    t.deepEqual(
      sanitize(h('div', {id: 'getElementById'})),
      h('div', {id: 'user-content-getElementById'}),
      'should prevent clobbering (#1)'
    )

    t.deepEqual(
      sanitize(h('div', {name: 'getElementById'})),
      h('div', {name: 'user-content-getElementById'}),
      'should prevent clobbering (#2)'
    )

    t.deepEqual(
      sanitize(
        u('element', {tagName: 'img', properties: {alt: {toString: toString}}})
      ),
      h('img'),
      'should ignore objects'
    )

    t.deepEqual(
      sanitize(
        u('element', {
          tagName: 'img',
          properties: {alt: [1, true, 'three', [4], {toString: toString}]}
        })
      ),
      h('img', {alt: [1, true, 'three']}),
      'should supports arrays'
    )

    t.deepEqual(
      sanitize(s('svg', {viewBox: '0 0 50 50'}, '!')),
      u('text', '!'),
      'should ignore `svg` elements'
    )

    t.test('href`', function (t) {
      testAllURLs(t, 'a', 'href', {
        valid: {
          anchor: '#heading',
          relative: '/file.html',
          search: 'example.com?foo:bar',
          hash: 'example.com#foo:bar',
          'protocol-less': 'www.example.com',
          mailto: 'mailto:foo@bar.com',
          https: 'http://example.com',
          http: 'http://example.com'
        },
        invalid: {
          javascript: 'javascript:alert(1)',
          whitespace: ' javascript:while(1){}',
          'Unicode LS/PS I': '\u2028javascript:alert(1)',
          'Unicode Whitespace (#1)': ' javascript:alert(1)',
          'Unicode Whitespace (#2)': ' javascript:alert(1)',
          'infinity loop': 'javascript:while(1){}',
          'data URL': 'data:,evilnastystuff'
        }
      })

      t.end()
    })

    t.test('`cite`', function (t) {
      testAllURLs(t, 'blockquote', 'cite', {
        valid: {
          anchor: '#heading',
          relative: '/file.html',
          search: 'example.com?foo:bar',
          hash: 'example.com#foo:bar',
          'protocol-less': 'www.example.com',
          https: 'http://example.com',
          http: 'http://example.com'
        },
        invalid: {
          mailto: 'mailto:foo@bar.com',
          javascript: 'javascript:alert(1)',
          'Unicode LS/PS I': '\u2028javascript:alert(1)',
          'Unicode Whitespace (#1)': ' javascript:alert(1)',
          'Unicode Whitespace (#2)': ' javascript:alert(1)',
          'infinity loop': 'javascript:while(1){}',
          'data URL': 'data:,evilnastystuff'
        }
      })

      t.end()
    })

    t.test('`src`', function (t) {
      testAllURLs(t, 'img', 'src', {
        valid: {
          anchor: '#heading',
          relative: '/file.html',
          search: 'example.com?foo:bar',
          hash: 'example.com#foo:bar',
          'protocol-less': 'www.example.com',
          https: 'http://example.com',
          http: 'http://example.com'
        },
        invalid: {
          mailto: 'mailto:foo@bar.com',
          javascript: 'javascript:alert(1)',
          'Unicode LS/PS I': '\u2028javascript:alert(1)',
          'Unicode Whitespace (#1)': ' javascript:alert(1)',
          'Unicode Whitespace (#2)': ' javascript:alert(1)',
          'infinity loop': 'javascript:while(1){}',
          'data URL': 'data:,evilnastystuff'
        }
      })

      t.end()
    })

    t.test('`longDesc`', function (t) {
      testAllURLs(t, 'img', 'longDesc', {
        valid: {
          anchor: '#heading',
          relative: '/file.html',
          search: 'example.com?foo:bar',
          hash: 'example.com#foo:bar',
          'protocol-less': 'www.example.com',
          https: 'http://example.com',
          http: 'http://example.com'
        },
        invalid: {
          mailto: 'mailto:foo@bar.com',
          javascript: 'javascript:alert(1)',
          'Unicode LS/PS I': '\u2028javascript:alert(1)',
          'Unicode Whitespace (#1)': ' javascript:alert(1)',
          'Unicode Whitespace (#2)': ' javascript:alert(1)',
          'infinity loop': 'javascript:while(1){}',
          'data URL': 'data:,evilnastystuff'
        }
      })

      t.end()
    })

    t.test('`li`', function (t) {
      t.deepEqual(
        sanitize(h('li', 'alert(1)')),
        h('li', 'alert(1)'),
        'should allow `li` outside list'
      )

      t.deepEqual(
        sanitize(h('ol', h('li', 'alert(1)'))),
        h('ol', h('li', 'alert(1)')),
        'should allow `li` in `ol`'
      )

      t.deepEqual(
        sanitize(h('ul', h('li', 'alert(1)'))),
        h('ul', h('li', 'alert(1)')),
        'should allow `li` in `ul`'
      )

      t.deepEqual(
        sanitize(h('ol', h('div', h('li', 'alert(1)')))),
        h('ol', h('div', h('li', 'alert(1)'))),
        'should allow `li` descendant `ol`'
      )

      t.deepEqual(
        sanitize(h('ul', h('div', h('li', 'alert(1)')))),
        h('ul', h('div', h('li', 'alert(1)'))),
        'should allow `li` descendant `ul`'
      )

      t.end()
    })
    ;['tr', 'td', 'th', 'tbody', 'thead', 'tfoot'].forEach(function (name) {
      t.test('`' + name + '`', function (t) {
        t.deepEqual(
          sanitize(h(name, 'alert(1)')),
          u('text', 'alert(1)'),
          'should not allow `' + name + '` outside `table`'
        )

        t.deepEqual(
          sanitize(h('table', h(name, 'alert(1)'))),
          h('table', h(name, 'alert(1)')),
          'should allow `' + name + '` in `table`'
        )

        t.deepEqual(
          sanitize(h('table', h('div', h(name, 'alert(1)')))),
          h('table', h('div', h(name, 'alert(1)'))),
          'should allow `' + name + '` descendant `table`'
        )

        t.end()
      })
    })

    t.deepEqual(
      sanitize(h('input')),
      h('input', {type: 'checkbox', disabled: true}),
      'should allow only disabled checkbox inputs'
    )

    t.deepEqual(
      sanitize(h('input', {type: 'text'})),
      h('input', {type: 'checkbox', disabled: true}),
      'should not allow text inputs'
    )

    t.deepEqual(
      sanitize(h('input', {type: 'checkbox', disabled: false})),
      h('input', {type: 'checkbox', disabled: true}),
      'should not allow enabled inputs'
    )

    t.deepEqual(
      sanitize(h('ol', [h('li')])),
      h('ol', [h('li')]),
      'should allow list items'
    )

    t.deepEqual(
      sanitize(h('ol', [h('li', {className: ['foo', 'bar']})])),
      h('ol', [h('li', {className: []})]),
      'should not allow classes on list items'
    )

    t.deepEqual(
      sanitize(h('ol', [h('li', {className: ['foo', 'task-list-item']})])),
      h('ol', [h('li', {className: ['task-list-item']})]),
      'should only allow `task-list-item` as a class on list items'
    )

    t.deepEqual(
      sanitize(h('select')),
      u('root', []),
      'should ignore some elements by default'
    )

    t.deepEqual(
      sanitize(h('select'), merge(gh, {tagNames: ['select']})),
      h('select'),
      'should support allowing elements through the schema'
    )

    t.deepEqual(
      sanitize(
        h('select', {autoComplete: true}),
        merge(gh, {tagNames: ['select']})
      ),
      h('select'),
      'should ignore attributes for new elements'
    )

    t.deepEqual(
      sanitize(
        h('select', {autoComplete: true}),
        merge(gh, {
          tagNames: ['select'],
          attributes: {select: ['autoComplete']}
        })
      ),
      h('select', {autoComplete: true}),
      'should support allowing attributes for new elements through the schema'
    )

    t.deepEqual(
      sanitize(
        h('div', [h('select', {form: 'one'}), h('select', {form: 'two'})]),
        merge(gh, {
          tagNames: ['select'],
          attributes: {select: [['form', 'one']]}
        })
      ),
      h('div', [h('select', {form: 'one'}), h('select')]),
      'should support a list of valid values on new attributes'
    )

    t.deepEqual(
      sanitize(
        h('div', [
          h('select', {form: 'alpha'}),
          h('select', {form: 'bravo'}),
          h('select', {}),
          h('select', {form: false})
        ]),
        merge(gh, {
          tagNames: ['select'],
          attributes: {select: [['form', 'alpha']]},
          required: {select: {form: 'alpha'}}
        })
      ),
      h('div', [
        h('select', {form: 'alpha'}),
        h('select', {form: 'alpha'}),
        h('select', {form: 'alpha'}),
        h('select', {form: 'alpha'})
      ]),
      'should support required attributes'
    )

    t.deepEqual(
      sanitize(h('div', h('li', 'text')), {
        tagNames: ['div', 'ul', 'li'],
        ancestors: {li: ['ul']}
      }),
      h('div', 'text'),
      'should support `ancestors` to enforce certain ancestors (rehypejs/rehype-sanitize#8)'
    )

    t.end()
  })

  t.test('`root`', function (t) {
    t.deepEqual(
      sanitize({
        type: 'root',
        tagName: 'div',
        value: 'alert(1)',
        unknown: 'alert(1)',
        properties: {href: 'javascript:alert(1)'},
        children: [h('script', 'alert(1)')],
        data: {href: 'alert(1)'},
        position: {
          start: {line: 1, column: 1},
          end: {line: 2, column: 1}
        }
      }),
      {
        type: 'root',
        children: [],
        data: {href: 'alert(1)'},
        position: {
          start: {line: 1, column: 1},
          end: {line: 2, column: 1}
        }
      },
      'should allow known properties'
    )

    t.end()
  })

  t.end()
})

// Coverage.
toString()

// Check.
function toString() {
  return 'alert(1);'
}

// Test `valid` and `invalid` `url`s in `prop` on `tagName`.
function testAllURLs(t, tagName, prop, all) {
  testURLs(t, tagName, prop, all.valid, true)
  testURLs(t, tagName, prop, all.invalid, false)
}

// Test `valid` `url`s in `prop` on `tagName`.
function testURLs(t, tagName, prop, urls, valid) {
  Object.keys(urls).forEach(function (name) {
    var props = {}

    props[prop] = urls[name]

    t.deepEqual(
      sanitize(h(tagName, props)),
      h(tagName, valid ? props : {}),
      'should ' + (valid ? 'allow' : 'clean') + ' ' + name
    )
  })
}

/* eslint-enable no-script-url, max-params */
