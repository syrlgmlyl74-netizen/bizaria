import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { generateText } from "@/lib/ai-service";
import SparkleIcon from "@/components/SparkleIcon";
import {
  ArrowRight, ArrowLeft, Sparkles, ChevronLeft, ChevronRight,
  Download, RefreshCw, Plus, Trash2, Type, Palette, Image as ImageIcon,
  FileText, LayoutGrid, Loader2, Upload,
} from "lucide-react";

// ─── Types ───
interface Slide {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl?: string;
  layout: "center" | "left-image" | "right-image" | "full-image";
}

type PresentationType = "business" | "service" | "product" | "launch" | "branding" | "investors";
type DesignTheme = "dark-luxury" | "cream" | "white" | "black" | "soft" | "clean" | "rose" | "ocean" | "forest" | "sunset";

const THEMES: Record<DesignTheme, { bg: string; fg: string; accent: string; label: { he: string; en: string } }> = {
  "dark-luxury": { bg: "bg-[#1a1625]", fg: "text-[#f0e6d3]", accent: "text-[#c9a96e]", label: { he: "יוקרתי כהה", en: "Dark Luxury" } },
  "cream":       { bg: "bg-[#f5f0e8]", fg: "text-[#3d3427]", accent: "text-[#8b6f47]", label: { he: "שמנת ובז׳", en: "Cream & Beige" } },
  "white":       { bg: "bg-white",      fg: "text-[#1a1a2e]", accent: "text-[#4361ee]", label: { he: "מודרני לבן", en: "Modern White" } },
  "black":       { bg: "bg-[#0a0a0a]",  fg: "text-white",      accent: "text-[#e63946]", label: { he: "שחור דרמטי", en: "Dramatic Black" } },
  "soft":        { bg: "bg-[#f8f4ff]",  fg: "text-[#2d2b55]", accent: "text-[#7c3aed]", label: { he: "סגול עדין", en: "Soft Purple" } },
  "clean":       { bg: "bg-[#f7f9fc]",  fg: "text-[#1e293b]", accent: "text-[#0ea5e9]", label: { he: "עסקי נקי", en: "Clean Business" } },
  "rose":        { bg: "bg-[#fff0f3]",  fg: "text-[#4a1528]", accent: "text-[#e11d48]", label: { he: "ורוד אלגנטי", en: "Rose Elegant" } },
  "ocean":       { bg: "bg-[#0c1929]",  fg: "text-[#e0f2fe]", accent: "text-[#38bdf8]", label: { he: "אוקיינוס", en: "Ocean Deep" } },
  "forest":      { bg: "bg-[#f0f5f0]",  fg: "text-[#1a3a2a]", accent: "text-[#16a34a]", label: { he: "יער ירוק", en: "Forest Green" } },
  "sunset":      { bg: "bg-[#1f1020]",  fg: "text-[#fef3c7]", accent: "text-[#f97316]", label: { he: "שקיעה", en: "Sunset" } },
};

const COLOR_PALETTES = [
  { id: "purple-pink", colors: ["#C084FC", "#F472B6", "#8B5CF6", "#EC4899"], label: { he: "סגול-ורוד", en: "Purple-Pink" } },
  { id: "blue-cyan", colors: ["#3B82F6", "#06B6D4", "#1D4ED8", "#22D3EE"], label: { he: "כחול-ציאן", en: "Blue-Cyan" } },
  { id: "warm-earth", colors: ["#D97706", "#92400E", "#F59E0B", "#78350F"], label: { he: "גוני אדמה", en: "Earth Tones" } },
  { id: "green-nature", colors: ["#16A34A", "#4ADE80", "#166534", "#86EFAC"], label: { he: "ירוק טבע", en: "Nature Green" } },
  { id: "red-gold", colors: ["#DC2626", "#CA8A04", "#991B1B", "#EAB308"], label: { he: "אדום-זהב", en: "Red-Gold" } },
  { id: "mono-dark", colors: ["#1C1C1C", "#6B6B6B", "#374151", "#9CA3AF"], label: { he: "מונוכרום כהה", en: "Dark Mono" } },
];

const PRES_TYPES: { id: PresentationType; he: string; en: string }[] = [
  { id: "business", he: "עסקית כללית", en: "General Business" },
  { id: "service", he: "מצגת שירות", en: "Service" },
  { id: "product", he: "מצגת מוצר", en: "Product" },
  { id: "launch", he: "מצגת השקה", en: "Launch" },
  { id: "branding", he: "מצגת תדמית", en: "Branding" },
  { id: "investors", he: "למשקיעים", en: "Investors" },
];

