
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  bgGradient?: string;
}

const StatCard = ({ title, value, icon: Icon, trend }: StatCardProps) => {
  return (
    <div className="rounded-lg p-6 border border-border bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
          <h3 className="text-3xl font-mono font-medium mt-2 text-ink">{value}</h3>
          {trend && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${trend.isPositive ? 'text-primary' : 'text-destructive'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="text-xs text-muted-foreground">vs last month</span>
            </p>
          )}
        </div>
        <div className="p-2.5 bg-muted rounded-md">
          <Icon className="text-primary" size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
