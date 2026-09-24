/**
 * Typed access to environment configuration.
 *
 * Values are read from Vite env vars (`import.meta.env.VITE_*`) and fall back to
 * the literals that were previously hardcoded in the app so development keeps
 * working without a local `.env` file.
 */

const COGNITO_USER_POOL_ID_FALLBACK = 'us-east-1_vUo50ofKI';
const COGNITO_CLIENT_ID_FALLBACK = '4nvgf7et9f4ui0glr4ddf152r8';

export const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || COGNITO_USER_POOL_ID_FALLBACK,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || COGNITO_CLIENT_ID_FALLBACK,
};

