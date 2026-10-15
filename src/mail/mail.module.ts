import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
