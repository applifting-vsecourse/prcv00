export class UsernameTakenError extends Error {
  constructor() {
    super("This username is already taken. Try another one.")
  }
}
