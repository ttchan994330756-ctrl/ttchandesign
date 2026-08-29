import { StrictMode, Suspense, lazy, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import CircularGallery from "./components/CircularGallery";
import ExperienceTimeline from "./components/ExperienceTimeline";
import GooeyNav from "./components/GooeyNav";
import Grainient from "./components/Grainient";
import ThreeDCard from "./components/ThreeDCard";
import VariableProximity from "./components/VariableProximity";
import WarpText from "./components/WarpText";
import PortfolioMotion from "./components/PortfolioMotion";
import BlurText from "./components/BlurText";
import "./components/VariableProximity.css";
import "./styles.css";

const ForkliftModelViewer = lazy(() => import("./components/ForkliftModelViewer"));
const MRModelViewer = lazy(() => import("./components/MRModelViewer"));
const TowerModelViewer = lazy(() => import("./components/TowerModelViewer"));
const InkBottleModelViewer = lazy(() => import("./components/InkBottleModelViewer"));
const ProjectorModelViewer = lazy(() => import("./components/ProjectorModelViewer"));
const CoatRackModelViewer = lazy(() => import("./components/CoatRackModelViewer"));
const DiagnosticModelViewer = lazy(() => import("./components/DiagnosticModelViewer"));
const IpModelViewer = lazy(() => import("./components/IpModelViewer"));

const navItems = [
  ["about", "关于我"],
  ["process", "设计历程"],
  ["work", "个人作品"],
  ["ability", "个人优势"],
  ["contact", "联系我"],
];

const heroProjects = [
  { image: "/hero-projects/01.webp", text: "欧能叉车设计" },
  { image: "/hero-projects/02.webp", text: "MR交互设备", badge: "/hero-projects/new-quality-award.png" },
  { image: "/hero-projects/03.webp", text: "德信塔扇设计" },
  { image: "/hero-projects/04.webp", text: "墨水瓶设计", badge: "/hero-projects/if-design-award.png" },
  { image: "/hero-projects/05.webp", text: "酷开投影仪" },
  { image: "/hero-projects/06.webp", text: "衣帽架设计", badge: "/hero-projects/gd-industrial-design-award.png" },
  { image: "/hero-projects/07.webp", text: "汽车诊断仪" },
  { image: "/hero-projects/08.webp", text: "AI潮玩应用" },
];

const workExperiences = [
  {
    id: "01",
    company: "浪尖集团有限公司",
    role: "工业设计实习生",
    responsibilities: "任职电子 3C 部 ID 设计师，负责消费电子、车载工业设备及储能硬件产品的外观设计，参与项目从需求分析到客户提案的全流程。结合产品定位、目标用户及竞品分析，提炼造型、人机与 CMF 设计方向；独立完成创意草图、方案筛选、三维建模、写实渲染及提案 PPT；协同结构工程师评估拔模、装配及量产工艺，持续优化产品配色、纹理与表面处理方案。",
    achievements: "参与完成 4 个商业设计项目，覆盖车载诊断、户外储能、教育文创及海外智能家居硬件，累计输出 3 套完整外观方案，其中 2 个项目成功中标。",
    handled: 4,
    adopted: 2,
    start: "2022.05",
    end: "2022.08",
  },
  {
    id: "02",
    company: "叁目计研产品策划有限公司",
    role: "工业设计师",
    responsibilities: "任职 ID2 组工业设计师，负责消费电子、家用电器及户外硬件产品的外观设计，参与项目从需求分析、前期研究到客户提案的全流程。围绕产品定位、用户画像及使用场景开展竞品研究，提炼造型、人机与 CMF 设计策略；独立完成创意草图、方案筛选、Rhino 精细化建模、KeyShot 渲染及提案 PPT；协同结构工程师解决分型、拔模、装配及量产工艺问题，并负责客户汇报及方案迭代。",
    achievements: "累计完成 11 个商业设计项目，覆盖智能投影、家用制冷、户外通风及便携个护电子等品类，其中 5 套外观方案通过客户评审并成功中标。",
    handled: 11,
    adopted: 5,
    start: "2022.10",
    end: "2023.06",
  },
];

const projectExperiences = [
  {
    id: "01",
    company: "欧能叉车设计项目",
    role: "成员设计师",
    responsibilities: "参与叉车外观设计全流程，开展行业竞品、人机工学及使用场景调研；完成造型构思与多轮草图迭代，结合人机尺寸和结构要求优化方案，并负责三维建模、产品渲染及线下提案。",
    achievements: "团队形成叉车行业专项调研报告，梳理市场痛点与设计趋势，为企业产品升级提供设计参考。",
    contribution: "输出 7 套差异化造型草案，完成 1 套终版方案及全套建模渲染，设计方案通过企业评审并获选用。",
    metrics: [
      { value: "1套", label: "最终提案" },
      { value: "1套", label: "企业采纳" },
    ],
    start: "2021.05",
    end: "2021.08",
  },
  {
    id: "02",
    company: "德信电器欧洲塔扇设计项目",
    role: "成员设计师",
    responsibilities: "负责面向欧洲市场的塔扇产品设计，通过外文行业及电商资料，研究当地竞品特征、用户审美与行业标准，并完成产品设计提案。",
    achievements: "团队形成塔扇行业调研报告，明确海外市场差异化设计方向，为企业建立可落地的海外家电设计参考。",
    contribution: "独立完成欧洲市场调研及外文资料整理，输出 7 套造型草案并优化定稿 2 套方案，其中 1 套被企业选入产品方案库。",
    metrics: [
      { value: "2套", label: "最终提案" },
      { value: "1套", label: "企业采纳" },
    ],
    start: "2021.09",
    end: "2022.03",
  },
  {
    id: "03",
    company: "青原礼物文创项目",
    role: "项目负责人",
    responsibilities: "统筹命题分析、文化调研、创意设计、成果整合及赛事申报。梳理青原文化符号与评审标准，制定整体设计方向，组织团队开展多方案创意发散，并完成作品整合、排版与申报。",
    achievements: "带领团队完成青原文化主题文创产品设计，作品后续获得浙江省工业设计大赛三等奖、中国包装创意大赛三等奖。",
    contribution: "主导产品设计理念与整体方向，负责三维建模、团队方案指导及渲染协作，推动参赛作品完整呈现。",
    metrics: [{ value: "二等奖*2", label: "获奖层次" }],
    start: "2025.04",
    end: "2025.05",
  },
  {
    id: "04",
    company: "浙江省大学生工业设计竞赛·云和木玩产业项目",
    role: "工业设计师",
    responsibilities: "围绕竞赛命题开展云和木玩产业、儿童用户需求及传统木艺工艺调研，挖掘非遗木制玩具创新方向，完成创意构思与多轮方案迭代。",
    achievements: "完成益智木玩产品及实物模型设计，作品通过多轮评审，获得浙江省大学生工业设计竞赛云和木玩赛题二等奖。",
    contribution: "独立完成创意设计、三维建模、产品渲染、竞赛展板排版及实物模型制作。",
    metrics: [{ value: "二等奖", label: "获奖层次" }],
    start: "2025.06",
    end: "2025.07",
  },
  {
    id: "05",
    company: "蓝桥杯·博物馆智慧导览项目",
    role: "项目负责人",
    responsibilities: "组织团队调研博物馆导览现状与游客使用痛点，结合 MR 交互技术确定产品创新方向；负责产品造型、交互界面及方案优化，并统筹项目进度与赛事申报。",
    achievements: "形成导览硬件外观与配套交互 UI 一体化设计方案，作品获得蓝桥杯二等奖及新质点专项奖。",
    contribution: "主导方案构思与设计推进，独立完成产品建模渲染、UI 界面设计及展板排版，统筹参赛成果的整合与提交。",
    metrics: [{ value: "二等奖\\新质点奖", label: "获奖层次" }],
    start: "2026.04",
    end: "2026.06",
  },
];

const projects = [
  { id: "P—01", title: "ONEN", zh: "4吨位叉车设计", image: "/works/01-forklift.webp", tags: "Five Tons Electric Forklift", size: "feature", focus: "58% 58%" },
  { id: "P—02", title: "TRACE", zh: "探迹-博物馆文旅交互设计", image: "/works/02-mr-device.webp", tags: "Museum Interactive Devices", size: "stack-top", focus: "70% 52%" },
  { id: "P—03", title: "GENTRY", zh: "家用塔扇设计（欧洲市场）", image: "/works/03-tower-fan.webp", tags: "Overseas tower fan design", size: "tower", focus: "18% 55%" },
  { id: "P—04", title: "BEE-T", zh: "‘蜂尾’墨水瓶（改良设计）", image: "/works/04-ink-bottle.webp", tags: "Improved Design Of Ink Bottle", size: "stack-bottom", focus: "55% 58%" },
  { id: "P—05", title: "P9-C", zh: "居家投影设计", image: "/works/05-projector.webp", tags: "Home Projector", size: "lower-left", focus: "56% 52%" },
  { id: "P—06", title: "FOLD", zh: "折叠衣帽架", image: "/works/06-coat-rack.webp", tags: "Clothes Rack Design", size: "lower-center", focus: "58% 50%" },
  { id: "P—07", title: "LAUNCH", zh: "汽车诊断仪设计", image: "/works/07-diagnostic.webp", tags: "Car Diagnostic Instrument", size: "banner", focus: "64% 76%" },
  { id: "P—08", title: "TT-ROBOT", zh: "AI 潮玩应用", image: "/works/08-ip-character.webp", tags: "Trendy Toy Design", size: "lower-right", focus: "58% 62%" },
];

const forkliftDetailImages = Array.from({ length: 15 }, (_, index) => `/forklift-detail/${index}.jpg`);
const mrDetailImages = Array.from({ length: 14 }, (_, index) => `/mr-detail/${index}.jpg`);
const additionalDetailPages = {
  3: { title: "德信塔扇设计作品详情", label: "03 / 德信塔扇设计 · 作品详情", path: "tower-detail", count: 13 },
  4: { title: "BEE-T 墨水瓶作品详情", label: "04 / BEE-T 墨水瓶 · 作品详情", path: "ink-detail", count: 10 },
  5: { title: "P9-C 投影仪作品详情", label: "05 / P9-C 投影仪 · 作品详情", path: "projector-detail", count: 9 },
  6: { title: "FOLD 衣帽架作品详情", label: "06 / FOLD 衣帽架 · 作品详情", path: "coat-rack-detail", count: 10 },
  7: { title: "LAUNCH 汽车诊断仪作品详情", label: "07 / LAUNCH 汽车诊断仪 · 作品详情", path: "diagnostic-detail", count: 10 },
  8: { title: "TT-ROBOT IP 形象作品详情", label: "08 / TT-ROBOT IP 形象 · 作品详情", path: "ip-detail", count: 9 },
} as const;

const abilities = [
  { id: "01 / CORE", title: "商业落地", points: ["明需求", "中标高", "懂量产"], icon: "arc", metrics: [{ value: "17个", label: "累计商业项目" }, { value: "9个", label: "累计采纳项目" }], note: null, logo: null },
  { id: "02 / CORE", title: "洞察敏锐", points: ["抓痛点", "细人机", "跨品类"], icon: "star", metrics: null, note: "3C消费电子、家居产品、工程装备、家具、文具、\n文创、IP....", logo: null },
  { id: "03 / CORE", title: "专业功底", points: ["审美好", "善软硬", "斩大奖"], icon: "orbit", metrics: null, note: null, logo: "/ability-new-quality-award.png" },
] as const;

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function DetailImage({ src, alt, loading }: { src: string; alt: string; loading: "eager" | "lazy" }) {
  const webp = src.replace(/\.jpe?g$/i, ".webp");
  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img src={src} alt={alt} loading={loading} decoding="async" />
    </picture>
  );
}

