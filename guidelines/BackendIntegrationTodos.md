# Backend Integration TODOs

This frontend is now prepared to connect to a real backend through a centralized API layer.

## ✅ Already prepared
- [x] Added `VITE_API_BASE_URL` and `VITE_USE_MOCKS` environment variables via `.env.example`.
- [x] Added `src/app/lib/api.ts` for reusable authenticated API requests.
- [x] Added `src/app/services/authService.ts` to isolate login/session/lab-loading logic from UI components.
- [x] Updated `AuthContext.tsx` so user session and selected lab can be persisted and restored cleanly.
- [x] Updated lab selection and sidebar dropdowns to read labs from context/service instead of hardcoded imports.

## 🔌 Remaining backend connection tasks

### 1) Authentication
- [ ] Connect `POST /auth/login`
- [ ] Connect `GET /auth/me`
- [ ] Connect `POST /auth/logout`
- [ ] Confirm backend response shape for `user`, `role`, and token fields

### 2) Lab membership
- [ ] Connect `GET /labs` or `GET /users/me/labs`
- [ ] Return only labs that the logged-in user belongs to
- [ ] Optionally persist the active lab with a backend endpoint if the backend supports it

### 3) My papers / submissions
- [ ] Replace `MOCK_SUBMISSIONS` with `GET /papers/me`
- [ ] Connect paper creation to `POST /papers`
- [ ] Add loading, empty, and error states around submission fetches

### 4) AI-assisted review
- [ ] Replace locally generated review output with `POST /ai/review`
- [ ] Send `paperId` or uploaded file reference to the backend
- [ ] Return score, checks, annotations, and summary from the backend

### 5) Venue recommendations
- [ ] Replace static venue recommendation data with `GET /recommendations/venues?paperId=...`
- [ ] Return venue list, match score, reasoning, and readiness from the backend

### 6) Reviewer feedback / comments
- [ ] Replace `reviewerFeedbackStorage.ts` localStorage logic with real endpoints
- [ ] Suggested endpoints: `GET /members/:memberId/feedback` and `POST /feedback`
- [ ] Enforce the same role-based visibility on the backend side as well

### 7) Coordinator dashboards
- [ ] Replace mock analytics, workload, deadlines, and paper-assignment data with API endpoints
- [ ] Suggested endpoints: `/reviewers/analytics`, `/papers`, `/assignments`, `/deadlines`

### 8) Production readiness
- [ ] Configure CORS on the backend
- [ ] Add refresh-token / session-expiration handling if needed
- [ ] Add global error handling for 401/403/500 responses
- [ ] Add request retry or toast-based network error messages where appropriate
