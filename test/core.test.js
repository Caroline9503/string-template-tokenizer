import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../src/index.js';

test('plain template with no substitutions', () => {
  const tokens = tokenize('`hello`');
  assert.deepEqual(tokens, [
    { type: 'template', value: '`hello`', tokens: [{ type: 'chunk', value: 'hello' }] },
  ]);
});

test('template with one substitution', () => {
  const tokens = tokenize('`a${x}b`');
  assert.deepEqual(tokens, [
    {
      type: 'template',
      value: '`a${x}b`',
      tokens: [
        { type: 'chunk', value: 'a' },
        { type: 'substitution', value: 'x' },
        { type: 'chunk', value: 'b' },
      ],
    },
  ]);
});

test('nested braces inside substitution', () => {
  const tokens = tokenize('`${ {a:1} }`');
  assert.deepEqual(tokens, [
    {
      type: 'template',
      value: '`${ {a:1} }`',
      tokens: [{ type: 'substitution', value: ' {a:1} ' }],
    },
  ]);
});

test('string containing closing brace inside substitution', () => {
  const tokens = tokenize('`${"}"}`');
  assert.deepEqual(tokens, [
    {
      type: 'template',
      value: '`${"}"}`',
      tokens: [{ type: 'substitution', value: '"}"' }],
    },
  ]);
});

test('escaped backtick does not terminate template', () => {
  const tokens = tokenize('`a\\`b`');
  assert.deepEqual(tokens, [
    {
      type: 'template',
      value: '`a\\`b`',
      tokens: [{ type: 'chunk', value: 'a\\`b' }],
    },
  ]);
});

test('escaped dollar-brace is literal text', () => {
  const tokens = tokenize('`a\\${b}c`');
  assert.deepEqual(tokens, [
    {
      type: 'template',
      value: '`a\\${b}c`',
      tokens: [{ type: 'chunk', value: 'a\\${b}c' }],
    },
  ]);
});

test('tag function detection', () => {
  const tokens = tokenize('tag`hi`');
  assert.deepEqual(tokens, [
    { type: 'tag', value: 'tag' },
    { type: 'template', value: '`hi`', tokens: [{ type: 'chunk', value: 'hi' }] },
  ]);
});

test('tag with whitespace before template', () => {
  const tokens = tokenize('tag   `hi`');
  assert.deepEqual(tokens, [
    { type: 'tag', value: 'tag' },
    { type: 'template', value: '`hi`', tokens: [{ type: 'chunk', value: 'hi' }] },
  ]);
});

test('identifier that is not a tag is ignored', () => {
  const tokens = tokenize('foo bar`baz`');
  assert.deepEqual(tokens, [
    { type: 'tag', value: 'bar' },
    { type: 'template', value: '`baz`', tokens: [{ type: 'chunk', value: 'baz' }] },
  ]);
});

test('multiple templates in one source', () => {
  const tokens = tokenize('`a` + `b`');
  assert.deepEqual(tokens, [
    { type: 'template', value: '`a`', tokens: [{ type: 'chunk', value: 'a' }] },
    { type: 'template', value: '`b`', tokens: [{ type: 'chunk', value: 'b' }] },
  ]);
});

test('nested template inside substitution', () => {
  const tokens = tokenize('`${`inner`}`');
  assert.deepEqual(tokens, [
    {
      type: 'template',
      value: '`${`inner`}`',
      tokens: [
        {
          type: 'substitution',
          value: '`inner`',
        },
      ],
    },
  ]);
});

test('unterminated template throws', () => {
  assert.throws(() => tokenize('`abc'), /Unterminated template literal/);
});

test('unterminated substitution throws', () => {
  assert.throws(() => tokenize('`${x`'), /Unterminated template literal/);
});

test('unterminated string in substitution throws', () => {
  assert.throws(() => tokenize('`${"abc}`'), /Unterminated string in substitution/);
});
