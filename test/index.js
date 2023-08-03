import assert from 'node:assert/strict'
import test from 'node:test'
import deepmerge from 'deepmerge'
import {h, s} from 'hastscript'
import {toHtml} from 'hast-util-to-html'
import {u} from 'unist-builder'
import {defaultSchema, sanitize} from '../index.js'

const own = {}.hasOwnProperty

test('sanitize()', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('../index.js')).sort(), [
      'defaultSchema',
      'sanitize'
    ])
  })

  await t.test('should ignore non-nodes (#1)', async function () {
    assert.equal(
      toHtml(
        // @ts-expect-error: check how a non-node is handled.
        sanitize(true)
      ),
      ''
    )
  })

  await t.test('should ignore non-nodes (#2)', async function () {
    assert.equal(
      toHtml(
        // @ts-expect-error: check how a non-node is handled.
        sanitize(undefined)
      ),
      ''
    )
  })

  await t.test('should ignore non-nodes (#3)', async function () {
    assert.equal(
      toHtml(
        // @ts-expect-error: check how a non-node is handled.
        sanitize({type: 1})
      ),
      ''
    )
  })

  await t.test('should ignore unknown nodes', async function () {
    assert.equal(
      toHtml(
        // @ts-expect-error: remove when `hast-util-to-html` updates.
        sanitize(
          // @ts-expect-error: check how an unknown node is
          u('unknown', '<xml></xml>')
        )
      ),
      ''
    )
  })
})

test('`comment`', async function (t) {
  await t.test('should ignore `comment`s by default', async function () {
    assert.equal(
      toHtml(
        // @ts-expect-error: remove when `hast-util-to-html` updates.
        sanitize(u('comment', 'alpha'))
      ),
      ''
    )
  })

  await t.test(
    'should allow `comment`s with `allowComments: true`',
    async function () {
      assert.equal(
        toHtml(
          // @ts-expect-error: remove when `hast-util-to-html` updates.
          sanitize(u('comment', 'alpha'), {allowComments: true})
        ),
        '<!--alpha-->'
      )
    }
  )

  await t.test(
    'should ignore non-string `value`s with `allowComments: true`',
    async function () {
      assert.equal(
        toHtml(
          // @ts-expect-error: check how non-string `value` is handled.
          sanitize({type: 'comment', value: {toString}}, {allowComments: true})
        ),
        '<!---->'
      )
    }
  )

  await t.test(
    'should not break out of comments with `allowComments: true`',
    async function () {
      assert.equal(
        toHtml(
          // @ts-expect-error: remove when `hast-util-to-html` updates.
          sanitize(u('comment', 'alpha--><script>alert(1)</script><!--bravo'), {
            allowComments: true
          })
        ),
        '<!--alpha-->'
      )
    }
  )
})

test('`doctype`', async function (t) {
  await t.test('should ignore `doctype`s by default', async function () {
    assert.equal(
      // @ts-expect-error: remove when `hast-util-to-html` updates.
      toHtml(sanitize(u('doctype', {name: 'html'}, 'alpha'))),
      ''
    )
  })

  await t.test(
    'should allow `doctype`s with `allowDoctypes: true`',
    async function () {
      assert.equal(
        toHtml(
          // @ts-expect-error: remove when `hast-util-to-html` updates.
          sanitize(u('doctype', {name: 'html'}, 'alpha'), {
            allowDoctypes: true
          })
        ),
        '<!doctype html>'
      )
    }
  )
})

test('`text`', async function (t) {
  await t.test('should allow known properties', async function () {
    assert.deepEqual(
      sanitize({
        type: 'text',
        // @ts-expect-error: check how unknown properties on `text` are handled.
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
          start: {line: 1, column: 1, offset: undefined},
          end: {line: 2, column: 1, offset: undefined}
        }
      }
    )
  })

  await t.test('should allow `text`', async function () {
    assert.equal(
      // @ts-expect-error: remove when `hast-util-to-html` updates.
      toHtml(sanitize(u('text', 'alert(1)'))),
      'alert(1)'
    )
  })

  await t.test('should ignore non-string `value`s', async function () {
    assert.equal(
      // @ts-expect-error: check how non-string `value` is handled.
      toHtml(sanitize({type: 'text', value: {toString}})),
      ''
    )
  })

  await t.test('should ignore `text` in `script` elements', async function () {
    assert.equal(
      toHtml(
        // @ts-expect-error: remove when `hast-util-to-html` updates.
        sanitize(h('script', u('text', 'alert(1)')))
      ),
      ''
    )
  })

  await t.test('should show `text` in `style` elements', async function () {
    assert.equal(
      toHtml(
        // @ts-expect-error: remove when `hast-util-to-html` updates.
        sanitize(h('style', u('text', 'alert(1)')))
      ),
      'alert(1)'
    )
  })
})

