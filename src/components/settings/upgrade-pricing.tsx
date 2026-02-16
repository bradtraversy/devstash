'use client';

import { useState } from 'react';
import { Check, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const FREE_FEATURES = [
  { text: '50 items', included: true },
  { text: '3 collections', included: true },
  { text: 'Snippets, Prompts, Commands, Notes, Links', included: true },
  { text: 'Basic search', included: true },
  { text: 'File & Image uploads', included: false },
  { text: 'AI features', included: false },
];

const PRO_FEATURES = [
  'Unlimited items',
  'Unlimited collections',
  'All item types including Files & Images',
  'AI auto-tagging & summaries',
  '\u201CExplain This Code\u201D',
  'Data export (JSON/ZIP)',
];

interface UpgradePricingProps {
  itemCount: number;
  collectionCount: number;
}

export default function UpgradePricing({ itemCount, collectionCount }: UpgradePricingProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-foreground">Upgrade to Pro</h1>
        </div>
        <p className="text-muted-foreground">
          Unlock unlimited items, file uploads, AI features, and more.
        </p>
        <p className="text-sm text-muted-foreground">
          You&apos;re currently using {itemCount}/50 items and {collectionCount}/3 collections.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className="w-12 h-7 bg-muted border border-border rounded-full relative cursor-pointer transition-colors"
          aria-label="Toggle billing period"
        >
          <span
            className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full transition-all duration-200 ${
              isYearly ? 'translate-x-5 bg-green-500' : 'translate-x-0 bg-muted-foreground'
            }`}
          />
        </button>
        <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
          Yearly{' '}
          <span className="inline-block bg-green-500/20 text-green-500 text-xs font-bold px-2 py-0.5 rounded-lg ml-1">
            Save 25%
          </span>
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
        {/* Free - Current Plan */}
        <div className="bg-card border border-border rounded-xl p-8 text-left">
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-1">Free</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">$0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Your current plan</p>
          </div>
          <ul className="flex flex-col gap-3 mb-6">
            {FREE_FEATURES.map((f) => (
              <li
                key={f.text}
                className={`flex items-center gap-2.5 text-sm ${
                  f.included ? 'text-muted-foreground' : 'text-muted-foreground/50'
                }`}
              >
                {f.included ? (
                  <Check className="size-4 text-green-500 shrink-0" strokeWidth={2.5} />
                ) : (
                  <X className="size-4 text-muted-foreground/50 shrink-0" />
                )}
                {f.text}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        </div>

        {/* Pro */}
        <div className="bg-card border border-blue-500/50 rounded-xl p-8 text-left relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
            Recommended
          </span>
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-1">Pro</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">
                {isYearly ? '$6' : '$8'}
              </span>
              <span className="text-sm text-muted-foreground">
                {isYearly ? '/month (billed $72/yr)' : '/month'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">For serious developers</p>
          </div>
          <ul className="flex flex-col gap-3 mb-6">
            {PRO_FEATURES.map((text) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Check className="size-4 text-green-500 shrink-0" strokeWidth={2.5} />
                {text}
              </li>
            ))}
          </ul>
          <Button
            className="w-full"
            onClick={() => handleUpgrade(isYearly ? 'yearly' : 'monthly')}
            disabled={loading !== null}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upgrade to Pro {isYearly ? '($72/yr)' : '($8/mo)'}
          </Button>
        </div>
      </div>
    </div>
  );
}
