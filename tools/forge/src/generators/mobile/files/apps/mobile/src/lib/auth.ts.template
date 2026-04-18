import { createAuthClient } from 'better-auth/react';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL?.replace('/trpc', '/api/auth') ?? 'http://localhost:3000/api/auth',
});
