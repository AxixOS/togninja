import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, ShoppingCart, Gift, DollarSign } from 'lucide-react';

interface VoucherProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  validity_months: number;
  is_active: boolean;
}

interface VoucherSale {
  id: string;
  voucher_code: string;
  buyer_name: string;
  buyer_email: string;
  amount_paid: number;
  payment_status: string;
  is_redeemed: boolean;
  product_name: string;
  created_at: string;
}

const VoucherManagementPage: React.FC = () => {
  const [products, setProducts] = useState<VoucherProduct[]>([]);
  const [sales, setSales] = useState<VoucherSale[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New product form
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    validityMonths: 12
  });

  // New sale form
  const [newSale, setNewSale] = useState({
    voucherProductId: '',
    buyerName: '',
    buyerEmail: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch voucher products
      const productsRes = await fetch('/api/vouchers/products');
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }

      // Fetch voucher sales
      const salesRes = await fetch('/api/vouchers/sales');
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSales(salesData);
      }
    } catch (error) {
      console.error('Failed to fetch voucher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/vouchers/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price: parseFloat(newProduct.price),
          validityMonths: newProduct.validityMonths
        })
      });

      if (response.ok) {
        setNewProduct({ name: '', description: '', price: '', validityMonths: 12 });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create voucher product:', error);
    }
  };

  const handleSellVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/vouchers/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSale)
      });

      if (response.ok) {
        setNewSale({ voucherProductId: '', buyerName: '', buyerEmail: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to sell voucher:', error);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div>Loading voucher data...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Voucher Management</h1>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Create New Voucher Product
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Product name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      required
                    />
                    <Input
                      placeholder="Price (EUR)"
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      required
                    />
                  </div>
                  <Input
                    placeholder="Description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  />
                  <Input
                    placeholder="Validity (months)"
                    type="number"
                    value={newProduct.validityMonths}
                    onChange={(e) => setNewProduct({...newProduct, validityMonths: parseInt(e.target.value)})}
                  />
                  <Button type="submit" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Product
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-gray-600">{product.description}</p>
                        <p className="text-lg font-bold">€{product.price}</p>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>Valid for {product.validity_months} months</p>
                        <p className={product.is_active ? 'text-green-600' : 'text-red-600'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Sell Voucher
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSellVoucher} className="space-y-4">
                  <select
                    className="w-full p-2 border rounded"
                    value={newSale.voucherProductId}
                    onChange={(e) => setNewSale({...newSale, voucherProductId: e.target.value})}
                    required
                  >
                    <option value="">Select voucher product</option>
                    {products.filter(p => p.is_active).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - €{product.price}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Buyer name"
                      value={newSale.buyerName}
                      onChange={(e) => setNewSale({...newSale, buyerName: e.target.value})}
                      required
                    />
                    <Input
                      placeholder="Buyer email"
                      type="email"
                      value={newSale.buyerEmail}
                      onChange={(e) => setNewSale({...newSale, buyerEmail: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Sell Voucher
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Recent Sales</h3>
              {sales.map((sale) => (
                <Card key={sale.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">{sale.product_name}</h4>
                        <p className="text-sm text-gray-600">{sale.buyer_name} ({sale.buyer_email})</p>
                        <p className="text-sm font-mono">{sale.voucher_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">€{sale.amount_paid}</p>
                        <p className={`text-sm ${sale.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                          {sale.payment_status}
                        </p>
                        <p className={`text-sm ${sale.is_redeemed ? 'text-blue-600' : 'text-gray-600'}`}>
                          {sale.is_redeemed ? 'Redeemed' : 'Active'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Voucher Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{sales.length}</p>
                    <p className="text-sm text-gray-600">Total Sales</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      €{sales.reduce((sum, sale) => sum + sale.amount_paid, 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {sales.filter(sale => sale.is_redeemed).length}
                    </p>
                    <p className="text-sm text-gray-600">Redeemed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default VoucherManagementPage;