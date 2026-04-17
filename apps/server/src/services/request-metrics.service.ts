import db from '../config/db';

const FLUSH_INTERVAL_MS = 60 * 1000;

type RequestCountRow = {
  bucket_start: Date;
  request_count: number;
};

type RequestTypeCountRow = RequestCountRow & {
  request_type: string;
};

type RequestIpCountRow = RequestCountRow & {
  ip: string;
};

function getMinuteBucket(date: Date) {
  const bucket = new Date(date);
  bucket.setSeconds(0, 0);
  return bucket;
}

function getBucketKey(date: Date) {
  return getMinuteBucket(date).toISOString();
}

function incrementCounter(store: Map<string, number>, key: string) {
  store.set(key, (store.get(key) || 0) + 1);
}

export class RequestMetricsService {
  private readonly requestTypeCounts = new Map<string, number>();
  private readonly requestIpCounts = new Map<string, number>();
  private flushTimer?: NodeJS.Timeout;

  start() {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    return this.flush();
  }

  record(requestType: string, ip: string, now: Date = new Date()) {
    const bucketKey = getBucketKey(now);

    incrementCounter(this.requestTypeCounts, `${bucketKey}|${requestType}`);
    incrementCounter(this.requestIpCounts, `${bucketKey}|${ip}`);
  }

  private async flush() {
    if (this.requestTypeCounts.size === 0 && this.requestIpCounts.size === 0) {
      return;
    }

    const requestTypeRows: RequestTypeCountRow[] = [];
    const requestIpRows: RequestIpCountRow[] = [];

    for (const [key, requestCount] of this.requestTypeCounts.entries()) {
      const [bucketKey, requestType] = key.split('|');
      requestTypeRows.push({
        bucket_start: new Date(bucketKey),
        request_type: requestType,
        request_count: requestCount,
      });
    }

    for (const [key, requestCount] of this.requestIpCounts.entries()) {
      const [bucketKey, ip] = key.split('|');
      requestIpRows.push({
        bucket_start: new Date(bucketKey),
        ip,
        request_count: requestCount,
      });
    }

    this.requestTypeCounts.clear();
    this.requestIpCounts.clear();

    try {
      await db.transaction(async (trx) => {
        if (requestTypeRows.length > 0) {
          await trx('request_type_metric')
            .insert(requestTypeRows)
            .onConflict(['bucket_start', 'request_type'])
            .merge({
              request_count: db.raw('request_type_metric.request_count + EXCLUDED.request_count'),
            });
        }

        if (requestIpRows.length > 0) {
          await trx('request_ip_metric')
            .insert(requestIpRows)
            .onConflict(['bucket_start', 'ip'])
            .merge({
              request_count: db.raw('request_ip_metric.request_count + EXCLUDED.request_count'),
            });
        }
      });
    } catch (error) {
      console.error('Failed to flush request metrics', error);

      for (const row of requestTypeRows) {
        incrementCounter(
          this.requestTypeCounts,
          `${row.bucket_start.toISOString()}|${row.request_type}`
        );
      }

      for (const row of requestIpRows) {
        incrementCounter(this.requestIpCounts, `${row.bucket_start.toISOString()}|${row.ip}`);
      }
    }
  }
}

export const requestMetricsService = new RequestMetricsService();
