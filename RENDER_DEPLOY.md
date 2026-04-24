# Render Deploy

This app needs a Node web service plus persistent disk storage.

## What is already prepared

- `render.yaml` for Render Blueprint deploy
- `DATA_DIR=/var/data`
- persistent disk mount at `/var/data`
- health check endpoint at `/healthz`

## What you need once

1. Put this folder in GitHub.
2. Sign in to Render.
3. Create a new Blueprint or Web Service from that repo.
4. Keep the disk enabled so `data/app-state.json` becomes durable storage at `/var/data`.

## Recommended Render setup

- Region: Singapore
- Plan: Starter
- Start command: `npm start`
- Health check path: `/healthz`
- Disk mount path: `/var/data`

## Important

- A persistent disk on Render is available only on paid web services.
- Without a persistent disk, local file changes are lost on redeploy.
- With a disk attached, the service should stay public at an `onrender.com` URL even when your PC is off.

## After deploy

Render gives you a permanent public URL like:

`https://your-service-name.onrender.com`

That is the link you can open on phone, PC, or share with others.
