import { format } from "date-fns";
import { Clock, CheckCircle2 } from "lucide-react";

type TimelineEvent = {
  label: string;
  timestamp: number;
  description?: string;
  completed?: boolean;
};

type SubscriptionTimelineProps = {
  events: TimelineEvent[];
};

export function SubscriptionTimeline({ events }: SubscriptionTimelineProps) {
  return (
    <div className="card-surface p-6">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">
        Subscription Timeline
      </h3>
      <ol className="relative space-y-6 border-l border-bronze/60 pl-6">
        {events.map((event) => (
          <li key={`${event.label}-${event.timestamp}`} className="relative pb-2">
            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-foundation-black">
              {event.completed ? (
                <CheckCircle2 size={14} className="text-primary" />
              ) : (
                <Clock size={14} className="text-text-muted" />
              )}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-primary">
                {event.label}
              </span>
              <span className="text-xs text-text-muted">
                {format(new Date(event.timestamp * 1000), "dd MMM yyyy • HH:mm")}
              </span>
              {event.description ? (
                <p className="text-xs text-text-muted/80">{event.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
