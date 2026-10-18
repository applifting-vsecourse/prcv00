import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateQuackDto } from './create-quack.dto';

const errorsFor = async (payload: object): Promise<ValidationError[]> =>
  validate(plainToInstance(CreateQuackDto, payload));

describe('CreateQuackDto', () => {
  it('accepts a quack without a mood', async () => {
    await expect(errorsFor({ text: 'hello' })).resolves.toHaveLength(0);
    await expect(
      errorsFor({ text: 'hello', mood: null }),
    ).resolves.toHaveLength(0);
  });

  it.each(['happy', 'sad', 'angry', 'silly'])(
    'accepts the "%s" mood',
    async (mood) => {
      await expect(errorsFor({ text: 'hello', mood })).resolves.toHaveLength(0);
    },
  );

  it('rejects an unknown mood', async () => {
    const errors = await errorsFor({ text: 'hello', mood: 'grumpy' });
    expect(errors.map((e) => e.property)).toEqual(['mood']);
  });

  describe('poll', () => {
    const withOptions = (options: unknown): Promise<ValidationError[]> =>
      errorsFor({ text: 'Lunch?', poll: { options } });

    it('accepts a quack without a poll', async () => {
      await expect(errorsFor({ text: 'hi', poll: null })).resolves.toEqual([]);
    });

    it.each([
      ['2 answers', ['Pizza', 'Sushi']],
      ['6 answers', ['a', 'b', 'c', 'd', 'e', 'f']],
      ['a 50-character answer', ['a'.repeat(50), 'b']],
    ])('accepts %s', async (_label, options) => {
      await expect(withOptions(options)).resolves.toHaveLength(0);
    });

    it.each([
      ['1 answer', ['Pizza']],
      ['7 answers', ['a', 'b', 'c', 'd', 'e', 'f', 'g']],
      ['a 51-character answer', ['a'.repeat(51), 'b']],
      ['an empty answer', ['Pizza', '']],
      ['an answer of only spaces', ['Pizza', '   ']],
      ['the same answer twice', ['Pizza', 'Sushi', 'Pizza']],
      ['answers that differ only in capitals and spaces', ['Pizza', 'pizza ']],
      ['something that is not a list', 'Pizza'],
    ])('refuses %s', async (_label, options) => {
      const errors = await withOptions(options);
      expect(errors.map((e) => e.property)).toEqual(['poll']);
    });

    it('trims answers before storing them', async () => {
      const dto = plainToInstance(CreateQuackDto, {
        text: 'Lunch?',
        poll: { options: ['  Pizza ', 'Sushi'] },
      });
      await expect(validate(dto)).resolves.toHaveLength(0);
      expect(dto.poll?.options).toEqual(['Pizza', 'Sushi']);
    });
  });
});
