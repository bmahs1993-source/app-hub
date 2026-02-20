import React from 'react';
import { motion } from 'motion/react';
import { Star, Download, ExternalLink } from 'lucide-react';
import { AppRecord } from '../types';
import { Link } from 'react-router-dom';

interface AppCardProps {
  app: AppRecord;
}

export const AppCard: React.FC<AppCardProps> = ({ app }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-200 card-hover"
    >
      <Link to={`/app/${app.id}`} className="block">
        <div className="aspect-square overflow-hidden bg-neutral-100">
          <img
            src={app.icon_url || `https://picsum.photos/seed/${app.id}/400/400`}
            alt={app.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-display font-semibold text-lg truncate pr-2">{app.name}</h3>
            <div className="flex items-center text-amber-500 text-sm font-medium">
              <Star className="w-4 h-4 fill-current mr-1" />
              {app.rating.toFixed(1)}
            </div>
          </div>
          <p className="text-neutral-500 text-sm line-clamp-2 mb-3 h-10">
            {app.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium px-2 py-1 bg-neutral-100 rounded-full text-neutral-600">
              {app.category}
            </span>
            <div className="flex items-center text-xs text-neutral-400">
              <Download className="w-3 h-3 mr-1" />
              {app.downloads.toLocaleString()}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
