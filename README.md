<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your BOOKHAVEN app

This contains everything you need to run your app locally.


## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies from the repository root with `npm install`.
2. Start the backend in one terminal: `cd backend && npm run dev`.
   It listens on `http://localhost:3000` and loads the root `.env`, including `MONGODB_URI`.
3. Start the frontend in another terminal: `cd frontend && npm run dev`.
   Vite listens on `http://localhost:5173` and proxies API, upload, and asset requests to the backend.

`VITE_API_BASE_URL` is optional. Leave it empty to use the Vite proxy; set it to an API origin only when the frontend should call a different backend host directly.
