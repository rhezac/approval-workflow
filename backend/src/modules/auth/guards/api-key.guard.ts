import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private getApiKeys() {
    try {
      const configPath = path.resolve(__dirname, '../../config/api-keys.json');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(raw).apiKeys || [];
      }
    } catch (e) {
      console.error('Error loading api-keys.json', e);
    }
    return [];
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.query.apiKey;

    if (!apiKey) {
      throw new UnauthorizedException('API Key header "x-api-key" is required for this endpoint');
    }

    const validKeys = this.getApiKeys();
    const foundKey = validKeys.find((k: any) => k.key === apiKey && k.enabled);

    if (!foundKey) {
      throw new UnauthorizedException('Invalid or inactive API Key');
    }

    request.apiKeyClient = foundKey;
    request.user = {
      id: `api-client-${foundKey.clientName}`,
      username: foundKey.clientName,
      roles: foundKey.roles || ['Admin'],
      isApiKey: true,
    };
    return true;
  }
}
