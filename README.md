# Kohl's AutoForwarder

This is a Node.js script that automatically forwards emails from specific Kohl’s senders to a designated email address using the Gmail API. It supports both automatic background forwarding and on-demand manual forwarding from a given date.

## Features

- Automatically checks for unread emails every 60 seconds
- Forwards emails from:
  - `Kohls@t.kohls.com`
  - `kohls@s.kohls.com`
- Rewrites the "To" address to forward to a configured email
- Manual mode:
  - Type `M` and press Enter to forward **all emails** from a specified start date
- Uses OAuth2 with persistent token storage

## Requirements

- Node.js (v18 or newer)
- A Gmail account
- Gmail API enabled on a Google Cloud project
- OAuth 2.0 Client ID credentials (Desktop type)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install googleapis dotenv
```

### 2. Create `.env` File

In the root directory of the project, create a file named `.env` and add:

```env
FORWARD_TO=youremail@example.com
```

Replace `youremail@example.com` with the email address you want to forward messages to.

### 3. Add Your OAuth Client File

Download your `client_secret.json` from the [Google Cloud Console](https://console.cloud.google.com/) and place it in the root directory of the project.

### 4. Run the Script

```bash
node server.js
```

You will be prompted to authorize Gmail access in your browser the first time.

## Manual Forwarding Mode

While the script is running, you can manually initiate a one-time batch forward of all matching emails since a specified date.

### To trigger manual mode:

1. Type `M` and press Enter.
2. Enter a date in the format `YYYY-MM-DD`.

The script will forward all matching emails received after that date.

## Gmail API Configuration

You must enable the Gmail API for your Google Cloud project. Visit:

[https://console.developers.google.com/apis/api/gmail.googleapis.com/overview](https://console.developers.google.com/apis/api/gmail.googleapis.com/overview)

Enable the API and ensure your OAuth credentials are set to type "Desktop".

## Notes

- Messages are forwarded by modifying the "To" field.
- Script stores OAuth token in `token.json` to avoid repeated logins.
- Forwarding logic uses the Gmail `raw` format to preserve content.
- Duplicate forwarding is not currently prevented; avoid running the same batch twice unless needed.

## License

MIT License