test('`element`', async function (t) {
  await t.test('should allow known properties', async function () {
    assert.deepEqual(
      sanitize({
        type: 'element',
        tagName: 'div',
        // @ts-expect-error: check how unknown properties are handled.
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
          start: {line: 1, column: 1, offset: undefined},
          end: {line: 2, column: 1, offset: undefined}
        }
      }
    )
  })

  await t.test('should ignore unknown elements', async function () {
    assert.deepEqual(
      sanitize(h('unknown', u('text', 'alert(1)'))),
      u('text', 'alert(1)')
    )
  })

  await t.test('should ignore elements without name', async function () {
    assert.deepEqual(
      sanitize(
        // @ts-expect-error: check how missing `tagName` is handled.
        {
          type: 'element',
          properties: {},
          children: [u('text', 'alert(1)')]
        }
      ),
      u('text', 'alert(1)')
    )
  })

  await t.test(
    'should support elements without children / properties',
    async function () {
      assert.deepEqual(
        sanitize(
          // @ts-expect-error: check how missing `children`, `properties` is handled.
          {type: 'element', tagName: 'div'}
        ),
        h('')
      )
    }
  )

  await t.test('should always return a valid node (#1)', async function () {
    assert.deepEqual(sanitize(h('unknown', [])), u('root', []))
  })

  await t.test('should always return a valid node (#2)', async function () {
    assert.deepEqual(sanitize(h('script', [])), u('root', []))
  })

  await t.test('should always return a valid node (#3)', async function () {
    assert.deepEqual(
      sanitize(h('div', h('style', [u('text', '1'), u('text', '2')]))),
      h('div', [u('text', '1'), u('text', '2')])
    )
  })

  await t.test('should always return a valid node (#4)', async function () {
    assert.deepEqual(
      sanitize(h('unknown', [u('text', 'value')])),
      u('text', 'value')
    )
  })

  await t.test('should always return a valid node (#5)', async function () {
    assert.deepEqual(
      sanitize(h('unknown', [u('text', '1'), u('text', '2')])),
      u('root', [u('text', '1'), u('text', '2')])
    )
  })

  await t.test('should allow known generic properties', async function () {
    assert.deepEqual(
      sanitize(h('div', {alt: 'alpha'})),
      h('div', {alt: 'alpha'})
    )
  })

  await t.test('should allow specific properties', async function () {
    assert.deepEqual(
      sanitize(h('a', {href: '#heading'})),
      h('a', {href: '#heading'})
    )
  })

  await t.test(
    'should ignore mismatched specific properties',
    async function () {
      assert.deepEqual(sanitize(h('img', {href: '#heading'})), h('img'))
    }
  )

  await t.test('should ignore unspecified properties', async function () {
    assert.deepEqual(sanitize(h('div', {dataFoo: 'bar'})), h('div'))
  })

  await t.test('should ignore unspecified properties', async function () {
    assert.deepEqual(sanitize(h('div', {dataFoo: 'bar'})), h('div'))
  })

  await t.test('should allow `data*`', async function () {
    assert.deepEqual(
      sanitize(
        h('div', {dataFoo: 'bar'}),
        deepmerge(defaultSchema, {attributes: {'*': ['data*']}})
      ),
      h('div', {dataFoo: 'bar'})
    )
  })

  await t.test('should allow `string`s', async function () {
    assert.deepEqual(
      sanitize(h('img', {alt: 'hello'})),
      h('img', {alt: 'hello'})
    )
  })

  await t.test('should allow `boolean`s', async function () {
    assert.deepEqual(sanitize(h('img', {alt: true})), h('img', {alt: true}))
  })

  await t.test('should allow `number`s', async function () {
    assert.deepEqual(sanitize(h('img', {alt: 1})), h('img', {alt: 1}))
  })

  await t.test('should ignore `null`', async function () {
    assert.deepEqual(
      sanitize({
        type: 'element',
        tagName: 'img',
        properties: {alt: null},
        children: []
      }),
      h('img')
    )
  })

  await t.test('should ignore `undefined`', async function () {
    assert.deepEqual(
      sanitize({
        type: 'element',
        tagName: 'img',
        properties: {alt: undefined},
        children: []
      }),
      h('img')
    )
  })

  await t.test('should prevent clobbering (#1)', async function () {
    assert.deepEqual(
      sanitize(h('div', {id: 'getElementById'})),
      h('div', {id: 'user-content-getElementById'})
    )
  })

  await t.test('should prevent clobbering (#2)', async function () {
    assert.deepEqual(
      sanitize(h('div', {name: 'getElementById'})),
      h('div', {name: 'user-content-getElementById'})
    )
  })

  await t.test('should ignore objects', async function () {
    assert.deepEqual(
      sanitize({
        type: 'element',
        tagName: 'img',
        properties: {
          // @ts-expect-error: check how non-string property value is handled.
          alt: {toString}
        },
        children: []
      }),
      h('img')
    )
  })

  await t.test('should supports arrays', async function () {
    assert.deepEqual(
      sanitize({
        type: 'element',
        tagName: 'img',
        properties: {
          // @ts-expect-error: check how non-string values are handled.
          alt: [1, true, 'three', [4], {toString}]
        },
        children: []
      }),
      h('img', {alt: [1, 'three']})
    )
  })

  await t.test('should ignore `svg` elements', async function () {
    assert.deepEqual(
      sanitize(s('svg', {viewBox: '0 0 50 50'}, '!')),
      u('text', '!')
    )
  })

  await t.test('should support `href`', async function () {
    testAllUrls('a', 'href', {
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
  })

  await t.test('should support `cite`', async function () {
    testAllUrls('blockquote', 'cite', {
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
  })

  await t.test('should support `src`', async function () {
    testAllUrls('img', 'src', {
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
  })

  await t.test('should support `longDesc`', async function () {
    testAllUrls('img', 'longDesc', {
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
  })

  await t.test('should allow `li` outside list', async function () {
    assert.deepEqual(sanitize(h('li', 'alert(1)')), h('li', 'alert(1)'))
  })

  await t.test('should allow `li` in `ol`', async function () {
    assert.deepEqual(
      sanitize(h('ol', h('li', 'alert(1)'))),
      h('ol', h('li', 'alert(1)'))
    )
  })

  await t.test('should allow `li` in `ul`', async function () {
    assert.deepEqual(
      sanitize(h('ul', h('li', 'alert(1)'))),
      h('ul', h('li', 'alert(1)'))
    )
  })

  await t.test('should allow `li` descendant `ol`', async function () {
    assert.deepEqual(
      sanitize(h('ol', h('div', h('li', 'alert(1)')))),
      h('ol', h('div', h('li', 'alert(1)')))
    )
  })

  await t.test('should allow `li` descendant `ul`', async function () {
    assert.deepEqual(
      sanitize(h('ul', h('div', h('li', 'alert(1)')))),
      h('ul', h('div', h('li', 'alert(1)')))
    )
  })

  const tableNames = ['tr', 'td', 'th', 'tbody', 'thead', 'tfoot']
  let index = -1

  while (++index < tableNames.length) {
    const name = tableNames[index]

    await t.test(
      'should not allow `' + name + '` outside `table`',
      async function () {
        assert.deepEqual(sanitize(h(name, 'alert(1)')), u('text', 'alert(1)'))
      }
    )

    await t.test('should allow `' + name + '` in `table`', async function () {
      assert.deepEqual(
        sanitize(h('table', h(name, 'alert(1)'))),
        h('table', h(name, 'alert(1)'))
      )
    })

    await t.test(
      'should allow `' + name + '` descendant `table`',
      async function () {
        assert.deepEqual(
          sanitize(h('table', h('div', h(name, 'alert(1)')))),
          h('table', h('div', h(name, 'alert(1)')))
        )
      }
    )
  }

  await t.test('should allow only disabled checkbox inputs', async function () {
    assert.deepEqual(
      sanitize(h('input')),
      h('input', {type: 'checkbox', disabled: true})
    )
  })

  await t.test('should not allow text inputs', async function () {
    assert.deepEqual(
      sanitize(h('input', {type: 'text'})),
      h('input', {type: 'checkbox', disabled: true})
    )
  })

  await t.test('should not allow enabled inputs', async function () {
    assert.deepEqual(
      sanitize(h('input', {type: 'checkbox', disabled: false})),
      h('input', {type: 'checkbox', disabled: true})
    )
  })

  await t.test('should allow list items', async function () {
    assert.deepEqual(sanitize(h('ol', [h('li')])), h('ol', [h('li')]))
  })

  await t.test('should not allow classes on list items', async function () {
    assert.deepEqual(
      sanitize(h('ol', [h('li', {className: ['foo', 'bar']})])),
      h('ol', [h('li', {className: []})])
    )
  })

  await t.test(
    'should only allow `task-list-item` as a class on list items',
    async function () {
      assert.deepEqual(
        sanitize(h('ol', [h('li', {className: ['foo', 'task-list-item']})])),
        h('ol', [h('li', {className: ['task-list-item']})])
      )
    }
  )

  await t.test('should ignore some elements by default', async function () {
    assert.deepEqual(sanitize(h('select')), u('root', []))
  })

  await t.test(
    'should support allowing elements through the schema',
    async function () {
      assert.deepEqual(
        sanitize(h('select'), deepmerge(defaultSchema, {tagNames: ['select']})),
        h('select')
      )
    }
  )

  await t.test('should ignore attributes for new elements', async function () {
    assert.deepEqual(
      sanitize(
        h('select', {autoComplete: true}),
        deepmerge(defaultSchema, {tagNames: ['select']})
      ),
      h('select')
    )
  })

  await t.test(
    'should support allowing attributes for new elements through the schema',
    async function () {
      assert.deepEqual(
        sanitize(
          h('select', {autoComplete: true}),
          deepmerge(defaultSchema, {
            tagNames: ['select'],
            attributes: {select: ['autoComplete']}
          })
        ),
        h('select', {autoComplete: true})
      )
    }
  )

  await t.test(
    'should support a list of valid values on new attributes',
    async function () {
      assert.deepEqual(
        sanitize(
          h('div', [h('select', {form: 'one'}), h('select', {form: 'two'})]),
          deepmerge(defaultSchema, {
            tagNames: ['select'],
            attributes: {select: [['form', 'one']]}
          })
        ),
        h('div', [h('select', {form: 'one'}), h('select')])
      )
    }
  )

  await t.test(
    'should support RegExp in the list of valid values',
    async function () {
      assert.deepEqual(
        sanitize(
          h('div', [
            h('span', {className: 'a-one'}),
            h('span', {className: 'a-two'}),
            h('span', {className: 'b-one'}),
            h('span', {className: 'b-two'}),
            h('span', {className: 'a-one a-two b-one b-two'})
          ]),
          deepmerge(defaultSchema, {
            tagNames: ['span'],
            attributes: {span: [['className', /^a-/, 'b-one']]}
          })
        ),
        h('div', [
          h('span', {className: 'a-one'}),
          h('span', {className: 'a-two'}),
          h('span', {className: 'b-one'}),
          h('span', {className: []}),
          h('span', {className: 'a-one a-two b-one'})
        ])
      )
    }
  )

  await t.test(
    'should not support allowing *all* attributes',
    async function () {
      assert.deepEqual(
        sanitize(h('img', {title: true}), {
          tagNames: ['img'],
          attributes: undefined
        }),
        h('img')
      )
    }
  )

  await t.test('should support required attributes', async function () {
    assert.deepEqual(
      sanitize(
        h('div', [
          h('select', {form: 'alpha'}),
          h('select', {form: 'bravo'}),
          h('select', {}),
          h('select', {form: false})
        ]),
        deepmerge(defaultSchema, {
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
      ])
    )
  })

  await t.test('should support not setting `required`', async function () {
    assert.deepEqual(
      sanitize(h('input', {checked: true}), {
        tagNames: ['input'],
        required: undefined
      }),
      h('input', {checked: true})
    )
  })

  await t.test(
    'should support `ancestors` to enforce certain ancestors (rehypejs/rehype-sanitize#8)',
    async function () {
      assert.deepEqual(
        sanitize(h('div', h('li', 'text')), {
          tagNames: ['div', 'ul', 'li'],
          ancestors: {li: ['ul']}
        }),
        h('div', 'text')
      )
    }
  )
})

test('`root`', async function (t) {
  await t.test('should allow known properties', async function () {
    assert.deepEqual(
      sanitize({
        type: 'root',
        // @ts-expect-error: check how unknown properties are handled.
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
          start: {line: 1, column: 1, offset: undefined},
          end: {line: 2, column: 1, offset: undefined}
        }
      }
    )
  })

  await t.test(
    'should support `ancestors` to enforce certain ancestors in a `root` (rehypejs/rehype-sanitize#8)',
    async function () {
      assert.deepEqual(
        sanitize(u('root', [h('div', h('li', 'text'))]), {
          tagNames: ['div', 'ul', 'li'],
          ancestors: {li: ['ul']}
        }),
        u('root', [h('div', 'text')])
      )
    }
  )
})

// Simple value to see if `toString` is called.
// Check.
function toString() {
  return 'alert(1);'
}

/**
 * Test `valid` and `invalid` `url`s in `prop` on `tagName`.
 *
 * @param {string} tagName
 * @param {string} prop
 * @param {{valid: Record<string, string>, invalid: Record<string, string>}} all
 */
function testAllUrls(tagName, prop, all) {
  testUrls(tagName, prop, all.valid, true)
  testUrls(tagName, prop, all.invalid, false)
}

/**
 * Test `valid` `url`s in `prop` on `tagName`.
 *
 * @param {string} tagName
 * @param {string} prop
 * @param {Record<string, string>} urls
 * @param {boolean} valid
 */
function testUrls(tagName, prop, urls, valid) {
  /** @type {string} */
  let name

  for (name in urls) {
    if (own.call(urls, name)) {
      const props = {[prop]: urls[name]}

      assert.deepEqual(
        sanitize(h(tagName, props)),
        h(tagName, valid ? props : {}),
        'should ' + (valid ? 'allow' : 'clean') + ' ' + name
      )
    }
  }
}
