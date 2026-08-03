import React, { useState } from 'react';
import { Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2, Link as LinkIcon, Image, Undo, Redo, Code } from 'lucide-react';
import { uploadImage } from '../../lib/blog-api';

interface RichTextEditorProps {
  initialContent?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  initialContent = '', 
  onChange,
  placeholder = 'Start writing...'
}) => {
  const [content, setContent] = useState(initialContent);
  const [imageUploading, setImageUploading] = useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (initialContent && content !== initialContent) {
      setContent(initialContent);
    }
  }, [initialContent]);

  const execCommand = (command: string, value: string | boolean = false) => {
    document.execCommand(command, false, value);
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      onChange(newContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      execCommand('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageUploading(true);
      const imageUrl = await uploadImage(file);
      execCommand('insertHTML', `<img src="${imageUrl}" alt="Uploaded image" class="max-w-full h-auto my-4 rounded" />`);
    } catch (error) {
      // console.error removed
      alert('Failed to upload image. Please try again.');
    } finally {
      setImageUploading(false);
      // Clear the input value so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleLinkInsert = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 bg-gray-50">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-2 rounded hover:bg-gray-200"
          title="Bold"
        >
          <Bold size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-2 rounded hover:bg-gray-200"
          title="Italic"
        >
          <Italic size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h1>')}
          className="p-2 rounded hover:bg-gray-200"
          title="Heading 1"
        >
          <Heading1 size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h2>')}
          className="p-2 rounded hover:bg-gray-200"
          title="Heading 2"
        >
          <Heading2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 rounded hover:bg-gray-200"
          title="Bullet List"
        >
          <List size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 rounded hover:bg-gray-200"
          title="Ordered List"
        >
          <ListOrdered size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<blockquote>')}
          className="p-2 rounded hover:bg-gray-200"
          title="Quote"
        >
          <Quote size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<pre>')}
          className="p-2 rounded hover:bg-gray-200"
          title="Code Block"
        >
          <Code size={18} />
        </button>
        <button
          type="button"
          onClick={handleLinkInsert}
          className="p-2 rounded hover:bg-gray-200"
          title="Link"
        >
          <LinkIcon size={18} />
        </button>
        <label className="relative">
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleImageUpload}
            disabled={imageUploading}
          />
          <div 
            className={`p-2 rounded hover:bg-gray-200 cursor-pointer ${imageUploading ? 'opacity-50' : ''}`}
            title="Insert Image"
          >
            <Image size={18} />
          </div>
        </label>
        <div className="ml-auto flex">
          <button
            type="button"
            onClick={() => execCommand('undo')}
            className="p-2 rounded hover:bg-gray-200"
            title="Undo"
          >
            <Undo size={18} />
          </button>
          <button
            type="button"
            onClick={() => execCommand('redo')}
            className="p-2 rounded hover:bg-gray-200"
            title="Redo"
          >
            <Redo size={18} />
          </button>
        </div>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[300px] p-4 focus:outline-none"
        dangerouslySetInnerHTML={{ __html: content }}
        onInput={updateContent}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;