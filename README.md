# string-template-tokenizer

Tokenizes ECMAScript template literal syntax, including substitutions and tag functions, without evaluating the expressions.

```js
import { tokenize } from 'string-template-tokenizer';

const tokens = tokenize('tag`a${x}b`');
// [
//   { type: 'tag', value: 'tag' },
//   {
//     type: 'template',
//     value: '`a${x}b`',
//     tokens: [
//       { type: 'chunk', value: 'a' },
//       { type: 'substitution', value: 'x' },
//       { type: 'chunk', value: 'b' },
//     ],
//   },
// ]
```

The exported function is `tokenize(source: string): Token[]`.

A `Token` is one of:

- `{ type: 'chunk', value: string }`
- `{ type: 'substitution', value: string }`
- `{ type: 'tag', value: string }`
- `{ type: 'template', value: string, tokens: Token[] }`

## Why this exists

Template literals are easy to find with a regular expression until they contain
nested braces, strings, or other template literals. This library walks the
source once, tracking brace depth and skipping over quoted strings and nested
templates, so a substitution like `` `${ {a: "}"} }` `` is captured whole.

The trade-off: this is a tokenizer, not a parser. It does not validate the
JavaScript inside a substitution, and it does not return tokens for the
surrounding non-template code. If you need a full AST, use a real parser.

## The awkward edge

Escaped characters are passed through verbatim. A backslash before a backtick
or before `${` prevents the template from ending or substituting, but the
backslash stays in the `chunk` value. This matches the raw source text, which
is what a formatter or syntax highlighter usually wants.
