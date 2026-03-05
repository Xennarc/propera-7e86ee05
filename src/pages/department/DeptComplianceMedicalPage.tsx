import { useState } from 'react';
import { DepartmentGuard } from '@/components/department/DepartmentGuard';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { Search, CalendarIcon, HeartPulse, Plus, X } from 'lucide-react';

function DeptComplianceMedicalContent() {
  const { currentDepartment } = useDepartment();
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({ from: new Date() });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Medical Review</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentDepartment?.name}</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled>
                <Plus className="h-3.5 w-3.5" />
                Log Entry
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Coming soon — manual medical log</TooltipContent>
        </Tooltip>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(dateRange.from, 'MMM d')}
              {dateRange.to ? ` – ${format(dateRange.to, 'MMM d')}` : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => range?.from && setDateRange({ from: range.from, to: range.to })}
            />
          </PopoverContent>
        </Popover>

        {showSearch ? (
          <div className="flex items-center gap-1 flex-1 min-w-[140px]">
            <Input
              placeholder="Search guest or condition..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSearch(true)}>
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Table shell */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Guest</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Session</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Condition</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Review Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Reviewed By</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <HeartPulse className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">No pending medical reviews</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Medical disclosures requiring review will appear here.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptComplianceMedicalPage() {
  return (
    <DepartmentGuard moduleKey="compliance_medical">
      <DeptComplianceMedicalContent />
    </DepartmentGuard>
  );
}
