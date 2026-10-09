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
});
