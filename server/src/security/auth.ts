import crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface ValidatedInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
}

/**
 * Validates the raw Telegram WebApp initData string against the bot token.
 * In development or demo mode, allows a mock user if no initData is present.
 */
export function validateTelegramInitData(
  initData: string | undefined,
  botToken: string
): { valid: boolean; user?: TelegramUser; error?: string } {
  // If no initData is provided and we are in demo or local development mode, permit a mock user
  if (!initData || initData.trim() === '') {
    if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production') {
      return {
        valid: true,
        user: {
          id: 999999999,
          first_name: 'Pilot',
          username: 'demo_operator',
        },
      };
    }
    return { valid: false, error: 'Telegram initData is missing' };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return { valid: false, error: 'Missing hash parameter in initData' };
    }

    params.delete('hash');

    // Sort parameters alphabetically by key
    const dataCheckArr: string[] = [];
    Array.from(params.keys())
      .sort()
      .forEach((key) => {
        dataCheckArr.push(`${key}=${params.get(key)}`);
      });
    const dataCheckString = dataCheckArr.join('\n');

    // Secret key = HMAC-SHA256(botToken, "WebAppData")
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      // In DEMO_MODE we can be lenient if token is a dummy token
      if (process.env.DEMO_MODE === 'true' && botToken.startsWith('mock_')) {
        const userStr = params.get('user');
        const user = userStr ? JSON.parse(userStr) : { id: 999999999, first_name: 'Demo Pilot' };
        return { valid: true, user };
      }
      return { valid: false, error: 'Invalid HMAC signature in initData' };
    }

    const userStr = params.get('user');
    if (!userStr) {
      return { valid: false, error: 'User data not found in initData' };
    }

    const user: TelegramUser = JSON.parse(userStr);
    return { valid: true, user };
  } catch (err: any) {
    return { valid: false, error: `Failed to parse initData: ${err.message}` };
  }
}
