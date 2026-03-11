'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Database, Download, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ImportDialog from './import-dialog';

interface DataSettingsProps {
  isPro: boolean;
}

export default function DataSettings({ isPro }: DataSettingsProps) {
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function handleExport(format: 'json' | 'zip') {
    const setLoading = format === 'json' ? setExportingJson : setExportingZip;
    setLoading(true);

    try {
      const res = await fetch(`/api/export?format=${format}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Export failed');
        return;
      }

      // Trigger browser download
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] || `devstash-export.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Export downloaded as ${filename}`);
    } catch {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Data</CardTitle>
          </div>
          <CardDescription>Export your data or import from a previous export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport('json')}
              disabled={exportingJson || exportingZip}
            >
              {exportingJson ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export JSON
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport('zip')}
                disabled={exportingJson || exportingZip || !isPro}
              >
                {exportingZip ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export ZIP
              </Button>
              {!isPro && (
                <Badge variant="secondary" className="text-xs">PRO</Badge>
              )}
            </div>
          </div>

          <Separator />

          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import from JSON
          </Button>
        </CardContent>
      </Card>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