const LAYOUTS: { id: Slide["layout"]; he: string; en: string }[] = [
  { id: "center", he: "טקסט מרכזי", en: "Center Text" },
  { id: "left-image", he: "תמונה שמאל", en: "Image Left" },
  { id: "right-image", he: "תמונה ימין", en: "Image Right" },
  { id: "full-image", he: "תמונה מלאה", en: "Full Image" },
];

function makeId() { return Math.random().toString(36).slice(2, 9); }

function defaultSlides(lang: "he" | "en"): Slide[] {
  const s = (he: string, en: string) => lang === "he" ? he : en;
  return [
    { id: makeId(), title: s("שקופית פתיחה", "Opening Slide"), subtitle: s("שם העסק שלך", "Your Business Name"), body: s("סלוגן מרשים כאן", "Impressive tagline here"), layout: "center" },
    { id: makeId(), title: s("מי אנחנו", "About Us"), subtitle: "", body: s("ספר על העסק שלך בקצרה...", "Tell about your business briefly..."), layout: "center" },
    { id: makeId(), title: s("מה הבעיה", "The Problem"), subtitle: "", body: s("איזו בעיה אתה פותר ללקוחות?", "What problem do you solve?"), layout: "left-image" },
    { id: makeId(), title: s("הפתרון שלנו", "Our Solution"), subtitle: "", body: s("הסבר את הפתרון הייחודי שלך", "Explain your unique solution"), layout: "right-image" },
    { id: makeId(), title: s("למה לבחור בנו", "Why Choose Us"), subtitle: "", body: s("יתרונות ונקודות חוזק", "Advantages and strengths"), layout: "center" },
    { id: makeId(), title: s("תוצאות", "Results"), subtitle: "", body: s("דוגמאות, מספרים, המלצות", "Examples, numbers, testimonials"), layout: "left-image" },
    { id: makeId(), title: s("צור קשר", "Contact Us"), subtitle: "", body: s("טלפון, אימייל, אתר", "Phone, email, website"), layout: "center" },
  ];
}

