# VN Mobiles

A smartphone e-commerce store built with Next.js and Supabase, deployed on Vercel.

🔗 **Live:** [vnmobiles.vercel.app](https://vnmobiles.vercel.app)

## Features

- Browse smartphones with specs, colors and storage variants
- Search, filter and sort by brand and price
- Cart, orders and order status tracking
- Wishlist and product reviews
- User accounts
- Admin management for products and orders

## Tech Stack

- Next.js 16
- TypeScript
- Supabase (PostgreSQL)
- Vercel

## Getting Started

```bash
git clone https://github.com/vicramathithann/Esite.git
cd Esite
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Run `supabase/schema.sql` in the Supabase SQL Editor, then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Author

**Vicramathithan** · [@vicramathithann](https://github.com/vicramathithann)
