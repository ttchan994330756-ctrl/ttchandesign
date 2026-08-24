import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import BorderGlow from "./BorderGlow";
import WarpText from "./WarpText";

export type ExperienceItem = {
  id: string;
  company: string;
  role: string;
  responsibilities: string;
  achievements: string;
  contribution?: string;
  handled?: number;
  adopted?: number;
  metrics?: Array<{
    value: string;
    label: string;
  }>;
  start: string;
  end: string;
};

export type ExperienceSection = {
  kicker: string;
  titleEn: string;
  titleZh: string;
  description: string;
  eyebrow: string;
  items: ExperienceItem[];
};

type ExperienceTimelineProps = {
  sections: ExperienceSection[];
  ariaLabel?: string;
};

export default function ExperienceTimeline({ sections, ariaLabel = "设计历程时间轴，可上下滚动浏览" }: ExperienceTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startY: 0, startScroll: 0 });
  const [scrollbar, setScrollbar] = useState({ top: 0, height: 72, value: 0, max: 0 });

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const rows = [...root.querySelectorAll<HTMLElement>(".experience-row")];
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle("is-active", entry.isIntersecting && entry.intersectionRatio >= 0.42);
        });
      },
      { root, threshold: [0.2, 0.42, 0.7] },
    );
    rows.forEach(row => observer.observe(row));
    return () => observer.disconnect();
  }, [sections]);

  const updateScrollbar = () => {
    const scroller = scrollRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    const max = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
    const ratio = Math.min(scroller.clientHeight / Math.max(scroller.scrollHeight, 1), 1);
    const height = Math.max(62, track.clientHeight * ratio);
    const progress = max ? scroller.scrollTop / max : 0;
    setScrollbar({ top: (track.clientHeight - height) * progress, height, value: scroller.scrollTop, max });
  };

  useEffect(() => {
    const scroller = scrollRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(scroller);
    observer.observe(track);
    requestAnimationFrame(updateScrollbar);
    return () => observer.disconnect();
  }, [sections]);

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    const target = event.target as HTMLElement;
    if (target.classList.contains("experience-scrollbar-thumb")) {
      dragRef.current = { active: true, startY: event.clientY, startScroll: scroller.scrollTop };
      track.setPointerCapture(event.pointerId);
      return;
    }
    const rect = track.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(rect.height, 1)));
    scroller.scrollTo({ top: progress * scrollbar.max, behavior: "smooth" });
  };

  const handleTrackPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollRef.current;
    const track = trackRef.current;
    if (!dragRef.current.active || !scroller || !track) return;
    const trackRange = Math.max(track.clientHeight - scrollbar.height, 1);
    const delta = event.clientY - dragRef.current.startY;
    scroller.scrollTop = dragRef.current.startScroll + delta * (scrollbar.max / trackRange);
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleScrollbarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const steps: Record<string, number> = {
      ArrowUp: -90,
      ArrowDown: 90,
      PageUp: -scroller.clientHeight * 0.82,
      PageDown: scroller.clientHeight * 0.82,
    };
    if (event.key === "Home") scroller.scrollTo({ top: 0, behavior: "smooth" });
    else if (event.key === "End") scroller.scrollTo({ top: scrollbar.max, behavior: "smooth" });
    else if (event.key in steps) scroller.scrollBy({ top: steps[event.key], behavior: "smooth" });
    else return;
    event.preventDefault();
  };

  // Keep the page locked to the timeline while it has room to scroll. Once
  // the inner scroller reaches either edge, let the wheel event bubble so the
  // document can move to the neighboring section.
  const handleScrollWheel = (event: WheelEvent<HTMLDivElement>) => {
    const scroller = scrollRef.current;
    if (!scroller || event.deltaY === 0) return;

    // The timeline must not capture the wheel while the hero/header is still
    // visible. Forward that gesture to the document until the header has
    // completely left the viewport.
    const hero = document.getElementById("about");
    if (hero && hero.getBoundingClientRect().bottom > 1) {
      event.preventDefault();
      window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
      return;
    }

    const max = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop >= max - 1;
    const scrollingWithinTimeline = (event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom);
    if (scrollingWithinTimeline) {
      event.preventDefault();
      scroller.scrollTop = Math.max(0, Math.min(max, scroller.scrollTop + event.deltaY));
    }
  };

  return (
    <div className="experience-scroll-shell design-process-scroll-shell">
      <div className="experience-scroll" id="design-process-scroll" ref={scrollRef} onScroll={updateScrollbar} onWheel={handleScrollWheel} tabIndex={0} aria-label={ariaLabel}>
        <div className="experience-list">
          {sections.map((section, sectionIndex) => (
            <Fragment key={section.eyebrow}>
              <header className={`experience-heading experience-timeline-heading${sectionIndex ? " is-followup" : ""}`}>
                <p className="micro"><span /> {section.kicker}</p>
                <div>
                  <WarpText className="experience-title" ariaLabel={`${section.titleEn} ${section.titleZh}`}>
                    <span className="experience-title-en" data-warp-text>{section.titleEn}</span>
                    <span className="experience-title-zh" data-warp-text>{section.titleZh}</span>
                    <span className="experience-title-mark" data-warp-ignore aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false"><path d="M3 3 19 19M9 19h10V9" /></svg>
                    </span>
                  </WarpText>
                  <p>{section.description}</p>
                </div>
              </header>
              <div className="experience-group">
                <div className="experience-tree" aria-hidden="true" />
                {section.items.map((item, index) => (
                  <article className={`experience-row${index % 2 ? " is-right" : ""}${sectionIndex === 0 && index === 0 ? " is-active" : ""}${item.contribution ? " project-row" : ""}`} key={`${section.eyebrow}-${item.id}`}>
                    <BorderGlow
                      className="experience-card"
                      edgeSensitivity={30}
                      glowColor="256 100 58"
                      backgroundColor="#101827"
                      borderRadius={18}
                      glowRadius={38}
                      glowIntensity={1.15}
                      coneSpread={24}
                      colors={["#4101F6", "#A855F7", "#38BDF8"]}
                      fillOpacity={0.32}
                    >
                      <div className="experience-card-meta">
                        <span className="experience-index">{section.eyebrow} / {item.id}</span>
                        <span className="experience-role">{item.role}</span>
                      </div>
                      <h3>{item.company}</h3>
                      <div className={`experience-copy-grid${item.contribution ? " has-contribution" : ""}`}>
                        <section>
                          <h4><span>01</span> {item.contribution ? "项目职责" : "主要职责"}</h4>
                          <p>{item.responsibilities}</p>
                        </section>
                        <div className="experience-side-stack">
                          <section className="experience-result">
                            <h4><span>02</span> {item.contribution ? "项目成果" : "工作业绩"}</h4>
                            <p>{item.achievements}</p>
                          </section>
                          {item.contribution && (
                            <section className="experience-contribution">
                              <h4><span>03</span> 个人贡献</h4>
                              <p>{item.contribution}</p>
                            </section>
                          )}
                        </div>
                      </div>
                    </BorderGlow>
                    {typeof item.handled === "number" && typeof item.adopted === "number" && (
                      <div className="experience-stats" aria-label={`经手项目 ${item.handled} 个，采纳项目 ${item.adopted} 个`}>
                        <div><strong>{item.handled}</strong><span>经手项目</span></div>
                        <div><strong>{item.adopted}</strong><span>采纳项目</span></div>
                      </div>
                    )}
                    {item.metrics && item.metrics.length > 0 && (
                      <div
                        className={`experience-stats project-stats${item.metrics.length === 1 ? " is-single" : ""}`}
                        aria-label={item.metrics.map((metric) => `${metric.label} ${metric.value}`).join("，")}
                      >
                        {item.metrics.map((metric) => (
                          <div key={`${metric.label}-${metric.value}`}>
                            <strong className={metric.value.length > 7 ? "is-long" : undefined}>{metric.value}</strong>
                            <span>{metric.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="experience-node"><span>{item.id}</span></div>
                    <div className="experience-period">
                      <strong>{item.start}</strong>
                      {item.end && <><i /><strong>{item.end}</strong></>}
                    </div>
                  </article>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <div
        className="experience-scrollbar"
        ref={trackRef}
        role="scrollbar"
        aria-controls="design-process-scroll"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={Math.round(scrollbar.max)}
        aria-valuenow={Math.round(scrollbar.value)}
        tabIndex={0}
        onKeyDown={handleScrollbarKeyDown}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <span className="experience-scrollbar-thumb" style={{ height: scrollbar.height, top: scrollbar.top }} />
      </div>
    </div>
  );
}
