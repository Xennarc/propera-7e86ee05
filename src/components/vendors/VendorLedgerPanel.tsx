import { useState } from 'react';
import { useVendorLedger, VendorLedgerEntry, VendorPayout } from '@/hooks/useVendorLedger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  DollarSign, TrendingUp, TrendingDown, Plus, 
  FileText, Send, CheckCircle, XCircle 
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';

interface VendorLedgerPanelProps {
  vendorId: string;
  vendorName: string;
}

export function VendorLedgerPanel({ vendorId, vendorName }: VendorLedgerPanelProps) {
  const { 
    ledgerEntries, 
    balance, 
    payouts, 
    isLoading,
    createPayout,
    updatePayoutStatus,
    addAdjustment,
    isCreatingPayout,
  } = useVendorLedger(vendorId);

  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');

  const handleCreatePayout = async () => {
    await createPayout({ periodStart, periodEnd });
    setShowPayoutDialog(false);
  };

  const handleAddAdjustment = async () => {
    await addAdjustment({ amount: parseFloat(adjustmentAmount), note: adjustmentNote });
    setShowAdjustmentDialog(false);
    setAdjustmentAmount('');
    setAdjustmentNote('');
  };

  const getEntryTypeIcon = (type: VendorLedgerEntry['type']) => {
    switch (type) {
      case 'CHARGE':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'COMMISSION':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'ADJUSTMENT':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'PAYOUT':
        return <DollarSign className="h-4 w-4 text-primary" />;
    }
  };

  const getPayoutStatusBadge = (status: VendorPayout['status']) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>;
      case 'SENT':
        return <Badge variant="secondary">Sent</Badge>;
      case 'PAID':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${balance.total.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All time net balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${balance.unpaid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" onClick={() => setShowPayoutDialog(true)} disabled={balance.unpaid <= 0}>
              <DollarSign className="h-4 w-4 mr-1" />
              Create Payout
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdjustmentDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Adjustment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Tabs */}
      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">Ledger Entries</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No ledger entries yet
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(parseISO(entry.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEntryTypeIcon(entry.type)}
                          {entry.type}
                        </div>
                      </TableCell>
                      <TableCell className={entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {entry.amount >= 0 ? '+' : ''}{entry.currency} {entry.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.status === 'POSTED' ? 'default' : 'secondary'}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.note}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No payouts created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {format(parseISO(payout.period_start), 'MMM d')} - {format(parseISO(payout.period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">${payout.total_amount.toFixed(2)}</TableCell>
                      <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                      <TableCell>{format(parseISO(payout.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {payout.status === 'DRAFT' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updatePayoutStatus({ payoutId: payout.id, status: 'SENT' })}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Send
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => updatePayoutStatus({ payoutId: payout.id, status: 'CANCELLED' })}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {payout.status === 'SENT' && (
                            <Button 
                              size="sm"
                              onClick={() => updatePayoutStatus({ payoutId: payout.id, status: 'PAID' })}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payout Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payout for {vendorName}</DialogTitle>
            <DialogDescription>
              Select the period for this payout. All unpaid entries within this period will be included.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Unpaid balance: <span className="font-medium text-foreground">${balance.unpaid.toFixed(2)}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePayout} disabled={isCreatingPayout}>
              {isCreatingPayout && <LoadingSpinner size="sm" className="mr-2" />}
              Create Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Adjustment</DialogTitle>
            <DialogDescription>
              Add a manual adjustment to the vendor's ledger. Use negative values for deductions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="100.00 or -50.00"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                placeholder="Reason for adjustment..."
                value={adjustmentNote}
                onChange={(e) => setAdjustmentNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleAddAdjustment} 
              disabled={!adjustmentAmount || !adjustmentNote}
            >
              Add Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
