# Image Organization

Store your images here to serve them from your own domain without external URLs.

## Directory Structure

```
public/images/
├── services/          # Service-specific images (family, newborn, maternity, etc.)
├── about/            # About page images (studio, team, history)
├── gallery/          # Portfolio and example work
├── hero-*.jpg        # Hero section images
└── logo.png          # Logo and branding
```

## Usage in React Components

### Simple Image Reference
```tsx
<img src="/images/services/family-photo.jpg" alt="Family Photography" />
```

### With Responsive Sizes
```tsx
<img 
  src="/images/hero-family.jpg"
  srcSet="/images/hero-family-sm.jpg 640w,
          /images/hero-family-md.jpg 1024w,
          /images/hero-family-lg.jpg 1920w"
  sizes="(max-width: 640px) 640px,
         (max-width: 1024px) 1024px,
         1920px"
  alt="Hero"
/>
```

### Background Images (CSS)
```tsx
<div 
  className="hero-section"
  style={{ backgroundImage: 'url(/images/hero-family.jpg)' }}
>
```

## Image Optimization Tips

1. **Compress images before upload** (use TinyPNG, ImageOptim, or Squoosh)
2. **Use WebP format** for better compression (with JPG fallback)
3. **Resize to actual display size** (don't upload 4K images for 800px displays)
4. **Use lazy loading** for below-the-fold images:
   ```tsx
   <img src="/images/gallery/photo1.jpg" loading="lazy" alt="..." />
   ```

## Naming Convention

- Use lowercase with hyphens: `family-photo-session.jpg`
- Include descriptive names: `newborn-studio-setup.jpg`
- Add size suffix for variants: `hero-family-lg.jpg`, `hero-family-sm.jpg`

## Deployment

All files in `public/` are automatically:
- ✅ Copied to the build output
- ✅ Served from your domain root
- ✅ Deployed to Heroku with your app
- ✅ No external CDN needed
