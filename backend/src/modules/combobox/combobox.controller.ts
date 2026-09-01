import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorator';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Combobox & Reference Data')
@Controller('combobox')
export class ComboboxController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get dynamic reference options for Divisions and Roles' })
  @ApiResponse({
    status: 200,
    description: 'Success Operation - Retrieved combobox reference data for roles and divisions',
    schema: {
      type: 'object',
      properties: {
        divisions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'IT' },
              name: { type: 'string', example: 'IT' },
              description: { type: 'string', example: 'Information Technology Division' },
            },
          },
        },
        roles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'Manager' },
              name: { type: 'string', example: 'Manager' },
              description: { type: 'string', example: 'Manager level' },
            },
          },
        },
      },
    },
  })
  getComboboxData() {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'src/config/combobox-data.json'),
        path.resolve(process.cwd(), 'config/combobox-data.json'),
        path.resolve(__dirname, '../../config/combobox-data.json'),
        path.resolve(__dirname, '../../../src/config/combobox-data.json'),
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          return JSON.parse(fs.readFileSync(p, 'utf8'));
        }
      }
    } catch (e) {
      // Fallback
    }

    return {
      divisions: [
        { id: 'IT', name: 'IT', description: 'Information Technology Division' },
        { id: 'Finance', name: 'Finance', description: 'Finance & Accounting Division' },
        { id: 'Business', name: 'Business', description: 'Business Development & Operations' },
        { id: 'Operation', name: 'Operation', description: 'Operation Development & Operations' },
        { id: 'HR', name: 'Human Resources', description: 'HR Development & Operations' },
      ],
      roles: [
        { id: 'Admin', name: 'Admin', description: 'Full access' },
        { id: 'Direktur', name: 'Direktur', description: 'Director level' },
        { id: 'Head of Division', name: 'Head of Division', description: 'Head level' },
        { id: 'Manager', name: 'Manager', description: 'Manager level' },
        { id: 'Leader', name: 'Leader', description: 'Leader level' },
        { id: 'Staff', name: 'Staff', description: 'Staff level' },
      ],
    };
  }
}
