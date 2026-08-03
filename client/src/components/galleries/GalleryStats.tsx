import React from 'react';
import { GalleryStats as GalleryStatsType } from '../../types/gallery';
import { Users, Eye, Heart, Download } from 'lucide-react';

interface GalleryStatsProps {
  stats: GalleryStatsType;
}

const GalleryStats: React.FC<GalleryStatsProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Visitors</p>
              <p className="text-xl font-semibold text-gray-900">{stats.uniqueVisitors}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Eye className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Views</p>
              <p className="text-xl font-semibold text-gray-900">{stats.totalViews}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Heart className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Favorites</p>
              <p className="text-xl font-semibold text-gray-900">{stats.totalFavorites}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Download className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Downloads</p>
              <p className="text-xl font-semibold text-gray-900">{stats.totalDownloads}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Daily Stats Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Over Time</h3>
        
        {stats.dailyStats.length > 0 ? (
          <div className="h-64">
            {/* This would be implemented with a chart library like Chart.js or Recharts */}
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">Chart would be displayed here</p>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">No activity data available yet</p>
          </div>
        )}
      </div>
      
      {/* Top Images */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Most Popular Images</h3>
        
        {stats.topImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {stats.topImages.map((image, index) => (
              <div key={image.imageId} className="space-y-2">
                <div className="aspect-square overflow-hidden rounded-lg">
                  <img 
                    src={image.thumbUrl} 
                    alt={`Popular image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <Eye size={12} className="mr-1" /> {image.views}
                  </span>
                  <span className="flex items-center">
                    <Heart size={12} className="mr-1" /> {image.favorites}
                  </span>
                  <span className="flex items-center">
                    <Download size={12} className="mr-1" /> {image.downloads}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">No image popularity data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryStats;