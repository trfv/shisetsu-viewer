import type { MetricType } from "web-vitals";

export const reportWebVitals = (onPerfEntry?: (metric: MetricType) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import("web-vitals/attribution").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onFCP(onPerfEntry);
      onINP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    });
  }
};
