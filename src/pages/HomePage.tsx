import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Rocket, TrendingUp, ShieldCheck } from 'lucide-react';
import { AppCard } from '../components/AppCard';
import { AppRecord } from '../types';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [dbError, setDbError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('Nexus App Store');

  const categories = ['All', 'Games', 'Productivity', 'Social', 'Tools', 'Education', 'Finance'];

  useEffect(() => {
    fetchApps();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('store_name').eq('id', 'main').single();
      if (data?.store_name) setStoreName(data.store_name);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchApps = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          setDbError('Database table "apps" not found. Please run the SQL setup script in your Supabase dashboard.');
        }
        throw error;
      }
      setApps(data || []);
    } catch (error) {
      console.error('Error fetching apps:', error);
      // Fallback mock data if Supabase is not configured
      setApps([
        {
          id: '1',
          name: 'Nexus Browser',
          description: 'The fastest browser for the modern web with built-in ad blocking and privacy features.',
          category: 'Tools',
          icon_url: 'https://picsum.photos/seed/browser/400/400',
          apk_url: '#',
          screenshots: [],
          rating: 4.8,
          downloads: 12500,
          developer: 'Nexus Labs',
          version: '2.4.0',
          size: '45MB',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'published'
        },
        {
          id: '2',
          name: 'Pixel Editor',
          description: 'Professional photo editing tools in the palm of your hand. Filters, layers, and more.',
          category: 'Productivity',
          icon_url: 'https://picsum.photos/seed/editor/400/400',
          apk_url: '#',
          screenshots: [],
          rating: 4.5,
          downloads: 8900,
          developer: 'Creative Apps',
          version: '1.2.1',
          size: '120MB',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'published'
        },
        {
          id: '3',
          name: 'Space Runner',
          description: 'An endless runner through the galaxy. Collect coins and upgrade your spaceship.',
          category: 'Games',
          icon_url: 'https://picsum.photos/seed/game/400/400',
          apk_url: '#',
          screenshots: [],
          rating: 4.9,
          downloads: 50000,
          developer: 'Nebula Games',
          version: '3.0.5',
          size: '250MB',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'published'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative bg-neutral-900 text-white py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.3),transparent_70%)]"></div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-7xl font-display font-bold mb-6 leading-tight">
              Discover the <span className="text-brand-500">Next Generation</span> of Apps
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 mb-10 leading-relaxed">
              {storeName} is the premier destination for high-quality, verified applications. 
              Built for speed, security, and the community.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => document.getElementById('apps-grid')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-full font-semibold transition-all flex items-center"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Explore Apps
              </button>
              <Link 
                to="/login"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-all backdrop-blur-sm border border-white/10"
              >
                Developer Portal
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="max-w-7xl mx-auto px-6 -mt-8 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl p-4 md:p-6 border border-neutral-200">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search apps, games, developers..."
                className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main id="apps-grid" className="max-w-7xl mx-auto px-6 mt-12">
        {dbError && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800">
            <ShieldCheck className="w-6 h-6 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">Database Setup Required</p>
              <p className="text-sm opacity-90">{dbError}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-brand-500" />
            {selectedCategory === 'All' ? 'Featured Apps' : `${selectedCategory} Apps`}
          </h2>
          <div className="flex items-center text-sm text-neutral-500">
            <ShieldCheck className="w-4 h-4 mr-1 text-blue-500" />
            All apps are verified
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse bg-neutral-200 rounded-2xl aspect-[3/4]"></div>
            ))}
          </div>
        ) : filteredApps.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredApps.map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-neutral-50 rounded-3xl border border-dashed border-neutral-300">
            <p className="text-neutral-500 text-lg">No apps found matching your criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
};