function AbilityMark({ kind }: { kind: "arc" | "star" | "orbit" }) {
  if (kind === "star") {
    return (
      <svg className="ability-mark ability-mark-star" viewBox="0 0 64 64" aria-hidden="true">
        <path d="m31 7 6 18 18 6-18 7-6 18-7-18-17-7 17-6 7-18Z" />
      </svg>
    );
  }

  if (kind === "orbit") {
    return (
      <svg className="ability-mark ability-mark-orbit" viewBox="0 0 64 64" aria-hidden="true">
        <ellipse cx="31" cy="32" rx="24" ry="11" transform="rotate(-22 31 32)" />
        <circle cx="15" cy="45" r="5" />
        <path d="m43 12 8 2-2 8" />
      </svg>
    );
  }

  return (
    <svg className="ability-mark ability-mark-arc" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 39c10-18 28-25 44-17" />
      <path d="m48 17 7 4-2 8" />
      <circle cx="21" cy="48" r="5" />
    </svg>
  );
}

function SectionGrainient() {
  return (
    <Grainient
      className="section-grainient"
      color1="#000000"
      color2="#190760"
      color3="#000000"
      timeSpeed={0.25}
      colorBalance={0}
      warpStrength={1}
      warpFrequency={5}
      warpSpeed={2}
      warpAmplitude={50}
      blendAngle={0}
      blendSoftness={0.28}
      rotationAmount={500}
      noiseScale={2}
      grainAmount={0.09}
      grainScale={1.8}
      grainAnimated={false}
      contrast={1.45}
      gamma={1}
      saturation={1}
      centerX={-0.03}
      centerY={0}
      zoom={0.9}
    />
  );
}

