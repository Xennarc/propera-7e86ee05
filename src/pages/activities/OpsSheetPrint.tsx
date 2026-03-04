/**
 * OpsSheetPrint – Printable daily ops sheet for team briefings.
 * Route: /staff/activities/ops/day/print?date=YYYY-MM-DD&dept=dive
 * Minimal styling, white background, high contrast.
 */
import { FeatureGate } from '@/components/FeatureGate';
import { useSearchParams } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { useDailyOpsSheet, type OpsDepartment, type OpsSessionRow } from '@/hooks/useDailyOpsSheet';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const DEPT_LABELS: Record<string, string> = {
  DIVE: 'Dive',
  WATERSPORT: 'Watersports',
  EXCURSION: 'Excursions',
};

function getTimeBlock(startTime: string): string {
  const hour = parseInt(startTime?.slice(0, 2) ?? '0', 10);
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

function OpsSheetPrintContent() {
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const [searchParams] = useSearchParams();

  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  const deptParam = (searchParams.get('dept')?.toUpperCase() || 'DIVE') as string;

  const { data: sheet, isLoading } = useDailyOpsSheet(
    currentResort?.id,
    dateParam,
    deptParam as OpsDepartment,
  );

  const summary = sheet?.summary;
  const rows = sheet?.rows ?? [];

  // Group by time block
  const grouped = new Map<string, OpsSessionRow[]>();
  for (const r of rows) {
    const block = getTimeBlock(r.start_time);
    const list = grouped.get(block) || [];
    list.push(r);
    grouped.set(block, list);
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Screen-only toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-black border-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={() => window.print()}
          className="bg-black text-white hover:bg-gray-800"
        >
          <Printer className="h-4 w-4 mr-1.5" />
          Print
        </Button>
      </div>

      {/* Printable content */}
      <div className="max-w-[800px] mx-auto px-6 py-8 print:px-0 print:py-4">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Daily Ops Sheet
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {currentResort?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">
                {format(parseISO(dateParam), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm font-medium text-gray-700">
                {DEPT_LABELS[deptParam] ?? deptParam} Department
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8 print:grid-cols-6">
            {[
              { label: 'Sessions', value: summary.sessions },
              { label: 'Total Guests', value: summary.total_guests },
              { label: 'Pickups', value: summary.pickups_required },
              { label: 'Missing Prep', value: summary.missing_readiness, warn: true },
              { label: 'Medical', value: summary.pending_medical, warn: true },
              { label: 'Certs', value: summary.unverified_certs, warn: true },
            ].map(kpi => (
              <div
                key={kpi.label}
                className={`border rounded-lg p-3 text-center ${
                  kpi.warn && kpi.value > 0
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">
                  {kpi.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-400 text-center py-12">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No sessions scheduled</p>
        ) : (
          /* Session groups */
          ['Morning', 'Afternoon', 'Evening'].map(block => {
            const blockRows = grouped.get(block);
            if (!blockRows || blockRows.length === 0) return null;
            return (
              <div key={block} className="mb-8 print:break-inside-avoid">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 mb-3">
                  {block}
                </h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 pr-2 font-semibold text-gray-700 w-20">Time</th>
                      <th className="text-left py-2 pr-2 font-semibold text-gray-700">Activity</th>
                      <th className="text-left py-2 pr-2 font-semibold text-gray-700 w-24">Location</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700 w-12">Pax</th>
                      <th className="text-left py-2 pr-2 font-semibold text-gray-700 w-20">Boat</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700 w-12">Crew</th>
                      <th className="text-left py-2 font-semibold text-gray-700 w-28">Readiness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockRows.map(row => (
                      <PrintRow key={row.session_id} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 mt-8 text-[10px] text-gray-400 flex justify-between print:mt-4">
          <span>Generated {format(new Date(), 'MMM d, yyyy HH:mm')}</span>
          <span>Propera Ops</span>
        </div>
      </div>
    </div>
  );
}

function PrintRow({ row }: { row: OpsSessionRow }) {
  const hasIssues =
    row.readiness.missing > 0 ||
    row.readiness.pending_medical > 0 ||
    row.readiness.unverified_certs > 0 ||
    row.conflicts_count > 0;

  return (
    <tr className={`border-b border-gray-100 ${hasIssues ? 'bg-red-50/50' : ''}`}>
      <td className="py-2 pr-2 tabular-nums text-xs font-medium whitespace-nowrap">
        {row.start_time?.slice(0, 5)}–{row.end_time?.slice(0, 5)}
      </td>
      <td className="py-2 pr-2">
        <span className="font-medium">{row.activity_name}</span>
        {row.blockers.length > 0 && (
          <span className="text-red-600 text-[10px] ml-1 font-semibold">⚠</span>
        )}
      </td>
      <td className="py-2 pr-2 text-xs text-gray-500 truncate max-w-[100px]">
        {row.location || '—'}
      </td>
      <td className="py-2 px-1 text-center tabular-nums">
        <span className="font-medium">{row.total_pax}</span>
        <span className="text-gray-400">/{row.capacity}</span>
      </td>
      <td className="py-2 pr-2 text-xs truncate max-w-[80px]">
        {row.assignments.boat?.name || <span className="text-gray-300">—</span>}
      </td>
      <td className="py-2 px-1 text-center tabular-nums">
        {row.assignments.crew.length || '—'}
      </td>
      <td className="py-2 text-[10px] space-x-1">
        <span className="text-green-700">{row.readiness.ready}✓</span>
        {row.readiness.missing > 0 && (
          <span className="text-amber-600 font-semibold">{row.readiness.missing}✗</span>
        )}
        {row.readiness.pending_medical > 0 && (
          <span className="text-red-600 font-semibold">{row.readiness.pending_medical}M</span>
        )}
        {row.readiness.unverified_certs > 0 && (
          <span className="text-red-600 font-semibold">{row.readiness.unverified_certs}C</span>
        )}
      </td>
    </tr>
  );
}

export default function OpsSheetPrint() {
  return (
    <FeatureGate requiredFlags={['enable_activities_ops']} mode="staff">
      <OpsSheetPrintContent />
    </FeatureGate>
  );
}
