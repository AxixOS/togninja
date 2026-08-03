import React, { useEffect } from 'react';
import { CheckCircle, Download, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MockSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">TN</span>
              </div>
              <span className="font-semibold">TogNinja</span>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={20} />
              <span>Zurück zur Startseite</span>
            </button>
          </div>
        </div>
      </header>

      {/* Success Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={48} className="text-green-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Bestellung erfolgreich! (Demo Modus)
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Vielen Dank für Ihren Kauf! Dies ist eine Demo-Bestätigung, da Stripe im Entwicklungsmodus läuft.
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Bestelldetails</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Bestellnummer:</span>
              <span className="font-mono text-sm">DEMO-{Date.now()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">
                Bezahlt (Demo)
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Produkt:</span>
              <span>Fotoshooting Gutschein</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Nächste Schritte</h3>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Mail size={20} className="text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-blue-900">E-Mail Bestätigung</h4>
                <p className="text-blue-700 text-sm">
                  Sie erhalten in Kürze eine Bestätigungs-E-Mail mit allen Details (im echten System).
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Download size={20} className="text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-blue-900">Gutschein Download</h4>
                <p className="text-blue-700 text-sm">
                  Ihr personalisierter Gutschein wird entsprechend der gewählten Versandart bereitgestellt.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
            <h4 className="font-medium text-yellow-800">Demo Hinweis</h4>
          </div>
          <p className="text-yellow-700 text-sm mt-2">
            Dies ist eine Demo-Umgebung. Es wurde keine echte Zahlung verarbeitet. 
            Um echte Zahlungen zu akzeptieren, konfigurieren Sie gültige Stripe-Schlüssel in den Umgebungsvariablen.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Zur Startseite
          </button>
          
          <button
            onClick={() => navigate('/gutschein/family')}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Weiteren Gutschein kaufen
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockSuccessPage;
