import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useManualPageContent } from '../hooks/useManualPageContent';
import { SITE } from '../config/site';

const VoucherSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useManualPageContent('voucher-success');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">NAF</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">NEW AGE FOTOGRAFIE</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-purple-600 hover:text-purple-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('voucher.backToHome')}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('voucher.paymentSuccessful')}
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            {t('voucher.thankYouMessage')}
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              {t('voucher.whatHappensNext')}
            </h3>
            <ul className="text-sm text-green-800 space-y-2 text-left">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                {t('voucher.emailReceived')}
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                {t('voucher.validity')}
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                {t('voucher.bookingContact')}
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => navigate('/vouchers')}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('voucher.moreVouchers')}
              </Button>
              
              <Button 
                onClick={() => window.open('https://newagefotografie.sproutstudio.com/invitation/live-link-shootings-new-age-fotografie', '_blank')}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('voucher.bookAppointment')}
              </Button>
            </div>
            
            <div className="pt-6 border-t">
              <p className="text-sm text-gray-500 mb-4">
                {t('voucher.questionsAboutVoucher')}
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>{t('voucher.phone')}:</strong> {SITE.phone}
                </p>
                <p>
                  <strong>{t('voucher.email')}:</strong> {SITE.email}
                </p>
                <p>
                  <strong>{t('voucher.openingHours')}:</strong> {t('voucher.openingTimes')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherSuccessPage;