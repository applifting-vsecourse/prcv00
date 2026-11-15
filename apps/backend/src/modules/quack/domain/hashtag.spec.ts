// The frontend's hashtags.test.ts runs the same cases against its copy of the
// rule. Add a case to both.
import { extractHashtags, normalizeHashtag } from './hashtag';

describe('extractHashtags', () => {
  it.each([
    ['no hashtag here', []],
    ['#vse', ['vse']],
    ['Ahoj #vse!', ['vse']],
    ['#vse, #pond.', ['vse', 'pond']],
    ['(#vse)', ['vse']],
    ['line one\n#vse', ['vse']],
    ['#snake_case', ['snake_case']],
    ['#VSE and #vse', ['vse']],
    ['#b then #a then #b', ['b', 'a']],
    ['#čeština #Žluťoučký', ['čeština', 'žluťoučký']],
    ['#vše #vse', ['vše', 'vse']],
    ['#2026vse', ['2026vse']],
    ['#1 and #2026', []],
    ['#', []],
    ['# vse', []],
    ['a#b', []],
    ['##vse', []],
    ['example.com/#top', []],
    ['#vse-a', ['vse']],
  ])('finds the hashtags in %j', (text, expected) => {
    expect(extractHashtags(text)).toEqual(expected);
  });

  it('treats a decomposed accent like a composed one', () => {
    // "é" written as "e" + combining acute accent
    expect(extractHashtags('#café')).toEqual(['café']);
  });
});

describe('normalizeHashtag', () => {
  it('lowercases and composes accents', () => {
    expect(normalizeHashtag('CAFÉ')).toBe('café');
  });
});
