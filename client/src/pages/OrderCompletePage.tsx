import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAppContext } from '../context/AppContext';
import { CheckCircle, AlertCircle, Copy, Home, ShoppingBag, Download, User } from 'lucide-react';

const OrderCompletePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, isLoggedIn } = useAppContext();
  
  // Find the order
  const order = orders.find(o => o.id === id);
  
  // If no order is found, redirect to home
  useEffect(() => {
    if (!order) {
      setTimeout(() => {
        navigate('/');
      }, 3000);
    }
  }, [order, navigate]);
  
  // Copy voucher code to clipboard
  const copyVoucherCode = () => {
    if (order) {
      navigator.clipboard.writeText(order.voucherCode);
      alert('Voucher code copied to clipboard!');
    }
  };

  // Download voucher PDF
  const downloadVoucherPDF = () => {
    if (!order) return;
    
    const pdfUrl = `/voucher/pdf/preview?` +
      `voucher_id=${encodeURIComponent(order.voucherCode)}&` +
      `sku=${encodeURIComponent(order.voucher.sku || 'voucher')}&` +
      `name=${encodeURIComponent(order.recipientName || order.purchaserName || 'Customer')}&` +
      `from=${encodeURIComponent(order.purchaserName || 'Gift Giver')}&` +
      `message=${encodeURIComponent(order.giftMessage || 'Enjoy your voucher!')}&` +
      `amount=${order.totalPrice}`;
    
    window.open(pdfUrl, '_blank');
  };
  
  if (!order) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Order Not Found</h1>
          <p className="text-gray-600 mb-4">
            We couldn't find the order you're looking for.
          </p>
          <p className="text-gray-600 mb-8">
            Redirecting to home page...
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
          
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">
            Thank You for Your Purchase!
          </h1>
          
          <p className="text-gray-600 mb-8">
            Your order has been successfully processed. A confirmation email has been sent to {order.purchaserEmail}.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Order Details</h2>
            
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-medium text-gray-800">{order.id}</span>
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium text-gray-800">
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium text-gray-800">€{order.totalPrice.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-green-600">Paid</span>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Voucher</h2>
            
            <div className="flex items-center mb-4">
              <img 
                src={order.voucher.image} 
                alt={order.voucher.title}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="ml-4 text-left">
                <h3 className="font-medium text-gray-800">{order.voucher.title}</h3>
                <p className="text-gray-600 text-sm">Quantity: {order.quantity}</p>
              </div>
            </div>
            
            <div className="border border-blue-200 rounded p-3 bg-white flex items-center justify-between mb-2">
              <span className="font-medium text-gray-800">{order.voucherCode}</span>
              <button 
                onClick={copyVoucherCode}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Copy code"
              >
                <Copy size={18} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 text-left">
              This is your voucher code. Please save it as you will need it to redeem your voucher.
            </p>

            <button
              onClick={downloadVoucherPDF}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <Download size={18} className="mr-2" />
              Download Voucher PDF
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => navigate('/')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
            >
              <Home size={18} className="mr-2" />
              Return to Home
            </button>
            
            {isLoggedIn ? (
              <button 
                onClick={() => navigate('/account')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                <User size={18} className="mr-2" />
                View My Account
              </button>
            ) : (
              <button 
                onClick={() => navigate('/vouchers')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                <ShoppingBag size={18} className="mr-2" />
                Browse More Vouchers
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderCompletePage;