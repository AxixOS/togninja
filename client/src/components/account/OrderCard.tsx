import React from 'react';
import { Order } from '../../types';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface OrderCardProps {
  order: Order;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  // Status badge styling
  const getStatusBadge = () => {
    switch (order.status) {
      case 'paid':
        return (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center">
            <CheckCircle size={14} className="mr-1" /> Paid
          </span>
        );
      case 'pending':
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs flex items-center">
            <Clock size={14} className="mr-1" /> Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs flex items-center">
            <AlertCircle size={14} className="mr-1" /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-800">{order.voucher.title}</h3>
          <p className="text-gray-600 text-sm">Order #{order.id}</p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div className="flex-shrink-0">
          <img 
            src={order.voucher.image} 
            alt={order.voucher.title} 
            className="w-20 h-20 object-cover rounded"
          />
        </div>
        
        <div className="flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-600">Quantity: {order.quantity}</p>
              <p className="text-gray-600">Total Price: <span className="font-semibold">€{(order.totalPrice || 0).toFixed(2)}</span></p>
            </div>
            <div>
              <p className="text-gray-600">Voucher Code: <span className="font-semibold">{order.voucherCode}</span></p>
              <p className="text-gray-600 flex items-center">
                <Calendar size={14} className="mr-1" /> 
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;