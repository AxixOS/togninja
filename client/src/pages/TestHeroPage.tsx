import { SEOHead } from '../components/SEO/SEOHead';
import Layout from '../components/layout/Layout';
import GoogleReviews from '../components/layout/GoogleReviews';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Package, Check, ArrowRight, Sparkles, Camera, Layers, SlidersHorizontal } from 'lucide-react';
import { useManualPageContent } from '../hooks/useManualPageContent';

export default function TestHeroPage() {
  const t = useManualPageContent('produktfotografie');

  const fromManual = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) {
      return fallback;
    }
    return value;
  };

  const heroTitle = fromManual('manual.produktfotografie.heroTitle', 'Produkt- & E-Commerce-Fotografie in Wien');
  const heroSubtitle = fromManual('manual.produktfotografie.heroTagline', 'Scharf. Farbtreu. Verkaufsstark.');
  const heroDescription = fromManual('manual.produktfotografie.heroDescription', 'Als produktfotograf wien liefern wir Bilder, die konvertieren – von technisch sauberen Freistellern über edle Spiegelungen bis zu Lifestyle-Sets, die Story und Nutzen zeigen. Für Amazon, Shopify, B2B-Kataloge, PR & Social.');
  const primaryCta = fromManual('manual.produktfotografie.primaryCta', 'Slot sichern');
  const secondaryCta = fromManual('manual.produktfotografie.secondaryCta', 'Anfrage & Specs');
  const heroImage1 = fromManual('manual.produktfotografie.heroImage1', '');
  const heroImage2 = fromManual('manual.produktfotografie.heroImage2', '');
  const heroImage3 = fromManual('manual.produktfotografie.heroImage3', '');

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <SEOHead
          title="TEST: Produktfotograf Wien – Full Width Hero Test"
          description="Test page for full-width hero layout"
          keywords="test"
          canonical="/test-hero"
        />

        {/* Hero - Full Width Image with Bottles */}
        <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20"></div>
          
          {/* Full Width Hero Image */}
          <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden bg-gray-900">
            {heroImage2 ? (
              <img
                src={heroImage2}
                alt="Produktfotografie Wien – E-Commerce & Amazon Produktfotos"
                className="w-full h-full object-contain object-center"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 to-gray-800"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent"></div>
            
            {/* Text Content Overlay */}
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-3xl">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white drop-shadow-2xl">{heroTitle}</h1>
                  <p className="text-xl md:text-2xl text-white mb-3 leading-relaxed font-semibold drop-shadow-lg">{heroSubtitle}</p>
                  <p className="text-base md:text-lg text-gray-100 mb-8 leading-relaxed drop-shadow-lg">
                    {heroDescription}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/warteliste" className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg shadow-2xl">
                      {primaryCta}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                    <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg shadow-2xl backdrop-blur-sm">
                      {secondaryCta}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <GoogleReviews />

        {/* Was wir perfekt können */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Was wir perfekt können</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700">
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />Freisteller (Weiß #FFFFFF): pixelgenau, saubere Kanten, keine Farbsäume.
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />Reflex/Shadow Looks: Bodenspiegelung oder natürlicher Soft-Shadow.
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />Lifestyle-Sets: Umgebung, Hände, Anwendung – „so wirkt's im echten Leben".
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />Glänzende Oberflächen: Glas/Metall ohne Hotspots, kontrollierte Highlights.
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />Textur & Farbe: Kalibrierte Monitore, ColorChecker, konsistente Serien.
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />Specs für Marktplätze: Abmessungen, DPI, Seitenverhältnis – compliant.
              </div>
            </div>
          </div>
        </section>

        {/* Sets & Licht */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">Sets & Licht – Best-of</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Set</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Einsatz</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Licht-Setup</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Ergebnis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Freisteller Weiß</td><td className="px-6 py-4">Amazon/Shop Hero</td><td className="px-6 py-4">Großes Softbox-Key + Flags</td><td className="px-6 py-4">Klinisch sauber, #FFFFFF, hartes Knock-Out</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Soft Shadow</td><td className="px-6 py-4">Shop, Print</td><td className="px-6 py-4">Key + Neg. Fill + Bodenkarte</td><td className="px-6 py-4">Natürlicher Schatten, dreidimensional</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Mirror Gloss</td><td className="px-6 py-4">Premium/Kosmetik</td><td className="px-6 py-4">Streifenlicht + Acrylplatte</td><td className="px-6 py-4">Edle Spiegelung, high-end</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Matte Craft</td><td className="px-6 py-4">Food/Handwerk</td><td className="px-6 py-4">Overhead Soft + Sidelight</td><td className="px-6 py-4">Textur, warm, greifbar</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Lifestyle Table</td><td className="px-6 py-4">Anwendung/How-To</td><td className="px-6 py-4">2-Licht Mix + Props</td><td className="px-6 py-4">Story, Benefit, Scroll-Stopper</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Example Images - Portfolio Showcase */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Beispiele unserer Arbeit</h2>
              <p className="text-lg text-gray-600">Professionelle Produktfotografie für E-Commerce, Amazon und Marketing</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {heroImage1 && (
                <div className="rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
                  <img
                    src={heroImage1}
                    alt="Produktfotograf Wien – Freisteller auf Weiß mit Soft-Shadow"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              {heroImage3 && (
                <div className="rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
                  <img
                    src={heroImage3}
                    alt="E-Commerce Produktfotos Wien – Lifestyle Setting"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pakete & Preise */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Pakete & Preise (Richtwerte)</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Starter 10 */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-200">
                <div className="mb-6"><h3 className="text-2xl font-bold text-gray-900 mb-2">Starter 10</h3><p className="text-purple-600 font-medium">10 Motive</p></div>
                <div className="mb-6"><span className="text-4xl font-bold text-purple-600">€390</span></div>
                <div className="space-y-3 mb-8 text-sm">
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>1 Look/Motiv, Retusche, Freisteller</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>Ideal: Kleinserie, Amazon Launch</span></div>
                </div>
                <Link to="/warteliste" className="block text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold">Termin sichern</Link>
              </div>

              {/* Shop 25 (Beliebt) */}
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 transform scale-105 relative">
                <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">BELIEBT</div>
                <div className="mb-6 mt-4"><h3 className="text-2xl font-bold mb-2">Shop 25</h3><p className="text-purple-100 font-medium">25 Motive</p></div>
                <div className="mb-6"><span className="text-4xl font-bold">€890</span></div>
                <div className="space-y-3 mb-8 text-sm">
                  <div className="flex items-start"><Check className="h-4 w-4 text-yellow-300 mr-2 mt-0.5" /><span>1–2 Looks, Schatten/Reflex-Option</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-yellow-300 mr-2 mt-0.5" /><span>Farbkalibrierung inklusive</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-yellow-300 mr-2 mt-0.5" /><span>Ideal: Full Shop Update</span></div>
                </div>
                <Link to="/warteliste" className="block text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold">Termin sichern</Link>
              </div>

              {/* Brand 50 */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-200">
                <div className="mb-6"><h3 className="text-2xl font-bold text-gray-900 mb-2">Brand 50</h3><p className="text-purple-600 font-medium">50 Motive</p></div>
                <div className="mb-6"><span className="text-4xl font-bold text-purple-600">€1.790</span></div>
                <div className="space-y-3 mb-8 text-sm">
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>Mix aus Freisteller + Lifestyle</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>Set-Bau light</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>Ideal: Relaunch, Kampagnen</span></div>
                </div>
                <Link to="/warteliste" className="block text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold">Termin sichern</Link>
              </div>
            </div>

            {/* Add-ons & SLAs */}
            <div className="bg-gray-50 rounded-xl p-6 text-sm">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">Add-ons</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center"><Check className="h-4 w-4 text-purple-600 mr-2" />Video Snippet (6–10s)</div>
                    <div className="flex items-center"><Check className="h-4 w-4 text-purple-600 mr-2" />360° Spin</div>
                    <div className="flex items-center"><Check className="h-4 w-4 text-purple-600 mr-2" />Text-Overlay</div>
                    <div className="flex items-center"><Check className="h-4 w-4 text-purple-600 mr-2" />Social/Ads ab <strong>€120</strong></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">Liefer-SLAs</h4>
                  <p className="text-gray-700">Preview <strong>48–72 h</strong>, Final <strong>3–7 AT</strong> (abhängig von Menge).</p>
                </div>
              </div>
              <p className="mt-4 text-center text-gray-700">Slot sichern? <Link to="/warteliste" className="text-purple-600 hover:text-purple-700 underline font-semibold">Zur Warteliste</Link></p>
            </div>
          </div>
        </section>

        {/* Dateiformate & Spezifikationen */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">Dateiformate & Spezifikationen</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Bedarf</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Format</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Größe/Seitenverhältnis</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Besonderheiten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Amazon Hero</td><td className="px-6 py-4">JPG sRGB</td><td className="px-6 py-4">min. 2000 px längste Seite, 1:1 möglich</td><td className="px-6 py-4">Hintergrund #FFFFFF, Produkt ≥85% Fläche</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Shop Galerie</td><td className="px-6 py-4">JPG/PNG</td><td className="px-6 py-4">1500–2500 px, 4:5 / 1:1</td><td className="px-6 py-4">Einheitliche Kanten, identische Höhe</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Print/PR</td><td className="px-6 py-4">TIFF/JPG</td><td className="px-6 py-4">300 DPI, CMYK möglich</td><td className="px-6 py-4">Farbprofil nach Absprache</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Social</td><td className="px-6 py-4">MP4/JPG</td><td className="px-6 py-4">Reels 1080×1920, Feed 1080×1350</td><td className="px-6 py-4">Hook-Frame, Textsafe-Zonen</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-center text-sm text-gray-600 mt-3">Externer Hinweis: Offizielle Amazon-Bildanforderungen findest du im <a href="https://sellercentral.amazon.de/gp/help/external/200421110" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 underline">Amazon Seller-Guide</a>.</p>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">Workflow – schnell & sicher</h2>
            <div className="bg-purple-50 rounded-xl p-8 text-sm text-gray-800">
              <ul className="grid md:grid-cols-2 gap-3">
                <li>• Briefing & Shotlist: Produktvarianten, Prioritäten, Specs.</li>
                <li>• Testshot: 1–2 Proofs zur Freigabe (Licht, Winkel, Schatten).</li>
                <li>• Produktion: Serien mit konsistenter Perspektive.</li>
                <li>• Retusche: Staub, Kratzer, Kantenreinzeichnung, Farbabgleich.</li>
                <li>• Delivery: Web + Print Ordner, eindeutiges Namensschema, Backup.</li>
                <li>• Qualität: Dual-Card, Tethering, kalibriert; ColorChecker-Referenz.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Häufige Fragen (FAQ)</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg text-gray-900 mb-2">Könnt ihr stark spiegelnde Produkte (Chrom/Glas)?</h3><p className="text-gray-600">Ja. Mit Flagging, Polarizer, Streifenlicht und kontrollierten Specular Highlights.</p></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg text-gray-900 mb-2">Baut ihr Sets/Untergründe?</h3><p className="text-gray-600">Ja. Acryl (klar/schwarz), Stein, Holz, Paper, Plexi – individuell abgestimmt.</p></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg text-gray-900 mb-2">Brauchen wir Muster oder Render?</h3><p className="text-gray-600">Echte Muster liefern realistische Highlights/Texturen. Render nur als Ergänzung.</p></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg text-gray-900 mb-2">Wie viele Dateien je Motiv?</h3><p className="text-gray-600">Standard: 1 Hauptlook, optional Zusatzwinkel/Detail. Benennung nach SKU/Variante.</p></div>
            </div>
          </div>
        </section>

        {/* Mini-Checkliste & Tipp */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">Mini-Checkliste fürs Anliefern</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-800">
              <div className="bg-gray-50 rounded-xl p-6">
                <ul className="space-y-2">
                  <li>• Saubere, unbeschädigte Muster + Ersatz.</li>
                  <li>• Style Guide, CI-Farben, Referenzbilder wenn möglich.</li>
                  <li>• Liste Pflichtwinkel/Details (Ports, Labels, Anschlüsse).</li>
                  <li>• Verpackung separat? Gern – für E-Com-Set.</li>
                </ul>
              </div>
              <div className="bg-purple-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Kurzer Praxis-Tipp</h3>
                <p className="text-gray-700">Serien konsistent halten: gleiche Perspektive, gleiche Lichtkante, gleiche Schattenlänge – der Shop wirkt sofort professioneller.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Related Services */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-8">Verwandte Services</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/business-portrait-wien/" className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <Camera className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">Business-Portraits</h3>
                <p className="text-gray-600 text-sm mb-4">Team & CEO – einheitlicher Look für Web & PR</p>
                <span className="text-purple-600 font-semibold">Mehr erfahren →</span>
              </Link>
              <Link to="/bewerbungsfotos-wien/" className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <SlidersHorizontal className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">Bewerbungsfotos</h3>
                <p className="text-gray-600 text-sm mb-4">LinkedIn/PR Portraits – schnell & markenschonend</p>
                <span className="text-purple-600 font-semibold">Mehr erfahren →</span>
              </Link>
              <Link to="/eventfotografie-wien/" className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <Layers className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">Eventfotografie</h3>
                <p className="text-gray-600 text-sm mb-4">Launches & PR – Assets, die sofort nutzbar sind</p>
                <span className="text-purple-600 font-semibold">Mehr erfahren →</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Bereit für konvertierende Produktbilder?</h2>
            <p className="text-xl mb-8 opacity-90">Schick uns kurz Specs & Deadline – wir schlagen Set & Licht vor und blocken deinen Slot.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/warteliste" className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg">
                Wartelisten-Platz sichern
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg">
                Projekt anfragen
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}