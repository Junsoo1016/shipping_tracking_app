import styles from './Timeline.module.css';

export type TimelineEvent = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  timestamp?: string;
};

type TimelineProps = {
  events: TimelineEvent[];
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const Timeline = ({ events }: TimelineProps) => {
  if (!events.length) {
    return <div className={styles.empty}>No tracking events available.</div>;
  }

  return (
    <ol className={styles.timeline}>
      {events.map(event => (
        <li key={event.id} className={styles.item}>
          <div className={styles.marker} />
          <div className={styles.details}>
            <h4>{event.title}</h4>
            {event.timestamp && <time>{formatDateTime(event.timestamp)}</time>}
            {event.location && <div className={styles.location}>{event.location}</div>}
            {event.description && <p>{event.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
};

export default Timeline;
