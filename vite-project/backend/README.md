# StayNest Backend

Run this server in a separate terminal:

```bash
cd C:\staynest\vite-project
npm install
npm run dev:backend
```

If you want to use a custom MongoDB URI, set it in a `.env` file or as an environment variable:

```env
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=staynest
JWT_SECRET=staynest-secret
BACKEND_PORT=5050
```

API base URL:

```text
http://localhost:5050/api
```
