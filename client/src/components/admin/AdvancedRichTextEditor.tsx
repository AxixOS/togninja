import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link,
  Image,
  Quote,
  Code,
  Type,
  Palette,
  Upload,
  X,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Table,
  Indent,
  Outdent,
  Subscript,
  Superscript,
  FileCode,
  Monitor,
  ChevronDown,
  Plus,
  Minus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdvancedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const AdvancedRichTextEditor: React.FC<AdvancedRichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Start writing your blog post content..." 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  // The exact HTML we last sent to the parent via onChange. Used to tell an
  // editor-originated change (don't touch the DOM → caret stays put) apart from
  // a genuinely external `value` change (load / undo-redo / mode switch → write).
  const lastEmittedRef = useRef<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showFontFamilyPicker, setShowFontFamilyPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showHeadingPicker, setShowHeadingPicker] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Enhanced color palette
  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
    '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
    '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
    '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
    '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
    '#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79',
    '#85200C', '#990000', '#B45F06', '#BF9000', '#38761D', '#134F5C', '#1155CC', '#0B5394', '#351C75', '#741B47',
    '#5B0F00', '#660000', '#783F04', '#7F6000', '#274E13', '#0C343D', '#1C4587', '#073763', '#20124D', '#4C1130'
  ];

  // Font families
  const fontFamilies = [
    { name: 'Default', value: '' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: '"Times New Roman", serif' },
    { name: 'Courier New', value: '"Courier New", monospace' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
    { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
    { name: 'Impact', value: 'Impact, sans-serif' },
    { name: 'Palatino', value: 'Palatino, serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
    { name: 'Century Gothic', value: '"Century Gothic", sans-serif' },
    { name: 'Lucida Console', value: '"Lucida Console", monospace' },
    { name: 'Book Antiqua', value: '"Book Antiqua", serif' },
    { name: 'Calibri', value: 'Calibri, sans-serif' },
    { name: 'Cambria', value: 'Cambria, serif' },
    { name: 'Garamond', value: 'Garamond, serif' }
  ];

  // Font sizes
  const fontSizes = [
    { label: '8px', value: '1' },
    { label: '10px', value: '2' },
    { label: '12px', value: '3' },
    { label: '14px', value: '4' },
    { label: '18px', value: '5' },
    { label: '24px', value: '6' },
    { label: '36px', value: '7' }
  ];

  // Heading options
  const headingOptions = [
    { label: 'Normal Text', value: 'div' },
    { label: 'Heading 1', value: 'h1' },
    { label: 'Heading 2', value: 'h2' },
    { label: 'Heading 3', value: 'h3' },
    { label: 'Heading 4', value: 'h4' },
    { label: 'Heading 5', value: 'h5' },
    { label: 'Heading 6', value: 'h6' },
    { label: 'Paragraph', value: 'p' },
    { label: 'Preformatted', value: 'pre' }
  ];

  useEffect(() => {
    if (isHtmlMode) {
      setHtmlContent(value);
    }
  }, [value, isHtmlMode]);

  // Sync the editor DOM from `value` ONLY for EXTERNAL changes.
  //
  // The caret-jump bug: typing fires onInput -> onChange(value); the parent
  // re-renders with a new `value`, re-running this effect. Reassigning innerHTML
  // rebuilds every text node, so the browser collapses the caret to offset 0 (it
  // jumps to the top of the document). We avoid that by remembering the exact
  // HTML we ourselves emitted (lastEmittedRef): when `value` equals it, the
  // change came from the user's own typing — leave the DOM untouched and the
  // caret stays put. The write still runs for genuine external changes: initial
  // load, undo/redo, and switching back from HTML/preview mode.
  useEffect(() => {
    if (!editorRef.current || isHtmlMode || isPreviewMode) return;
    if (value !== lastEmittedRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
      lastEmittedRef.current = value;
    }
  }, [value, isHtmlMode, isPreviewMode]);

  const saveToHistory = useCallback((content: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Emit content to the parent, recording it so the sync effect can recognise
  // this as our own change and leave the DOM (and caret) untouched.
  const emit = useCallback((html: string) => {
    lastEmittedRef.current = html;
    onChange(html);
  }, [onChange]);

  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    
    // Update the parent component with new content
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      emit(newContent);
      saveToHistory(newContent);
    }
  }, [onChange, saveToHistory]);

  // When the user pastes raw HTML markup (e.g. a prepared article), insert it as
  // real HTML instead of letting contentEditable escape it into visible "<p>" text.
  // Prefers text/plain so we drop any inline background/style soup from rich copies.
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const plain = e.clipboardData.getData('text/plain');
    if (plain && /<\/?[a-z][a-z0-9]*(\s[^>]*)?>/i.test(plain)) {
      e.preventDefault();
      document.execCommand('insertHTML', false, plain);
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        emit(newContent);
        saveToHistory(newContent);
      }
    }
  }, [onChange, saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const content = history[newIndex];
      setHistoryIndex(newIndex);
      emit(content);
      if (editorRef.current) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [history, historyIndex, onChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const content = history[newIndex];
      setHistoryIndex(newIndex);
      emit(content);
      if (editorRef.current) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [history, historyIndex, onChange]);

  const handleImageUpload = async (file: File) => {
    try {
      setImageUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `blog/content/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      // Insert image into editor with better styling
      const img = `<img src="${publicUrl}" alt="${file.name}" style="max-width: 100%; height: auto; margin: 15px auto; display: block; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" />`;
      document.execCommand('insertHTML', false, img);
      
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        emit(newContent);
        saveToHistory(newContent);
      }
      
      setShowImageUpload(false);
    } catch (error) {
      // console.error removed
      alert('Failed to upload image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleInsertLink = () => {
    if (linkUrl && linkText) {
      const link = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="color: #3B82F6; text-decoration: underline;">${linkText}</a>`;
      document.execCommand('insertHTML', false, link);
      
      if (editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        emit(newContent);
        saveToHistory(newContent);
      }
      
      setLinkUrl('');
      setLinkText('');
      setShowLinkDialog(false);
    }
  };

  const insertTable = (rows: number, cols: number) => {
    let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 15px 0;">';
    
    for (let i = 0; i < rows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHTML += `<td style="border: 1px solid #ddd; padding: 12px; ${i === 0 ? 'background-color: #f8f9fa; font-weight: bold;' : ''}">${i === 0 ? `Header ${j + 1}` : 'Cell content'}</td>`;
      }
      tableHTML += '</tr>';
    }
    
    tableHTML += '</table>';
    
    document.execCommand('insertHTML', false, tableHTML);
    
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      emit(newContent);
      saveToHistory(newContent);
    }
    
    setShowTableDialog(false);
  };

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
    setIsHtmlMode(false);
  };

  const toggleHtmlMode = () => {
    if (isHtmlMode) {
      // Switching back from HTML mode
      emit(htmlContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent;
      }
    } else {
      // Switching to HTML mode
      setHtmlContent(value);
    }
    setIsHtmlMode(!isHtmlMode);
    setIsPreviewMode(false);
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
    disabled?: boolean;
  }> = ({ onClick, active, children, title, disabled = false }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-2 rounded transition-colors ${
        disabled 
          ? 'text-gray-400 cursor-not-allowed'
          : active 
            ? 'bg-purple-100 text-purple-700' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );

  const DropdownButton: React.FC<{
    children: React.ReactNode;
    title: string;
    isOpen: boolean;
    onClick: () => void;
  }> = ({ children, title, isOpen, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded transition-colors flex items-center ${
        isOpen 
          ? 'bg-purple-100 text-purple-700' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
      <ChevronDown size={12} className="ml-1" />
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white" style={{ direction: 'ltr' }}>
      {/* Placeholder for the empty contentEditable. Rendered via CSS so the
          placeholder text is never part of the saved HTML content. */}
      <style>{`
        .advanced-rte:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
      {/* Main Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* History Controls */}
          <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
            <ToolbarButton 
              onClick={undo} 
              title="Undo" 
              disabled={historyIndex <= 0}
            >
              <Undo size={16} />
            </ToolbarButton>
            <ToolbarButton 
              onClick={redo} 
              title="Redo" 
              disabled={historyIndex >= history.length - 1}
            >
              <Redo size={16} />
            </ToolbarButton>
          </div>

          {/* View Mode Controls */}
          <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
            <ToolbarButton 
              onClick={togglePreview} 
              title="Toggle Preview" 
              active={isPreviewMode}
            >
              {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
            </ToolbarButton>
            <ToolbarButton 
              onClick={toggleHtmlMode} 
              title="HTML Source" 
              active={isHtmlMode}
            >
              <FileCode size={16} />
            </ToolbarButton>
          </div>

          {!isPreviewMode && !isHtmlMode && (
            <>
              {/* Font Family */}
              <div className="relative border-r border-gray-300 pr-2 mr-2">
                <DropdownButton 
                  onClick={() => setShowFontFamilyPicker(!showFontFamilyPicker)} 
                  title="Font Family"
                  isOpen={showFontFamilyPicker}
                >
                  <Type size={16} />
                </DropdownButton>
                {showFontFamilyPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-48 max-h-64 overflow-y-auto">
                    {fontFamilies.map((font) => (
                      <button
                        key={font.value}
                        type="button"
                        onClick={() => {
                          executeCommand('fontName', font.value);
                          setShowFontFamilyPicker(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                        style={{ fontFamily: font.value }}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Heading Selector */}
              <div className="relative border-r border-gray-300 pr-2 mr-2">
                <DropdownButton 
                  onClick={() => setShowHeadingPicker(!showHeadingPicker)} 
                  title="Heading"
                  isOpen={showHeadingPicker}
                >
                  <span className="text-sm font-medium">H</span>
                </DropdownButton>
                {showHeadingPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-40">
                    {headingOptions.map((heading) => (
                      <button
                        key={heading.value}
                        type="button"
                        onClick={() => {
                          executeCommand('formatBlock', heading.value);
                          setShowHeadingPicker(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {heading.value.startsWith('h') ? (
                          <span className={`font-bold ${
                            heading.value === 'h1' ? 'text-2xl' :
                            heading.value === 'h2' ? 'text-xl' :
                            heading.value === 'h3' ? 'text-lg' :
                            heading.value === 'h4' ? 'text-base' :
                            heading.value === 'h5' ? 'text-sm' : 'text-xs'
                          }`}>
                            {heading.label}
                          </span>
                        ) : (
                          <span>{heading.label}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Font Size */}
              <div className="relative border-r border-gray-300 pr-2 mr-2">
                <DropdownButton 
                  onClick={() => setShowFontSizePicker(!showFontSizePicker)} 
                  title="Font Size"
                  isOpen={showFontSizePicker}
                >
                  <span className="text-xs">Aa</span>
                </DropdownButton>
                {showFontSizePicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-24">
                    {fontSizes.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => {
                          executeCommand('fontSize', size.value);
                          setShowFontSizePicker(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                        style={{ fontSize: size.label }}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Text Formatting */}
              <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
                <ToolbarButton onClick={() => executeCommand('bold')} title="Bold">
                  <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('italic')} title="Italic">
                  <Italic size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('underline')} title="Underline">
                  <Underline size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('strikeThrough')} title="Strikethrough">
                  <Strikethrough size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('superscript')} title="Superscript">
                  <Superscript size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('subscript')} title="Subscript">
                  <Subscript size={16} />
                </ToolbarButton>
              </div>

              {/* Colors */}
              <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
                {/* Text Color */}
                <div className="relative">
                  <ToolbarButton 
                    onClick={() => setShowColorPicker(!showColorPicker)} 
                    title="Text Color"
                  >
                    <div className="relative">
                      <Type size={16} />
                      <div className="absolute -bottom-1 left-0 right-0 h-1 bg-red-500 rounded"></div>
                    </div>
                  </ToolbarButton>
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
                      <div className="grid grid-cols-10 gap-1">
                        {colors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              executeCommand('foreColor', color);
                              setShowColorPicker(false);
                            }}
                            className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Background Color */}
                <div className="relative">
                  <ToolbarButton 
                    onClick={() => setShowBgColorPicker(!showBgColorPicker)} 
                    title="Background Color"
                  >
                    <div className="relative">
                      <Palette size={16} />
                      <div className="absolute -bottom-1 left-0 right-0 h-1 bg-yellow-400 rounded"></div>
                    </div>
                  </ToolbarButton>
                  {showBgColorPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
                      <div className="grid grid-cols-10 gap-1">
                        {colors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              executeCommand('backColor', color);
                              setShowBgColorPicker(false);
                            }}
                            className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Alignment */}
              <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
                <ToolbarButton onClick={() => executeCommand('justifyLeft')} title="Align Left">
                  <AlignLeft size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('justifyCenter')} title="Align Center">
                  <AlignCenter size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('justifyRight')} title="Align Right">
                  <AlignRight size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('justifyFull')} title="Justify">
                  <AlignJustify size={16} />
                </ToolbarButton>
              </div>

              {/* Lists and Indentation */}
              <div className="flex items-center border-r border-gray-300 pr-2 mr-2">
                <ToolbarButton onClick={() => executeCommand('insertUnorderedList')} title="Bullet List">
                  <List size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('insertOrderedList')} title="Numbered List">
                  <ListOrdered size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('outdent')} title="Decrease Indent">
                  <Outdent size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('indent')} title="Increase Indent">
                  <Indent size={16} />
                </ToolbarButton>
              </div>

              {/* Insert Elements */}
              <div className="flex items-center">
                <ToolbarButton onClick={() => setShowLinkDialog(true)} title="Insert Link">
                  <Link size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => setShowImageUpload(true)} title="Insert Image">
                  <Image size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => setShowTableDialog(true)} title="Insert Table">
                  <Table size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('formatBlock', 'blockquote')} title="Quote">
                  <Quote size={16} />
                </ToolbarButton>
                <ToolbarButton onClick={() => executeCommand('formatBlock', 'pre')} title="Code Block">
                  <Code size={16} />
                </ToolbarButton>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="relative">
        {isPreviewMode ? (
          <div 
            className="min-h-96 p-6 prose max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : isHtmlMode ? (
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full min-h-96 p-4 font-mono text-sm border-0 outline-none resize-none"
            style={{ direction: 'ltr', textAlign: 'left' }}
            placeholder="Edit HTML source..."
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning={true}
            data-placeholder={placeholder}
            onInput={(e) => {
              const newContent = e.currentTarget.innerHTML;
              emit(newContent);
              saveToHistory(newContent);
            }}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                  e.preventDefault();
                  undo();
                } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
                  e.preventDefault();
                  redo();
                }
              }
            }}
            className="advanced-rte min-h-96 p-6 outline-none w-full border-0 focus:ring-0 prose max-w-none"
            style={{
              lineHeight: '1.7',
              fontSize: '16px',
              direction: 'ltr',
              textAlign: 'left',
              unicodeBidi: 'embed',
              writingMode: 'horizontal-tb',
              fontFamily: 'inherit'
            }}
            // NOTE: no dangerouslySetInnerHTML here — content is synced imperatively
            // by the guarded effect above. Binding it here would re-apply innerHTML
            // on every render and reintroduce the caret-jump bug.
          />
        )}
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Insert Link</h3>
              <button
                onClick={() => setShowLinkDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter link text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLinkDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertLink}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Insert Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Dialog */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Insert Image</h3>
              <button
                onClick={() => setShowImageUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  disabled={imageUploading}
                />
                {imageUploading && (
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <Upload className="animate-pulse mr-2" size={16} />
                    Uploading image...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Dialog */}
      {showTableDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-w-90vw">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Insert Table</h3>
              <button
                onClick={() => setShowTableDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Click to select table size:</p>
              <div className="grid grid-cols-8 gap-1 p-2 border border-gray-300 rounded">
                {Array.from({ length: 64 }, (_, i) => {
                  const row = Math.floor(i / 8) + 1;
                  const col = (i % 8) + 1;
                  return (
                    <button
                      key={i}
                      onClick={() => insertTable(row, col)}
                      className="w-6 h-6 border border-gray-300 hover:bg-purple-100 transition-colors"
                      title={`${row} x ${col}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedRichTextEditor;