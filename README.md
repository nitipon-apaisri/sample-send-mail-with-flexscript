# sandbox-flexscript-sendmail

NestJS client for sending email through a Flex Script HTTP gateway. The app renders the HTML and posts it as multipart form data; Flex delivers the mail.

## Setup

```
npm install
cp .env.example .env   # fill in the values
```

| Variable | Required | Meaning |
|---|---|---|
| `FLEX_MAIL_URL` | yes | Flex send-mail script URL |
| `FLEX_MAIL_ID` | yes | Flex mail profile id |
| `FLEX_MAIL_TOKEN` | yes | Secret for that profile (never commit it) |
| `FLEX_MAIL_TO` | no | Default recipient when `to` is not passed |
| `FLEX_MAIL_CC` | no | Default CC when `cc` is not passed (`cc: ''` sends none) |
| `APP_MODE` | no | Anything other than `production` adds `, ENV:<mode>` to the subject |

## Usage

```ts
await mail.send({
  to: 'reviewer@example.com',          // optional, falls back to FLEX_MAIL_TO
  subject: 'Please review report #1042',
  html: renderTemplate('review-request', { dear: 'Alex', message: '...', link: '...' }),
  attachments: [{ filename: 'a.pdf', path: './a.pdf' }],
});
```

Send a test mail: `npm start` (or `npm start -- <to> [cc]`). Run unit tests: `npm test`.

Raw request for curl:

```
curl -X POST "$FLEX_MAIL_URL?mail_id=$FLEX_MAIL_ID&token=$FLEX_MAIL_TOKEN" \
  -F 'mail_to=you@example.com' -F 'mail_subject=Flex test' -F 'mail_body=<h1>Hello</h1>'
```

## Notes

- Sending is inline with no retry or queue; errors are logged (without the token) and rethrown.
- Pinned to NestJS 11 / `@nestjs/axios` 4 (newer majors are ESM-only and break Jest) and TypeScript 5.
