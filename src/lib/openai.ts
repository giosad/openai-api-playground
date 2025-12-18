import OpenAI from 'openai';
import { USE_PROXY_KEY, OPENAI_API_KEY } from './constants';

/**
 * OpenAI client that can switch between proxy mode and direct mode.
 * - Proxy mode: requests go through /api/openai/*, server substitutes API key
 * - Direct mode: requests go directly to OpenAI with client-side API key from localStorage
 */
const openai = new OpenAI({
  apiKey: '',
  dangerouslyAllowBrowser: true,
});

/**
 * Check if proxy mode is enabled (from localStorage).
 * Defaults to true if not set.
 */
export function isProxyEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(USE_PROXY_KEY);
  // Default to proxy mode if not set
  return stored === null ? true : stored === 'true';
}

/**
 * Set proxy mode preference in localStorage.
 */
export function setProxyEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USE_PROXY_KEY, String(enabled));
  configureOpenAI();
}

/**
 * Configure OpenAI client based on current mode.
 * Call this after changing mode or on app initialization.
 */
export function configureOpenAI(): void {
  if (typeof window === 'undefined') return;

  const useProxy = isProxyEnabled();

  if (useProxy) {
    openai.baseURL = `${window.location.origin}/api/openai`;
    openai.apiKey = 'proxy';
  } else {
    openai.baseURL = 'https://api.openai.com/v1';
    openai.apiKey = localStorage.getItem(OPENAI_API_KEY) || '';
  }
}

// Initialize on module load (in browser)
if (typeof window !== 'undefined') {
  configureOpenAI();
}

export default openai;