// ─── Main Component ───
const PresentationStudioPage = () => {
  const { t, lang } = useI18n();
  const isHe = lang === "he";
  const BackArrow = isHe ? ArrowRight : ArrowLeft;
  const imageRef = useRef<HTMLInputElement>(null);

  const [slides, setSlides] = useState<Slide[]>(() => defaultSlides(lang));
  const [activeIdx, setActiveIdx] = useState(0);
  const [theme, setTheme] = useState<DesignTheme>("dark-luxury");
  const [presType, setPresType] = useState<PresentationType>("business");
  const [businessName, setBusinessName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"structure" | "content" | "style">("structure");
  const [selectedPalette, setSelectedPalette] = useState("purple-pink");

  const activeSlide = slides[activeIdx] || slides[0];
  const themeConfig = THEMES[theme];

  const updateSlide = useCallback((idx: number, patch: Partial<Slide>) => {
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }, []);

  const addSlide = () => {
    const newSlide: Slide = { id: makeId(), title: isHe ? "שקופית חדשה" : "New Slide", subtitle: "", body: "", layout: "center" };
    setSlides(prev => [...prev, newSlide]);
    setActiveIdx(slides.length);
  };

  const removeSlide = (idx: number) => {
    if (slides.length <= 1) return;
    setSlides(prev => prev.filter((_, i) => i !== idx));
    if (activeIdx >= slides.length - 1) setActiveIdx(Math.max(0, slides.length - 2));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        updateSlide(activeIdx, { imageUrl: ev.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const systemPrompt = isHe
        ? "אתה מעצב מצגות מקצועי. צור תוכן לכל שקופית בפורמט JSON. החזר מערך של אובייקטים עם title, subtitle, body. כתוב בעברית. אל תוסיף טקסט מחוץ ל-JSON."
        : "You are a professional presentation designer. Create content for each slide in JSON format. Return an array of objects with title, subtitle, body. Do not add text outside the JSON.";

      const prompt = isHe
        ? `צור מצגת ${PRES_TYPES.find(p => p.id === presType)?.he || "עסקית"} עם ${slides.length} שקופיות${businessName ? ` עבור "${businessName}"` : ""}. החזר JSON בלבד: [{"title":"...","subtitle":"...","body":"..."}]`
        : `Create a ${presType} presentation with ${slides.length} slides${businessName ? ` for "${businessName}"` : ""}. Return JSON only: [{"title":"...","subtitle":"...","body":"..."}]`;

      const result = await generateText(prompt, systemPrompt);
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { title: string; subtitle?: string; body: string }[];
        const layouts: Slide["layout"][] = ["center", "left-image", "right-image", "center", "left-image", "center", "center"];
        setSlides(parsed.map((s, i) => ({ id: makeId(), title: s.title, subtitle: s.subtitle || "", body: s.body, layout: layouts[i % layouts.length] })));
        setActiveIdx(0);
      }
    } catch (err) {
      console.error("AI generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Download as formatted text ───
  const handleDownload = () => {
    const content = slides.map((s, i) =>
      `--- ${isHe ? "שקופית" : "Slide"} ${i + 1} ---\n${s.title}\n${s.subtitle ? s.subtitle + "\n" : ""}${s.body}\n`
    ).join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presentation-${businessName || "bizaira"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const palette = COLOR_PALETTES.find(p => p.id === selectedPalette);

  // Slide rendering helper
  const renderSlideContent = (slide: Slide, isPreview = false) => {
    const textSize = isPreview ? {
      title: "text-2xl md:text-4xl",
      subtitle: "text-base md:text-lg",
      body: "text-sm md:text-base",
      label: "text-xs",
    } : {
      title: "text-[8px]",
      subtitle: "text-[6px]",
      body: "text-[6px]",
      label: "text-[5px]",
    };

    if (slide.layout === "full-image" && slide.imageUrl) {
      return (
        <div className="absolute inset-0">
          <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-8">
            <h2 className={`${textSize.title} font-bold text-white`}>{slide.title}</h2>
            {slide.body && <p className={`${textSize.body} text-white/80 mt-2`}>{slide.body}</p>}
          </div>
        </div>
      );
    }

    if ((slide.layout === "left-image" || slide.layout === "right-image") && slide.imageUrl) {
      const imgFirst = slide.layout === "left-image";
      return (
        <div className={`absolute inset-0 flex ${imgFirst ? "flex-row" : "flex-row-reverse"}`}>
          <div className="w-[45%] h-full">
            <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="w-[55%] flex flex-col justify-center p-4 md:p-8 space-y-2">
            <div className={`w-8 h-0.5 ${themeConfig.accent.replace("text-", "bg-")} opacity-50`} />
            <h2 className={`${textSize.title} font-bold ${themeConfig.fg}`}>{slide.title}</h2>
            {slide.subtitle && <p className={`${textSize.subtitle} ${themeConfig.accent}`}>{slide.subtitle}</p>}
            <p className={`${textSize.body} ${themeConfig.fg} opacity-70 leading-relaxed whitespace-pre-line`}>{slide.body}</p>
          </div>
        </div>
      );
    }

    // Center layout (default)
    const isTitle = activeIdx === 0 && isPreview;
    return (
      <div className={`absolute inset-0 p-4 md:p-12 flex flex-col justify-center ${isTitle ? "text-center items-center" : ""}`}>
        {isTitle && (
          <div className={`${textSize.label} font-medium uppercase tracking-[0.3em] ${themeConfig.accent} opacity-70 mb-4`}>
            {businessName || (isHe ? "שם העסק" : "Business Name")}
          </div>
        )}
        {!isTitle && <div className={`w-12 h-0.5 ${themeConfig.accent.replace("text-", "bg-")} opacity-50 mb-4`} />}
        <h2 className={`${textSize.title} font-bold leading-tight ${themeConfig.fg}`}>{slide.title}</h2>
        {slide.subtitle && <p className={`${textSize.subtitle} ${isTitle ? themeConfig.fg + " opacity-70" : themeConfig.accent} mt-2`}>{slide.subtitle}</p>}
        <p className={`${textSize.body} ${themeConfig.fg} opacity-${isTitle ? "50" : "70"} mt-4 leading-relaxed whitespace-pre-line ${isPreview ? "max-w-[80%]" : ""}`}>{slide.body}</p>
        {slide.imageUrl && (
          <div className={`mt-4 ${isPreview ? "max-w-[200px]" : "max-w-[40px]"} mx-auto`}>
            <img src={slide.imageUrl} alt="" className="w-full h-auto rounded-lg shadow-lg" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-card border-b border-border/40 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/create" className="glass-card p-2 rounded-lg hover:scale-105 transition-all">
              <BackArrow size={18} className="text-foreground" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-foreground">{t("pres.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("pres.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="glass-card px-3 py-2 rounded-lg text-xs font-medium text-foreground flex items-center gap-1.5 hover:scale-105 transition-all">
              <Download size={14} />
              {isHe ? "הורדה" : "Download"}
            </button>
            <SparkleIcon size={18} />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full px-4 pt-4 gap-4">

        {/* ═══ Slide Preview Area ═══ */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Main slide */}
          <div className={`relative rounded-2xl overflow-hidden shadow-2xl aspect-[16/9] ${themeConfig.bg} transition-colors duration-500`}>
            {renderSlideContent(activeSlide, true)}
            {/* Slide number */}
            <div className={`absolute bottom-4 ${isHe ? "left-6" : "right-6"} text-xs ${themeConfig.fg} opacity-30`}>
              {activeIdx + 1} / {slides.length}
            </div>
            {/* Color accent bar */}
            {palette && (
              <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                {palette.colors.map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => setActiveIdx(i)}
                className={`relative flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  i === activeIdx ? "border-primary glow-shadow scale-105" : "border-border/30 opacity-60 hover:opacity-100"
                }`}
              >
                <div className={`absolute inset-0 ${themeConfig.bg} flex items-center justify-center p-1`}>
                  {slide.imageUrl && (slide.layout === "full-image" || slide.layout === "left-image" || slide.layout === "right-image") ? (
                    <img src={slide.imageUrl} alt="" className="w-full h-full object-cover opacity-60 absolute inset-0" />
                  ) : null}
                  <span className={`text-[8px] font-bold truncate relative z-10 ${themeConfig.fg}`}>{slide.title}</span>
                </div>
              </button>
            ))}
            <button onClick={addSlide} className="flex-shrink-0 w-28 h-16 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center hover:border-primary/50 transition-all">
              <Plus size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-3">
            <button onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))} disabled={activeIdx === 0} className="glass-card p-2 rounded-lg disabled:opacity-30 hover:scale-105 transition-all">
              {isHe ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button onClick={() => setActiveIdx(Math.min(slides.length - 1, activeIdx + 1))} disabled={activeIdx === slides.length - 1} className="glass-card p-2 rounded-lg disabled:opacity-30 hover:scale-105 transition-all">
              {isHe ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {/* ═══ Sidebar Controls ═══ */}
        <div className="lg:w-80 w-full space-y-4">
          <div className="flex gap-1 glass-card rounded-xl p-1">
            {([
              { id: "structure" as const, icon: LayoutGrid, label: isHe ? "מבנה" : "Structure" },
              { id: "content" as const, icon: Type, label: isHe ? "תוכן" : "Content" },
              { id: "style" as const, icon: Palette, label: isHe ? "עיצוב" : "Style" },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  sidebarTab === tab.id ? "gradient-glow text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── Structure tab ─── */}
          {sidebarTab === "structure" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="glass-card rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-foreground">{isHe ? "שם העסק" : "Business Name"}</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder={isHe ? "שם העסק שלך" : "Your business name"} className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50" />
              </div>

              <div className="glass-card rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-foreground">{isHe ? "סוג מצגת" : "Type"}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRES_TYPES.map(pt => (
                    <button key={pt.id} onClick={() => setPresType(pt.id)} className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${presType === pt.id ? "gradient-glow text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {isHe ? pt.he : pt.en}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-xl p-4 space-y-2">
                <label className="text-xs font-bold text-foreground">{isHe ? "שקופיות" : "Slides"} ({slides.length})</label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {slides.map((s, i) => (
                    <div key={s.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all group ${i === activeIdx ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-muted/50"}`} onClick={() => setActiveIdx(i)}>
                      <span className="text-[10px] w-4 text-center opacity-50">{i + 1}</span>
                      {s.imageUrl && <ImageIcon size={10} className="text-primary opacity-60" />}
                      <span className="text-xs truncate flex-1">{s.title}</span>
                      {slides.length > 1 && (
                        <button onClick={e => { e.stopPropagation(); removeSlide(i); }} className="opacity-0 group-hover:opacity-100 hover:text-destructive p-0.5">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addSlide} className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1.5 border border-dashed border-border/30 rounded-lg">
                  <Plus size={12} /> {isHe ? "הוסף שקופית" : "Add Slide"}
                </button>
              </div>

              <button onClick={handleAIGenerate} disabled={isGenerating} className="w-full gradient-glow glow-shadow text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50">
                {isGenerating ? <><Loader2 size={18} className="animate-spin" />{isHe ? "מייצר תוכן..." : "Generating..."}</> : <><Sparkles size={18} />{isHe ? "צור תוכן עם AI" : "Generate with AI"}</>}
              </button>
            </div>
          )}

          {/* ─── Content tab ─── */}
          {sidebarTab === "content" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">{isHe ? "שקופית" : "Slide"} {activeIdx + 1}</label>
                  <span className="text-[10px] text-muted-foreground">{activeSlide.title}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{isHe ? "כותרת" : "Title"}</label>
                  <input value={activeSlide.title} onChange={e => updateSlide(activeIdx, { title: e.target.value })} placeholder={isHe ? "כותרת השקופית" : "Slide title"} className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{isHe ? "תת כותרת" : "Subtitle"}</label>
                  <input value={activeSlide.subtitle} onChange={e => updateSlide(activeIdx, { subtitle: e.target.value })} placeholder={isHe ? "תת כותרת (אופציונלי)" : "Subtitle (optional)"} className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">{isHe ? "תוכן" : "Body"}</label>
                  <textarea value={activeSlide.body} onChange={e => updateSlide(activeIdx, { body: e.target.value })} placeholder={isHe ? "התוכן של השקופית..." : "Slide content..."} rows={4} className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring/50" />
                </div>
              </div>

              {/* Image upload for slide */}
              <div className="glass-card rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-foreground">{isHe ? "תמונה לשקופית" : "Slide Image"}</label>
                {activeSlide.imageUrl ? (
                  <div className="relative">
                    <img src={activeSlide.imageUrl} alt="" className="w-full h-28 object-cover rounded-lg" />
                    <button onClick={() => updateSlide(activeIdx, { imageUrl: undefined })} className="absolute top-1 end-1 bg-background/80 rounded-full p-1 hover:scale-110 transition-all">
                      <Trash2 size={12} className="text-destructive" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => imageRef.current?.click()} className="w-full border-2 border-dashed border-border/40 rounded-lg py-4 flex flex-col items-center gap-2 hover:border-primary/40 transition-all text-muted-foreground hover:text-foreground">
                    <Upload size={18} />
                    <span className="text-xs">{isHe ? "העלה תמונה" : "Upload Image"}</span>
                  </button>
                )}
                <input ref={imageRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              {/* Layout selection */}
              <div className="glass-card rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-foreground">{isHe ? "פריסת שקופית" : "Slide Layout"}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {LAYOUTS.map(l => (
                    <button key={l.id} onClick={() => updateSlide(activeIdx, { layout: l.id })} className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${activeSlide.layout === l.id ? "gradient-glow text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {isHe ? l.he : l.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Style tab ─── */}
          {sidebarTab === "style" && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="glass-card rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-foreground">{isHe ? "סגנון עיצוב" : "Design Theme"}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(THEMES) as [DesignTheme, typeof THEMES[DesignTheme]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setTheme(key)} className={`relative rounded-lg overflow-hidden border-2 transition-all ${theme === key ? "border-primary glow-shadow" : "border-border/30 hover:border-primary/30"}`}>
                      <div className={`${cfg.bg} p-3 space-y-1`}>
                        <div className={`h-1 w-6 rounded ${cfg.accent.replace("text-", "bg-")} opacity-60`} />
                        <div className={`h-1.5 w-10 rounded ${cfg.fg.replace("text-", "bg-")} opacity-80`} />
                        <div className={`h-1 w-8 rounded ${cfg.fg.replace("text-", "bg-")} opacity-40`} />
                      </div>
                      <div className="px-2 py-1.5 bg-muted/80">
                        <span className="text-[10px] font-medium text-foreground">{isHe ? cfg.label.he : cfg.label.en}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color palette */}
              <div className="glass-card rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-foreground">{isHe ? "פלטת צבעים" : "Color Palette"}</label>
                <div className="space-y-2">
                  {COLOR_PALETTES.map(pal => (
                    <button key={pal.id} onClick={() => setSelectedPalette(pal.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-all ${selectedPalette === pal.id ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/30"}`}>
                      <div className="flex gap-1">
                        {pal.colors.map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-border/20" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className="text-xs text-foreground">{isHe ? pal.label.he : pal.label.en}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresentationStudioPage;
