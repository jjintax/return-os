# GitHub First Upload

This folder is ready for a browser upload.

## Upload order

1. Create a new GitHub repository.
2. Upload this folder's files in the browser.
3. Open Render and create a new Blueprint or Web Service from that repo.

## Recommended repo name

`return-os`

## Do not upload

- `data/app-state.json`
- `*.log`
- `*.pid`

Those are already listed in `.gitignore`.

## After GitHub upload

Open Render and connect the repo.

Use these settings:

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/healthz`
- Disk mount path: `/var/data`

The included `render.yaml` already describes this setup.
