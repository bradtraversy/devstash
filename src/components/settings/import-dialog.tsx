'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileJson, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { previewImport, importData, type ImportPreview } from '@/actions/import';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const router = useRouter();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  function reset() {
    setFileContent(null);
    setFileName(null);
    setPreview(null);
    setSkipDuplicates(true);
    setLoading(false);
    setImporting(false);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a .json file');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      setFileContent(text);
      setFileName(file.name);

      const result = await previewImport(text);
      if (!result.success) {
        toast.error(result.error || 'Invalid file');
        setFileContent(null);
        setFileName(null);
        return;
      }

      setPreview(result.data!);
    } catch {
      toast.error('Failed to read file');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (!fileContent) return;

    setImporting(true);
    try {
      const result = await importData(fileContent, skipDuplicates);
      if (!result.success) {
        toast.error(result.error || 'Import failed');
        return;
      }

      const { itemsImported, collectionsImported, itemsSkipped, collectionsSkipped } = result.data!;

      let message = `Imported ${itemsImported} item${itemsImported !== 1 ? 's' : ''}`;
      if (collectionsImported > 0) {
        message += ` and ${collectionsImported} collection${collectionsImported !== 1 ? 's' : ''}`;
      }
      if (itemsSkipped > 0 || collectionsSkipped > 0) {
        const skippedParts: string[] = [];
        if (itemsSkipped > 0) skippedParts.push(`${itemsSkipped} item${itemsSkipped !== 1 ? 's' : ''}`);
        if (collectionsSkipped > 0) skippedParts.push(`${collectionsSkipped} collection${collectionsSkipped !== 1 ? 's' : ''}`);
        message += ` (skipped ${skippedParts.join(' and ')})`;
      }

      toast.success(message);
      handleClose(false);
      router.refresh();
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    snippet: 'snippets',
    prompt: 'prompts',
    command: 'commands',
    note: 'notes',
    file: 'files',
    image: 'images',
    link: 'links',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import items and collections from a DevStash export file.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('import-file-input')?.click()}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Reading file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop a .json file here or click to browse
                </p>
              </div>
            )}
            <input
              id="import-file-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileJson className="h-4 w-4" />
              <span>{fileName}</span>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <div className="text-sm text-muted-foreground space-y-1">
                {Object.entries(preview.itemCountsByType).map(([type, count]) => (
                  <p key={type}>
                    {count} {TYPE_LABELS[type] || type}
                  </p>
                ))}
                {preview.collectionCount > 0 && (
                  <p>{preview.collectionCount} collection{preview.collectionCount !== 1 ? 's' : ''}</p>
                )}
                {preview.tagCount > 0 && (
                  <p>{preview.tagCount} unique tag{preview.tagCount !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="skip-duplicates"
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
              />
              <label
                htmlFor="skip-duplicates"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Skip duplicates (matches on title + type + content)
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => reset()}>
                Choose Different File
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
