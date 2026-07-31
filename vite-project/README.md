# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Run (development)

Quick commands to run the project locally (from the project root `C:\staynest\vite-project`):

```powershell
# Start backend (Express + MongoDB)
npm run dev:backend

# Start frontend (Vite)
npm run dev:frontend
```

Notes:
- Authentication and user data are handled by the backend and stored in MongoDB (`staynest` database). The frontend calls `/api/*` endpoints to interact with the server.
- To inspect the database use `mongosh` or MongoDB Compass and connect to `mongodb://127.0.0.1:27017`.

## Firebase Admin (optional server-side sync)

If you want signup in the app to create a user in Firebase Authentication (so users also appear in Firebase Console), add a Firebase service account and set the `FIREBASE_SERVICE_ACCOUNT_PATH` environment variable to the JSON file path.

Steps:

1. In Firebase Console → Project Settings → Service accounts → Generate new private key. Save the JSON file to your machine (e.g. `C:\staynest\firebase-service-account.json`).
2. Set environment variable before starting backend:

```powershell
setx FIREBASE_SERVICE_ACCOUNT_PATH "C:\\staynest\\firebase-service-account.json"
# then restart PowerShell or use $env:FIREBASE_SERVICE_ACCOUNT_PATH in current shell
```

3. Restart the backend. When present, the backend will attempt to create the Firebase user during signup (it still stores the user in MongoDB).

If you prefer to provide the service account JSON directly as an environment variable, set `FIREBASE_ADMIN_JSON` to the JSON string (not recommended for production).
