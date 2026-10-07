/** Identidade do usuario autenticado, anexada em req.user. */
export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  status: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
