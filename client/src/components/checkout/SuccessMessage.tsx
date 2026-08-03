import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SuccessMessageProps {
  email: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ email }) => {
  const { language } = useLanguage();
  const de = language === 'de';
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        {de ? 'Vielen Dank für Ihren Einkauf!' : 'Thank you for your purchase!'}
      </h2>
      <p className="text-gray-600 mb-4">
        {de ? `Eine Bestätigungs-E-Mail wurde an ${email} gesendet.` : `A confirmation email has been sent to ${email}.`}
      </p>
      <p className="text-gray-600">
        {de
          ? 'Ihr Gutschein wird innerhalb der nächsten Minuten per E-Mail zugestellt.'
          : 'Your voucher will be delivered by email within the next few minutes.'}
      </p>
    </div>
  );
};

export default SuccessMessage;