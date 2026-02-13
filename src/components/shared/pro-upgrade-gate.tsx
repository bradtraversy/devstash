'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Loader2, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';

interface ProUpgradeGateProps {
  typeName: string;
}

const TYPE_INFO: Record<string, { icon: typeof Upload; description: string }> = {
  file: {
    icon: Upload,
    description: 'Upload and manage files like PDFs, documents, config files, and more.',
  },
  image: {
    icon: Image,
    description: 'Upload and organize images, screenshots, diagrams, and visual references.',
  },
};

export default function ProUpgradeGate({ typeName }: ProUpgradeGateProps) {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

  const info = TYPE_INFO[typeName] || TYPE_INFO['file'];
  const Icon = info.icon;
  const displayName = typeName.charAt(0).toUpperCase() + typeName.slice(1) + 's';

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
    <div className="max-w-md mx-auto mt-24 text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
        <Icon className="h-8 w-8 text-blue-500" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold">{displayName}</h2>
          <Badge className="bg-blue-600 hover:bg-blue-700">
            <Crown className="mr-1 h-3 w-3" />
            Pro
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {info.description}
        </p>
        <p className="text-sm text-muted-foreground">
          Upgrade to Pro to unlock {typeName} uploads and storage.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
    </div>
  );
}
