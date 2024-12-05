import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface JwtPayload {
  email: string;
  otp?: string;
  [key: string]: any;
}

@Injectable()
export class AuthJwtService {
  constructor(private readonly jwtService: NestJwtService) {}

  /**
   * Generate a JWT token with a given payload
   * @param payload - Data to be encoded in the token
   * @param expiresIn - Expiration time of the token
   * @returns Signed JWT token
   */
  generateToken(payload: JwtPayload, expiresIn: string): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn,
    });
  }

  /**
   * Validate a JWT token
   * @param token - The JWT token to validate
   * @returns Decoded payload if valid, otherwise throws an error
   */
  validateToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      throw new Error('Invalid or expired token' + error);
    }
  }

  /**
   * Decode a JWT token without validating its signature
   * @param token - The JWT token to decode
   * @returns Decoded payload
   */
  decodeToken(token: string): JwtPayload | null {
    return this.jwtService.decode(token);
  }
}
