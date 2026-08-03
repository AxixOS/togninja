import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { getTags, createTag } from '../../lib/blog-api';
import { BlogTag } from '../../types/blog';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
  isAdmin?: boolean;
}

const TagSelector: React.FC<TagSelectorProps> = ({ 
  selectedTags, 
  onChange,
  isAdmin = false
}) => {
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const fetchedTags = await getTags();
      setTags(fetchedTags);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTagName.trim() || !isAdmin) return;
    
    try {
      setIsCreatingTag(true);
      const newTag = await createTag(newTagName.trim());
      setTags([...tags, newTag]);
      setNewTagName('');
      setShowCreateForm(false);
      
      // Automatically select the new tag
      onChange([...selectedTags, newTag.id]);
    } catch (error) {
      // console.error removed
      alert('Failed to create tag. Please try again.');
    } finally {
      setIsCreatingTag(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="animate-spin h-5 w-5 text-gray-500 mr-2" />
        <span className="text-gray-500">Loading tags...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleTagToggle(tag.id)}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedTags.includes(tag.id)
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tag.name}
            {selectedTags.includes(tag.id) && (
              <X size={14} className="ml-1.5" />
            )}
          </button>
        ))}
        
        {isAdmin && !showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Plus size={14} className="mr-1" />
            Add Tag
          </button>
        )}
      </div>
      
      {isAdmin && showCreateForm && (
        <form onSubmit={handleCreateTag} className="flex items-center mt-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isCreatingTag}
          />
          <button
            type="submit"
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            disabled={!newTagName.trim() || isCreatingTag}
          >
            {isCreatingTag ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              'Create'
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm(false)}
            className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            disabled={isCreatingTag}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};

export default TagSelector;