'use client';

import { useState } from 'react';
import { Clock, FileText, ChevronRight, Trash2, Search } from 'lucide-react';
import { Article } from '@/types/app';

interface ArticleHistorySidebarProps {
  articles: Article[];
  onViewArticle: (article: Article) => void;
  onDeleteArticle: (articleId: string) => void;
}

export default function ArticleHistorySidebar({ 
  articles, 
  onViewArticle, 
  onDeleteArticle 
}: ArticleHistorySidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.primaryKeyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateTitle = (title: string, maxLength: number = 60) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  return (
    <div className="bg-white rounded-[20px] card-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Article History</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {articles.length}
          </span>
        </div>

        {/* Search */}
        {articles.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Articles List */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredArticles.length === 0 && articles.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No articles generated yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Your generated articles will appear here
              </p>
            </div>
          )}

          {filteredArticles.length === 0 && articles.length > 0 && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No articles match your search</p>
            </div>
          )}

          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className="group border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => onViewArticle(article)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm leading-tight mb-2">
                    {truncateTitle(article.title)}
                  </h4>
                  
                  <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3" />
                      <span>{article.wordCount} words</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{article.readingTime} min</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {formatDate(article.createdAt)}
                    </span>
                  </div>

                  <div className="mt-2">
                    <span className="inline-block bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full">
                      {article.primaryKeyword}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteArticle(article.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200"
                    title="Delete article"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {articles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Click any article to view • Auto-saved locally
            </p>
          </div>
        )}
      </div>
    </div>
  );
}