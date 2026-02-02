import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Trophy, Clock, MapPin, Users } from 'lucide-react';
import type { DriverPerformance } from '@/hooks/transport/useTransportMetrics';

interface DriverPerformanceTableProps {
  drivers: DriverPerformance[];
}

export function DriverPerformanceTable({ drivers }: DriverPerformanceTableProps) {
  if (drivers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Driver Performance
          </CardTitle>
          <CardDescription>No driver data for selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-2">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Complete some trips to see driver stats
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topDriver = drivers[0];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Driver Performance
            </CardTitle>
            <CardDescription>{drivers.length} drivers in period</CardDescription>
          </div>
          {topDriver && (
            <Badge className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
              <Trophy className="h-3 w-3" />
              {topDriver.driverName}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Driver</TableHead>
                <TableHead className="text-center">Trips</TableHead>
                <TableHead className="text-center">Stops</TableHead>
                <TableHead className="text-center">Avg Duration</TableHead>
                <TableHead className="text-center">Passengers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver, index) => (
                <TableRow key={driver.driverId}>
                  <TableCell className="pl-6 font-medium">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                      {driver.driverName}
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {driver.tripsCompleted}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    <div className="flex items-center justify-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {driver.totalStops}
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {driver.avgTripDurationMinutes}m
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {driver.totalPassengers}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
