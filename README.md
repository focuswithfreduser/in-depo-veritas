# In Depo Veritas

This project is used to make summary files for depositions. The user uploads a deposition and an email containing the summary files is sent back to the user. 

## Stripe
stripe listen --forward-to http://local.indepoveritas.com:4049/api/webhooks/stripe

## Deploy

### Frontend
CI is setup with Vercel for the FE changes to be deployed on PR merge.

## VS Code Setup
    
    https://stackoverflow.com/questions/71038134/vscode-setup-a-monorepo-with-a-deno-backend-folder-and-a-vite-frontend-fol

## Common errors


## NextJS Setup

1. Setup .env.local file
2. Generate a secret: https://next-auth.js.org/configuration/options#secret

3. Add values found in ~/create-env.mjs
