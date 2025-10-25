import { format } from "date-fns";
import { CalendarCheck, Clock, FlagTriangleRight } from "lucide-react";

export type TimelineEvent = {
  label: string;
  timestamp: number;
  description?: string;
  state?: "past" | "current" | "future" | "complete";
};

type SubscriptionTimelineProps = {
  events: TimelineEvent[];
};

function iconForState(state: TimelineEvent["state"]) {
  switch (state) {
    case "past":
    case "complete":
      return <CalendarCheck size={16} className="text-primary" />;
    case "current":
      return <FlagTriangleRight size={16} className="text-secondary" />;
    case "future":
    default:
      return <Clock size={16} className="text-text-muted" />;
  }
}

export function SubscriptionTimeline({ events }: SubscriptionTimelineProps) {
  if (!events.length) {
    return null;
  }

  return (
    <div className="card-surface overflow-hidden p-6">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">Timeline</h3>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <div className="relative flex-1 overflow-x-auto">
          <div className="hidden h-px w-full md:block md:bg-bronze/40" />
          <ol className="flex w-max min-w-full flex-row gap-8 md:gap-12">
            {events.map((event, index) => (
              <li key={`${event.label}-${event.timestamp}`} className="relative flex min-w-[180px] flex-col items-start">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-carbon">
                    {iconForState(event.state)}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-text-primary">
                      {event.label}
                    </span>
                    <span className="text-xs text-text-muted">
                      {format(new Date(event.timestamp * 1000), "dd MMM yyyy • HH:mm")}
                    </span>
                  </div>
                </div>
                {event.description ? (
                  <p className="mt-2 max-w-xs text-xs text-text-muted">{event.description}</p>
                ) : null}
                {index < events.length - 1 ? (
                  <div className="absolute left-5 top-10 hidden h-px w-[120px] bg-bronze/40 md:block" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
