import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Star, 
  Download, 
  ChevronLeft, 
  ShieldCheck, 
  Info, 
  MessageSquare, 
  Share2,
  Calendar,
  HardDrive,
  Code
} from 'lucide-react';
import { AppRecord, Review } from '../types';
import { supabase } from '../lib/supabase';

export const AppDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<AppRecord | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppDetails();
  }, [id]);

  const fetchAppDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setApp(data);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('app_id', id)
        .order('created_at', { ascending: false });
      
      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error fetching app details:', error);
      // Fallback mock data
      setApp({
        id: id || '1',
        name: 'Nexus Browser',
        description: 'The fastest browser for the modern web with built-in ad blocking and privacy features. Experience the web like never before with lightning-fast page loads, secure browsing, and a customizable interface that adapts to your needs.\n\nKey Features:\n- Built-in Ad Blocker\n- Enhanced Privacy Protection\n- Customizable Themes\n- Cross-device Sync\n- Developer Tools Integration',
        category: 'Tools',
        icon_url: 'https://picsum.photos/seed/browser/400/400',
        apk_url: '#',
        screenshots: [
          'https://picsum.photos/seed/s1/800/450',
          'https://picsum.photos/seed/s2/800/450',
          'https://picsum.photos/seed/s3/800/450'
        ],
        rating: 4.8,
        downloads: 12500,
        developer: 'Nexus Labs',
        version: '2.4.0',
        size: '45MB',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'published'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: app?.name,
          text: app?.description,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDownload = async () => {
    if (!app) return;
    
    // Increment download count in Supabase
    try {
      await supabase
        .from('apps')
        .update({ downloads: (app.downloads || 0) + 1 })
        .eq('id', app.id);
      
      setApp({ ...app, downloads: (app.downloads || 0) + 1 });
      
      // Trigger download
      window.open(app.apk_url, '_blank');
    } catch (err) {
      console.error('Error updating downloads:', err);
      window.open(app.apk_url, '_blank');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!app) return <div className="min-h-screen flex items-center justify-center">App not found</div>;

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex gap-2">
            <button 
              onClick={handleShare}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: App Info */}
          <div className="lg:col-span-2">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-12">
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={app.icon_url}
                alt={app.name}
                className="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] shadow-2xl border-4 border-white shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl md:text-5xl font-display font-bold mb-2">{app.name}</h1>
                <p className="text-brand-600 font-medium text-lg mb-4">{app.developer}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 mb-8">
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-neutral-400 text-[10px] md:text-xs uppercase tracking-wider font-semibold mb-1">Rating</span>
                    <div className="flex items-center font-bold text-base md:text-lg">
                      {app.rating.toFixed(1)} <Star className="w-4 h-4 fill-amber-500 text-amber-500 ml-1" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center md:items-start border-l border-neutral-200 pl-4 md:pl-6">
                    <span className="text-neutral-400 text-[10px] md:text-xs uppercase tracking-wider font-semibold mb-1">Downloads</span>
                    <span className="font-bold text-base md:text-lg">{app.downloads.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col items-center md:items-start border-l border-neutral-200 pl-4 md:pl-6">
                    <span className="text-neutral-400 text-[10px] md:text-xs uppercase tracking-wider font-semibold mb-1">Size</span>
                    <span className="font-bold text-base md:text-lg">{app.size}</span>
                  </div>
                </div>
                <button 
                  onClick={handleDownload}
                  className="w-full md:w-auto px-12 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center"
                >
                  <Download className="w-6 h-6 mr-2" />
                  Download APK
                </button>
              </div>
            </div>

            {/* Screenshots */}
            <section className="mb-12">
              <h2 className="text-xl font-display font-bold mb-6">Screenshots</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {app.screenshots.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`Screenshot ${idx + 1}`}
                    className="h-64 md:h-96 rounded-2xl shadow-md object-cover"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            </section>

            {/* Description */}
            <section className="mb-12">
              <h2 className="text-xl font-display font-bold mb-4">About this app</h2>
              <div className="text-neutral-600 leading-relaxed whitespace-pre-wrap">
                {app.description}
              </div>
            </section>

            {/* Reviews */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold">Ratings & Reviews</h2>
                <button className="text-brand-600 font-semibold hover:underline">See all</button>
              </div>
              <div className="space-y-6">
                {reviews.length > 0 ? (
                  reviews.map(review => (
                    <div key={review.id} className="bg-white p-6 rounded-2xl border border-neutral-200">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold">{review.user_name}</span>
                        <div className="flex text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-neutral-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-neutral-600 text-sm">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-8 rounded-2xl border border-dashed border-neutral-300 text-center text-neutral-500">
                    No reviews yet. Be the first to review!
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar Info */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
              <h3 className="font-display font-bold mb-6 flex items-center">
                <Info className="w-5 h-5 mr-2 text-neutral-400" />
                Information
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                  <span className="text-neutral-500 text-sm flex items-center">
                    <Code className="w-4 h-4 mr-2" /> Developer
                  </span>
                  <span className="font-medium text-sm">{app.developer}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                  <span className="text-neutral-500 text-sm flex items-center">
                    <Calendar className="w-4 h-4 mr-2" /> Updated
                  </span>
                  <span className="font-medium text-sm">{new Date(app.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                  <span className="text-neutral-500 text-sm flex items-center">
                    <HardDrive className="w-4 h-4 mr-2" /> Version
                  </span>
                  <span className="font-medium text-sm">{app.version}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-neutral-500 text-sm flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Safety
                  </span>
                  <span className="text-brand-600 font-medium text-sm">Verified</span>
                </div>
              </div>
            </div>

            <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100">
              <h3 className="font-display font-bold text-brand-900 mb-2">Developer Support</h3>
              <p className="text-brand-700 text-sm mb-4">Have issues with this app? Contact the developer directly.</p>
              <a 
                href={`mailto:support@${app.developer.toLowerCase().replace(/\s+/g, '')}.com?subject=Support for ${app.name}`}
                className="w-full py-3 bg-white text-brand-600 rounded-xl font-semibold border border-brand-200 hover:bg-brand-100 transition-colors flex items-center justify-center"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
