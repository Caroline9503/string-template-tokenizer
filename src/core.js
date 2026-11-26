/**
 * Tokenizes ECMAScript template literal syntax without evaluating expressions.
 *
 * The tokenizer recognizes four token types:
 *   - 'chunk': literal text between substitutions
 *   - 'substitution': an expression inside ${...}
 *   - 'tag': a tag function applied to a template
 *   - 'template': a template literal (possibly tagged)
 *
 * It does not attempt to parse or validate the contents of substitutions beyond
 * balancing braces and respecting nested strings/templates. This keeps the
 * tokenizer small and predictable; callers that need full expression parsing
 * can feed the substitution's `value` to a real parser.
 */

/**
 * @typedef {Object} Token
 * @property {'chunk'|'substitution'|'tag'|'template'} type
 * @property {string} value - raw source text for this token
 * @property {Token[]} [tokens] - for 'template', the inner tokens
 */

/**
 * Scan a template literal starting at `start` (the index of the backtick).
 * @param {string} src
 * @param {number} start
 * @returns {{ token: Token, end: number }}
 */
function scanTemplate(src, start) {
  if (src[start] !== '`') {
    throw new Error(`Expected backtick at index ${start}`);
  }
  const tokens = [];
  let i = start + 1;
  let chunkStart = i;

  while (i < src.length) {
    const ch = src[i];

    if (ch === '\\') {
      // Skip the escaped character so that \` and \${ do not terminate the template.
      i += 2;
      continue;
    }

    if (ch === '`') {
      if (i > chunkStart) {
        tokens.push({ type: 'chunk', value: src.slice(chunkStart, i) });
      }
      return { token: { type: 'template', value: src.slice(start, i + 1), tokens }, end: i + 1 };
    }

    if (ch === '$' && src[i + 1] === '{') {
      if (i > chunkStart) {
        tokens.push({ type: 'chunk', value: src.slice(chunkStart, i) });
      }
      const subStart = i + 2;
      const { value: subValue, end: subEnd } = scanSubstitution(src, subStart);
      tokens.push({ type: 'substitution', value: subValue });
      i = subEnd;
      chunkStart = i;
      continue;
    }

    i += 1;
  }

  throw new Error('Unterminated template literal');
}

/**
 * Scan a substitution starting just after `${`. Returns the raw expression text
 * (without the `${` and `}`) and the index just past the closing `}`.
 *
 * We track brace depth and skip over nested strings and templates so that braces
 * inside those constructs do not confuse the depth counter.
 *
 * @param {string} src
 * @param {number} start
 * @returns {{ value: string, end: number }}
 */
function scanSubstitution(src, start) {
  let depth = 1;
  let i = start;
  const begin = start;

  while (i < src.length) {
    const ch = src[i];

    if (ch === '\\') {
      i += 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      i = skipString(src, i, ch);
      continue;
    }

    if (ch === '`') {
      const { end } = scanTemplate(src, i);
      i = end;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      i += 1;
      continue;
    }

    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return { value: src.slice(begin, i), end: i + 1 };
      }
      i += 1;
      continue;
    }

    i += 1;
  }

  throw new Error('Unterminated substitution');
}

/**
 * Skip a single- or double-quoted string starting at `start` (index of the quote).
 * Returns the index just past the closing quote.
 * @param {string} src
 * @param {number} start
 * @param {string} quote
 * @returns {number}
 */
function skipString(src, start, quote) {
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === quote) {
      return i + 1;
    }
    i += 1;
  }
  throw new Error('Unterminated string in substitution');
}

/**
 * Tokenize a source string containing template literals and surrounding code.
 *
 * The returned array contains a 'template' token for every template literal
 * found, plus a 'tag' token for each identifier immediately preceding a
 * template literal (with optional whitespace). Non-template code is not
 * returned as tokens; callers that need it can use the `end` offsets.
 *
 * @param {string} source
 * @returns {Token[]}
 */
export function tokenize(source) {
  const tokens = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (ch === '`') {
      const { token, end } = scanTemplate(source, i);
      tokens.push(token);
      i = end;
      continue;
    }

    // Tag function detection: an identifier followed by optional whitespace
    // and a backtick. We only look back a bounded distance to keep this linear
    // and avoid misclassifying property accesses like `foo.bar` as tags.
    if (isIdentifierStart(ch)) {
      const identStart = i;
      i += 1;
      while (i < source.length && isIdentifierPart(source[i])) {
        i += 1;
      }
      const ident = source.slice(identStart, i);

      // Skip whitespace between the identifier and a possible backtick.
      let j = i;
      while (j < source.length && isWhitespace(source[j])) {
        j += 1;
      }

      if (source[j] === '`') {
        tokens.push({ type: 'tag', value: ident });
        const { token, end } = scanTemplate(source, j);
        tokens.push(token);
        i = end;
        continue;
      }

      // Not a tag; keep scanning after the identifier.
      continue;
    }

    i += 1;
  }

  return tokens;
}

function isIdentifierStart(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
}

function isIdentifierPart(ch) {
  return isIdentifierStart(ch) || (ch >= '0' && ch <= '9');
}

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}
