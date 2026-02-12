// synapse_core/src/auth.ts
// Handles OAuth 2.1, mTLS, and Token Exchange

export type AuthStrategy = 'oauth2' | 'mtls' | 'bearer' | 'api_key';

export interface IdentityContext {
  userId: string;
  userToken?: string; // Delegated Token (OBO)
  systemToken: string; // Machine Token (Service Identity)
  scopes: string[];
}

export class AuthManager {
  /**
   * Validates incoming request and extracts identity.
   * Supports Bearer (OAuth) and mTLS (Client Cert Headers).
   */
  static async validateRequest(req: Request, strategy: AuthStrategy): Promise<IdentityContext | null> {
    
    // 1. mTLS Check (Cloudflare Access / Mutual TLS)
    const certHeader = req.headers.get('X-Client-Cert-Verified');
    if (strategy === 'mtls' && certHeader !== 'SUCCESS') {
      return null;
    }

    // 2. OAuth / Bearer Check
    const authHeader = req.headers.get('Authorization');
    if ((strategy === 'oauth2' || strategy === 'bearer') && !authHeader) {
      return null;
    }

    const userToken = authHeader?.replace('Bearer ', '') || undefined;

    // Mock Identity Extraction (In prod: Verify JWT Signature + Claims)
    return {
      userId: 'user_mock_123',
      userToken: userToken,
      systemToken: 'sys_edgeneuro_core', // Internal System Identity
      scopes: ['agent.read', 'agent.connect']
    };
  }

  /**
   * Generates headers for downstream Agent calls.
   * Handles Token Propagation (On-Behalf-Of flow).
   */
  static propagateToken(ctx: IdentityContext, targetType: AuthStrategy): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Always attach Trace ID
    headers['X-A2A-Trace-Id'] = crypto.randomUUID();

    // 1. OAuth 2.1 / Bearer Propagation
    if (targetType === 'oauth2' || targetType === 'bearer') {
      // If we have a user token, we pass it (Delegation)
      if (ctx.userToken) headers['Authorization'] = `Bearer ${ctx.userToken}`;
      
      // We also assert our System Identity
      headers['X-EdgeNeuro-System-Auth'] = ctx.systemToken;
    } 
    
    // 2. API Key Propagation
    else if (targetType === 'api_key') {
      headers['X-API-Key'] = ctx.systemToken;
    }

    return headers;
  }
}
