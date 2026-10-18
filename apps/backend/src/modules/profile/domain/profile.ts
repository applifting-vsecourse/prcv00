import { QuackMood } from '@/modules/quack/domain/quack';

// Same rules BetterAuth's username plugin applies at sign-up, so a name that
// was valid there stays valid here and vice versa.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;

export const NAME_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 160;

export type Profile = {
  // As the user typed it ("CaffeinatedDuck"); this is what people see.
  username: string;
  name: string;
  bio: string | null;
  defaultQuackMood: QuackMood | null;
};

export class UsernameTakenError extends Error {
  constructor(username: string) {
    super(`Username "${username}" is already taken`);
  }
}
