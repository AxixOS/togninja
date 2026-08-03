// PublicLandingPageSeoFooter — Phase 4

interface PublicLandingPageSeoFooterProps {
  city?: string | null;
}

export function PublicLandingPageSeoFooter({ city }: PublicLandingPageSeoFooterProps) {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
      <p>© {new Date().getFullYear()} {city ? `Studio ${city}` : 'TogNinja Photography'}</p>
    </footer>
  );
}
