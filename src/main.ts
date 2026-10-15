import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MailService } from './mail/mail.service';
import { renderTemplate } from './mail/render-template';

// Usage: npm start [-- <to> [cc]]   (recipient defaults to FLEX_MAIL_TO)
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const [to, cc] = process.argv.slice(2);
  await app.get(MailService).send({
    to,
    cc,
    subject: 'Flex test',
    html: renderTemplate('review-request', {
      dear: 'Hello',
      message: 'This is a test sent through the Flex gateway.',
      link: 'https://example.com',
    }),
  });
  await app.close();
}
main();
