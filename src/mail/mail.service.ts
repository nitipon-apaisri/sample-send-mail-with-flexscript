import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { firstValueFrom } from 'rxjs';
import FormData = require('form-data');

export interface MailAttachment {
  filename: string;
  content?: Buffer | string; // Buffer, or base64 string
  path?: string; // http(s) URL or local file path
  contentType?: string;
  cid?: string; // set for inline images
}

export interface SendMailInput {
  to?: string; // falls back to FLEX_MAIL_TO
  subject: string;
  html: string;
  cc?: string; // falls back to FLEX_MAIL_CC; pass '' for no CC
  attachments?: MailAttachment[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly url: string;
  private readonly mailId: string;
  private readonly token: string;
  private readonly defaultTo: string;
  private readonly defaultCc: string;

  constructor(private http: HttpService, config: ConfigService) {
    this.url = config.get('FLEX_MAIL_URL') ?? '';
    this.mailId = config.get('FLEX_MAIL_ID') ?? '';
    this.token = config.get('FLEX_MAIL_TOKEN') ?? '';
    this.defaultTo = config.get('FLEX_MAIL_TO') ?? '';
    this.defaultCc = config.get('FLEX_MAIL_CC') ?? '';
  }

  async send(input: SendMailInput): Promise<void> {
    if (!this.url || !this.mailId || !this.token) {
      throw new InternalServerErrorException('Set FLEX_MAIL_URL, FLEX_MAIL_ID and FLEX_MAIL_TOKEN');
    }
    const to = input.to?.trim() || this.defaultTo;
    if (!to) throw new InternalServerErrorException('No recipient: pass `to` or set FLEX_MAIL_TO');
    const subject =
      process.env.APP_MODE !== 'production' ? `${input.subject}, ENV:${process.env.APP_MODE}` : input.subject;

    const form = new FormData();
    form.append('mail_to', to);
    form.append('mail_subject', subject);
    form.append('mail_body', input.html);
    const cc = input.cc ?? this.defaultCc;
    if (cc.trim()) form.append('mail_cc', cc);

    for (const file of await this.loadAttachments(input.attachments ?? [])) {
      form.append('files', file.content, {
        filename: file.filename,
        contentType: file.contentType,
        header: file.cid ? { 'Content-ID': `<${file.cid}>` } : undefined,
      });
    }

    try {
      await firstValueFrom(
        this.http.post(this.url, form, {
          params: { mail_id: this.mailId, token: this.token }, // axios encodes the query
          headers: { ...form.getHeaders(), 'Content-Length': form.getLengthSync().toString() },
          maxBodyLength: Infinity,
        }),
      );
      this.logger.log(`mail sent to ${to}`);
    } catch (err) {
      // do not log err.config.url: it contains the token
      this.logger.error(`mail to ${to} failed: ${(err as Error).message}`);
      throw err; // or swallow, if mail must never fail the caller
    }
  }

  private async loadAttachments(items: MailAttachment[]) {
    const out: { filename: string; content: Buffer; contentType?: string; cid?: string }[] = [];
    for (const a of items) {
      let content: Buffer | undefined;
      if (Buffer.isBuffer(a.content)) content = a.content;
      else if (typeof a.content === 'string') content = Buffer.from(a.content, 'base64');
      else if (a.path && /^https?:\/\//i.test(a.path)) {
        const res = await firstValueFrom(this.http.get<ArrayBuffer>(a.path, { responseType: 'arraybuffer' }));
        content = Buffer.from(res.data);
      } else if (a.path) content = await fs.readFile(a.path);
      if (!content) continue;
      const contentType = a.contentType ?? (a.filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined);
      out.push({ filename: a.filename, content, contentType, cid: a.cid });
    }
    return out;
  }
}
