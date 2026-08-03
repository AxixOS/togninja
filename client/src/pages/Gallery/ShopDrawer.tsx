import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, ShoppingCart, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  product_sku: string;
  qty: number;
  variant: Record<string, any>;
  product_name?: string;
  unit_price?: number;
}

interface ShopDrawerProps {
  galleryId: string;
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShopDrawer({ galleryId, clientId, isOpen, onClose }: ShopDrawerProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/gallery/print-catalog'],
    enabled: isOpen
  });

  const checkoutMutation = useMutation({
    mutationFn: async (checkoutData: any) => {
      const response = await fetch('/api/gallery/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData)
      });
      if (!response.ok) throw new Error('Checkout failed');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast({
          title: "Order Created",
          description: `Order #${data.order_id} created for €${data.total}`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Checkout Failed",
        description: "Unable to process your order. Please try again.",
        variant: "destructive"
      });
    }
  });

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.product_sku === product.sku);
    if (existingItem) {
      setCart(cart.map(item => 
        item.product_sku === product.sku 
          ? { ...item, qty: item.qty + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_sku: product.sku,
        qty: 1,
        variant: {},
        product_name: product.name,
        unit_price: Number(product.base_price)
      }]);
    }
    
    toast({
      title: "Added to Cart",
      description: `${product.name} added to your cart`,
    });
  };

  const removeFromCart = (sku: string) => {
    setCart(cart.filter(item => item.product_sku !== sku));
  };

  const updateQuantity = (sku: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(sku);
    } else {
      setCart(cart.map(item => 
        item.product_sku === sku ? { ...item, qty: newQty } : item
      ));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.unit_price || 0) * item.qty, 0);
  };

  const handleCheckout = () => {
    checkoutMutation.mutate({
      gallery_id: galleryId,
      client_id: clientId,
      items: cart
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Shop Drawer */}
      <div className="ml-auto w-96 bg-white shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Buy Prints</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Products */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : (
            <>
              <div className="space-y-3">
                <h4 className="font-medium">Available Products</h4>
                {products?.map((product: any) => (
                  <Card key={product.sku} className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium">{product.name}</h5>
                        <p className="text-sm text-gray-600">€{product.base_price}</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => addToCart(product)}
                        className="ml-2"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Cart */}
              {cart.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Your Cart</h4>
                    <Badge variant="secondary">{cart.length} items</Badge>
                  </div>
                  
                  {cart.map((item) => (
                    <Card key={item.product_sku} className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium">{item.product_name}</h5>
                          <p className="text-xs text-gray-600">€{item.unit_price} each</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateQuantity(item.product_sku, item.qty - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium min-w-[20px] text-center">
                            {item.qty}
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateQuantity(item.product_sku, item.qty + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Checkout Footer */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span>€{getTotalPrice().toFixed(2)}</span>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? "Processing..." : "Proceed to Checkout"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}