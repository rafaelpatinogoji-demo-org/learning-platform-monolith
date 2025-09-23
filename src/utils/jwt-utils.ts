/**
 * JWT utility functions for token signing and verification
 * 
 * These utilities are extracted for easier testing and reusability.
 * They wrap the jsonwebtoken library with our specific payload structure.
 */

import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: number;    // Subject (user ID)
  email: string;
  role: string;
  iat: number;    // Issued at
  exp: number;    // Expires at
}

export interface JwtSignOptions {
  expiresIn?: string | number; // e.g., '24h', '1d', 86400 (seconds)
}

/**
 * Sign a JWT token with user payload
 */
export function signJwt(
  payload: { id: number; email: string; role: string },
  secret: string,
  options: JwtSignOptions = {}
): string {
  const { expiresIn = '24h' } = options;
  
  const jwtPayload = {
    sub: payload.id,
    email: payload.email,
    role: payload.role
  };

  return jwt.sign(jwtPayload, secret, {
    algorithm: 'HS256',
    expiresIn: expiresIn
  } as jwt.SignOptions);
}

/**
 * Verify a JWT token and return decoded payload
 * Throws JsonWebTokenError on invalid/expired tokens
 */
export function verifyJwt(token: string, secret: string): JwtPayload {
  const decoded = jwt.verify(token, secret);
  
  // Type guard to ensure we have the expected payload structure
  if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }
  
  // Validate required fields exist and have correct types
  if (
    typeof decoded.sub !== 'number' ||
    typeof decoded.email !== 'string' ||
    typeof decoded.role !== 'string' ||
    typeof decoded.iat !== 'number' ||
    typeof decoded.exp !== 'number'
  ) {
    throw new jwt.JsonWebTokenError('Invalid token payload structure');
  }
  
  return decoded as unknown as JwtPayload;
}

/**
 * Decode JWT token without verification (for testing/debugging)
 * Returns null if token is malformed
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token);
    if (typeof decoded === 'object' && decoded !== null) {
      return decoded as unknown as JwtPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired (without verification)
 * Returns true if expired, false if valid, null if can't decode
 */
export function isJwtExpired(token: string): boolean | null {
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}
