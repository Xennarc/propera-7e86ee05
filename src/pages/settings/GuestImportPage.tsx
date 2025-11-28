import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { 
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, X, 
  AlertTriangle, Download, Users, Shield, RefreshCw, CheckCircle2
} from 'lucide-react';
import {
  parseCSV, parseDate, suggestColumnMapping, generateSampleCSV,
  GUEST_FIELDS, ParsedCSV
} from '@/lib/csv-utils';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

interface MappedRow {
  original: Record<string, string>;
  mapped: {
    full_name: string;
    room_number: string;
    check_in_date: string | null;
    check_out_date: string | null;
    nationality: string | null;
    email: string | null;
    phone: string | null;
    booking_reference: string | null;
    channel: string | null;
    notes: string | null;
  };
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  existingGuestId?: string;
  existingGuestName?: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  skippedRows: { row: number; reason: string }[];
}

export default function GuestImportPage() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [fileName, setFileName] = useState('');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewPage, setPreviewPage] = useState(0);
  const PREVIEW_PAGE_SIZE = 50;

  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;
  const canImport = isSuperAdmin() || currentResortRole === 'RESORT_ADMIN';

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseCSV(content);
        
        if (parsed.rows.length === 0) {
          toast.error('CSV file has no data rows');
          return;
        }
        
        setParsedCSV(parsed);
        const suggested = suggestColumnMapping(parsed.headers);
        setColumnMapping(suggested);
        setStep('mapping');
        toast.success(`Parsed ${parsed.rows.length} rows from CSV`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to parse CSV');
      }
    };
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsText(file);
  }, []);

  // Download sample template
  const handleDownloadTemplate = () => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Validate mapping
  const mappingValid = useMemo(() => {
    const requiredFields = GUEST_FIELDS.filter(f => f.required);
    return requiredFields.every(f => columnMapping[f.key]);
  }, [columnMapping]);

  const missingRecommended = useMemo(() => {
    return GUEST_FIELDS.filter(f => f.recommended && !columnMapping[f.key]);
  }, [columnMapping]);

  // Process rows with mapping and check duplicates
  const processRows = useCallback(async () => {
    if (!parsedCSV || !currentResort) return;

    // First, fetch existing guests for duplicate detection
    const { data: existingGuests } = await supabase
      .from('guests')
      .select('id, full_name, room_number, check_in_date, check_out_date')
      .eq('resort_id', currentResort.id);

    const existingMap = new Map<string, { id: string; name: string }>();
    existingGuests?.forEach(g => {
      const key = `${g.room_number?.toLowerCase()}-${g.check_in_date}-${g.check_out_date}`;
      existingMap.set(key, { id: g.id, name: g.full_name });
    });

    const processed: MappedRow[] = parsedCSV.rows.map(row => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Map fields
      const getValue = (field: string) => {
        const csvCol = columnMapping[field];
        return csvCol ? (row[csvCol] || '').trim() : '';
      };

      const fullName = getValue('full_name');
      const roomNumber = getValue('room_number');
      
      // Parse dates
      const checkInResult = parseDate(getValue('check_in_date'));
      const checkOutResult = parseDate(getValue('check_out_date'));
      
      if (checkInResult.error) warnings.push(checkInResult.error);
      if (checkOutResult.error) warnings.push(checkOutResult.error);

      // Validate required fields
      if (!fullName) errors.push('Missing full name');
      if (!roomNumber) errors.push('Missing room number');

      // Check for duplicate
      let isDuplicate = false;
      let existingGuestId: string | undefined;
      let existingGuestName: string | undefined;
      
      if (roomNumber && checkInResult.date && checkOutResult.date) {
        const key = `${roomNumber.toLowerCase()}-${checkInResult.date}-${checkOutResult.date}`;
        const existing = existingMap.get(key);
        if (existing) {
          isDuplicate = true;
          existingGuestId = existing.id;
          existingGuestName = existing.name;
        }
      }

      return {
        original: row,
        mapped: {
          full_name: fullName,
          room_number: roomNumber,
          check_in_date: checkInResult.date,
          check_out_date: checkOutResult.date,
          nationality: getValue('nationality') || null,
          email: getValue('email') || null,
          phone: getValue('phone') || null,
          booking_reference: getValue('booking_reference') || null,
          channel: getValue('channel') || null,
          notes: getValue('notes') || null,
        },
        errors,
        warnings,
        isDuplicate,
        existingGuestId,
        existingGuestName,
      };
    });

    setMappedRows(processed);
    setPreviewPage(0);
    setStep('preview');
  }, [parsedCSV, columnMapping, currentResort]);

  // Stats for preview
  const stats = useMemo(() => {
    const validNew = mappedRows.filter(r => r.errors.length === 0 && !r.isDuplicate).length;
    const duplicates = mappedRows.filter(r => r.isDuplicate).length;
    const invalid = mappedRows.filter(r => r.errors.length > 0).length;
    return { total: mappedRows.length, validNew, duplicates, invalid };
  }, [mappedRows]);

  // Execute import
  const executeImport = useCallback(async () => {
    if (!currentResort) return;
    
    setImporting(true);
    setStep('importing');
    setProgress(0);

    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      skippedRows: [],
    };

    const toProcess = mappedRows.filter(r => r.errors.length === 0);
    const batchSize = 50;
    
    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      
      for (const row of batch) {
        const rowIndex = mappedRows.indexOf(row) + 2; // +2 for 1-indexed and header row

        if (row.isDuplicate) {
          if (overwriteDuplicates && row.existingGuestId) {
            // Update existing guest
            const { error } = await supabase
              .from('guests')
              .update({
                full_name: row.mapped.full_name,
                room_number: row.mapped.room_number,
                check_in_date: row.mapped.check_in_date,
                check_out_date: row.mapped.check_out_date,
                nationality: row.mapped.nationality,
                email: row.mapped.email,
                phone: row.mapped.phone,
                booking_reference: row.mapped.booking_reference,
                channel: row.mapped.channel,
                notes: row.mapped.notes,
              })
              .eq('id', row.existingGuestId);

            if (error) {
              result.skipped++;
              result.skippedRows.push({ row: rowIndex, reason: `Update failed: ${error.message}` });
            } else {
              result.updated++;
            }
          } else {
            result.skipped++;
            result.skippedRows.push({ row: rowIndex, reason: 'Duplicate (skipped)' });
          }
        } else {
          // Insert new guest
          const { error } = await supabase
            .from('guests')
            .insert({
              resort_id: currentResort.id,
              full_name: row.mapped.full_name,
              room_number: row.mapped.room_number,
              check_in_date: row.mapped.check_in_date,
              check_out_date: row.mapped.check_out_date,
              nationality: row.mapped.nationality,
              email: row.mapped.email,
              phone: row.mapped.phone,
              booking_reference: row.mapped.booking_reference,
              channel: row.mapped.channel,
              notes: row.mapped.notes,
            });

          if (error) {
            result.skipped++;
            result.skippedRows.push({ row: rowIndex, reason: `Insert failed: ${error.message}` });
          } else {
            result.imported++;
          }
        }
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / toProcess.length) * 100)));
    }

    // Also count invalid rows as skipped
    mappedRows.filter(r => r.errors.length > 0).forEach((r, idx) => {
      result.skipped++;
      result.skippedRows.push({ row: mappedRows.indexOf(r) + 2, reason: r.errors.join(', ') });
    });

    setImportResult(result);
    setStep('complete');
    setImporting(false);
  }, [currentResort, mappedRows, overwriteDuplicates]);

  // Reset flow
  const resetImport = () => {
    setStep('upload');
    setParsedCSV(null);
    setFileName('');
    setColumnMapping({});
    setMappedRows([]);
    setOverwriteDuplicates(false);
    setImportResult(null);
    setProgress(0);
    setPreviewPage(0);
  };

  // Access control
  if (!currentResort) {
    return (
      <EmptyState
        icon={Users}
        title="No Resort Selected"
        description="Please select a resort to import guests"
      />
    );
  }

  if (!canImport) {
    return (
      <EmptyState
        icon={Shield}
        title="Access Denied"
        description="You need Resort Admin privileges to import guests"
      />
    );
  }

  // Paginated preview rows
  const paginatedRows = mappedRows.slice(
    previewPage * PREVIEW_PAGE_SIZE,
    (previewPage + 1) * PREVIEW_PAGE_SIZE
  );
  const totalPages = Math.ceil(mappedRows.length / PREVIEW_PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Guest Import"
        description={`Import guests from CSV for ${currentResort.name}`}
      />

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        {['upload', 'mapping', 'preview', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold ${
              step === s ? 'bg-primary text-primary-foreground' :
              ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(step) > i ? 'bg-success text-success-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(step) > i ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`ml-2 hidden sm:inline ${step === s ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Map Columns' : s === 'preview' ? 'Preview' : 'Complete'}
            </span>
            {i < 3 && <ArrowRight className="h-4 w-4 mx-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Guests from CSV
            </CardTitle>
            <CardDescription>
              Upload a CSV exported from your PMS or Excel. You'll be able to map the columns before importing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <span className="text-lg font-medium text-foreground">Click to upload CSV</span>
                <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
              </Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              {fileName && (
                <p className="mt-4 text-sm text-primary font-medium">{fileName}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Need a template? Download our sample CSV with the correct column headers.
              </p>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && parsedCSV && (
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns</CardTitle>
            <CardDescription>
              Match your CSV columns to Propera's guest fields. We've pre-filled some mappings based on column names.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {GUEST_FIELDS.map((field) => (
                <div key={field.key} className="grid sm:grid-cols-3 gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{field.label}</span>
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    {field.recommended && <Badge variant="pending" className="text-xs">Recommended</Badge>}
                  </div>
                  <Select
                    value={columnMapping[field.key] || '_none_'}
                    onValueChange={(v) => setColumnMapping(prev => ({
                      ...prev,
                      [field.key]: v === '_none_' ? '' : v
                    }))}
                  >
                    <SelectTrigger className="sm:col-span-2">
                      <SelectValue placeholder="Select CSV column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">— Not mapped —</SelectItem>
                      {parsedCSV.headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Sample preview */}
            {parsedCSV.rows.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-semibold mb-3">Sample Data (first 3 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {GUEST_FIELDS.filter(f => columnMapping[f.key]).map(f => (
                          <th key={f.key} className="text-left py-2 px-3 font-medium text-muted-foreground">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCSV.rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {GUEST_FIELDS.filter(f => columnMapping[f.key]).map(f => (
                            <td key={f.key} className="py-2 px-3">{row[columnMapping[f.key]] || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {missingRecommended.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Missing recommended fields</AlertTitle>
                <AlertDescription>
                  {missingRecommended.map(f => f.label).join(', ')} are not mapped. You can still continue, but guests may have incomplete data.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={resetImport}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={processRows} disabled={!mappingValid}>
                Preview Import
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-success">{stats.validNew}</div>
                <p className="text-sm text-muted-foreground">New Guests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-warning">{stats.duplicates}</div>
                <p className="text-sm text-muted-foreground">Duplicates</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">{stats.invalid}</div>
                <p className="text-sm text-muted-foreground">Invalid Rows</p>
              </CardContent>
            </Card>
          </div>

          {/* Duplicate handling option */}
          {stats.duplicates > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Duplicate Detection</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>Found {stats.duplicates} potential duplicates (matching room + dates).</span>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="overwrite" 
                    checked={overwriteDuplicates}
                    onCheckedChange={(v) => setOverwriteDuplicates(!!v)}
                  />
                  <Label htmlFor="overwrite" className="text-sm cursor-pointer">
                    Update existing guests instead of skipping
                  </Label>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview table */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Showing rows {previewPage * PREVIEW_PAGE_SIZE + 1} - {Math.min((previewPage + 1) * PREVIEW_PAGE_SIZE, mappedRows.length)} of {mappedRows.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Room</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Check-in</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Check-out</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 px-3">
                          {row.errors.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              <X className="h-3 w-3 mr-1" />
                              Invalid
                            </Badge>
                          ) : row.isDuplicate ? (
                            <Badge variant="pending" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Duplicate
                            </Badge>
                          ) : (
                            <Badge variant="confirmed" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium">{row.mapped.full_name || '—'}</td>
                        <td className="py-2 px-3 font-mono">{row.mapped.room_number || '—'}</td>
                        <td className="py-2 px-3">{row.mapped.check_in_date || '—'}</td>
                        <td className="py-2 px-3">{row.mapped.check_out_date || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{row.mapped.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={previewPage === 0}
                    onClick={() => setPreviewPage(p => p - 1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {previewPage + 1} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={previewPage >= totalPages - 1}
                    onClick={() => setPreviewPage(p => p + 1)}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Mapping
            </Button>
            <Button onClick={executeImport} disabled={stats.validNew === 0 && (stats.duplicates === 0 || !overwriteDuplicates)}>
              Import {stats.validNew + (overwriteDuplicates ? stats.duplicates : 0)} Guests
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Importing */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
              <h3 className="text-lg font-semibold mb-2">Importing guests...</h3>
              <Progress value={progress} className="w-64 mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && importResult && (
        <div className="space-y-6">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto text-success mb-4" />
                <h3 className="text-2xl font-bold mb-2">Import Complete</h3>
                <p className="text-muted-foreground">
                  Successfully processed {stats.total} rows
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 mt-8">
                <div className="text-center p-4 rounded-lg bg-success/10">
                  <div className="text-3xl font-bold text-success">{importResult.imported}</div>
                  <p className="text-sm text-muted-foreground">New Guests</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-info/10">
                  <div className="text-3xl font-bold text-info">{importResult.updated}</div>
                  <p className="text-sm text-muted-foreground">Updated</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <div className="text-3xl font-bold text-muted-foreground">{importResult.skipped}</div>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {importResult.skippedRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skipped Rows</CardTitle>
                <CardDescription>These rows were not imported</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Row</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.skippedRows.slice(0, 50).map((sr, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 px-3 font-mono">{sr.row}</td>
                          <td className="py-2 px-3 text-muted-foreground">{sr.reason}</td>
                        </tr>
                      ))}
                      {importResult.skippedRows.length > 50 && (
                        <tr>
                          <td colSpan={2} className="py-2 px-3 text-center text-muted-foreground">
                            ... and {importResult.skippedRows.length - 50} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={resetImport}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Import More
            </Button>
            <Button onClick={() => window.location.href = '/staff/guests'}>
              <Users className="h-4 w-4 mr-2" />
              View Guests
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
