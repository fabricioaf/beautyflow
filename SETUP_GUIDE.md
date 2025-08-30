# BeautyFlow Development Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 13.0 (or Docker)

### 1. Environment Setup

Copy the environment file and configure your variables:
```bash
cp .env.example .env.local
```

### 2. Database Configuration

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb beautyflow
sudo -u postgres createuser beautyflow_user
sudo -u postgres psql -c "ALTER USER beautyflow_user PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE beautyflow TO beautyflow_user;"
```

#### Option B: Docker PostgreSQL
```bash
docker run --name beautyflow-postgres \
  -e POSTGRES_DB=beautyflow \
  -e POSTGRES_USER=beautyflow_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Generate Prisma Client
```bash
npm run db:generate
```

### 5. Run Database Migrations
```bash
npm run db:push
```

### 6. Seed Database with Sample Data
```bash
npm run db:seed
```

### 7. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔑 Test Credentials

After running the seed, you can login with:

- **Admin**: admin@beautyflow.com / 123456
- **Professional**: ana@salaobella.com / 123456  
- **Staff**: carlos@salaobella.com / 123456

## 📊 Sample Data

The seed includes:
- 3 users (Admin, Professional, Staff)
- 1 beauty salon (Salão Bella Vita)
- 15 clients with realistic data
- 6 services (Hair, Nails, Skincare)
- 230+ appointments (past and future)
- Payment records and analytics data

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:migrate      # Run migrations (production)
npm run db:seed         # Seed sample data
npm run db:reset        # Reset and reseed database
npm run db:studio       # Open Prisma Studio

# Testing
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Code Quality
npm run lint            # Lint code
```

## 🔧 Environment Variables

### Required Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/beautyflow"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (for payments)
STRIPE_SECRET_KEY="sk_test_your_key"
STRIPE_PUBLIC_KEY="pk_test_your_key"
```

### Optional Variables

```env
# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN="your-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-id"

# Email Provider
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
```

## 🏗️ Architecture Overview

```
src/
├── app/                 # Next.js 15 App Router
│   ├── (dashboard)/     # Protected dashboard routes
│   ├── api/            # API endpoints
│   ├── auth/           # Authentication pages
│   └── globals.css     # Global styles
├── components/         # React components
│   ├── ui/            # Base UI components (Radix)
│   ├── dashboard/     # Dashboard components
│   ├── calendar/      # Calendar components
│   ├── payments/      # Payment components
│   └── analytics/     # Analytics components
├── lib/               # Utilities and services
│   ├── prisma.ts      # Database client
│   ├── auth.ts        # NextAuth configuration
│   ├── no-show-prediction.ts  # AI prediction
│   └── whatsapp-service.ts    # WhatsApp integration
└── hooks/             # Custom React hooks
```

## 🧪 Testing Setup

The project includes comprehensive testing:

- **Unit Tests**: Component and utility testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow testing (planned)

Run tests:
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report
```

## 🚀 Production Deployment

### 1. Environment Setup

```env
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@host:5432/beautyflow"
NEXTAUTH_URL="https://yourdomain.com"
```

### 2. Build and Deploy

```bash
# Build
npm run build

# Run migrations
npm run db:migrate

# Start production server
npm start
```

### 3. Recommended Platforms

- **Vercel**: Automatic deployment with GitHub
- **Railway**: Database + app hosting
- **PlanetScale**: Serverless database
- **Supabase**: PostgreSQL + auth

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Database**: Use connection pooling in production
3. **Authentication**: Strong NEXTAUTH_SECRET
4. **HTTPS**: Required for OAuth and webhooks
5. **CORS**: Configure for your domain

## 📈 Performance Optimization

1. **Database**: Add indexes for common queries
2. **Images**: Use Next.js Image optimization
3. **Caching**: Implement Redis for sessions
4. **CDN**: Use for static assets
5. **Monitoring**: Add Sentry or similar

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U beautyflow_user -d beautyflow
```

**Prisma Client Error**
```bash
# Regenerate client
npm run db:generate

# Reset database
npm run db:reset
```

**OAuth Issues**
- Verify redirect URLs in OAuth providers
- Check NEXTAUTH_URL matches deployment URL
- Ensure HTTPS in production

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.