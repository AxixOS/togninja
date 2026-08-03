import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Package,
  Tag,
  TrendingUp,
  Euro,
  ShoppingCart,
  Gift,
  Percent,
  Calendar,
  Eye,
  Download,
  Settings
} from "lucide-react";
import FulfillmentView from './components/FulfillmentView';

// Types
type VoucherProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  validityMonths: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
};

type DiscountCoupon = {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  startDate?: string;
  endDate?: string;
  allowedSkus?: string[];
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  createdAt: string;
};

type VoucherSale = {
  id: string;
  voucherCode: string;
  productId: string;
  purchaserName: string;
  purchaserEmail: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
};

// Form schemas
const voucherProductFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0.01, "Price must be greater than 0"),
  validityMonths: z.number().min(1, "Validity must be at least 1 month"),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(1)
});

const discountCouponFormSchema = z.object({
  code: z.string().min(3, "Coupon code must be at least 3 characters"),
  name: z.string().min(1, "Coupon name is required"),
  description: z.string().min(1, "Description is required"),
  discountType: z.enum(['percentage', 'fixed_amount']),
  discountValue: z.number().min(0.01, "Discount value must be greater than 0"),
  minOrderAmount: z.number().optional(),
  maxDiscountAmount: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  usageLimit: z.number().optional()
});

type VoucherProductFormData = z.infer<typeof voucherProductFormSchema>;
type DiscountCouponFormData = z.infer<typeof discountCouponFormSchema>;

