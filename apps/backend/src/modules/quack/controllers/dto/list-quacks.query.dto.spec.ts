import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ListQuacksQueryDto } from './list-quacks.query.dto';

const parse = async (
  query: Record<string, unknown>,
): Promise<{ dto: ListQuacksQueryDto; errors: ValidationError[] }> => {
  const dto = plainToInstance(ListQuacksQueryDto, query);
  return { dto, errors: await validate(dto) };
};

describe('ListQuacksQueryDto', () => {
  it('allows no search term', async () => {
    const { errors } = await parse({});
    expect(errors).toHaveLength(0);
  });

  it('trims the search term', async () => {
    const { dto, errors } = await parse({ q: '  duck  ' });
    expect(errors).toHaveLength(0);
    expect(dto.q).toBe('duck');
  });

  it('accepts 100 characters, counted after trimming', async () => {
    const { errors } = await parse({ q: `  ${'a'.repeat(100)}  ` });
    expect(errors).toHaveLength(0);
  });

  it('rejects more than 100 characters', async () => {
    const { errors } = await parse({ q: 'a'.repeat(101) });
    expect(errors).toHaveLength(1);
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('reads mine=%s as %s', async (input, expected) => {
    const { dto, errors } = await parse({ mine: input });
    expect(errors).toHaveLength(0);
    expect(dto.mine).toBe(expected);
  });

  it.each(['yes', '1', ''])('rejects mine=%j', async (input) => {
    const { errors } = await parse({ mine: input });
    expect(errors).toHaveLength(1);
  });

  describe('tag', () => {
    it.each(['vse', '#vse', 'VSE', 'čeština', 'snake_case', '2026vse'])(
      'accepts tag=%j',
      async (input) => {
        const { dto, errors } = await parse({ tag: input });
        expect(errors).toHaveLength(0);
        expect(dto.tag).toBe(input);
      },
    );

    it('trims the tag', async () => {
      const { dto, errors } = await parse({ tag: '  vse ' });
      expect(errors).toHaveLength(0);
      expect(dto.tag).toBe('vse');
    });

    it.each(['', '   '])('treats tag=%j as no filter', async (input) => {
      const { dto, errors } = await parse({ tag: input });
      expect(errors).toHaveLength(0);
      expect(dto.tag).toBeUndefined();
    });

    it.each(['two words', '##vse', 'vse#', '#', '%', 'a-b', 'a'.repeat(101)])(
      'rejects tag=%j',
      async (input) => {
        const { errors } = await parse({ tag: input });
        expect(errors.map((e) => e.property)).toEqual(['tag']);
      },
    );
  });
});
