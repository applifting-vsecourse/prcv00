export class Identity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string | null,
    public readonly role: string,
  ) {}
}

// A function, not a getter: the identity handed to controllers is the plain
// session user from better-auth, not an instance of this class.
export const isAdmin = (identity: Identity): boolean =>
  identity.role === 'admin';
