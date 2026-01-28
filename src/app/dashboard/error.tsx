'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[50vh]">
      <Card className="bg-card border-border max-w-md w-full">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground">
              We encountered an error while loading the dashboard. Please try again.
            </p>
          </div>
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
