import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import OrderCard from '../components/account/OrderCard';
import { useAppContext } from '../context/AppContext';
import { User, ShoppingBag, Clock, CheckCircle, Settings, LogOut } from 'lucide-react';

const AccountPage: React.FC = () => {
  const { user, orders, isLoggedIn, logout } = useAppContext();
  const navigate = useNavigate();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);
  
  if (!isLoggedIn || !user) {
    return null;
  }
  
  // Get stats
  const totalOrders = orders.length;
  const paidOrders = orders.filter(order => order.status === 'paid').length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-gray-800">My Account</h1>
        
        <div className="md:grid md:grid-cols-4 md:gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1 mb-8 md:mb-0">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="text-blue-600" size={32} />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">{user.name}</h2>
                <p className="text-gray-600 text-sm">{user.email}</p>
              </div>
              
              <hr className="my-4 border-gray-200" />
              
              <nav>
                <ul className="space-y-2">
                  <li>
                    <Link 
                      to="/account" 
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                    >
                      <ShoppingBag size={18} className="mr-3" />
                      My Orders
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/account/profile" 
                      className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                    >
                      <Settings size={18} className="mr-3" />
                      Account Settings
                    </Link>
                  </li>
                  <li>
                    <button 
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <LogOut size={18} className="mr-3" />
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
          
          {/* Main content */}
          <div className="md:col-span-3">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <ShoppingBag className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-800">{totalOrders}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Paid Orders</p>
                    <p className="text-2xl font-bold text-gray-800">{paidOrders}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                    <Clock className="text-yellow-600" size={20} />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Pending Orders</p>
                    <p className="text-2xl font-bold text-gray-800">{pendingOrders}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Orders */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">My Orders</h2>
              
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map(order => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <ShoppingBag size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">No Orders Yet</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't placed any orders yet.
                  </p>
                  <Link 
                    to="/vouchers"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Browse Vouchers
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AccountPage;