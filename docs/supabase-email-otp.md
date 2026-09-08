# Supabase email OTP with Brevo

The application uses a six-digit email OTP. The Magic Link / OTP template in the
**template** Supabase project must therefore render `{{ .Token }}` and must not
render `{{ .ConfirmationURL }}`. A confirmation URL produces a link while the UI
is waiting for a code.

Configure the hosted project in Supabase Dashboard:

1. Go to **Authentication → Email Templates**:
   - In **Confirm signup**, replace the body with `supabase/templates/magic_link.html` and click **Save changes**. (This is used during new user sign-up).
   - In **Magic link**, replace the body with `supabase/templates/magic_link.html` and click **Save changes**. (This is used during existing user sign-in).
2. Go to **Project Settings → Authentication → SMTP Settings**, enable custom
   SMTP, and use the verified Brevo sender.
3. Set host to `smtp-relay.brevo.com`, port to `587`, and use the SMTP login and
   SMTP key from Brevo's **SMTP & API** page. The SMTP key is not a Brevo API key.
4. Send a fresh sign-up email and verify that it contains a six-digit code.

The template has no Brevo values in `.env`. Supabase Auth owns delivery, so
enter the SMTP values directly in Supabase Dashboard's Custom SMTP form:

| Field                     | Value                                            |
| ------------------------- | ------------------------------------------------ |
| Sender email address      | `tvizzie@outlook.com`                            |
| Sender name               | `Tvizzie`                                        |
| Host                      | `smtp-relay.brevo.com`                           |
| Port                      | `587`                                            |
| Minimum interval per user | `60` seconds                                     |
| Username                  | The SMTP login copied from Brevo (not `Tvizzie`) |
| Password                  | A dedicated Brevo SMTP key (not a Brevo API key) |

Keep `.env` uncommitted and never expose SMTP credentials to browser code.

The local Supabase config points at the same code-only template for local work;
it does not update the hosted project's Dashboard configuration.

Accounts created before the hosted template is corrected may have an empty
username because their verification link bypassed the in-app OTP completion
step. Those legacy records return to the home page from `/account`; new
sign-ups complete their profile immediately after OTP verification.
