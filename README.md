# Financial Master Dashboard

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Railway account (free trial available) - [railway.app](https://railway.app)

### 1. Clone the Repository

```bash
git clone https://github.com/achmadnasutionid/financial-master-dashboard-faster.git
cd financial-master-dashboard-faster
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database (Railway PostgreSQL)

1. Go to [railway.app](https://railway.app) and create an account
2. Create a new project
3. Add PostgreSQL database from the service catalog
4. Copy the connection strings from the database settings

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Railway PostgreSQL Connection
DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"

# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"
```

### 5. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 🔧 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

## 🌐 Deployment (Railway)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL from service catalog
4. Add your GitHub repository as a new service
5. Configure environment variables in Railway dashboard:
   - `DATABASE_URL` - Use Railway's provided `DATABASE_URL` variable reference: `${{Postgres.DATABASE_URL}}`
   - `DIRECT_URL` - Same as `DATABASE_URL`
6. Deploy!

The app will automatically deploy on every push to your GitHub repository.
