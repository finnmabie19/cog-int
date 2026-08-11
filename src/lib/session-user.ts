/** The user shape carried on every session. */
export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  roles: string[];
}
