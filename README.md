# 🌍 World Local News - Global News Aggregator

A modern, real-time news aggregator that fetches headlines from major news sources worldwide. Built with React, TypeScript, Vite, and Supabase.

![World Local News](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Vite](https://img.shields.io/badge/Vite-5.0-purple) ![Supabase](https://img.shields.io/badge/Supabase-2.0-green)

## ✨ Features

- 🌍 **Global Coverage**: News from 6 continents with 30+ major news sources
- 🔍 **Smart Search**: Search across all articles with real-time filtering
- 🌎 **Region Filtering**: Filter news by continent (Asia, Africa, Europe, North America, South America, Oceania)
- ⚡ **Real-time Updates**: Live RSS feed scraping with background updates
- 📱 **Responsive Design**: Beautiful, modern UI that works on all devices
- 🔗 **Direct Links**: Click articles to read full stories on original news sites
- ⏱️ **Timeout Protection**: 30-second timeout prevents hanging requests
- 📄 **Pagination**: Load more articles with infinite scroll
- 🎨 **Animations**: Smooth transitions and loading states

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/world-local-news.git
   cd world-local-news
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase Database**
   - Run the SQL script in `setup-database-simple.sql` in your Supabase SQL Editor
   - Deploy the Edge Function using `comprehensive-news-scraper.ts`

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:8080`

## 📁 Project Structure

### 🎯 Core Application Files

#### `src/pages/Index.tsx`
**Main application page** - The heart of the news aggregator
- **Purpose**: Displays news articles with search, filtering, and pagination
- **Key Features**:
  - Article fetching with pagination (10 articles per page)
  - Real-time search across titles and descriptions
  - Region filtering (All, Asia, Africa, Europe, North America, South America, Oceania)
  - Background news scraping with timeout protection
  - Loading states and error handling
  - Responsive grid layout for articles

#### `src/components/ArticleCard.tsx`
**Individual article display component**
- **Purpose**: Renders each news article in a beautiful card format
- **Key Features**:
  - Clean article title and description display
  - Source and region badges
  - Publication date formatting
  - Direct links to original news sources
  - Hover animations and transitions
  - URL resolution for Google News redirects

#### `src/integrations/supabase/client.ts`
**Supabase database connection**
- **Purpose**: Initializes Supabase client with environment variables
- **Features**:
  - Environment variable validation
  - Debug logging for connection issues
  - Hardcoded credentials for reliability

#### `src/integrations/supabase/types.ts`
**TypeScript type definitions**
- **Purpose**: Defines database schema types for type safety
- **Features**:
  - Article table structure
  - Database version compatibility

### 🎨 Styling & UI

#### `src/index.css`
**Global styles and animations**
- **Purpose**: Defines Tailwind CSS directives and custom animations
- **Key Features**:
  - Custom keyframe animations (fadeIn, fadeInUp, glow, shimmer, bounceGentle, scaleIn, slideUp)
  - Utility classes for hover effects
  - Loading animations
  - Responsive design utilities

### 🗄️ Database & Backend

#### `setup-database-simple.sql`
**Database schema setup**
- **Purpose**: Creates the articles table and sets up Row Level Security (RLS)
- **Features**:
  - Articles table with all necessary columns
  - Indexes for performance optimization
  - RLS policies for data security
  - UUID primary key generation

#### `comprehensive-news-scraper.ts`
**Main Edge Function for news scraping**
- **Purpose**: Fetches real-time news from 30+ RSS feeds worldwide
- **Key Features**:
  - **30+ News Sources**: BBC, CNN, Reuters, Al Jazeera, Times of India, China Daily, Japan Times, and more
  - **Global Coverage**: Sources from all 6 continents
  - **Region Filtering**: Fetches region-specific news
  - **Search Functionality**: Filters articles by keywords
  - **URL Resolution**: Converts redirect links to direct article URLs
  - **Duplicate Prevention**: Removes duplicate articles
  - **Error Handling**: Graceful handling of failed RSS feeds

#### `supabase/functions/scrape-news/index.ts`
**Deployed Edge Function**
- **Purpose**: The actual deployed function in Supabase
- **Features**: Same as comprehensive-news-scraper.ts but deployed version

### 🔧 Configuration & Deployment

#### `package.json`
**Project dependencies and scripts**
- **Purpose**: Defines project metadata, dependencies, and build scripts
- **Key Dependencies**:
  - React 18 with TypeScript
  - Vite for fast development and building
  - Supabase client for database operations
  - Tailwind CSS for styling
  - shadcn/ui components
  - React Router for navigation

#### `vite.config.ts`
**Vite build configuration**
- **Purpose**: Configures the Vite build tool
- **Features**: TypeScript support, path aliases, and optimization settings

#### `tailwind.config.ts`
**Tailwind CSS configuration**
- **Purpose**: Customizes Tailwind CSS theme and utilities
- **Features**: Custom colors, animations, and responsive breakpoints

### 📚 Documentation & Utilities

#### `deploy-function-manually.md`
**Manual deployment guide**
- **Purpose**: Step-by-step instructions for deploying the Edge Function
- **Features**: Screenshots and detailed instructions for Supabase dashboard

#### `scrape-news-function.js`
**JavaScript version of the scraper**
- **Purpose**: Alternative JavaScript implementation for manual deployment
- **Features**: Same functionality as TypeScript version but in JavaScript

#### `real-news-scraper.ts`
**Simplified news scraper**
- **Purpose**: Basic version with fewer news sources
- **Features**: Good for testing and development

## 🌍 News Sources by Region

### 🌏 Asia (6 sources)
- **Al Jazeera** (Qatar) - International news
- **Times of India** (India) - Indian news and world coverage
- **China Daily** (China) - Chinese perspective on world events
- **Japan Times** (Japan) - Japanese and Asian news
- **Gulf News** (UAE) - Middle Eastern and Gulf region news
- **Straits Times** (Singapore) - Southeast Asian news

### 🌍 Africa (5 sources)
- **BBC Africa** (UK) - African news coverage
- **Al Jazeera Africa** (Qatar) - African and Middle Eastern news
- **News24** (South Africa) - South African and African news
- **Daily Nation** (Kenya) - East African news
- **Premium Times** (Nigeria) - Nigerian and West African news

### 🌎 South America (5 sources)
- **BBC Latin America** (UK) - Latin American news
- **Al Jazeera Americas** (Qatar) - Americas coverage
- **Folha de S.Paulo** (Brazil) - Brazilian and South American news
- **Clarín** (Argentina) - Argentine and regional news
- **El Tiempo** (Colombia) - Colombian and Andean news

### 🌍 Europe (5 sources)
- **The Guardian** (UK) - British and international news
- **BBC News UK** (UK) - British news and world coverage
- **Deutsche Welle** (Germany) - German and European news
- **France 24** (France) - French and European perspective
- **RT News** (Russia) - Russian and alternative perspective

### 🌎 North America (5 sources)
- **CNN** (US) - American and international news
- **BBC News** (US) - International news from US perspective
- **Reuters** (US) - Global news agency
- **Associated Press** (US) - American news agency
- **CBC News** (Canada) - Canadian and North American news

### 🌏 Oceania (3 sources)
- **ABC News Australia** (Australia) - Australian and Pacific news
- **BBC Australia** (UK) - Australian news from UK perspective
- **Stuff New Zealand** (New Zealand) - New Zealand and Pacific news

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Database Schema

```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  snippet TEXT,
  url TEXT UNIQUE NOT NULL,
  source_name TEXT,
  source_country TEXT,
  source_region TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Deployment

### Supabase Setup

1. **Create a new Supabase project**
2. **Run the database setup script** (`setup-database-simple.sql`)
3. **Deploy the Edge Function** using `comprehensive-news-scraper.ts`
4. **Set environment variables** in your Supabase project

### Frontend Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to your preferred platform** (Vercel, Netlify, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the backend infrastructure
- [React](https://reactjs.org) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com) for styling
- [shadcn/ui](https://ui.shadcn.com) for UI components
- All the news sources that provide RSS feeds

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

**Made with ❤️ for global news accessibility**