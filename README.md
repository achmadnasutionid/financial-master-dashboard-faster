# Financial Master Dashboard

> A comprehensive financial management dashboard built with Next.js 16, TypeScript, and Prisma ORM.

**🎉 Recently Refactored:** The dashboard has been refactored for better maintainability, type safety, and code organization. See [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) for details.

## ✨ Features

- 📊 **Real-time Dashboard** - Overview of quotations, invoices, expenses, and planning
- 💰 **Financial Analytics** - Profit tracking, budget analysis, and trend visualization
- 📈 **Interactive Charts** - Monthly trends, product expenses, and performance metrics
- 🔍 **Smart Search** - Quick navigation across all modules
- 📱 **Responsive Design** - Mobile-first approach with beautiful UI
- 🎯 **Action Items** - Highlights pending invoices, quotations, and drafts
- 📦 **Product Tracking** - Master products vs ETC items analysis
- 🏢 **Client Management** - Special workflows for Erha and Paragon clients
- 📄 **PDF Generation** - Generate professional documents
- 🌙 **Dark Mode** - Theme support included

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router, React Server Components)
- **Language:** TypeScript (100% type coverage)
- **Database:** PostgreSQL with Prisma ORM
- **UI:** Tailwind CSS v4 + Radix UI
- **Charts:** Recharts
- **State:** React Hooks + SWR
- **Deployment:** Railway

## 📁 Project Structure

```
master-dashboard-faster/
├── types/              # TypeScript type definitions
├── lib/                # Utility functions and business logic
├── components/         # Reusable UI components
│   ├── dashboard/     # Dashboard-specific components
│   ├── layout/        # Layout components
│   ├── pdf/           # PDF generation components
│   └── ui/            # UI primitives
├── app/               # Next.js app directory
│   ├── api/          # API routes
│   └── [pages]/      # Page components
├── prisma/           # Database schema and migrations
└── hooks/            # Custom React hooks
```

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

---

## 📚 Documentation

- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Overview of recent refactoring improvements
- **[REFACTORING_DETAILS.md](./REFACTORING_DETAILS.md)** - Detailed before/after comparison
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture diagrams and data flow
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference guide for developers

## 🎯 Key Improvements (Recent Refactoring)

✅ **Type Safety** - 100% TypeScript coverage (eliminated all `any` types)  
✅ **Modular Components** - Split 1,950-line page into 8 focused components  
✅ **Testable Logic** - Extracted business logic into pure functions  
✅ **Better Maintainability** - Clear separation of concerns  
✅ **Developer Experience** - Better IDE support and autocomplete  

## 🧪 Code Quality

| Metric | Score |
|--------|-------|
| TypeScript Coverage | 100% |
| Component Modularity | Excellent |
| Code Duplication | Minimal |
| Maintainability Index | High |
| Build Status | ✅ Passing |

## 📊 Database Schema

The project uses Prisma ORM with 20+ models:

- **Master Data:** Company, Billing, Signature, Product
- **Transactions:** Invoice, Quotation, Expense, Planning
- **Special Cases:** ParagonTicket, ErhaTicket
- **Extras:** GearExpense, BigExpense
- **Templates:** QuotationTemplate

See `prisma/schema.prisma` for full schema definition.

## 🔒 Security

- ✅ Bot blocking middleware
- ✅ No search engine indexing
- ✅ Security headers configured
- ✅ Environment variables for secrets
- ✅ SQL injection prevention (Prisma)

## 🎨 UI Components

Built with Radix UI and Tailwind CSS:

- Alert Dialog, Dialog, Popover
- Select, Input, Textarea
- Button, Card, Table
- Date Picker, Currency Input
- Auto-expand Input, Pagination
- Skeleton loaders, Empty states

## 📈 Performance

- **Single API Call** - Consolidated dashboard endpoint
- **Client-side Filtering** - Fast year filtering without re-fetching
- **Optimized Packages** - Tree-shaking and code splitting
- **Image Optimization** - Next.js Image component
- **Compression** - Gzip enabled

## 🤝 Contributing

This is a private financial dashboard. If you have access and want to contribute:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

Private - All rights reserved

## 👤 Author

**Achmad Nasution**

## 🙏 Acknowledgments

- Next.js team for the excellent framework
- Prisma team for the type-safe ORM
- Radix UI for accessible components
- Railway for easy deployment
