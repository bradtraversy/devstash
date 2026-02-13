'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BillingSettingsProps {
  isPro: boolean;
  itemCount: number;
  collectionCount: number;
}

export default function BillingSettings({ isPro, itemCount, collectionCount }: BillingSettingsProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<'monthly' | 'yearly' | 'portal' | null>(null);

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      toast.success('Welcome to DevStash Pro!');
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams]);

  async function handleUpgrade(plan: 'monthly' | 'yearly') {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to start checkout');
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to open billing portal');
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>Billing</CardTitle>
        </div>
        <CardDescription>Manage your subscription and billing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Current plan:</span>
          {isPro ? (
            <Badge className="bg-blue-600 hover:bg-blue-700">Pro</Badge>
          ) : (
            <Badge variant="secondary">Free</Badge>
          )}
        </div>

        {!isPro && (
          <>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{itemCount}/50 items</p>
              <p>{collectionCount}/3 collections</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleUpgrade('monthly')}
                disabled={loading !== null}
              >
                {loading === 'monthly' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upgrade $8/mo
              </Button>
              <Button
                variant="outline"
                onClick={() => handleUpgrade('yearly')}
                disabled={loading !== null}
              >
                {loading === 'yearly' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upgrade $72/yr (save 25%)
              </Button>
            </div>
          </>
        )}

        {isPro && (
          <Button
            variant="outline"
            onClick={handleManageBilling}
            disabled={loading !== null}
          >
            {loading === 'portal' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Manage Billing
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
