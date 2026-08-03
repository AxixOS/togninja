// PublicLandingPageNotFound — Phase 4
// 404 state for missing or unpublished landing pages

export function PublicLandingPageNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-500">This page doesn't exist or has been unpublished.</p>
      <a href="/" className="text-purple-600 hover:underline">← Back to Home</a>
    </div>
  );
}
