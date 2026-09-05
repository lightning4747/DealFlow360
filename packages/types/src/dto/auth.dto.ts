import { z } from 'zod';
import { UserRoleEnum } from '../dto/common.dto';

// Login DTO
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Signup DTO
export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['admin', 'sales_rep', 'sales_manager', 'finance', 'customer']).default('sales_rep'),
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

// Token payload contract
export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleEnum,
  type: z.enum(['access', 'refresh', 'portal']),
  quoteId: z.string().uuid().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

// Auth response envelope schema
export const AuthTokenResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: UserRoleEnum,
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
    tokenType: z.literal('Bearer'),
  }),
});
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

// Magic link request/verify schemas
export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
  quoteId: z.string().uuid(),
});
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(16),
  quoteId: z.string().uuid(),
});
export type MagicLinkVerify = z.infer<typeof MagicLinkVerifySchema>;
