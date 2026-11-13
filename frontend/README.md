# Preclinic CMS Frontend (React + Vite + Bootstrap 5)

```bash
cp .env.example .env
npm install
npm run dev      # http://localhost:3000  (proxies /api -> http://127.0.0.1:8000)
```
Backend: `python manage.py runserver` in `clinicmanagementsystem/`.

Backend field names are translated in `src/api/pharmacistAdapters.js`.
Change field mappings there, not in the pages.
Each teammate edits only `src/modules/<their-module>/` and `src/api/<their-module>Api.js`.
