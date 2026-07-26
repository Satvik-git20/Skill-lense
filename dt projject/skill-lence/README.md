# Skill lence — Unified Skill Aggregation Platform

A modern web platform connecting **Students**, **Developers**, and **Recruiters** through skill assessments, profile linking (LinkedIn/LeetCode), and job matching.

## Features

### For Students
- Track learning progress across multiple coding platforms
- Take skill assessments and view historical scores
- Identify strengths and areas for improvement
- Competitive job market preparation

### For Developers
- Aggregate skill metrics from GitHub, LeetCode, HackerRank, CodeChef
- Showcase comprehensive skill analytics to recruiters
- Link LinkedIn and LeetCode profiles
- Improve performance in coding interviews and real-world projects

### For Recruiters
- Unified candidate search across skill metrics
- View developer profiles and skill scores
- Make data-driven hiring decisions
- Track platform analytics and talent pool insights

## Tech Stack

- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 + Lottie animations
- **Auth**: JWT + bcryptjs
- **Database**: SQLite with persistent storage

## Installation & Run

```powershell
cd "c:/dt projject/skill-lence"
npm install
npm start
```

Then open http://localhost:3000 in your browser.

## Demo Accounts

After running `npm run seed`, use these credentials:

- **Student**: alice@skilllence.local / test123
- **Developer**: carol@skilllence.local / test123
- **Recruiter**: eve@skilllence.local / test123
- **Admin**: admin@skilllence.local / admin123

## Scripts

- `npm start` — Run the server on port 3000
- `npm run dev` — Run with nodemon (auto-reload on changes)
- `npm run seed` — Populate database with sample data
- `npm run reset-db` — Delete and reset the database

## API Endpoints

### Auth
- `POST /api/register` — Register new user
- `POST /api/login` — Login (returns JWT)

### Student
- `GET /api/student/progress` — View quiz history and stats (student only)

### Developer
- `GET /api/developer/analytics` — Get skill analytics (developer only)
- `POST /api/profile` — Save LinkedIn/LeetCode links
- `GET /api/profile/:userId` — Get developer profile

### Recruiter
- `GET /api/recruiter/dashboard` — Platform stats (recruiter only)
- `GET /api/recruiter/candidates` — Search developers (recruiter only)
- `GET /api/recruiter/candidate/:userId` — View candidate details (recruiter only)

### Quizzes (Admin)
- `GET /api/quiz?id=1` — Get quiz questions
- `POST /api/submit` — Submit quiz answers and get score
- `POST /api/admin/quiz` — Create new quiz (admin only)

### Public
- `GET /api/animations` — Get animation URLs

## File Structure

```
skill-lence/
├── server.js              # Express server with all API routes
├── db.js                  # SQLite database initialization
├── package.json           # Dependencies
├── skilllence.db          # SQLite database (created on first run)
├── scripts/
│   └── seed.js            # Seed sample data
├── public/
│   ├── index.html         # Landing page (auth)
│   ├── dashboard.html     # Role-based dashboard
│   ├── admin.html         # Admin quiz creator
│   ├── app-auth.js        # Auth logic
│   ├── dashboard.js       # Dashboard functionality
│   ├── admin.js           # Admin UI logic
│   └── styles.css         # Global styles
└── README.md
```

## Environment Variables

- `PORT` — Server port (default: 3000)
- `JWT_SECRET` — JWT signing secret (default: dev-secret-change-me, **change for production**)
- `NODE_ENV` — development or production

## Next Steps (Production)

1. **Use a real database** — Replace SQLite with PostgreSQL or MongoDB
2. **OAuth integration** — Implement LinkedIn OAuth for real profile linking
3. **LeetCode API** — Integrate LeetCode's public API or scraping for live stats
4. **Email verification** — Add email confirmation on signup
5. **Rate limiting** — Implement request rate limiting
6. **Security** — Add CSRF protection, input validation, helmet.js
7. **Monitoring** — Add logging and error tracking
8. **Deployment** — Deploy to AWS, Azure, or Heroku

## Admin Quickstart

1. Start the server
2. Open http://localhost:3000/admin.html
3. Login with admin@skilllence.local / admin123
4. Create quizzes with custom questions

## Notes

- Passwords are hashed using bcryptjs
- JWTs expire after 7 days
- Database is persisted in `skilllence.db` locally
- All errors return appropriate HTTP status codes and JSON responses
