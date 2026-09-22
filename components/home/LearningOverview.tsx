"use client";

import { useState } from "react";
import { learningOverview, learningPlan } from "@/data/home";

export function LearningOverview() {
  const [periodIndex, setPeriodIndex] = useState(0);
  const period = learningOverview.periods[periodIndex];
  const maximum = Math.max(...period.hours, 1);
  return (
    <section className="bento-card home-learning" aria-label="学习与生活">
      <div className="bento-heading">
        <h2>学习与生活</h2>
        <span className="source-label">{learningPlan.sourceLabel}</span>
      </div>
      <div className="learning-periods" role="group" aria-label="计划时间范围">
        {learningOverview.periods.map((item, index) => (
          <button
            key={item.name}
            type="button"
            aria-pressed={periodIndex === index}
            onClick={() => setPeriodIndex(index)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div
        className="learning-chart"
        aria-live="polite"
        aria-label={`${period.name}时间分配计划示例`}
      >
        {period.hours.map((hours, index) => (
          <div className="learning-column" key={learningOverview.labels[index]}>
            <span className="chart-value">{hours}h</span>
            <div
              className={`chart-bar bar-${index}`}
              style={{ height: `${(hours / maximum) * 70}px` }}
            />
            <span className="chart-label">
              {learningOverview.labels[index]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
