# Change Authentication Email Sender

This guide will help you change the authentication email sender from Supabase's default to your custom email address: `devbuf@myb-site.com`.

## Option 1: Using Supabase's Built-in Email (Recommended for Testing)

Supabase uses their own email service by default. The sender email cannot be changed when using Supabase's built-in email service. You'll need to use **Custom SMTP** to set a custom sender email.

## Option 2: Using Custom SMTP (Required for Custom Sender Email)

To use `devbuf@myb-site.com` as the sender email, you need to configure Custom SMTP in Supabase.

### Steps to Configure Custom SMTP:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Go to **Authentication** → **Settings** (or **Configuration**)
   - Scroll down to **SMTP Settings** section

3. **Enable Custom SMTP**
   - Toggle **"Enable Custom SMTP"** to ON
   - Fill in the following fields:

   **SMTP Configuration:**
   ```
   SMTP Host: smtp.your-email-provider.com
   SMTP Port: 587 (or 465 for SSL)
   SMTP User: devbuf@myb-site.com
   SMTP Password: [Your email account password or app-specific password]
   Sender Email: devbuf@myb-site.com
   Sender Name: Your App Name (e.g., "World News")
   ```

4. **Common SMTP Providers:**

   **For Gmail/Google Workspace:**
   - Host: `smtp.gmail.com`
   - Port: `587` (TLS) or `465` (SSL)
   - User: `devbuf@myb-site.com`
   - Password: Use an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password)
   - Enable TLS: Yes

   **For Outlook/Microsoft 365:**
   - Host: `smtp.office365.com`
   - Port: `587`
   - User: `devbuf@myb-site.com`
   - Password: Your account password
   - Enable TLS: Yes

   **For Custom Email Server:**
   - Contact your email provider for SMTP settings
   - Common ports: 587 (TLS), 465 (SSL), or 25

5. **Test the Configuration**
   - Click **"Send Test Email"** button
   - Check if you receive a test email from `devbuf@myb-site.com`

6. **Save Settings**
   - Click **"Save"** or **"Update"**

### Update Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. For each template (Confirm signup, Reset password, etc.), you can customize:
   - **Subject**: Change the email subject
   - **Body**: Customize the email content
   - The sender email will automatically be `devbuf@myb-site.com` once SMTP is configured

### Example Email Template Customization:

**Confirm Signup Template:**
```
Subject: Verify your account - World News

Hi there,

Please verify your email address by clicking the link below:

{{ .ConfirmationURL }}

If you didn't create an account, you can safely ignore this email.

Thanks,
World News Team
```

## Important Notes:

1. **Email Domain Verification**: Some email providers require domain verification. Make sure `myb-site.com` is properly configured and verified.

2. **SPF/DKIM Records**: For better email deliverability, ensure your domain has proper SPF and DKIM records configured in your DNS settings.

3. **App Passwords**: For Gmail, you'll need to generate an App Password (not your regular password):
   - Go to Google Account → Security → 2-Step Verification → App Passwords
   - Generate a password for "Mail"
   - Use that password in SMTP settings

4. **Rate Limits**: Be aware of SMTP rate limits from your email provider.

5. **Testing**: Always test the email configuration before going to production.

## Troubleshooting:

- **Emails not sending**: Check SMTP credentials and port settings
- **Emails going to spam**: Configure SPF/DKIM records for your domain
- **Authentication failed**: Verify username/password are correct
- **Connection timeout**: Check if port 587/465 is not blocked by firewall

## Alternative: Use Email Service Provider

If you don't have SMTP access, consider using:
- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 5,000 emails/month)
- **Amazon SES** (Very affordable)
- **Resend** (Developer-friendly)

These services provide SMTP credentials that you can use in Supabase.

