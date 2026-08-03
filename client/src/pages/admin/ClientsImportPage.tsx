import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import SmartCSVImporter from '../../components/clients/SmartCSVImporter';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ClientsImportPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin/clients" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft size={16} className="mr-1" /> Back to clients
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">Import Clients</h1>
            <p className="text-gray-600">Bulk import clients from a CSV file</p>
          </div>
        </div>        {/* Import Wizard */}
        <div className="bg-white rounded-lg shadow p-6">
          <SmartCSVImporter />
        </div>
      </div>
    </AdminLayout>
  );
};

export default ClientsImportPage;