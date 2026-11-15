// What counts as a hashtag. The frontend has a copy of this rule in
// apps/frontend/src/features/quack/lib/hashtags.ts (it turns the same words
// into links) with the same test cases; change both together.
//
// "#" followed by letters (any language, so "#čeština" works), digits and "_",
// with at least one letter, so "#1" stays a number. A "#" glued to a word, to
// another "#" or to a "/" is not one: "a#b", "##x", "example.com/#top".
const HASHTAG_PATTERN = /(?<![\p{L}\p{N}\p{M}_#/])#([\p{L}\p{N}\p{M}_]+)/gu;
const HAS_LETTER = /\p{L}/u;

// A ?tag= filter: one hashtag, "vse" or "#vse".
export const HASHTAG_FILTER_PATTERN = /^#?[\p{L}\p{N}\p{M}_]+$/u;

// "#VSE" and "#vse" are the same tag. NFC first, so an "é" typed as "e" plus an
// accent (as some keyboards do) is stored like everyone else's "é".
// Accents still matter: "#vse" and "#vše" are two different tags.
export const normalizeHashtag = (tag: string): string =>
  tag.normalize('NFC').toLowerCase();

// The quack's hashtags, normalized, each once, in the order they first appear.
export const extractHashtags = (text: string): string[] => {
  const tags = [...text.normalize('NFC').matchAll(HASHTAG_PATTERN)]
    .map((match) => match[1])
    .filter((tag) => HAS_LETTER.test(tag))
    .map(normalizeHashtag);
  return [...new Set(tags)];
};
