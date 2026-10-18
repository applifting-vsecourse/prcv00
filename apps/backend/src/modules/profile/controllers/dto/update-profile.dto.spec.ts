import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

const valid = {
  username: 'CaffeinatedDuck',
  name: 'Caffeinated Duck',
  bio: null,
  defaultQuackMood: null,
};

const parse = async (
  payload: object,
): Promise<{ dto: UpdateProfileDto; errors: ValidationError[] }> => {
  const dto = plainToInstance(UpdateProfileDto, { ...valid, ...payload });
  return { dto, errors: await validate(dto) };
};

const failingFields = async (payload: object): Promise<string[]> =>
  (await parse(payload)).errors.map((e) => e.property);

describe('UpdateProfileDto', () => {
  it('accepts a complete profile', async () => {
    await expect(failingFields({})).resolves.toEqual([]);
  });

  it.each(['abc', 'a'.repeat(30), 'duck.of_pond', 'Duck42'])(
    'accepts the username %j',
    async (username) => {
      await expect(failingFields({ username })).resolves.toEqual([]);
    },
  );

  it.each([
    'ab',
    'a'.repeat(31),
    'duck pond',
    'duck-pond',
    'kachna_ž',
    '@duck',
  ])('rejects the username %j', async (username) => {
    await expect(failingFields({ username })).resolves.toEqual(['username']);
  });

  it('trims the username before checking it', async () => {
    const { dto, errors } = await parse({ username: '  duck  ' });
    expect(errors).toHaveLength(0);
    expect(dto.username).toBe('duck');
  });

  it.each(['', '   '])('requires a display name (%j)', async (name) => {
    await expect(failingFields({ name })).resolves.toEqual(['name']);
  });

  it('accepts a bio of 160 characters and rejects 161', async () => {
    await expect(failingFields({ bio: 'a'.repeat(160) })).resolves.toEqual([]);
    await expect(failingFields({ bio: 'a'.repeat(161) })).resolves.toEqual([
      'bio',
    ]);
  });

  it.each([null, 'happy', 'sad', 'angry', 'silly'])(
    'accepts the default mood %j',
    async (defaultQuackMood) => {
      await expect(failingFields({ defaultQuackMood })).resolves.toEqual([]);
    },
  );

  it('rejects an unknown default mood', async () => {
    await expect(
      failingFields({ defaultQuackMood: 'grumpy' }),
    ).resolves.toEqual(['defaultQuackMood']);
  });
});
