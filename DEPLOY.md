# Deploying HSQE Assistant on Railway

You will create **three Railway services** in one project:
1. **PostgreSQL** (managed database plugin)
2. **Backend** (Spring Boot – Docker)
3. **Frontend** (React/Vite – Docker + nginx)

---

## Prerequisites

- A [Railway](https://railway.app) account (free tier works)
- Your code pushed to a **GitHub repository** (Railway deploys from Git)
- [Railway CLI](https://docs.railway.app/develop/cli) (optional but handy)

---

## Step 1 — Push your code to GitHub

Make sure both `hsqe-assistant-backend/hsqe-assistant-backend/` and
`hsqe-assistant-frontend/` (with their new `Dockerfile`s) are committed and
pushed to GitHub.

```bash
git add .
git commit -m "chore: add production Dockerfiles and nginx config"
git push
```

---

## Step 2 — Create a new Railway project

1. Go to [railway.app](https://railway.app) → **New Project**.
2. Choose **Empty Project**, give it a name (e.g. `hsqe-assistant`).

---

## Step 3 — Add a PostgreSQL database

1. Inside the project, click **+ New** → **Database** → **PostgreSQL**.
2. Railway provisions a managed Postgres instance in seconds.
3. Click the **PostgreSQL** service → **Variables** tab.  
   Note the following auto-generated values (you'll need them in Step 4):
   - `PGHOST`
   - `PGPORT`
   - `PGDATABASE`
   - `PGUSER`
   - `PGPASSWORD`
   - `DATABASE_URL` (format: `postgres://user:pass@host:port/db`)

### Run the schema

Use the Railway built-in shell **or** a local `psql` command to create the tables.

**Option A – Railway shell (easiest)**

1. Click the PostgreSQL service → **Connect** tab → **Connect via Query**.
2. Paste the entire contents of `hsqe-assistant-backend/create_tables.sql` and run it.

**Option B – psql from your machine**

```bash
# Replace the values with your Railway Postgres connection string
psql "postgres://USER:PASSWORD@HOST:PORT/DATABASE" -f hsqe-assistant-backend/create_tables.sql
```

---

## Step 4 — Deploy the Backend

### 4a. Add the service

1. Click **+ New** → **GitHub Repo**.
2. Select your repository.
3. Railway will detect the repo root. You need to point it to the backend subfolder.  
   Under **Settings → Source** set:
   - **Root Directory**: `hsqe-assistant-backend/hsqe-assistant-backend`
   - **Build Command**: *(leave empty — Docker is used)*

### 4b. Set environment variables

Go to the backend service → **Variables** tab and add:

| Variable | Value |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `JDBC_DATABASE_URL` | `jdbc:postgresql://PGHOST:PGPORT/PGDATABASE` *(build from the Postgres values above)* |
| `JDBC_DATABASE_USERNAME` | value of `PGUSER` from Postgres service |
| `JDBC_DATABASE_PASSWORD` | value of `PGPASSWORD` from Postgres service |
| `CORS_ALLOWED_ORIGINS` | *(leave empty for now — fill in after frontend is deployed)* |

> **Tip**: Railway lets you reference another service's variable with  
> `${{Postgres.PGHOST}}` syntax so you never have to copy-paste secrets.
> Use these reference expressions in the `JDBC_DATABASE_URL` field:
> ```
> jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
> ```
> And set `JDBC_DATABASE_USERNAME` = `${{Postgres.PGUSER}}`,  
> `JDBC_DATABASE_PASSWORD` = `${{Postgres.PGPASSWORD}}`.

### 4c. Deploy

Click **Deploy** (or push a commit). Railway will:
1. Build the Docker image using the `Dockerfile` in the backend folder.
2. Start the Spring Boot app on an auto-assigned `$PORT`.
3. Give it a public URL like `https://hsqe-backend-xxxx.up.railway.app`.

**Make a note of this URL** — you need it in Step 5.

---

## Step 5 — Deploy the Frontend

### 5a. Add the service

1. Click **+ New** → **GitHub Repo** → same repository.
2. Under **Settings → Source** set:
   - **Root Directory**: `hsqe-assistant-frontend`

### 5b. Set environment variables / build arguments

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://YOUR-BACKEND-URL.up.railway.app/api` |

> This is a **build-time** variable. Railway automatically passes all
> environment variables as Docker `--build-arg` values when using a
> Dockerfile, so Vite will inline the URL during `npm run build`.

### 5c. Deploy

Click **Deploy**. Once it's green, Railway assigns a public URL like
`https://hsqe-frontend-xxxx.up.railway.app`.

---

## Step 6 — Wire CORS

Now that you have the frontend URL, go back to the **Backend** service →
**Variables** and set:

| Variable | Value |
|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://hsqe-frontend-xxxx.up.railway.app` |

Railway will automatically redeploy the backend with the new variable.

---

## Step 7 — Verify

1. Open the frontend URL in your browser.
2. The app should load and data should flow through the API.
3. Check backend logs in Railway if anything seems broken:  
   Backend service → **Deployments** → **View Logs**.

---

## Custom Domain (optional)

For each service (frontend / backend):
1. Service → **Settings** → **Custom Domain**.
2. Add your domain and follow the DNS instructions.
3. Update `CORS_ALLOWED_ORIGINS` to include your custom frontend domain.

---

## Environment variable cheat-sheet

### Backend service
```
SPRING_PROFILES_ACTIVE=prod
JDBC_DATABASE_URL=jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
JDBC_DATABASE_USERNAME=${{Postgres.PGUSER}}
JDBC_DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
CORS_ALLOWED_ORIGINS=https://<your-frontend-url>.up.railway.app
```

### Frontend service
```
VITE_API_BASE_URL=https://<your-backend-url>.up.railway.app/api
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Backend starts but returns 500 | Check logs — most likely `JDBC_DATABASE_URL` is wrong. Verify the format starts with `jdbc:postgresql://` not `postgres://`. |
| Frontend shows "Failed to fetch" | `VITE_API_BASE_URL` is missing or wrong. Redeploy after correcting it (build-time variable). |
| CORS error in browser console | `CORS_ALLOWED_ORIGINS` on the backend doesn't include the exact frontend origin. Make sure there's no trailing slash. |
| Tables don't exist (JPA validate fails) | Re-run `create_tables.sql` against the Railway Postgres database. |
| Railway doesn't pick the right Dockerfile | Confirm **Root Directory** in service settings matches the folder that contains the `Dockerfile`. |

