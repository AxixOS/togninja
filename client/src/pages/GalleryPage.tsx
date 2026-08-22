import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ImageGrid from '../components/galleries/ImageGrid';
import Slideshow from '../components/galleries/Slideshow';
import { getGalleryBySlug, getPublicGalleryImages, authenticateGallery, uploadGalleryImages } from '../lib/gallery-api';
import { Gallery, GalleryImage } from '../types/gallery';
import { ArrowLeft, Download, Share2, Heart, Loader2, AlertCircle, Play, Lock, Mail, Image, Grid, Settings, HelpCircle, Calendar, HardDrive, CheckSquare, Info, Upload, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config/site';

const GalleryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAdmin } = useAuth();
  const { language } = useLanguage();
  const de = language === 'de';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedForSlideshow, setSelectedForSlideshow] = useState<Set<string>>(new Set());
  const [ratingFilter, setRatingFilter] = useState<'all' | 'love' | 'maybe' | 'reject'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Upload state for admin
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
  // Auth form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchGallery(slug);
      
      // Check for existing token in localStorage
      const savedToken = localStorage.getItem(`gallery_token_${slug}`);
      if (savedToken) {
        setAuthToken(savedToken);
        setIsAuthenticated(true);
      }
    } else {
      // No slug provided, stop loading
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // SEO / share-preview tags.
    //
    // These were hardcoded to the origin studio: "Foto-Galerie Wien — Familienfotos &
    // Porträts", a German description ending "vom Wiener Familienfotograf", and an
    // og:title with "Wien" appended. Every studio that bought this product served
    // another studio's city and language on every gallery they sent a client — and the
    // unmount cleanup put it back again.
    //
    // They also ignored the gallery itself: the title was a fixed string, so every
    // gallery shared one browser tab name and one link preview.
    const studio = SITE.name;
    const galleryName = gallery?.title?.trim();
    const title = galleryName ? `${galleryName} | ${studio}` : studio;

    document.title = title;

    const meta = (selector: string, attr: string, key: string, content: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const description = de
      ? `Private Galerie${galleryName ? ` – ${galleryName}` : ""}. Zugang mit dem Link und Passwort von ${studio}.`
      : `A private gallery${galleryName ? ` – ${galleryName}` : ""}. Access it with the link and password from ${studio}.`;

    meta('meta[name="description"]', "name", "description", description);
    meta('meta[property="og:title"]', "property", "og:title", title);
    meta('meta[property="og:description"]', "property", "og:description", description);

    // A private gallery has no business in a search index.
    meta('meta[name="robots"]', "name", "robots", "noindex, nofollow");

    return () => {
      document.title = studio;
    };
  }, [gallery, de]);

  useEffect(() => {
    if (isAuthenticated && slug && authToken) {
      fetchGalleryImages(slug, authToken);
      
      // Track gallery view
      trackGalleryView();
    }
  }, [isAuthenticated, slug, authToken]);

  const trackGalleryView = async () => {
    if (!gallery?.id) return;
    
    try {
      await fetch(`/api/galleries/${gallery.id}/track-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          visitorEmail: email || undefined,
          visitorName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
          metadata: {
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (err) {
      console.error('Failed to track view:', err);
      // Don't fail the page if tracking fails
    }
  };

  const fetchGallery = async (gallerySlug: string) => {
    try {
      setLoading(true);
      const data = await getGalleryBySlug(gallerySlug);
      setGallery(data);
    } catch (err) {
      // console.error removed
      setError(de ? 'Galerie konnte nicht geladen werden. Bitte versuchen Sie es erneut.' : 'Failed to load gallery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGalleryImages = async (gallerySlug: string, token: string) => {
    try {
      setLoading(true);
      const data = await getPublicGalleryImages(gallerySlug, token);
      setImages(data);
    } catch (err) {
      // console.error removed
      setError(de ? 'Galeriebilder konnten nicht geladen werden. Bitte versuchen Sie es erneut.' : 'Failed to load gallery images. Please try again.');
      
      // If the token is rejected, clear it and ask for the password again. These are
      // the codes server/lib/galleryToken.ts produces, plus the old wording.
      const rejected = ['auth_required', 'invalid_token', 'session_expired', 'Invalid token'];
      const message = err instanceof Error ? err.message : String(err);
      if (rejected.some((code) => message.includes(code))) {
        localStorage.removeItem(`gallery_token_${gallerySlug}`);
        setIsAuthenticated(false);
        setAuthToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  // Admin upload handler
  const handleAdminUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !gallery) return;
    
    try {
      setUploading(true);
      setUploadProgress(de ? `${files.length} Bilder werden hochgeladen...` : `Uploading ${files.length} images...`);
      
      const fileArray = Array.from(files);
      console.log(`[GalleryPage] Uploading ${fileArray.length} images to gallery ${gallery.id}`);
      
      const uploadedImages = await uploadGalleryImages(gallery.id, fileArray);
      console.log(`[GalleryPage] Upload complete:`, uploadedImages);
      
      if (uploadedImages && uploadedImages.length > 0) {
        setUploadProgress(de ? `${uploadedImages.length} Bilder erfolgreich hochgeladen!` : `Successfully uploaded ${uploadedImages.length} images!`);
        
        // Refresh gallery images
        if (slug && authToken) {
          await fetchGalleryImages(slug, authToken);
        }
      } else {
        setUploadProgress(de ? 'Upload abgeschlossen, aber keine Bilder wurden gespeichert. Bitte überprüfen Sie die Server-Logs.' : 'Upload completed but no images were saved. Please check the server logs.');
      }
      
      setTimeout(() => {
        setUploadProgress('');
      }, 5000);
    } catch (err: any) {
      console.error('[GalleryPage] Upload failed:', err);
      const errorMessage = err?.message || 'Unknown error';
      if (errorMessage.includes('401') || errorMessage.includes('Authentication')) {
        setUploadProgress(de ? 'Upload fehlgeschlagen: Sie müssen als Administrator angemeldet sein. Bitte melden Sie sich an und versuchen Sie es erneut.' : 'Upload failed: You must be logged in as admin. Please log in and try again.');
      } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
        setUploadProgress(de ? 'Upload fehlgeschlagen: Die Datei ist zu groß. Die maximale Größe beträgt 50 MB pro Bild.' : 'Upload failed: File is too large. Maximum size is 50MB per image.');
      } else {
        setUploadProgress(de ? `Upload fehlgeschlagen: ${errorMessage}` : `Upload failed: ${errorMessage}`);
      }
      setTimeout(() => {
        setUploadProgress('');
      }, 8000);
    } finally {
      setUploading(false);
    }
  };

  const handleAuthenticated = (token: string) => {
    setAuthToken(token);
    setIsAuthenticated(true);
    
    // Log access event
    logGalleryAccess(token);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setAuthError(de ? 'E-Mail ist erforderlich' : 'Email is required');
      return;
    }
    
    const isPasswordProtected = gallery?.isPasswordProtected;
    if (isPasswordProtected && !password) {
      setAuthError(de ? 'Passwort ist erforderlich' : 'Password is required');
      return;
    }
    
    try {
      setAuthLoading(true);
      setAuthError(null);
      
      const { token } = await authenticateGallery(slug || '', { 
        email, 
        firstName,
        lastName,
        password: isPasswordProtected ? password : undefined 
      });
      
      // Store token in localStorage for persistence
      localStorage.setItem(`gallery_token_${slug}`, token);

      // Keep the visitor.
      //
      // This form has always asked for an email address before opening a gallery, and
      // nothing in the client has ever called /capture-email — so every one was
      // collected and thrown away. The route, the gallery_email_captures table and the
      // admin panel that displays them all already existed; only this call was missing,
      // which is why the studio's gallery analytics showed nothing but zeroes.
      //
      // Deliberately not awaited and never allowed to throw: a visitor must get into
      // their gallery whether or not we managed to record that they did.
      if (gallery?.id) {
        fetch(`/api/galleries/${gallery.id}/capture-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
            source: 'gallery_access',
          }),
        }).catch(() => {});
      }

      // Notify parent component
      handleAuthenticated(token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : (de ? 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.' : 'Authentication failed. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const logGalleryAccess = async (token: string) => {
    // This would be implemented to log access to the gallery
    // console.log removed
  };

  // Slideshow handlers
  const openSlideshow = (index: number) => {
    setSlideshowIndex(index);
    setShowSlideshow(true);
  };

  const closeSlideshow = () => {
    setShowSlideshow(false);
  };

  const toggleFavorite = (imageId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(imageId)) {
        newFavorites.delete(imageId);
      } else {
        newFavorites.add(imageId);
      }
      // Persist to localStorage
      localStorage.setItem(`gallery_favorites_${slug}`, JSON.stringify(Array.from(newFavorites)));
      return newFavorites;
    });
  };

  // Selection handlers for slideshow
  const handleToggleSelection = (imageId: string) => {
    setSelectedForSlideshow(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const handleRunSlideshow = () => {
    if (selectedForSlideshow.size === 0) {
      alert(de ? 'Bitte wählen Sie mindestens ein Bild für die Diashow aus' : 'Please select at least one image for the slideshow');
      return;
    }
    setShowSlideshow(true);
  };

  const handleClearSelection = () => {
    setSelectedForSlideshow(new Set());
  };

  // Load favorites from localStorage
  useEffect(() => {
    if (slug) {
      const savedFavorites = localStorage.getItem(`gallery_favorites_${slug}`);
      if (savedFavorites) {
        try {
          const favArray = JSON.parse(savedFavorites);
          setFavorites(new Set(favArray));
        } catch (e) {
          console.error('Error loading favorites:', e);
        }
      }
    }
  }, [slug]);

  const handleDownloadAll = async () => {
    if (!gallery || !slug || !authToken) return;
    
    if (!gallery.downloadEnabled) {
      alert(de ? 'Downloads sind für diese Galerie deaktiviert.' : 'Downloads are disabled for this gallery.');
      return;
    }
    
    // Track download
    if (gallery.id) {
      try {
        await fetch(`/api/galleries/${gallery.id}/track-download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            visitorEmail: email || undefined,
            visitorName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
            metadata: {
              downloadType: 'all',
              imageCount: images.length,
              timestamp: new Date().toISOString()
            }
          })
        });
      } catch (err) {
        console.error('Failed to track download:', err);
        // Don't fail the download if tracking fails
      }
    }
    
    // Create a download link using Neon API
    const link = document.createElement('a');
    link.href = `/api/galleries/${slug}/download`;
    link.download = `${gallery.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
    
    // Add authorization header
    fetch(link.href, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    .then(response => {
      if (!response.ok) {
        // Without this, a 401 was written to disk as a .zip full of error JSON.
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem(`gallery_token_${slug}`);
          setIsAuthenticated(false);
          setAuthToken('');
        }
        throw new Error(String(response.status));
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      // console.error removed
      alert(de ? 'Galerie konnte nicht heruntergeladen werden. Bitte versuchen Sie es erneut.' : 'Failed to download gallery. Please try again.');
    });
  };

  const handleShare = () => {
    if (!gallery || !slug) return;
    
    const url = `${window.location.origin}/gallery/${slug}`;
    
    if (navigator.share) {
      navigator.share({
        title: gallery.title,
        url: url
      }).catch(err => {
        // console.error removed
        copyToClipboard(url);
      });
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          alert(de ? 'Galerie-Link in die Zwischenablage kopiert!' : 'Gallery link copied to clipboard!');
        })
        .catch(err => {
          // console.error removed
          prompt(de ? 'Diesen Link kopieren:' : 'Copy this link:', text);
        });
    } else {
      prompt(de ? 'Diesen Link kopieren:' : 'Copy this link:', text);
    }
  };

  // Apply filters: favorites and rating
  const filteredImages = images
    .filter(image => !showFavoritesOnly || image.isFavorite)
    .filter(image => ratingFilter === 'all' || image.rating === ratingFilter);

  // If no slug is provided, redirect to galleries overview
  if (!slug) {
    return <Navigate to="/galleries" replace />;
  }

  // Full-screen login view (not authenticated)
  if (!isAuthenticated && gallery) {
    const isPasswordProtected = gallery.isPasswordProtected;
    
    // Honor the focal point / zoom / rotation set in the Cover Designer so the
    // client sees exactly what was designed (previously hard-coded to centre).
    const coverPos = ((gallery as any).coverPosition) || { x: 50, y: 50 };
    const coverScale = Number((gallery as any).coverScale) || 100;
    const coverRotation = Number(coverPos.rotation) || 0;

    return (
      <div className="fixed inset-0 w-full h-full">
        {/* Full-screen background image (transform matches the Cover Designer) */}
        {gallery.coverImage ? (
          <img
            src={gallery.coverImage}
            alt={gallery.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `${coverPos.x}% ${coverPos.y}%`,
              transform: `scale(${coverScale / 100}) rotate(${coverRotation}deg)`,
              transformOrigin: `${coverPos.x}% ${coverPos.y}%`,
            }}
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-fuchsia-800" />
        )}

        {/* Left side overlay with login form */}
        <div className="absolute left-0 top-0 bottom-0 w-full md:w-[45%] lg:w-[40%] bg-black/50 backdrop-blur-sm flex flex-col justify-between p-8 md:p-12">
          {/* Gallery Title */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-[0.3em] uppercase mb-2">
              {gallery.title.split(' ').slice(0, -1).join(' ')}
            </h1>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-[0.3em] uppercase">
              {gallery.title.split(' ').slice(-1)[0]}
            </h2>
            
            {/* Divider line */}
            <div className="w-16 h-0.5 bg-white/50 my-8" />
            
            {/* Auth Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4 max-w-sm">
              {authError && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded flex items-start text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              
              <div>
                <label className="block text-xs text-white/70 uppercase tracking-wider mb-2">
                  {de ? 'E-Mail' : 'Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-white/30 text-white placeholder-white/40 py-2 px-0 focus:outline-none focus:border-white/70 transition-colors"
                  placeholder=""
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/70 uppercase tracking-wider mb-2">
                    {de ? 'Vorname' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 text-white placeholder-white/40 py-2 px-0 focus:outline-none focus:border-white/70 transition-colors"
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 uppercase tracking-wider mb-2">
                    {de ? 'Nachname' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 text-white placeholder-white/40 py-2 px-0 focus:outline-none focus:border-white/70 transition-colors"
                    placeholder=""
                  />
                </div>
              </div>
              
              {isPasswordProtected && (
                <div>
                  <label className="block text-xs text-white/70 uppercase tracking-wider mb-2">
                    {de ? 'Passwort' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-white/30 text-white placeholder-white/40 py-2 px-0 focus:outline-none focus:border-white/70 transition-colors"
                    placeholder=""
                    required
                  />
                </div>
              )}
              
              <button
                type="submit"
                disabled={authLoading}
                className="mt-6 w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white uppercase tracking-[0.2em] py-3 px-6 text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {de ? 'Wird geladen...' : 'Loading...'}
                  </>
                ) : (
                  de ? 'Galerie öffnen' : 'Open Gallery'
                )}
              </button>
            </form>
          </div>
        </div>
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // Gallery not found view
  if (!gallery && !loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{de ? 'Galerie nicht gefunden' : 'Gallery not found'}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {de ? 'Die gesuchte Galerie existiert nicht oder wurde entfernt.' : "The gallery you're looking for doesn't exist or has been removed."}
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                {de ? 'Zurück zur Startseite' : 'Return to home'}
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Loading state
  if (loading && !gallery) {
    return (
      <div className="fixed inset-0 w-full h-full bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
        <span className="ml-2 text-white">{de ? 'Galerie wird geladen...' : 'Loading gallery...'}</span>
      </div>
    );
  }

  // Authenticated view - show gallery content (Sprout Studio inspired layout)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/galleries" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            {gallery?.coverImage && (
              <img
                src={gallery.coverImage}
                alt={gallery?.title ? `${gallery.title} – ${de ? 'Galerie' : 'Gallery'}` : (de ? 'Galerie' : 'Gallery')}
                className="w-10 h-10 rounded-lg object-cover"
              />
            )}
            <h1 className="text-xl font-semibold text-gray-900">{gallery?.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
            <HelpCircle size={16} />
            <span className="hidden sm:inline">{de ? 'Hilfe' : 'Get Help'}</span>
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-60px)] p-4 hidden lg:block">
          {/* Gallery Cover Preview */}
          {gallery?.coverImage && (
            <div className="mb-6">
              <img 
                src={gallery.coverImage} 
                alt={gallery.title}
                className="w-full h-32 object-cover rounded-lg shadow-sm"
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{de ? 'Schnellaktionen' : 'Quick Actions'}</h3>
            <div className="space-y-1">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  showFavoritesOnly 
                    ? 'bg-pink-50 text-pink-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Heart size={16} className={showFavoritesOnly ? 'fill-current' : ''} />
                {showFavoritesOnly ? (de ? 'Alle anzeigen' : 'Show All') : (de ? 'Favoriten' : 'Favorites')}
              </button>
              
              {gallery?.downloadEnabled && (
                <button
                  onClick={handleDownloadAll}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Download size={16} />
                  {de ? 'Alle herunterladen' : 'Download All'}
                </button>
              )}
              
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Share2 size={16} />
                {de ? 'Galerie teilen' : 'Share Gallery'}
              </button>

              {selectedForSlideshow.size > 0 && (
                <button
                  onClick={handleRunSlideshow}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-green-500 text-white hover:bg-green-600 transition-colors"
                >
                  <Play size={16} />
                  {de ? 'Diashow' : 'Slideshow'} ({selectedForSlideshow.size})
                </button>
              )}
            </div>
          </div>

          {/* Filter by Rating */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filter</h3>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{de ? 'Alle Fotos' : 'All Photos'}</option>
              <option value="love">{de ? '😊 Gefällt mir' : '😊 Love'}</option>
              <option value="maybe">{de ? '😐 Vielleicht' : '😐 Maybe'}</option>
              <option value="reject">{de ? '☹️ Ablehnen' : '☹️ Reject'}</option>
            </select>
          </div>

          {/* Gallery Info */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{de ? 'Galerie-Info' : 'Gallery Info'}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Image size={14} />
                <span>{filteredImages.length} {de ? 'Fotos' : 'photos'}</span>
              </div>
              {gallery?.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>{de ? 'Erstellt' : 'Created'} {new Date(gallery.createdAt).toLocaleDateString(de ? 'de-DE' : 'en-US')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {/* Mobile Actions Bar */}
          <div className="lg:hidden mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                showFavoritesOnly 
                  ? 'bg-pink-50 border-pink-200 text-pink-700' 
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              <Heart size={16} className={showFavoritesOnly ? 'fill-current' : ''} />
              {de ? 'Favoriten' : 'Favorites'}
            </button>
            {gallery?.downloadEnabled && (
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-700"
              >
                <Download size={16} />
                {de ? 'Herunterladen' : 'Download'}
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-700"
            >
              <Share2 size={16} />
              {de ? 'Teilen' : 'Share'}
            </button>
          </div>

          {/* Selection Info Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input 
                  type="checkbox" 
                  checked={selectedForSlideshow.size === filteredImages.length && filteredImages.length > 0}
                  onChange={() => {
                    if (selectedForSlideshow.size === filteredImages.length) {
                      setSelectedForSlideshow(new Set());
                    } else {
                      setSelectedForSlideshow(new Set(filteredImages.map(img => img.id)));
                    }
                  }}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                {de ? 'Alle auswählen' : 'Select all'}
              </label>
              {selectedForSlideshow.size > 0 && (
                <span className="text-sm text-gray-500">
                  {selectedForSlideshow.size} {de ? 'ausgewählt' : 'selected'}
                </span>
              )}
              
              {/* Admin Upload Button */}
              {isAdmin && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAdminUpload(e.target.files)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {de ? 'Wird hochgeladen...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {de ? 'Bilder hinzufügen' : 'Add Images'}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
            
            {/* Upload Progress Banner */}
            {uploadProgress && (
              <div className={`mt-2 px-4 py-2 rounded-lg text-sm ${
                uploadProgress.includes('failed') || uploadProgress.includes('fehlgeschlagen')
                  ? 'bg-red-100 text-red-700'
                  : uploadProgress.includes('Successfully') || uploadProgress.includes('erfolgreich')
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
              }`}>
                {uploadProgress}
              </div>
            )}
            
            <div className="text-sm text-gray-500">
              {filteredImages.length} {de ? 'Fotos' : 'photos'}
            </div>
          </div>

          {/* Image Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
              <span className="ml-2 text-gray-600">{de ? 'Bilder werden geladen...' : 'Loading images...'}</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <ImageGrid 
                images={filteredImages} 
                galleryId={gallery?.id || ''}
                isPublic={true}
                authToken={authToken}
                downloadEnabled={gallery?.downloadEnabled}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                selectedForSlideshow={selectedForSlideshow}
                onToggleSelection={handleToggleSelection}
              />
              
              {showFavoritesOnly && filteredImages.length === 0 && (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{de ? 'Noch keine Favoriten' : 'No favorites yet'}</h3>
                  <p className="text-gray-500 mb-4">
                    {de ? 'Sie haben noch keine Fotos zu Ihren Favoriten hinzugefügt.' : "You haven't added any photos to your favorites."}
                  </p>
                  <button
                    onClick={() => setShowFavoritesOnly(false)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                  >
                    {de ? 'Alle Fotos anzeigen' : 'Show all photos'}
                  </button>
                </div>
              )}

              {!showFavoritesOnly && filteredImages.length === 0 && (
                <div className="text-center py-12">
                  <Image className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{de ? 'Noch keine Fotos' : 'No photos yet'}</h3>
                  <p className="text-gray-500">
                    {de ? 'Diese Galerie enthält noch keine Fotos.' : "This gallery doesn't have any photos yet."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Slideshow Modal */}
      {showSlideshow && gallery && (
        <Slideshow
          images={selectedForSlideshow.size > 0 
            ? filteredImages.filter(img => selectedForSlideshow.has(img.id))
            : filteredImages}
          startIndex={0}
          onClose={closeSlideshow}
          onToggleFavorite={toggleFavorite}
          favorites={favorites}
          downloadEnabled={gallery.downloadEnabled}
          authToken={authToken}
          galleryId={gallery.id}
        />
      )}
    </div>
  );
};

export default GalleryPage;