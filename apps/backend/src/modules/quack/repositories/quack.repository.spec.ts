import { escapeLikePattern } from './quack.repository';

describe('escapeLikePattern', () => {
  it.each([
    ['duck', 'duck'],
    ['100%', '100\\%'],
    ['snake_case', 'snake\\_case'],
    ['back\\slash', 'back\\\\slash'],
  ])('escapes %j as %j', (input, expected) => {
    expect(escapeLikePattern(input)).toBe(expected);
  });
});
