import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Gift, 
  Tag, 
  ShoppingCart, 
  TrendingUp,
  Calendar,
  Users,
  Euro,
  Percent,
  Eye,
  Copy,
  Download
} from "lucide-react";
import { 
  type VoucherProduct, 
  type DiscountCoupon, 
  type VoucherSale,
  insertVoucherProductSchema,
  insertDiscountCouponSchema
} from "@shared/schema";

// Form schemas
const voucherProductFormSchema = insertVoucherProductSchema.extend({
  price: z.string().min(1, "Price is required"),
  validityMonths: z.string().min(1, "Validity period is required"),
  displayOrder: z.string().optional(),
});

const discountCouponFormSchema = insertDiscountCouponSchema.extend({
  discountValue: z.string().min(1, "Discount value is required"),
  minOrderAmount: z.string().optional(),
  maxDiscountAmount: z.string().optional(),
  usageLimit: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type VoucherProductFormData = z.infer<typeof voucherProductFormSchema>;
type DiscountCouponFormData = z.infer<typeof discountCouponFormSchema>;

export default function AdminVoucherSalesPage() {
  // Simple toast replacement
  const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    // console.log removed
    alert(`${title}: ${description}`);
  };
  const [activeTab, setActiveTab] = useState("products");
  const [selectedProduct, setSelectedProduct] = useState<VoucherProduct | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<DiscountCoupon | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);

  // Fetch data
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/vouchers/products"],
  });

  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["/api/vouchers/coupons"],
  });

  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["/api/vouchers/sales"],
  });

  // Forms
  const productForm = useForm<VoucherProductFormData>({
    resolver: zodResolver(voucherProductFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      validityMonths: "",
      isActive: true,
      displayOrder: "0",
    },
  });

  const couponForm = useForm<DiscountCouponFormData>({
    resolver: zodResolver(discountCouponFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      isActive: true,
    },
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: VoucherProductFormData) => {
      const response = await fetch("/api/vouchers/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          price: parseFloat(data.price),
          validityMonths: parseInt(data.validityMonths),
          displayOrder: parseInt(data.displayOrder || "0"),
        }),
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/products"] });
      setIsProductDialogOpen(false);
      productForm.reset();
      toast({ title: "Success", description: "Voucher product created successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create voucher product", variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: VoucherProductFormData & { id: string }) => {
      const response = await fetch(`/api/vouchers/products/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          price: parseFloat(data.price),
          validityMonths: parseInt(data.validityMonths),
          displayOrder: parseInt(data.displayOrder || "0"),
        }),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/products"] });
      setIsProductDialogOpen(false);
      setSelectedProduct(null);
      productForm.reset();
      toast({ title: "Success", description: "Voucher product updated successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update voucher product", variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/vouchers/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/products"] });
      toast({ title: "Success", description: "Voucher product deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete voucher product", variant: "destructive" });
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: DiscountCouponFormData) => {
      const response = await fetch("/api/vouchers/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          discountValue: parseFloat(data.discountValue),
          minOrderAmount: data.minOrderAmount ? parseFloat(data.minOrderAmount) : null,
          maxDiscountAmount: data.maxDiscountAmount ? parseFloat(data.maxDiscountAmount) : null,
          usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
          usageCount: 0,
        }),
      });
      if (!response.ok) throw new Error("Failed to create coupon");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/coupons"] });
      setIsCouponDialogOpen(false);
      couponForm.reset();
      toast({ title: "Success", description: "Discount coupon created successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create discount coupon", variant: "destructive" });
    },
  });

  const updateCouponMutation = useMutation({
    mutationFn: async (data: DiscountCouponFormData & { id: string }) => {
      const response = await fetch(`/api/vouchers/coupons/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          discountValue: parseFloat(data.discountValue),
          minOrderAmount: data.minOrderAmount ? parseFloat(data.minOrderAmount) : null,
          maxDiscountAmount: data.maxDiscountAmount ? parseFloat(data.maxDiscountAmount) : null,
          usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to update coupon");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/coupons"] });
      setIsCouponDialogOpen(false);
      setSelectedCoupon(null);
      couponForm.reset();
      toast({ title: "Success", description: "Discount coupon updated successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update discount coupon", variant: "destructive" });
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/vouchers/coupons/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete coupon");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/coupons"] });
      toast({ title: "Success", description: "Discount coupon deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete discount coupon", variant: "destructive" });
    },
  });

  // Handlers
  const handleEditProduct = (product: VoucherProduct) => {
    setSelectedProduct(product);
    productForm.reset({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      validityMonths: product.validityMonths.toString(),
      isActive: product.isActive,
      displayOrder: product.displayOrder?.toString() || "0",
    });
    setIsProductDialogOpen(true);
  };

  const handleEditCoupon = (coupon: DiscountCoupon) => {
    setSelectedCoupon(coupon);
    couponForm.reset({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderAmount: coupon.minOrderAmount?.toString() || "",
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() || "",
      usageLimit: coupon.usageLimit?.toString() || "",
      startDate: coupon.startDate || "",
      endDate: coupon.endDate || "",
      isActive: coupon.isActive,
    });
    setIsCouponDialogOpen(true);
  };

  const handleProductSubmit = (data: VoucherProductFormData) => {
    if (selectedProduct) {
      updateProductMutation.mutate({ ...data, id: selectedProduct.id });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleCouponSubmit = (data: DiscountCouponFormData) => {
    if (selectedCoupon) {
      updateCouponMutation.mutate({ ...data, id: selectedCoupon.id });
    } else {
      createCouponMutation.mutate(data);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Code copied to clipboard" });
  };

  // Statistics
  const totalRevenue = sales.reduce((sum: number, sale: VoucherSale) => sum + parseFloat(sale.finalAmount || "0"), 0);
  const totalSales = sales.length;
  const activeCoupons = coupons.filter((c: DiscountCoupon) => c.isActive).length;
  const activeProducts = products.filter((p: VoucherProduct) => p.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Voucher & Sales Management</h1>
        <p className="text-muted-foreground">
          Manage voucher products, discount coupons, and track sales performance
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From voucher sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">Vouchers sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts}</div>
            <p className="text-xs text-muted-foreground">Available for sale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCoupons}</div>
            <p className="text-xs text-muted-foreground">Currently valid</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Voucher Products</TabsTrigger>
          <TabsTrigger value="coupons">Discount Coupons</TabsTrigger>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
        </TabsList>

        {/* Voucher Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Voucher Products</h2>
            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setSelectedProduct(null);
                  productForm.reset();
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {selectedProduct ? "Edit Voucher Product" : "Create Voucher Product"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedProduct 
                      ? "Update the voucher product details" 
                      : "Create a new voucher product for sale"
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...productForm}>
                  <form onSubmit={productForm.handleSubmit(handleProductSubmit)} className="space-y-4">
                    <FormField
                      control={productForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Family Photo Session Voucher" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={productForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Product description..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={productForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (€)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="199.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={productForm.control}
                        name="validityMonths"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Validity (Months)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={productForm.control}
                        name="displayOrder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Order</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={productForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Available for purchase
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsProductDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createProductMutation.isPending || updateProductMutation.isPending}>
                        {selectedProduct ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productsLoading ? (
              <div className="col-span-full text-center py-8">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="col-span-full text-center py-8">No voucher products yet. Create your first one!</div>
            ) : (
              products.map((product: VoucherProduct) => (
                <Card key={product.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription>{product.description}</CardDescription>
                      </div>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Price:</span>
                        <span className="font-semibold">€{product.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Validity:</span>
                        <span>{product.validityMonths} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Order:</span>
                        <span>{product.displayOrder || 0}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this product?")) {
                            deleteProductMutation.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Discount Coupons Tab */}
        <TabsContent value="coupons" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Discount Coupons</h2>
            <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setSelectedCoupon(null);
                  couponForm.reset();
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Coupon
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedCoupon ? "Edit Discount Coupon" : "Create Discount Coupon"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCoupon 
                      ? "Update the discount coupon details" 
                      : "Create a new discount coupon for promotions"
                    }
                  </DialogDescription>
                </DialogHeader>
                <Form {...couponForm}>
                  <form onSubmit={couponForm.handleSubmit(handleCouponSubmit)} className="space-y-4">
                    <FormField
                      control={couponForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coupon Code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., WELCOME10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={couponForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coupon Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Welcome Discount" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={couponForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Coupon description..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={couponForm.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={couponForm.control}
                        name="discountValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Value</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder={couponForm.watch("discountType") === "percentage" ? "10" : "25.00"} 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={couponForm.control}
                        name="minOrderAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Order Amount (€)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="100.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={couponForm.control}
                        name="maxDiscountAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Discount (€)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="50.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={couponForm.control}
                      name="usageLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usage Limit</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={couponForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={couponForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={couponForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Active</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Available for use
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCouponDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createCouponMutation.isPending || updateCouponMutation.isPending}>
                        {selectedCoupon ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {couponsLoading ? (
              <div className="col-span-full text-center py-8">Loading coupons...</div>
            ) : coupons.length === 0 ? (
              <div className="col-span-full text-center py-8">No discount coupons yet. Create your first one!</div>
            ) : (
              coupons.map((coupon: DiscountCoupon) => (
                <Card key={coupon.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {coupon.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(coupon.code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </CardTitle>
                        <CardDescription>
                          <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                            {coupon.code}
                          </code>
                        </CardDescription>
                      </div>
                      <Badge variant={coupon.isActive ? "default" : "secondary"}>
                        {coupon.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Discount:</span>
                        <span className="font-semibold flex items-center gap-1">
                          {coupon.discountType === "percentage" ? (
                            <>
                              <Percent className="h-3 w-3" />
                              {coupon.discountValue}%
                            </>
                          ) : (
                            <>
                              <Euro className="h-3 w-3" />
                              {coupon.discountValue}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Usage:</span>
                        <span>{coupon.usageCount || 0}/{coupon.usageLimit || "∞"}</span>
                      </div>
                      {coupon.endDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Expires:</span>
                          <span>{new Date(coupon.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCoupon(coupon)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this coupon?")) {
                            deleteCouponMutation.mutate(coupon.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Sales History</h2>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Sales
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Voucher Sales</CardTitle>
              <CardDescription>Track all voucher purchases and performance</CardDescription>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="text-center py-8">Loading sales...</div>
              ) : sales.length === 0 ? (
                <div className="text-center py-8">No sales recorded yet</div>
              ) : (
                <div className="space-y-4">
                  {sales.map((sale: VoucherSale) => (
                    <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{sale.purchaserName}</div>
                        <div className="text-sm text-muted-foreground">{sale.purchaserEmail}</div>
                        <div className="text-xs text-muted-foreground">
                          Code: <code className="bg-muted px-1 rounded">{sale.voucherCode}</code>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">€{sale.finalAmount}</div>
                        {sale.originalAmount !== sale.finalAmount && (
                          <div className="text-sm text-muted-foreground line-through">
                            €{sale.originalAmount}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}