/**
 * SLA Configuration for Guest Service Requests
 * Defines target response times by priority level
 */

export interface SLAConfig {
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  targetMinutes: number;
  warningThresholdPercent: number; // Show warning when this % of time has elapsed
  color: string;
  bgColor: string;
  pulseAnimation: boolean;
}

export const SLA_CONFIG: Record<string, SLAConfig> = {
  URGENT: {
    priority: 'URGENT',
    targetMinutes: 15,
    warningThresholdPercent: 50,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
    pulseAnimation: true,
  },
  HIGH: {
    priority: 'HIGH',
    targetMinutes: 30,
    warningThresholdPercent: 60,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
    pulseAnimation: false,
  },
  NORMAL: {
    priority: 'NORMAL',
    targetMinutes: 60,
    warningThresholdPercent: 70,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    pulseAnimation: false,
  },
  LOW: {
    priority: 'LOW',
    targetMinutes: 120,
    warningThresholdPercent: 80,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    pulseAnimation: false,
  },
};

export function getSLAConfig(priority: string): SLAConfig {
  return SLA_CONFIG[priority] || SLA_CONFIG.NORMAL;
}

export interface SLAStatus {
  remainingMinutes: number;
  totalMinutes: number;
  percentElapsed: number;
  isOverdue: boolean;
  isWarning: boolean;
  statusColor: 'green' | 'yellow' | 'red';
}

/**
 * Calculate SLA status for a request
 */
export function calculateSLAStatus(
  createdAt: string,
  priority: string,
  status: string
): SLAStatus | null {
  // Don't show SLA for completed/cancelled requests
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    return null;
  }

  const config = getSLAConfig(priority);
  const created = new Date(createdAt);
  const now = new Date();
  const elapsedMs = now.getTime() - created.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const targetMinutes = config.targetMinutes;
  const remainingMinutes = Math.max(0, targetMinutes - elapsedMinutes);
  const percentElapsed = Math.min(100, (elapsedMinutes / targetMinutes) * 100);

  const isOverdue = remainingMinutes <= 0;
  const isWarning = percentElapsed >= config.warningThresholdPercent && !isOverdue;

  let statusColor: 'green' | 'yellow' | 'red' = 'green';
  if (isOverdue) {
    statusColor = 'red';
  } else if (isWarning) {
    statusColor = 'yellow';
  }

  return {
    remainingMinutes: Math.round(remainingMinutes),
    totalMinutes: targetMinutes,
    percentElapsed: Math.round(percentElapsed),
    isOverdue,
    isWarning,
    statusColor,
  };
}

/**
 * Format remaining time for display
 */
export function formatSLATime(minutes: number): string {
  if (minutes < 0) {
    const overdue = Math.abs(minutes);
    if (overdue < 60) {
      return `${Math.round(overdue)}m overdue`;
    }
    const hours = Math.floor(overdue / 60);
    const mins = Math.round(overdue % 60);
    return `${hours}h ${mins}m overdue`;
  }

  if (minutes < 60) {
    return `${Math.round(minutes)}m left`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m left`;
}
