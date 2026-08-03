import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Note: Using div separator instead of missing @/components/ui/separator
import { Upload, Send, Loader2, Calendar, Globe, FileText, Mic, MicOff, Volume2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AutoBlogChatInterfaceProps {
  assistantId: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageCount?: number;
  metadata?: any;
}

export function AutoBlogChatInterface({ assistantId }: AutoBlogChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>('');
  
  // Publishing options
  const [publishOption, setPublishOption] = useState<'draft' | 'publish' | 'schedule'>('draft');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  
  // Voice-to-text functionality
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [supportsSpeechRecognition, setSupportsSpeechRecognition] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for browser support on component mount
  useEffect(() => {
    const checkSupport = () => {
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      const hasSupport = hasMediaRecorder && hasGetUserMedia;
      
      // Additional check for MediaRecorder support
      if (hasSupport && typeof MediaRecorder !== 'undefined') {
        try {
          // Test MediaRecorder support with supported MIME types
          const supportedTypes = ['audio/webm', 'audio/mp4', 'audio/wav'];
          const hasValidType = supportedTypes.some(type => MediaRecorder.isTypeSupported(type));
          setSupportsSpeechRecognition(hasValidType);
        } catch (error) {
          setSupportsSpeechRecognition(false);
        }
      } else {
        setSupportsSpeechRecognition(false);
      }
    };
    checkSupport();
  }, []);

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Check for browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Check MediaRecorder support with specific MIME types
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: options.mimeType || 'audio/webm' });
        setAudioChunks([]);
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(100); // Collect data every 100ms
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      setAudioChunks(chunks);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Unable to start recording: ${errorMessage}. Please check your microphone permissions.`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success && result.text) {
        // Add transcribed text to input message
        setInputMessage(prev => prev + (prev ? ' ' : '') + result.text);
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + images.length > 3) {
      alert('Maximum 3 images allowed');
      return;
    }
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() && images.length === 0) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      imageCount: images.length
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', inputMessage);
      formData.append('assistantId', assistantId);
      if (threadId) {
        formData.append('threadId', threadId);
      }

      // Add publishing options
      formData.append('publishOption', publishOption);
      if (customSlug) {
        formData.append('customSlug', customSlug);
      }
      if (publishOption === 'schedule' && scheduledDate && scheduledTime) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        formData.append('scheduledFor', scheduledDateTime.toISOString());
      }

      images.forEach((image, index) => {
        formData.append('images', image);
      });

      const response = await fetch('/api/autoblog/chat', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        let responseContent = result.response;
        
        // Add publishing information to the response
        if (result.blogPost) {
          responseContent += `\n\n✅ Blog Post Created Successfully!\n`;
          responseContent += `📝 Title: ${result.blogPost.title}\n`;
          responseContent += `🔗 URL: ${result.blogPost.url}\n`;
          responseContent += `📊 Status: ${result.blogPost.status}\n`;
          if (result.blogPost.status === 'SCHEDULED') {
            responseContent += `⏰ Scheduled for: ${scheduledDate} ${scheduledTime}\n`;
          }
        }
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          metadata: result.metadata
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (result.threadId) {
          setThreadId(result.threadId);
        }
        
        // Reset form after successful generation
        if (result.blogPost) {
          setPublishOption('draft');
          setCustomSlug('');
          setScheduledDate('');
          setScheduledTime('');
        }
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInputMessage('');
      setImages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Publishing Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Publishing Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Publish Option</Label>
              <Select value={publishOption} onValueChange={(value: 'draft' | 'publish' | 'schedule') => setPublishOption(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Save as Draft</SelectItem>
                  <SelectItem value="publish">Publish Immediately</SelectItem>
                  <SelectItem value="schedule">Schedule for Later</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="customSlug">Custom URL Slug (Optional)</Label>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="customSlug"
                  placeholder="custom-blog-url"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                />
              </div>
            </div>

            {publishOption === 'schedule' && (
              <div className="md:col-span-1">
                <Label>Schedule Date & Time</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Direct Assistant Chat
            <Badge variant="secondary">Assistant ID: {assistantId}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages */}
          <div className="max-h-96 overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground">
                Upload photography session images and start chatting with the AI assistant to generate comprehensive blog content.
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                    {message.imageCount && message.imageCount > 0 && (
                      <span className="ml-2">📷 {message.imageCount} images</span>
                    )}
                    {message.metadata && (
                      <span className="ml-2">• {message.metadata.model}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-background border p-3 rounded-lg flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assistant is analyzing and generating content...
                </div>
              </div>
            )}
          </div>

          <div className="border-t my-4" />

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Upload Photography Session Images (Max 3)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 3}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Images ({images.length}/3)
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Upload ${index + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message</Label>
              {supportsSpeechRecognition && (
                <div className="flex items-center gap-2">
                  {isRecording && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3" />
                      Recording: {formatRecordingTime(recordingTime)}
                    </Badge>
                  )}
                  {isTranscribing && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Transcribing...
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    className="flex items-center gap-1"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="h-4 w-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        Voice
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            <Textarea
              placeholder="Describe what kind of blog content you want to generate from the uploaded images... (or use voice input)"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              rows={3}
              disabled={isRecording}
            />
            {!supportsSpeechRecognition && (
              <p className="text-xs text-muted-foreground">
                Voice input not supported in this browser. Please use a modern browser with microphone access.
              </p>
            )}
          </div>

          <Button
            onClick={sendMessage}
            disabled={isLoading || (!inputMessage.trim() && images.length === 0)}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Content...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Generate Content with Assistant
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}