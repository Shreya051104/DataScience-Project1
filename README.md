# PharmaOptima

PharmaOptima is a React dashboard backed by a Flask API. It provides account registration and sign-in, private medicine and patient records, medicine expiry alerts, and analytics from the project-level `pharma_dataset.csv`.

## Run locally

1. From the project root, install the Python packages used by the API:

   ```powershell
   python -m pip install -r requirements.txt
   ```

2. From the project root, start the API:

   ```powershell
   python frontend/src/app.py
   ```

3. In another terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

4. Open the local Vite URL, create an account, and sign in. The API creates `pharma_app.db` in the project root to store accounts, medicine inventory, and patient records.

Set `FLASK_SECRET_KEY` to a long, private random value when running the API for longer than local development; otherwise sessions are invalidated when the API restarts. Set `PHARMA_DATABASE_PATH` to change the SQLite database location. Set `FLASK_COOKIE_SECURE=true` when the API is served over HTTPS.

Medicine expiry alerts include items that are already expired and items expiring within 90 days. Each account can access only the medicines and patient records it created. Passwords are stored as one-way hashes. Patient details are sensitive data: keep the database file access restricted and do not expose this development server directly to the public internet.
