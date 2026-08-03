# New Age Fotografie CRM

A comprehensive customer relationship management system designed for professional photography studios. Built with React, Express.js, and PostgreSQL.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/photography-crm)

## ⚡ One-Click Setup

1. **Fork this repository**
2. **Connect to Vercel** 
3. **Add environment variables** (see below)
4. **Deploy automatically**

## 🔧 Required Environment Variables

Set these in your Vercel dashboard:

```bash
# Database (Required)
DATABASE_URL=your_neon_postgresql_url
NODE_ENV=production
SESSION_SECRET=your_secure_random_string

# AI Features (Optional)
OPENAI_API_KEY=your_openai_key

# Payments (Optional)
STRIPE_SECRET_KEY=your_stripe_secret
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

> 📋 **Complete setup guide**: See [VERCEL-ENVIRONMENT-VARIABLES.md](./VERCEL-ENVIRONMENT-VARIABLES.md)

## ✨ Features

- **Customer Management** - Complete CRM for photography clients
- **Gallery System** - Showcase and organize photo collections  
- **Booking Calendar** - Schedule sessions and appointments
- **Invoice Generation** - PDF invoices with Stripe integration
- **AI Assistant** - Intelligent CRM automation with 60+ tools
- **Email Integration** - Automated communication workflows
- **Analytics Dashboard** - Business insights and reporting

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js, TypeScript
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Authentication**: Session-based with OpenID Connect
- **Deployment**: Vercel, serverless functions
- **AI**: OpenAI GPT-4, Anthropic Claude

## 📱 Demo

Live demo available at: [Your Vercel URL]

## 🏗️ Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/photography-crm.git
cd photography-crm

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Run development server
npm run dev
```

Opens at `http://localhost:5000`

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🗄️ Database Setup

This application uses PostgreSQL. For production, we recommend [Neon](https://neon.tech):

1. Create a Neon project
2. Copy your DATABASE_URL
3. Add to Vercel environment variables
4. Deploy - tables are created automatically

## 📋 Environment Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NODE_ENV` | ✅ | Set to `production` |
| `SESSION_SECRET` | ✅ | Secure random string for sessions |
| `OPENAI_API_KEY` | ⚠️ | For AI assistant features |
| `STRIPE_SECRET_KEY` | ⚠️ | For payment processing |
| `VITE_STRIPE_PUBLIC_KEY` | ⚠️ | Stripe public key (frontend) |

## Custom Voucher Coupons (Server-side)

You can define custom coupon codes that are validated on the server and applied directly to the Stripe Checkout prices (no Stripe promotion codes used). Configure them via the `COUPONS_JSON` environment variable.

Schema (JSON array):
- code: string (case-insensitive)
- type: "percent" | "amount" (amount is in cents)
- value: number (percent 0-100, or amount in cents)
- skus: optional array of strings; only items whose `sku` (or `productSlug`) matches will be discounted. Matching is case-insensitive.

Example JSON:
[
	{ "code": "VCWIEN", "type": "percent", "value": 50, "skus": ["maternity-basic", "family-basic", "newborn-basic"] },
	{ "code": "FAM20",  "type": "amount",  "value": 2000, "skus": ["family-basic"] },
	{ "code": "NEWB95", "type": "percent", "value": 15, "skus": ["newborn-basic"] }
]

Heroku CLI (PowerShell) examples:

Show current codes:

```powershell
heroku config:get COUPONS_JSON
```

Publish new set of codes (use a single-line JSON string; no comments):

```powershell
heroku config:set COUPONS_JSON='[{"code":"VCWIEN","type":"percent","value":50,"skus":["maternity-basic","family-basic","newborn-basic"]},{"code":"FAM20","type":"amount","value":2000,"skus":["family-basic"]},{"code":"NEWB95","type":"percent","value":15,"skus":["newborn-basic"]}]'
```

Notes:
- The validator endpoint `/api/vouchers/coupons/validate` uses `COUPONS_JSON` first. If no match is found, it falls back to DB coupons (legacy).
- During Stripe session creation, if a matching custom coupon is present, the server recalculates discounted unit amounts and disables Stripe promo codes at checkout.
- Client sends an `sku` per voucher item (defaults to `productSlug`) to ensure accurate coupon targeting.
## 🔒 Security

- Session-based authentication
- SQL injection protection via Drizzle ORM
- Environment variable validation
- Secure file upload handling
- API rate limiting

## 📞 Support

- [Documentation](./VERCEL-ENVIRONMENT-VARIABLES.md)
- [Deployment Guide](./GITHUB-DEPLOYMENT-READY.md)
- Issues: GitHub Issues tab

## 📄 License

MIT License - see LICENSE file for details

---

**Ready to deploy your photography business online?** 📸

*Built for photographers, by photographers*