import { TransportReportingView } from './TransportReportingView';

interface TransportHistoryTabProps {
  resortId: string | undefined;
}

export function TransportHistoryTab({ resortId }: TransportHistoryTabProps) {
  return <TransportReportingView resortId={resortId} />;
}
