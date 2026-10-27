# Kitchen Inbox (Alexa skill: "Kitchen Box")

Say something to Alexa in the kitchen and it lands as a new row in the **Kitchen Inbox** Google Sheet. Muse checks the sheet each morning and works through the "new" rows.

- Columns: **Added** (time) · **Item** (exactly what was said) · **Status** (starts as `new`) · **Muse notes**
- Anyone in the house can add items.

## What to say

| Say | Result |
|---|---|
| "Alexa, ask Kitchen Box to add oat milk" | Row "oat milk" → Alexa: "Added oat milk." |
| "Alexa, open Kitchen Box" → "add dish soap" → "add bananas" → "no" | Adds several in one go |
| Also works after the name: "we need …", "we're out of …", "buy …", "remind me to …", "write down …" | |

Use **"ask … to"** or **"open …"**. "Tell Kitchen Box to …" can get mistaken for sending a message.
The invocation name was first "kitchen inbox", but Alexa treats "inbox" as messaging, so it became "kitchen jar", then the skill was recreated as "kitchen box".

## Setup

The code has placeholders you fill in (they are secrets, so they're not in this repo):

- `apps-script/Code.gs`: `__SHEET_ID__` (from your sheet's URL) and `__TOKEN__` (any long random string).
- `lambda/index.js`: `__WEBAPP_URL__` (the Apps Script web app's /exec URL) and the same `__TOKEN__`.

## How it fits together

```
Echo → Alexa skill (Alexa-hosted) → Apps Script web app (your Google account) → Kitchen Inbox sheet ← Muse
```

- If Alexa says "<name> is not supported on this device" on a real Echo, recreating the skill from scratch fixed it for us.
- Apps Script project "Kitchen Inbox connector" (script.google.com), deployed as a Web app: Execute as Me, access Anyone. It only accepts requests carrying the secret TOKEN, which must match in `apps-script/Code.gs` and `lambda/index.js`.
- If you ever redeploy the Apps Script as a *new* deployment, the /exec URL changes. Update `WEBAPP_URL` in `lambda/index.js` on the Alexa Code tab → Save → Deploy. (Manage deployments → edit the existing one keeps the same URL.)

## Files

- `lambda/index.js`: skill logic (add item, launch, help, stop)
- `lambda/package.json`: libraries
- `skill-package/interactionModels/custom/en-US.json`: phrases (paste into Build → JSON Editor → Save → Build skill)
- `apps-script/Code.gs`: the Google side that appends the row

## Status (2026-10-26)

- Sheet, Apps Script connector, and Alexa skill are all deployed.
- Code + sheet path verified with a direct (Manual JSON) test: it replied "Added setup test - please delete." and wrote the row.
- Amazon's online voice simulator was broken that evening (even Toy Turn Helper showed "not supported on this device"), so the spoken-name test still needs a real Echo.
