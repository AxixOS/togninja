import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Loader2, RefreshCw, Wifi, WifiOff, Minimize2, Maximize2 } from 'lucide-react';
import { clampToViewport, isDrag, widgetSize } from '../../lib/widgetPosition';

type ConnectionStatus = 'connected' | 'checking' | 'disconnected' | 'reconnecting';

const AgentChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // --- Draggable position -------------------------------------------------
  // Parked bottom-right, the widget covered whatever the page rendered there.
  // On Galleries that was the pagination control, so page 2 could not be clicked.
  // Position is kept per-browser so a studio only has to move it once.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('agentChatWidgetPos');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const dragRef = useRef<{ dx: number; dy: number; startX: number; startY: number } | null>(null);
  const didDragRef = useRef(false);

  // Which shape is on screen right now. The saved position has to be clamped against
  // THIS, not against whatever it was when the studio last dragged it.
  const currentState: 'button' | 'minimized' | 'open' =
    !isOpen ? 'button' : isMinimized ? 'minimized' : 'open';

  // onDragMove is a useCallback with no deps — it is registered on window once — so it
  // cannot close over currentState. A ref keeps the size it clamps against honest
  // without re-registering the listener on every open and close.
  const currentStateRef = useRef(currentState);
  currentStateRef.current = currentState;

  // Fitting is a RENDER concern, not a stored one.
  //
  // The first version of this clamped and then WROTE THE RESULT BACK. Opening the chat
  // near the bottom-right pulled the 720px window to (1192, 352) on a 1080p screen —
  // correct for the window — and that clamped value was then saved. Closing it left the
  // little button stranded in the upper middle of the page, on top of the page title,
  // nowhere near where the studio had put it.
  //
  // So the studio's chosen point is kept verbatim and the clamp is applied only when
  // drawing. The button returns to its corner the moment the window closes.
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Default (bottom-right) until the studio moves it; after that, explicit coordinates.
  const shown = pos ? clampToViewport(pos, widgetSize(currentState), viewport) : null;
  const dragStyle: React.CSSProperties = shown
    ? { left: shown.x, top: shown.y, right: 'auto', bottom: 'auto' }
    : { right: '1.5rem', bottom: '1.5rem' };

  const startDrag = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragRef.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
    };
    didDragRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  /**
   * Dragging by the chat window's header.
   *
   * The header also holds the minimize and close buttons, and setPointerCapture on the
   * header retargets the whole gesture to it — so the click never reached the X and the
   * window could not be closed. Making the header a drag handle without this check is
   * what broke it.
   *
   * A press that starts on any control is that control's press, not a drag.
   */
  const startHeaderDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) return;
    startDrag(e);
  };

  const onDragMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;

    // The slop the old comment promised but never implemented: it set didDrag on the
    // FIRST move event, so a click with a pixel of hand-shake was treated as a drag and
    // the chat refused to open.
    if (!isDrag({ x: d.startX, y: d.startY }, { x: e.clientX, y: e.clientY })) return;
    didDragRef.current = true;

    setPos(clampToViewport(
      { x: e.clientX - d.dx, y: e.clientY - d.dy },
      widgetSize(currentStateRef.current),
      { width: window.innerWidth, height: window.innerHeight },
    ));
  }, []);

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setPos(current => {
      if (current) {
        try { localStorage.setItem('agentChatWidgetPos', JSON.stringify(current)); } catch {}
      }
      return current;
    });
    // Let the click handler see the drag, then clear it.
    window.setTimeout(() => { didDragRef.current = false; }, 0);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', endDrag);
    return () => {
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', endDrag);
    };
  }, [onDragMove, endDrag]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Health check function
  const checkAgentHealth = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/api/agent/v2/stats', {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Auto-reconnection logic
  const attemptReconnection = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionStatus('disconnected');
      return;
    }
    setConnectionStatus('reconnecting');
    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 15000);
    await new Promise(resolve => setTimeout(resolve, delay));
    const isHealthy = await checkAgentHealth();
    if (isHealthy) {
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
    } else {
      attemptReconnection();
    }
  }, [checkAgentHealth]);

  // Initial health check when widget opens
  useEffect(() => {
    if (isOpen) {
      checkAgentHealth().then(healthy => {
        setConnectionStatus(healthy ? 'connected' : 'disconnected');
        if (!healthy) attemptReconnection();
      });
    }
  }, [isOpen, checkAgentHealth, attemptReconnection]);

  const handleSendMessage = async (retryMessage?: string) => {
    const userMessage = retryMessage || message.trim();
    if (!userMessage || isLoading) return;

    if (connectionStatus === 'disconnected') {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Agent is disconnected. Reconnecting...'
      }]);
      attemptReconnection();
      return;
    }

    if (!retryMessage) {
      setMessage('');
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    }
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch('/api/agent/v2/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId,
          mode: 'auto_safe'
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      retryCountRef.current = 0;
      setConnectionStatus('connected');
      
      if (result.sessionId) {
        setSessionId(result.sessionId);
      }
      
      if (result.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
      } else if (result.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${result.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Task completed.' }]);
      }
    } catch (error: any) {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current));
        return handleSendMessage(userMessage);
      }
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Failed to send message. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    retryCountRef.current = 0;
  };

  const ConnectionIndicator = () => {
    const config = {
      connected: { color: 'bg-green-500', icon: Wifi },
      checking: { color: 'bg-yellow-500 animate-pulse', icon: Wifi },
      disconnected: { color: 'bg-red-500', icon: WifiOff },
      reconnecting: { color: 'bg-yellow-500 animate-pulse', icon: RefreshCw }
    }[connectionStatus];
    const Icon = config.icon;
    return (
      <div className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${config.color}`}></span>
        <Icon className={`w-3 h-3 ${connectionStatus === 'reconnecting' ? 'animate-spin' : ''}`} />
      </div>
    );
  };

  // Floating button when closed. Draggable, because parked bottom-right it sat on top
  // of whatever the page puts there — the Galleries pagination control, for one, which
  // made page 2 unreachable.
  if (!isOpen) {
    return (
      <button
        onClick={(e) => { if (!didDragRef.current) setIsOpen(true); }}
        onPointerDown={startDrag}
        style={dragStyle}
        className="fixed z-50 group touch-none cursor-grab active:cursor-grabbing"
        title="Open AI Assistant — drag to move"
      >
        <div className="relative">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-full animate-spin-slow opacity-75 blur-sm group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110">
            <Bot className="w-6 h-6 text-white" />
          </div>
          {/* Pulse effect */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 text-white text-xs items-center justify-center font-bold">AI</span>
          </span>
        </div>
      </button>
    );
  }

  // Chat window when open
  return (
    <div
      style={{ ...dragStyle, maxHeight: 'calc(100vh - 48px)' }}
      className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 flex flex-col ${
        isMinimized ? 'w-96 h-14' : 'w-[720px] h-[720px]'
      }`}
    >
      {/* Header — also the drag handle.

          Only the closed button used to carry onPointerDown, so once the chat was open
          it could not be moved. Combined with a position clamped for the 72px button,
          a window opened near the right edge hung off the screen with no way back. */}
      <div
        onPointerDown={startHeaderDrag}
        className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-white" />
          <span className="font-semibold text-white text-sm">Agent V2 Assistant</span>
          <ConnectionIndicator />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-white" />
            ) : (
              <Minimize2 className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Chat content (hidden when minimized) */}
      {!isMinimized && (
        <div className="flex flex-1 min-h-0">
          {/* Quick suggestions sidebar - always visible */}
          <div className="w-[240px] bg-purple-50 border-r border-purple-100 p-3 overflow-y-auto flex-shrink-0">
            <p className="text-xs font-semibold text-purple-700 mb-3 uppercase tracking-wide">Quick Actions</p>
            <div className="space-y-2">
              <button 
                onClick={() => handleSendMessage('Show me recent leads')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                📋 Recent leads
              </button>
              <button 
                onClick={() => handleSendMessage('What are my top clients by revenue?')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                👑 Top clients by revenue
              </button>
              <button 
                onClick={() => handleSendMessage('Show unpaid invoices')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                💰 Unpaid invoices
              </button>
              <button 
                onClick={() => handleSendMessage('Show my upcoming appointments')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                📅 Upcoming appointments
              </button>
              <button 
                onClick={() => handleSendMessage('What was my revenue last month?')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                📊 Last month revenue
              </button>
              <button 
                onClick={() => handleSendMessage('Show voucher sales this week')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                🎟️ Voucher sales this week
              </button>
              <button 
                onClick={() => handleSendMessage('List all active email campaigns')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                📧 Active campaigns
              </button>
              <button 
                onClick={() => handleSendMessage('Show clients who booked in the last 7 days')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                🆕 Recent bookings
              </button>
              <button 
                onClick={() => handleSendMessage('What galleries need photos uploaded?')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                🖼️ Galleries needing photos
              </button>
              <button 
                onClick={() => handleSendMessage('Draft a follow-up email for new leads')}
                className="w-full text-xs bg-white border border-purple-200 rounded-lg px-3 py-2.5 hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
              >
                ✉️ Draft follow-up email
              </button>
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {/* Messages area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                  <p className="text-lg font-medium">Hi! I'm your AI Assistant.</p>
                  <p className="text-sm mt-1">Ask me anything about your CRM data, or click a quick action to get started!</p>
                </div>
              )}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewSession}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="New conversation"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Ask anything..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!message.trim() || isLoading}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-2 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentChatWidget;
