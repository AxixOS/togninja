import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShopDrawer } from "./Gallery/ShopDrawer";
import { ShoppingCart } from "lucide-react";

export function GalleryShopTest() {
  const [isShopOpen, setIsShopOpen] = useState(false);
  
  // Mock gallery and client data for testing
  const mockGalleryId = "123e4567-e89b-12d3-a456-426614174000";
  const mockClientId = "456e7890-e89b-12d3-a456-426614174001";

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Gallery Shop Test Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Mock gallery images */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Gallery Image {i}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Button 
              onClick={() => setIsShopOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Buy Prints
            </Button>
            <p className="text-sm text-gray-600 mt-2">
              Click to test the Gallery Shop functionality
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Gallery Shop Features:</h3>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>✅ Print catalog with 7 products</li>
              <li>✅ Shopping cart functionality</li>
              <li>✅ Order creation and tracking</li>
              <li>✅ Stripe checkout integration (ready)</li>
              <li>✅ CRM agent tool registered (#7)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <ShopDrawer
        galleryId={mockGalleryId}
        clientId={mockClientId}
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
      />
    </div>
  );
}