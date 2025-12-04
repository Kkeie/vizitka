export interface JWTPayload {
  uid: number;
  iat?: number;
  exp?: number;
}