export default function AdminVoucherSalesPageV2() {
  const [activeTab, setActiveTab] = useState("overview");
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem('ADMIN_TOKEN') || '');
  const saveAdminToken = (val: string) => { setAdminToken(val); if (val) localStorage.setItem('ADMIN_TOKEN', val); else localStorage.removeItem('ADMIN_TOKEN'); };
  const [selectedProduct, setSelectedProduct] = useState<VoucherProduct | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<DiscountCoupon | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Simple toast replacement
  const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    // console.log removed
    alert(`${title}: ${description}`);
  };

  // API calls
  const { data: voucherProducts, isLoading: isLoadingProducts } = useQuery<VoucherProduct[]>({
    queryKey: ['/api/vouchers/products'],
  });

  // Product mutations
  const createProduct = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/vouchers/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Create failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/vouchers/products'] })
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/vouchers/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/vouchers/products'] })
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vouchers/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/vouchers/products'] })
  });

  const { data: discountCoupons, isLoading: isLoadingCoupons } = useQuery<DiscountCoupon[]>({
    queryKey: ['/api/admin/coupons', adminToken],
    queryFn: async () => {
      const res = await fetch('/api/admin/coupons', { headers: { 'x-admin-token': adminToken || '' } });
      if (res.status === 401) throw new Error('Unauthorized');
      const data = await res.json();
      const rows = data.coupons || [];
      return rows.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.code,
        description: r.description || '',
        discountType: (r.type === 'amount') ? 'fixed_amount' : 'percentage',
        discountValue: (r.type === 'amount') ? Number(r.amount || 0) : Number(r.percent || 0),
        minOrderAmount: undefined,
        maxDiscountAmount: undefined,
        startDate: r.starts_at,
        endDate: r.ends_at,
        allowedSkus: Array.isArray(r.allowed_skus) ? r.allowed_skus : [],
        isActive: !!r.is_active,
        usageLimit: undefined,
        usageCount: 0,
        createdAt: r.created_at || new Date().toISOString(),
      })) as DiscountCoupon[];
    },
    enabled: !!adminToken,
  });

  // Coupon mutations
  const createCoupon = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken || '' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Create failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons', adminToken] })
  });
  const updateCoupon = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/admin/coupons/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken || '' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons', adminToken] })
  });
  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/coupons/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken || '' },
      });
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons', adminToken] })
  });

  const { data: voucherSales, isLoading: isLoadingSales } = useQuery<VoucherSale[]>({
    queryKey: ['/api/vouchers/sales'],
  });

  // Calculate statistics
  const stats = {
    totalRevenue: voucherSales?.reduce((sum, sale) => sum + Number(sale.finalAmount), 0) || 0,
    totalSales: voucherSales?.length || 0,
    activeProducts: voucherProducts?.filter(p => p.isActive).length || 0,
    activeCoupons: discountCoupons?.filter(c => c.isActive).length || 0,
    avgOrderValue: voucherSales?.length ? (voucherSales.reduce((sum, sale) => sum + Number(sale.finalAmount), 0) / voucherSales.length) : 0,
    totalDiscountGiven: voucherSales?.reduce((sum, sale) => sum + Number(sale.discountAmount), 0) || 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Voucher Management</h1>
              <p className="mt-2 text-sm text-gray-600">
                Create and manage photography vouchers, discount codes, and track sales performance
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 lg:w-2/3">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Products</span>
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>Coupons</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Sales</span>
            </TabsTrigger>
            <TabsTrigger value="fulfillment" className="flex items-center space-x-2">
              <Gift className="h-4 w-4" />
              <span>Fulfillment</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-blue-100">Total Revenue</CardTitle>
                  <Euro className="h-4 w-4 text-blue-200" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-blue-100 mt-1">
                    From {stats.totalSales} voucher sales
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-green-100">Active Products</CardTitle>
                  <Package className="h-4 w-4 text-green-200" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeProducts}</div>
                  <p className="text-xs text-green-100 mt-1">
                    Available for purchase
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-purple-100">Active Coupons</CardTitle>
                  <Tag className="h-4 w-4 text-purple-200" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeCoupons}</div>
                  <p className="text-xs text-purple-100 mt-1">
                    Currently valid codes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Average Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">€{stats.avgOrderValue.toFixed(2)}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Per voucher sale
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Discounts</CardTitle>
                  <Percent className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">€{stats.totalDiscountGiven.toFixed(2)}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Given to customers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalDiscountGiven > 0 ? ((stats.totalRevenue / (stats.totalRevenue + stats.totalDiscountGiven)) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Revenue vs discounts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-500">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Create Voucher Product</CardTitle>
                  <CardDescription>
                    Add a new photography voucher package that customers can purchase
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button 
                    onClick={() => {
                      setSelectedProduct(null);
                      setIsProductDialogOpen(true);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Product
                  </Button>
                </CardFooter>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-gray-300 hover:border-purple-500">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Tag className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Create Discount Coupon</CardTitle>
                  <CardDescription>
                    Generate discount codes for promotional campaigns and special offers
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button 
                    onClick={() => {
                      setSelectedCoupon(null);
                      setIsCouponDialogOpen(true);
                    }}
                    className="w-full"
                    variant="secondary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Voucher Products</h2>
                <p className="text-gray-600">Manage your photography voucher offerings</p>
              </div>
              <Button 
                onClick={() => {
                  setSelectedProduct(null);
                  setIsProductDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>

            {isLoadingProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : voucherProducts && voucherProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {voucherProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant={product.isActive ? "default" : "secondary"}>
                              {product.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">
                              {product.validityMonths} months
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">€{product.price}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-sm line-clamp-3">{product.description}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsProductDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No voucher products yet</h3>
                  <p className="text-gray-600 mb-6">Create your first voucher product to start selling photography packages</p>
                  <Button 
                    onClick={() => {
                      setSelectedProduct(null);
                      setIsProductDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Product
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-6">
            {!adminToken && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm mb-2">Enter Admin Token to manage coupons:</p>
                <div className="flex gap-2">
                  <Input placeholder="Admin token" value={adminToken} onChange={(e) => saveAdminToken(e.target.value)} />
                </div>
              </div>
            )}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Discount Coupons</h2>
                <p className="text-gray-600">Manage promotional codes and special offers</p>
              </div>
              <Button 
                onClick={() => {
                  setSelectedCoupon(null);
                  setIsCouponDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Coupon
              </Button>
            </div>

            {isLoadingCoupons ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : discountCoupons && discountCoupons.length > 0 ? (
              <div className="space-y-4">
                {discountCoupons.map((coupon) => (
                  <Card key={coupon.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <code className="bg-gray-100 px-3 py-1 rounded text-lg font-mono font-bold">
                              {coupon.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(coupon.code);
                                toast({ title: "Copied!", description: "Coupon code copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardTitle className="text-lg mt-2">{coupon.name}</CardTitle>
                          <CardDescription>{coupon.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <Badge variant={coupon.isActive ? "default" : "secondary"} className="mb-2">
                            {coupon.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <div className="text-sm text-gray-600">
                            Used: {coupon.usageCount} / {coupon.usageLimit || "∞"}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Percent className="h-4 w-4 text-gray-400" />
                          <span>
                            {coupon.discountType === 'percentage' 
                              ? `${coupon.discountValue}% off`
                              : `€${coupon.discountValue} off`
                            }
                          </span>
                        </div>
                        {coupon.minOrderAmount && (
                          <div className="flex items-center space-x-1">
                            <Euro className="h-4 w-4 text-gray-400" />
                            <span>Min: €{coupon.minOrderAmount}</span>
                          </div>
                        )}
                        {coupon.endDate && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>Expires: {new Date(coupon.endDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCoupon(coupon);
                          setIsCouponDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={async () => {
                          if (!adminToken) return toast({ title: 'Token required', description: 'Enter admin token above' });
                          if (confirm(`Delete coupon ${coupon.code}?`)) {
                            try {
                              await deleteCoupon.mutateAsync(coupon.id);
                              toast({ title: 'Deleted', description: `Coupon ${coupon.code} removed` });
                            } catch (e:any) {
                              toast({ title: 'Error', description: e.message || 'Failed to delete' });
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No discount coupons yet</h3>
                  <p className="text-gray-600 mb-6">Create promotional codes to offer discounts to your customers</p>
                  <Button 
                    onClick={() => {
                      setSelectedCoupon(null);
                      setIsCouponDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Coupon
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Sales History</h2>
                <p className="text-gray-600">Track all voucher sales and redemptions</p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Sales
              </Button>
            </div>

            {isLoadingSales ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : voucherSales && voucherSales.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Voucher Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Original Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Discount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Final Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {voucherSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
                                {sale.voucherCode}
                              </code>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="font-medium text-gray-900">{sale.purchaserName}</div>
                                <div className="text-sm text-gray-500">{sale.purchaserEmail}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              €{Number(sale.originalAmount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                              -€{Number(sale.discountAmount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              €{Number(sale.finalAmount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={sale.status === 'active' ? 'default' : 'secondary'}>
                                {sale.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(sale.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No sales yet</h3>
                  <p className="text-gray-600">Voucher sales will appear here once customers start purchasing</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Fulfillment Tab: Print Queue and Secure Download */}
          <TabsContent value="fulfillment" className="space-y-6">
            {!adminToken && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm mb-2">Enter Admin Token to access print queue:</p>
                <div className="flex gap-2">
                  <Input placeholder="Admin token" value={adminToken} onChange={(e) => saveAdminToken(e.target.value)} />
                </div>
              </div>
            )}
            {adminToken && <FulfillmentView adminToken={adminToken} />}
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? 'Edit Voucher Product' : 'Create New Voucher Product'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct 
                ? 'Update the details of this voucher product'
                : 'Create a new voucher product that customers can purchase'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g., Family Photo Session Voucher"
                  defaultValue={selectedProduct?.name || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (€)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  placeholder="199.00"
                  defaultValue={selectedProduct?.price || ''}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe what's included in this voucher package..."
                rows={3}
                defaultValue={selectedProduct?.description || ''}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validity">Validity (Months)</Label>
                <Input 
                  id="validity" 
                  type="number" 
                  placeholder="12"
                  defaultValue={selectedProduct?.validityMonths || ''}
                />
              </div>
              <div className="space-y-2 flex items-center space-x-2 pt-6">
                <Switch 
                  id="active" 
                  defaultChecked={selectedProduct?.isActive ?? true}
                />
                <Label htmlFor="active">Active for sale</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              const name = (document.getElementById('name') as HTMLInputElement)?.value?.trim();
              const price = parseFloat((document.getElementById('price') as HTMLInputElement)?.value || '0');
              const description = (document.getElementById('description') as HTMLTextAreaElement)?.value?.trim();
              const validityMonths = parseInt((document.getElementById('validity') as HTMLInputElement)?.value || '12');
              const isActive = (document.getElementById('active') as HTMLInputElement)?.checked;

              if (!name) { 
                toast({ title: 'Name required', description: 'Please enter a product name' }); 
                return; 
              }
              if (price <= 0) { 
                toast({ title: 'Invalid price', description: 'Price must be greater than 0' }); 
                return; 
              }

              const payload: any = {
                name,
                description: description || '',
                price,
                validityMonths,
                isActive: isActive !== undefined ? isActive : true,
                displayOrder: selectedProduct?.displayOrder || 1
              };

              try {
                if (selectedProduct) {
                  await updateProduct.mutateAsync({ id: selectedProduct.id, payload });
                  toast({ title: 'Success!', description: 'Product updated successfully' });
                } else {
                  await createProduct.mutateAsync(payload);
                  toast({ title: 'Success!', description: 'Product created successfully' });
                }
                setIsProductDialogOpen(false);
              } catch (e: any) {
                toast({ title: 'Error', description: e.message || 'Operation failed', variant: 'destructive' });
              }
            }}>
              {selectedProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedCoupon ? 'Edit Discount Coupon' : 'Create New Discount Coupon'}
            </DialogTitle>
            <DialogDescription>
              {selectedCoupon 
                ? 'Update the details of this discount coupon'
                : 'Create a new discount coupon for promotional campaigns'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code</Label>
                <Input 
                  id="code" 
                  placeholder="e.g., WELCOME15"
                  defaultValue={selectedCoupon?.code || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-name">Coupon Name</Label>
                <Input 
                  id="coupon-name" 
                  placeholder="e.g., Welcome Discount"
                  defaultValue={selectedCoupon?.name || ''}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-description">Description</Label>
              <Textarea 
                id="coupon-description" 
                placeholder="Describe this discount offer..."
                rows={2}
                defaultValue={selectedCoupon?.description || ''}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount-type">Discount Type</Label>
                <Select defaultValue={selectedCoupon?.discountType || 'percentage'} onValueChange={(v)=>{(document as any)._couponType=v;}}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-value">Discount Value</Label>
                <Input 
                  id="discount-value" 
                  type="number" 
                  placeholder="15"
                  defaultValue={selectedCoupon?.discountValue || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-order">Min Order (€)</Label>
                <Input 
                  id="min-order" 
                  type="number" 
                  placeholder="100"
                  defaultValue={selectedCoupon?.minOrderAmount || ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starts-at">Start Date</Label>
                <Input id="starts-at" type="date" defaultValue={selectedCoupon?.startDate ? selectedCoupon.startDate.slice(0,10) : ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends-at">End Date</Label>
                <Input id="ends-at" type="date" defaultValue={selectedCoupon?.endDate ? selectedCoupon.endDate.slice(0,10) : ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowed-skus">Allowed SKUs (comma separated)</Label>
              <Input id="allowed-skus" placeholder="e.g., Maternity-Basic,Family-Premium" defaultValue={(selectedCoupon?.allowedSkus || []).join(',')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usage-limit">Usage Limit</Label>
                <Input 
                  id="usage-limit" 
                  type="number" 
                  placeholder="100"
                  defaultValue={selectedCoupon?.usageLimit || ''}
                />
              </div>
              <div className="space-y-2 flex items-center space-x-2 pt-6">
                <Switch 
                  id="coupon-active" 
                  defaultChecked={selectedCoupon?.isActive ?? true}
                />
                <Label htmlFor="coupon-active">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCouponDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!adminToken) { toast({ title: 'Token required', description: 'Enter admin token above' }); return; }
              const code = (document.getElementById('code') as HTMLInputElement)?.value?.trim();
              const name = (document.getElementById('coupon-name') as HTMLInputElement)?.value?.trim();
              const description = (document.getElementById('coupon-description') as HTMLTextAreaElement)?.value?.trim();
              const typeSel = (document as any)._couponType || (selectedCoupon?.discountType || 'percentage');
              const discountValue = parseFloat((document.getElementById('discount-value') as HTMLInputElement)?.value || '0');
              const startsAtRaw = (document.getElementById('starts-at') as HTMLInputElement)?.value || '';
              const endsAtRaw = (document.getElementById('ends-at') as HTMLInputElement)?.value || '';
              const allowedSkusRaw = (document.getElementById('allowed-skus') as HTMLInputElement)?.value || '';
              const isActive = (document.getElementById('coupon-active') as HTMLInputElement)?.checked;
              if (!code) { toast({ title: 'Code required', description: 'Please enter coupon code' }); return; }
              const payload: any = {
                code,
                type: typeSel === 'fixed_amount' ? 'amount' : 'percentage',
              };
              if (payload.type === 'amount') payload.amount = discountValue; else payload.percent = discountValue;
              if (startsAtRaw) payload.starts_at = new Date(startsAtRaw).toISOString();
              if (endsAtRaw) payload.ends_at = new Date(endsAtRaw).toISOString();
              if (allowedSkusRaw) payload.allowed_skus = allowedSkusRaw.split(',').map(s=>s.trim()).filter(Boolean);
              if (isActive !== undefined) payload.is_active = !!isActive;
              try {
                if (selectedCoupon) {
                  await updateCoupon.mutateAsync({ id: selectedCoupon.id, payload });
                  toast({ title: 'Updated', description: 'Coupon updated successfully' });
                } else {
                  await createCoupon.mutateAsync(payload);
                  toast({ title: 'Created', description: 'Coupon created successfully' });
                }
                setIsCouponDialogOpen(false);
              } catch (e:any) {
                toast({ title: 'Error', description: e.message || 'Operation failed' });
              }
            }}>
              {selectedCoupon ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}