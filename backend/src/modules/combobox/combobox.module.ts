import { Module } from '@nestjs/common';
import { ComboboxController } from './combobox.controller';

@Module({
  controllers: [ComboboxController],
})
export class ComboboxModule {}
