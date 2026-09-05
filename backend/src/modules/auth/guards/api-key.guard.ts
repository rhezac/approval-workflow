import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private getApiKeys() {
    try {
      const candidatePaths = [
        path.resolve(process.cwd(), 'src/config/api-keys.json'),
        path.resolve(process.cwd(), 'dist/config/api-keys.json'),
        path.resolve(__dirname, '../../../config/api-keys.json'),
        path.resolve(__dirname, '../../config/api-keys.json'),
        path.resolve(__dirname, '../config/api-keys.json'),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          return JSON.parse(raw).apiKeys || [];
        }
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
      fullName: foundKey.clientName,
      role: (foundKey.roles && foundKey.roles[0]) || 'Admin',
      roles: foundKey.roles || ['Admin'],
      division: 'IT',
      isApiKey: true,
    };
    return true;
  }
}