function App() {
  const [active, setActive] = useState("about");
  const [forkliftViewerOpen, setForkliftViewerOpen] = useState(false);
  const [mrViewerOpen, setMrViewerOpen] = useState(false);
  const [towerViewerOpen, setTowerViewerOpen] = useState(false);
  const [inkBottleViewerOpen, setInkBottleViewerOpen] = useState(false);
  const [projectorViewerOpen, setProjectorViewerOpen] = useState(false);
  const [coatRackViewerOpen, setCoatRackViewerOpen] = useState(false);
  const [diagnosticViewerOpen, setDiagnosticViewerOpen] = useState(false);
  const [ipViewerOpen, setIpViewerOpen] = useState(false);
  const [resumeViewerOpen, setResumeViewerOpen] = useState(false);
  const [forkliftDetailOpen, setForkliftDetailOpen] = useState(false);
  const [mrDetailOpen, setMrDetailOpen] = useState(false);
  const [additionalDetailId, setAdditionalDetailId] = useState<keyof typeof additionalDetailPages | null>(null);
  const contactTitleRef = useRef<HTMLHeadingElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const openHeroProject = useCallback(({ ordinal }: { ordinal: number }) => {
    if (ordinal === 1) setForkliftViewerOpen(true);
    if (ordinal === 2) setMrViewerOpen(true);
    if (ordinal === 3) setTowerViewerOpen(true);
    if (ordinal === 4) setInkBottleViewerOpen(true);
    if (ordinal === 5) setProjectorViewerOpen(true);
    if (ordinal === 6) setCoatRackViewerOpen(true);
    if (ordinal === 7) setDiagnosticViewerOpen(true);
    if (ordinal === 8) setIpViewerOpen(true);
  }, []);
  const openProjectModel = useCallback((projectId: string) => {
    const ordinal = Number.parseInt(projectId.replace(/\D/g, ""), 10);
    if (ordinal === 1) setForkliftViewerOpen(true);
    if (ordinal === 2) setMrViewerOpen(true);
    if (ordinal === 3) setTowerViewerOpen(true);
    if (ordinal === 4) setInkBottleViewerOpen(true);
    if (ordinal === 5) setProjectorViewerOpen(true);
    if (ordinal === 6) setCoatRackViewerOpen(true);
    if (ordinal === 7) setDiagnosticViewerOpen(true);
    if (ordinal === 8) setIpViewerOpen(true);
  }, []);
  const closeForkliftViewer = useCallback(() => setForkliftViewerOpen(false), []);
  const closeMrViewer = useCallback(() => setMrViewerOpen(false), []);
  const closeTowerViewer = useCallback(() => setTowerViewerOpen(false), []);
  const closeInkBottleViewer = useCallback(() => setInkBottleViewerOpen(false), []);
  const closeProjectorViewer = useCallback(() => setProjectorViewerOpen(false), []);
  const closeCoatRackViewer = useCallback(() => setCoatRackViewerOpen(false), []);
  const closeDiagnosticViewer = useCallback(() => setDiagnosticViewerOpen(false), []);
  const closeIpViewer = useCallback(() => setIpViewerOpen(false), []);
  const closeResumeViewer = useCallback(() => setResumeViewerOpen(false), []);
  const closeForkliftDetail = useCallback(() => setForkliftDetailOpen(false), []);
  const closeMrDetail = useCallback(() => setMrDetailOpen(false), []);
  const closeAdditionalDetail = useCallback(() => setAdditionalDetailId(null), []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    const startVideo = () => {
      void video.play().catch(() => undefined);
    };
    if (document.documentElement.dataset.openingComplete === "true") startVideo();
    else window.addEventListener("portfolio:opening-complete", startVideo, { once: true });
    return () => window.removeEventListener("portfolio:opening-complete", startVideo);
  }, []);

  useEffect(() => {
    if (!resumeViewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeResumeViewer();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [resumeViewerOpen, closeResumeViewer]);

  useEffect(() => {
    if (!forkliftDetailOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeForkliftDetail();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [forkliftDetailOpen, closeForkliftDetail]);

  useEffect(() => {
    if (!mrDetailOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMrDetail();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mrDetailOpen, closeMrDetail]);

  useEffect(() => {
    if (additionalDetailId === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAdditionalDetail();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [additionalDetailId, closeAdditionalDetail]);

  useEffect(() => {
    const sections = navItems
      .map(([id]) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-35% 0px -45%", threshold: [0, .1, .35] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    let clientX = -100;
    let clientY = -100;
    const updatePointer = (event: PointerEvent) => {
      clientX = event.clientX;
      clientY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        document.documentElement.style.setProperty("--mx", `${clientX}px`);
        document.documentElement.style.setProperty("--my", `${clientY}px`);
      });
    };
    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", updatePointer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main>
      <PortfolioMotion />
      <div className="cursor-glow" aria-hidden="true" />
      <GooeyNav
        items={navItems.map(([id, label]) => ({ id, label, href: `#${id}` }))}
        activeIndex={Math.max(0, navItems.findIndex(([id]) => id === active))}
        onActiveChange={index => setActive(navItems[index][0])}
      />

      <section className="hero" id="about">
        <video ref={heroVideoRef} className="hero-video" muted loop playsInline preload="none" aria-hidden="true">
          <source src="/hero-background-4k-mirrored.mp4" type="video/mp4" />
        </video>
        <div className="hero-video-shade" aria-hidden="true" />
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="grid-overlay" />

        <div className="top-rail frame">
          <span className="availability"><i /> AVAILABLE FOR SELECTED PROJECTS</span>
        </div>

        <div className="hero-stage frame">
          <div className="hero-copy">
            <p className="micro hero-kicker"><BlurText text="HELLO / 你好" delay={55} stepDuration={0.28} waitForOpening /></p>
            <div className="hero-title">
              <span className="zh"><BlurText text="我是陈麒聪" delay={75} stepDuration={0.44} waitForOpening /></span>
              <h1><BlurText text="PORTFOLIO" delay={70} stepDuration={0.42} waitForOpening /></h1>
            </div>
            <p className="role"><BlurText text="工业设计师" delay={75} stepDuration={0.4} waitForOpening /></p>
            <p className="intro"><BlurText text="为物件建立秩序，也为体验留出想象。" delay={58} stepDuration={0.38} waitForOpening /></p>
            <div className="hero-actions">
              <a className="primary-action" href="#work">查看作品 <Arrow /></a>
              <button className="secondary-action" type="button" onClick={() => setResumeViewerOpen(true)}>查看简历</button>
            </div>
          </div>

          <span className="outline-word">PORTFOLIO</span>
          <figure className="hero-portrait-card" aria-label="Industrial Designer portrait">
            <ThreeDCard className="hero-portrait-tilt">
              <img src="/hero-portrait-component.webp" alt="Industrial Designer portrait" />
              <p className="education-tag portrait-education-tag">浙江理工大学设计硕士</p>
            </ThreeDCard>
          </figure>
        </div>

        <div className="hero-project-marquee" aria-label="作品图片展示">
          <CircularGallery
            items={heroProjects}
            bend={1.75}
            textColor="#ffffff"
            borderRadius={0.075}
            font='600 22px Inter, "PingFang SC", sans-serif'
            scrollSpeed={1.45}
            scrollEase={0.045}
            onItemClick={openHeroProject}
          />
        </div>

        <a className="hero-scroll-indicator main__action" href="#process" aria-label="向下滚动浏览设计历程">
          <svg className="hero-scroll-indicator-icon main__scroll-box" viewBox="0 0 24 16" aria-hidden="true">
            <path d="m4 4 8 8 8-8" />
          </svg>
          <span className="hero-scroll-indicator-text">滚动</span>
        </a>
      </section>

      {forkliftViewerOpen && (
        <Suspense
          fallback={(
            <div
              role="status"
              aria-label="正在准备三维模型展示"
              style={{ position: "fixed", zIndex: 299, inset: 0, display: "grid", placeItems: "center", color: "white", background: "rgba(0,0,0,.2)", fontSize: 12, letterSpacing: ".18em" }}
            >
              PREPARING 3D VIEWER
            </div>
          )}
        >
          <ForkliftModelViewer open onClose={closeForkliftViewer} />
        </Suspense>
      )}

      {mrViewerOpen && (
        <Suspense
          fallback={(
            <div
              role="status"
              aria-label="正在准备 MR 模型展示"
              style={{ position: "fixed", zIndex: 299, inset: 0, display: "grid", placeItems: "center", color: "white", background: "rgba(0,0,0,.2)", fontSize: 12, letterSpacing: ".18em" }}
            >
              PREPARING MR VIEWER
            </div>
          )}
        >
          <MRModelViewer open onClose={closeMrViewer} />
        </Suspense>
      )}

      {towerViewerOpen && (
        <Suspense
          fallback={(
            <div
              role="status"
              aria-label="正在准备塔扇模型展示"
              style={{ position: "fixed", zIndex: 299, inset: 0, display: "grid", placeItems: "center", color: "white", background: "rgba(0,0,0,.2)", fontSize: 12, letterSpacing: ".18em" }}
            >
              PREPARING TOWER FAN VIEWER
            </div>
          )}
        >
          <TowerModelViewer open onClose={closeTowerViewer} />
        </Suspense>
      )}

      {inkBottleViewerOpen && (
        <Suspense
          fallback={(
            <div
              role="status"
              aria-label="正在准备墨水瓶模型展示"
              style={{ position: "fixed", zIndex: 299, inset: 0, display: "grid", placeItems: "center", color: "white", background: "rgba(0,0,0,.2)", fontSize: 12, letterSpacing: ".18em" }}
            >
              PREPARING INK BOTTLE VIEWER
            </div>
          )}
        >
          <InkBottleModelViewer open onClose={closeInkBottleViewer} />
        </Suspense>
      )}

      {projectorViewerOpen && (
        <Suspense
          fallback={(
            <div
              role="status"
              aria-label="正在准备投影仪模型展示"
              style={{ position: "fixed", zIndex: 299, inset: 0, display: "grid", placeItems: "center", color: "white", background: "rgba(0,0,0,.2)", fontSize: 12, letterSpacing: ".18em" }}
            >
              PREPARING PROJECTOR VIEWER
            </div>
          )}
        >
          <ProjectorModelViewer open onClose={closeProjectorViewer} />
        </Suspense>
      )}

      {coatRackViewerOpen && (
        <Suspense
          fallback={(
            <div
              role="status"
              aria-label="正在准备衣帽架模型展示"
              style={{ position: "fixed", zIndex: 299, inset: 0, display: "grid", placeItems: "center", color: "white", background: "rgba(0,0,0,.2)", fontSize: 12, letterSpacing: ".18em" }}
            >
              PREPARING COAT RACK VIEWER
            </div>
          )}
        >
          <CoatRackModelViewer open onClose={closeCoatRackViewer} />
        </Suspense>
      )}

      {diagnosticViewerOpen && (
        <Suspense
          fallback={(
            <div
              role="status"
              aria-label="正在准备汽车诊断仪模型展示"
              style={{ position: "fixed", zIndex: 299, inset: 0, display: "grid", placeItems: "center", color: "white", background: "rgba(0,0,0,.2)", fontSize: 12, letterSpacing: ".18em" }}
            >
              PREPARING DIAGNOSTIC VIEWER
            </div>
          )}
        >
          <DiagnosticModelViewer open onClose={closeDiagnosticViewer} />
        </Suspense>
      )}

      {ipViewerOpen && (
        <Suspense
          fallback={(
            <div
              role="status"
              aria-label="正在准备 TT-ROBOT 模型展示"
              style={{ position: "fixed", zIndex: 299, inset: 0, display: "grid", placeItems: "center", color: "white", background: "rgba(0,0,0,.2)", fontSize: 12, letterSpacing: ".18em" }}
            >
              PREPARING IP VIEWER
            </div>
          )}
        >
          <IpModelViewer open onClose={closeIpViewer} />
        </Suspense>
      )}

      {resumeViewerOpen && (
        <div className="resume-viewer" role="dialog" aria-modal="true" aria-label="工业设计简历预览">
          <button className="resume-viewer-backdrop" type="button" aria-label="关闭简历预览" onClick={closeResumeViewer} />
          <div className="resume-viewer-panel">
            <div className="resume-viewer-toolbar">
              <span>工业设计简历</span>
              <button className="resume-viewer-close" type="button" aria-label="关闭简历预览" onClick={closeResumeViewer}>×</button>
            </div>
            <iframe src="/工业设计简历.pdf#view=FitH" title="工业设计简历" />
          </div>
        </div>
      )}

      {forkliftDetailOpen && (
        <div className="detail-viewer" role="dialog" aria-modal="true" aria-label="欧能叉车设计作品详情">
          <button className="detail-viewer-backdrop" type="button" aria-label="关闭叉车作品详情" onClick={closeForkliftDetail} />
          <section className="detail-viewer-panel">
            <header className="detail-viewer-toolbar">
              <span>01 / 欧能叉车设计 · 作品详情</span>
              <button className="detail-viewer-close" type="button" aria-label="关闭叉车作品详情" onClick={closeForkliftDetail}>×</button>
            </header>
            <div className="detail-viewer-scroll" aria-label="叉车作品详情连续页面">
              {forkliftDetailImages.map((image, index) => (
                <DetailImage key={image} src={image} alt={`欧能叉车设计详情 ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} />
              ))}
            </div>
          </section>
        </div>
      )}

      {mrDetailOpen && (
        <div className="detail-viewer" role="dialog" aria-modal="true" aria-label="TRACE 探迹 MR 设备作品详情">
          <button className="detail-viewer-backdrop" type="button" aria-label="关闭 MR 设备作品详情" onClick={closeMrDetail} />
          <section className="detail-viewer-panel">
            <header className="detail-viewer-toolbar">
              <span>02 / TRACE 探迹 · MR 设备作品详情</span>
              <button className="detail-viewer-close" type="button" aria-label="关闭 MR 设备作品详情" onClick={closeMrDetail}>×</button>
            </header>
            <div className="detail-viewer-scroll" aria-label="MR 设备作品详情连续页面">
              {mrDetailImages.map((image, index) => (
                <DetailImage key={image} src={image} alt={`MR 设备作品详情 ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} />
              ))}
            </div>
          </section>
        </div>
      )}

      {additionalDetailId !== null && (() => {
        const detail = additionalDetailPages[additionalDetailId];
        const images = Array.from({ length: detail.count }, (_, index) => `/${detail.path}/${index}.jpg`);
        return (
          <div className="detail-viewer" role="dialog" aria-modal="true" aria-label={detail.title}>
            <button className="detail-viewer-backdrop" type="button" aria-label={`关闭${detail.title}`} onClick={closeAdditionalDetail} />
            <section className="detail-viewer-panel">
              <header className="detail-viewer-toolbar">
                <span>{detail.label}</span>
                <button className="detail-viewer-close" type="button" aria-label={`关闭${detail.title}`} onClick={closeAdditionalDetail}>×</button>
              </header>
              <div className="detail-viewer-scroll" aria-label={`${detail.title}连续页面`}>
                {additionalDetailId === 8 && (
                  <video className="detail-viewer-video" controls preload="metadata" playsInline>
                    <source src="/ip-detail-promo.mp4" type="video/mp4" />
                    当前浏览器不支持视频播放。
                  </video>
                )}
                {images.map((image, index) => (
                  <DetailImage key={image} src={image} alt={`${detail.title} ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} />
                ))}
              </div>
            </section>
          </div>
        );
      })()}

      <div className="design-work-continuum">
        <SectionGrainient />
        <section className="process content-section" id="process">
          <div className="section-ambient process-ambient" />
          <div className="frame section-inner experience-inner combined-experience-inner">
            <ExperienceTimeline
              sections={[
                {
                  kicker: "02 / DESIGN PROCESS",
                  titleEn: "Work Experience /",
                  titleZh: "实习、工作经历",
                  description: "个人经历 / 每一段经历都在形成现在的我",
                  eyebrow: "WORK EXPERIENCE",
                  items: workExperiences,
                },
                {
                  kicker: "02 / DESIGN PROCESS",
                  titleEn: "Project Experience /",
                  titleZh: "项目经历",
                  description: "项目实践 / 在真实命题中形成完整的设计判断",
                  eyebrow: "PROJECT EXPERIENCE",
                  items: projectExperiences,
                },
              ]}
            />
          </div>
        </section>

        <section className="work content-section" id="work">
          <div className="section-ambient work-ambient" />
          <div className="frame section-inner">
            <header className="experience-heading portfolio-heading">
              <p className="micro"><span /> 03 / THE PRACTITIONER</p>
              <div>
                <WarpText className="experience-title" ariaLabel="Portfolio / 精选作品">
                  <span className="experience-title-en" data-warp-text>Portfolio /</span>
                  <span className="experience-title-zh" data-warp-text>精选作品</span>
                  <span className="experience-title-mark" data-warp-ignore aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="M3 3 19 19M9 19h10V9" />
                    </svg>
                  </span>
                </WarpText>
                <p>不同尺度、不同场景，同一套关于秩序与体验的设计判断。</p>
              </div>
            </header>

            <div className="work-grid">
              {projects.map((project) => (
                <article
                  className={`work-card ${project.size}`}
                  style={{ "--work-focus": project.focus } as CSSProperties}
                  key={project.id}
                >
                  <img src={project.image} alt={`${project.zh}设计项目`} loading="lazy" />
                  <div className="work-wash" />
                  <div className="work-fill-bubble" aria-hidden="true" />
                  <div className="work-id" aria-label={`作品序号 ${project.id.replace(/\D/g, "")}`}>
                    <span>{project.id.replace(/\D/g, "")}</span>
                    <i aria-hidden="true" />
                  </div>
                  <div className="work-copy work-copy-reference">
                    <h3>{project.title}</h3>
                    <p>{project.tags}</p>
                    <span>{project.zh}</span>
                  </div>
                  <div className="work-bubbles" aria-label={`${project.zh}操作菜单`}>
                    <button className="work-bubble model" type="button" onClick={() => openProjectModel(project.id)}><span />作品模型互动</button>
                    <button className="work-bubble detail" type="button" onClick={() => {
                      if (project.id === "P—01") setForkliftDetailOpen(true);
                      if (project.id === "P—02") setMrDetailOpen(true);
                      if (/P—0[3-8]/.test(project.id)) setAdditionalDetailId(Number.parseInt(project.id.slice(-1), 10) as keyof typeof additionalDetailPages);
                    }}><span />作品详情介绍</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ability content-section" id="ability">
        <div className="section-ambient ability-ambient" />
        <div className="frame section-inner">
          <header className="experience-heading portfolio-heading">
            <p className="micro"><span /> 04 / WHAT I DO BEST</p>
            <div>
              <WarpText className="experience-title" ariaLabel="Advantages / 个人优势">
                <span className="experience-title-en" data-warp-text>Advantages /</span>
                <span className="experience-title-zh" data-warp-text>个人优势</span>
                <span className="experience-title-mark" data-warp-ignore aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M3 3 19 19M9 19h10V9" />
                  </svg>
                </span>
              </WarpText>
              <p>跨越策略、造型与表达，让设计始终保持完整。</p>
            </div>
          </header>

          <div className="ability-grid">
            {abilities.map((ability) => (
              <article className="ability-card" key={ability.id}>
                <div className="ability-top">
                  <span><b>{ability.id}</b><em>{ability.title}</em></span>
                  <i>×</i>
                </div>
                <div className="ability-card-copy">
                  <ul>
                    {ability.points.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                  {ability.note && <p className="ability-note">{ability.note}</p>}
                </div>
                {ability.metrics && (
                  <div className="ability-metrics" aria-label="商业项目数据">
                    {ability.metrics.map((metric) => (
                      <div key={metric.label}>
                        <strong>{metric.value}</strong>
                        <span>{metric.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {ability.logo && (
                  <img className="ability-logo" src={ability.logo} alt="新质点奖及相关设计奖项标志" />
                )}
                <AbilityMark kind={ability.icon} />
              </article>
            ))}
          </div>

          <div className="tool-belt">
            <span>RESEARCH</span><i>×</i><span>FORM</span><i>×</i><span>CMF</span><i>×</i><span>CAD</span><i>×</i><span>PROTOTYPE</span><i>×</i><span>VISUAL</span>
          </div>
        </div>
        </section>

      <footer className="contact" id="contact">
        <div className="contact-ambient contact-ambient-left" aria-hidden="true" />
        <div className="contact-ambient contact-ambient-right" aria-hidden="true" />
        <div className="grid-overlay" />
        <div className="frame contact-inner">
          <div className="contact-top">
            <p className="micro"><span /> 05 / CONTACT</p>
            <span className="contact-status"><i /> OPEN TO CONVERSATIONS</span>
          </div>
          <div className="contact-main">
            <div className="contact-copy">
              <p><VariableProximity label="联系方式" containerRef={contactTitleRef} radius={120} falloff="exponential" /></p>
              <h2 ref={contactTitleRef}>
                <span className="contact-title-line"><VariableProximity label="LET’S BUILD" containerRef={contactTitleRef} /></span>
                <span className="contact-title-line"><VariableProximity label="BETTER" containerRef={contactTitleRef} /> <em><VariableProximity label="VISUAL" containerRef={contactTitleRef} /></em></span>
                <span className="contact-title-line"><VariableProximity label="SYSTEMS" containerRef={contactTitleRef} /> <span className="contact-title-arrow" aria-hidden="true"><VariableProximity label="↘" containerRef={contactTitleRef} radius={120} falloff="exponential" /></span></span>
              </h2>
              <button className="contact-cta" type="button" onClick={() => setResumeViewerOpen(true)}>我的简历 <Arrow /></button>
            </div>
            <aside className="contact-card" aria-label="联系信息">
              <div className="contact-card-head">
                <span>CONTACT</span>
                <i aria-hidden="true">×</i>
              </div>
              <div className="contact-details">
                <a href="tel:13113093043"><span>手机：</span>13113093043</a>
                <p><span>微信号：</span>TT--Chan</p>
                <a href="mailto:994330756@qq.com"><span>邮箱：</span>994330756@qq.com</a>
              </div>
              <p className="contact-caption">作品集交互网站 — Codex制作</p>
              <div className="contact-qr-wrap">
                <img src="/contact-qr.png" alt="微信联系二维码" />
              </div>
            </aside>
          </div>
          <div className="contact-bottom">
            <span>INDUSTRIAL DESIGN PORTFOLIO</span>
            <span>© 2026 / ALL RIGHTS RESERVED</span>
            <a href="#about">BACK TO TOP ↑</a>
          </div>
        </div>
      </footer>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
