import { of } from 'rxjs';
import { MailService } from './mail.service';

const cfg = { FLEX_MAIL_URL: 'http://flex.test/send', FLEX_MAIL_ID: '1', FLEX_MAIL_TOKEN: 't' } as Record<string, string>;
const make = (http: any) => new MailService(http, { get: (k: string) => cfg[k] } as any);

describe('MailService', () => {
  beforeEach(() => { process.env.APP_MODE = 'production'; });

  it('posts to Flex with credentials in the query', async () => {
    const http = { post: jest.fn().mockReturnValue(of({ status: 200, data: 'ok' })), get: jest.fn() };
    await make(http).send({ to: 'a@b.c', subject: 'Hi', html: '<p>x</p>' });
    expect(http.post).toHaveBeenCalledWith('http://flex.test/send', expect.anything(),
      expect.objectContaining({ params: { mail_id: '1', token: 't' } }));
  });

  it('tags the subject outside production and omits empty cc', async () => {
    process.env.APP_MODE = 'staging';
    const http = { post: jest.fn().mockReturnValue(of({})), get: jest.fn() };
    await make(http).send({ to: 'a@b.c', subject: 'Hi', html: 'x', cc: ' ' });
    const body = http.post.mock.calls[0][1].getBuffer().toString();
    expect(body).toContain('Hi, ENV:staging');
    expect(body).not.toContain('mail_cc');
  });

  it('sets Content-ID on inline attachments', async () => {
    const http = { post: jest.fn().mockReturnValue(of({})), get: jest.fn() };
    await make(http).send({ to: 'a@b.c', subject: 'Hi', html: 'x',
      attachments: [{ filename: 'l.png', content: Buffer.from('p'), cid: 'logo' }] });
    expect(http.post.mock.calls[0][1].getBuffer().toString()).toContain('Content-ID: <logo>');
  });

  it('uses FLEX_MAIL_TO when `to` is omitted', async () => {
    const http = { post: jest.fn().mockReturnValue(of({})), get: jest.fn() };
    const s = new MailService(http as any, { get: (k: string) => ({ ...cfg, FLEX_MAIL_TO: 'env@x.y' })[k] } as any);
    await s.send({ subject: 'Hi', html: 'x' });
    expect(http.post.mock.calls[0][1].getBuffer().toString()).toContain('env@x.y');
  });

  it('uses FLEX_MAIL_CC unless cc is passed explicitly', async () => {
    const http = { post: jest.fn().mockReturnValue(of({})), get: jest.fn() };
    const s = new MailService(http as any, { get: (k: string) => ({ ...cfg, FLEX_MAIL_CC: 'cc@x.y' })[k] } as any);
    await s.send({ to: 'a@b.c', subject: 'Hi', html: 'x' });
    await s.send({ to: 'a@b.c', subject: 'Hi', html: 'x', cc: '' });
    const body = (i: number) => http.post.mock.calls[i][1].getBuffer().toString();
    expect(body(0)).toContain('cc@x.y');
    expect(body(1)).not.toContain('mail_cc');
  });

  it('throws when there is no recipient', async () => {
    await expect(make({}).send({ subject: 'Hi', html: 'x' })).rejects.toThrow('FLEX_MAIL_TO');
  });

  it('throws when config is missing', async () => {
    const s = new MailService({} as any, { get: () => undefined } as any);
    await expect(s.send({ to: 'a', subject: 's', html: 'h' })).rejects.toThrow('FLEX_MAIL_URL');
  });
});
