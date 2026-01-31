# Umbra Blueprint Bot

Instagram automation bot for Umbra Training. Sends automatic DMs when users comment or reply with "blueprint".

## Environment Variables (Required)

| Variable | Description |
|----------|-------------|
| ACCESS_TOKEN | Instagram/Meta API access token |
| INSTAGRAM_USER_ID | Your Instagram user ID |
| VERIFY_TOKEN | Webhook verification token (default: umbra_verify_2026) |
| KEYWORD | Trigger keyword (default: blueprint) |

## Deploy

### Railway
1. Connect this repo
2. Add environment variables
3. Deploy

### Render
1. Connect this repo
2. Add environment variables
3. Deploy

## Webhook URL

Configure in Meta Developer Console:
- Callback URL: \https://your-app-url/webhook\
- Verify Token: Your VERIFY_TOKEN value
- Subscribe to: comments, messages