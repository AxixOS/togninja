/**
 * Storage Upgrade Prompt Component
 * Shows upgrade recommendations when storage quota is near limit
 */

import { AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface StorageUpgradePromptProps {
  currentUsageBytes: number;
  storageLimitBytes: number;
  currentTier: 'starter' | 'professional' | 'enterprise';
  percentUsed: number;
  onUpgradeClick?: () => void;
}

const STORAGE_PLANS = {
  starter: {
    name: 'Starter',
    price: '€9.99',
    storage: '50GB',
    storageBytes: 53687091200,
  },
  professional: {
    name: 'Professional',
    price: '€19.99',
    storage: '200GB',
    storageBytes: 214748364800,
  },
  enterprise: {
    name: 'Enterprise',
    price: '€39.99',
    storage: '1TB',
    storageBytes: 1099511627776,
  },
};

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function StorageUpgradePrompt({
  currentUsageBytes,
  storageLimitBytes,
  currentTier,
  percentUsed,
  onUpgradeClick,
}: StorageUpgradePromptProps) {
  // Determine severity and message
  const isOverLimit = percentUsed >= 100;
  const isNearLimit = percentUsed >= 90 && percentUsed < 100;
  const isWarning = percentUsed >= 75 && percentUsed < 90;

  if (percentUsed < 75) {
    return null; // Don't show prompt if under 75%
  }

  // Get recommended tier
  const getRecommendedTier = () => {
    if (currentTier === 'starter') return 'professional';
    if (currentTier === 'professional') return 'enterprise';
    return null;
  };

  const recommendedTier = getRecommendedTier();
  const recommendedPlan = recommendedTier ? STORAGE_PLANS[recommendedTier] : null;

  // Severity styling
  const getBorderColor = () => {
    if (isOverLimit) return 'border-red-500';
    if (isNearLimit) return 'border-orange-500';
    return 'border-yellow-500';
  };

  const getIcon = () => {
    if (isOverLimit || isNearLimit) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <TrendingUp className="h-5 w-5 text-yellow-500" />;
  };

  const getTitle = () => {
    if (isOverLimit) return 'Storage Limit Exceeded';
    if (isNearLimit) return 'Storage Almost Full';
    return 'Consider Upgrading';
  };

  const getMessage = () => {
    if (isOverLimit) {
      return 'You have exceeded your storage limit and cannot upload more files. Please upgrade your plan or delete files.';
    }
    if (isNearLimit) {
      return `You're using ${percentUsed.toFixed(1)}% of your storage. Upgrade now to avoid interruption.`;
    }
    return `You're using ${percentUsed.toFixed(1)}% of your storage. Consider upgrading for more space.`;
  };

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Default behavior: open Stripe billing portal or plans page
      window.location.href = '/my-subscription';
    }
  };

  return (
    <Card className={`border-2 ${getBorderColor()} mb-6`}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="mt-1">{getIcon()}</div>
          <div className="flex-1">
            <CardTitle className="text-lg">{getTitle()}</CardTitle>
            <CardDescription className="mt-2">{getMessage()}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Storage Usage Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Current Usage</span>
              <span className="text-muted-foreground">
                {formatBytes(currentUsageBytes)} / {formatBytes(storageLimitBytes)}
              </span>
            </div>
            <Progress 
              value={percentUsed > 100 ? 100 : percentUsed} 
              className={`h-3 ${isOverLimit ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-orange-500' : '[&>div]:bg-yellow-500'}`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {percentUsed.toFixed(1)}% used
            </p>
          </div>

          {/* Current Plan */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Badge variant="secondary">{STORAGE_PLANS[currentTier].name}</Badge>
            <span className="text-sm">
              {STORAGE_PLANS[currentTier].price}/month • {STORAGE_PLANS[currentTier].storage}
            </span>
          </div>

          {/* Recommended Upgrade */}
          {recommendedPlan && (
            <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Badge className="mb-2">Recommended</Badge>
                  <h4 className="font-semibold text-base">{recommendedPlan.name} Plan</h4>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{recommendedPlan.price}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ {recommendedPlan.storage} of storage</li>
                <li>✓ {((recommendedPlan.storageBytes / STORAGE_PLANS[currentTier].storageBytes)).toFixed(0)}x more space than your current plan</li>
                <li>✓ No upload interruptions</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button onClick={handleUpgrade} className="flex-1" size="lg">
          {isOverLimit ? 'Upgrade Now' : 'View Plans'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        {!isOverLimit && (
          <Button variant="outline" onClick={() => window.location.href = '/my-archive'}>
            Manage Files
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default StorageUpgradePrompt;
