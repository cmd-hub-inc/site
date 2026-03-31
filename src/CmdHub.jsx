import { useState, useEffect, useRef } from "react";
import {
  Search, Upload, User, Home, Grid, Star, Download, Tag, X, Plus,
  Heart, Copy, Check, ExternalLink, Github, Globe, LogIn, LogOut,
  ChevronRight, Code2, MessageSquare, MousePointer, Filter, Eye,
  Calendar, Hash, ArrowLeft, Package, Zap, Shield, ChevronDown,
} from "lucide-react";

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:          "#1e1f22",
  surface:     "#2b2d31",
  surface2:    "#313338",
  surface3:    "#383a40",
  blurple:     "#5865F2",
  blurpleHov:  "#4752C4",
  blurpleDim:  "rgba(88,101,242,0.15)",
  green:       "#57F287",
  greenDim:    "rgba(87,242,135,0.12)",
  red:         "#ED4245",
  yellow:      "#FEE75C",
  text:        "#DBDEE1",
  muted:       "#949BA4",
  faint:       "#5C5F66",
  border:      "rgba(255,255,255,0.06)",
  white:       "#ffffff",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_TAGS = [
  "moderation","fun","utility","music","economy","games",
  "admin","info","social","ai","logging","roles","tickets","welcome","giveaway",
];
const FRAMEWORKS = [
  "Discord.js","Discord.py","Discordeno",
  "Discord Bot Maker","Framework-agnostic JSON","Custom",
];
const CMD_TYPES = ["Slash","Context","Message"];

const FW_COLORS = {
  "Discord.js":             { bg:"rgba(59,165,92,0.15)",    color:"#3ba55c" },
  "Discord.py":             { bg:"rgba(88,101,242,0.15)",   color:"#5865F2" },
  "Discordeno":             { bg:"rgba(254,163,0,0.15)",    color:"#fea300" },
  "Discord Bot Maker":      { bg:"rgba(237,66,69,0.15)",    color:"#ED4245" },
  "Framework-agnostic JSON":{ bg:"rgba(149,55,255,0.15)",   color:"#9537ff" },
  "Custom":                 { bg:"rgba(255,255,255,0.08)",  color:"#DBDEE1" },
};

const TYPE_COLORS = { Slash: C.blurple, Context: C.green, Message: C.yellow };

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_USER = { id:"123456789", username:"Kai", avatar:null };

const MOCK_COMMANDS = [
  {
    id:"1", name:"ban",
    description:"Ban a user from the server with an optional reason and duration. Supports temporary bans with automatic unban scheduling.",
    type:"Slash", framework:"Discord.js", version:"v2.1.0",
    tags:["moderation","admin"],
    author:{ username:"Kai", id:"123456789" },
    githubUrl:"https://github.com", websiteUrl:"",
    downloads:1420, rating:4.7, ratingCount:89, favourites:234, views:5200,
    createdAt:"2024-11-15", updatedAt:"2025-01-20",
    changelog:"v2.1.0: Added duration support for temp-bans.\nv2.0.0: Rewrote for Discord.js v14 compatibility.",
    rawData:`{
  "name": "ban",
  "description": "Ban a user from the server",
  "options": [
    {
      "name": "user",
      "description": "The user to ban",
      "type": 6,
      "required": true
    },
    {
      "name": "reason",
      "description": "Reason for the ban",
      "type": 3,
      "required": false
    },
    {
      "name": "duration",
      "description": "Duration in days (0 = permanent)",
      "type": 4,
      "required": false
    }
  ],
  "default_member_permissions": "4"
}`,
  },
  {
    id:"2", name:"play",
    description:"Play a song or playlist from YouTube, Spotify, or SoundCloud directly in a voice channel with queue support.",
    type:"Slash", framework:"Discord.py", version:"v1.3.2",
    tags:["music","fun"],
    author:{ username:"soundwave", id:"987654321" },
    githubUrl:"https://github.com", websiteUrl:"https://example.dev",
    downloads:3850, rating:4.9, ratingCount:312, favourites:891, views:12400,
    createdAt:"2024-09-01", updatedAt:"2025-02-01",
    changelog:"v1.3.2: Added Spotify playlist support.\nv1.3.0: SoundCloud integration.\nv1.0.0: Initial release.",
    rawData:`{
  "name": "play",
  "description": "Play audio from a URL or search query",
  "options": [
    {
      "name": "query",
      "description": "Song name or direct URL",
      "type": 3,
      "required": true
    }
  ]
}`,
  },
  {
    id:"3", name:"poll",
    description:"Create an interactive poll with up to 10 options, emoji reactions, and a configurable voting duration.",
    type:"Slash", framework:"Discord Bot Maker", version:"v1.0.0",
    tags:["utility","social"],
    author:{ username:"Kai", id:"123456789" },
    githubUrl:"", websiteUrl:"",
    downloads:720, rating:4.5, ratingCount:43, favourites:110, views:2800,
    createdAt:"2025-01-10", updatedAt:"2025-01-10",
    changelog:"v1.0.0: Initial release.",
    rawData:`{
  "name": "poll",
  "description": "Create a community poll",
  "options": [
    {
      "name": "question",
      "description": "The poll question",
      "type": 3,
      "required": true
    },
    {
      "name": "options",
      "description": "Comma-separated list of options",
      "type": 3,
      "required": true
    },
    {
      "name": "duration",
      "description": "Poll duration in minutes",
      "type": 4,
      "required": false
    }
  ]
}`,
  },
  {
    id:"4", name:"economy-daily",
    description:"Claim your daily currency reward with streak bonuses. Tracks cooldowns per user and awards bonus coins for consecutive claims.",
    type:"Slash", framework:"Framework-agnostic JSON", version:"v3.0.1",
    tags:["economy","games"],
    author:{ username:"coinflip", id:"111222333" },
    githubUrl:"https://github.com", websiteUrl:"",
    downloads:2100, rating:4.6, ratingCount:156, favourites:445, views:7900,
    createdAt:"2024-07-20", updatedAt:"2025-03-01",
    changelog:"v3.0.1: Fixed streak reset bug on timezone edge cases.\nv3.0.0: Added weekly milestone bonuses.\nv2.0.0: Rewritten cooldown system.",
    rawData:`{
  "name": "daily",
  "description": "Claim your daily currency reward",
  "options": []
}`,
  },
  {
    id:"5", name:"ticket-create",
    description:"Open a support ticket with category selection, automatic channel creation, staff role pinging, and transcript logging.",
    type:"Slash", framework:"Discord.js", version:"v2.0.0",
    tags:["tickets","utility","admin"],
    author:{ username:"helpdesk99", id:"444555666" },
    githubUrl:"https://github.com", websiteUrl:"",
    downloads:4200, rating:4.8, ratingCount:289, favourites:670, views:15600,
    createdAt:"2024-05-15", updatedAt:"2024-12-20",
    changelog:"v2.0.0: Full rewrite with multi-category support and transcript logging.\nv1.0.0: Initial release.",
    rawData:`{
  "name": "ticket",
  "description": "Open a support ticket",
  "options": [
    {
      "name": "category",
      "description": "Ticket category",
      "type": 3,
      "required": true,
      "choices": [
        { "name": "General Support", "value": "support" },
        { "name": "Bug Report",      "value": "bug" },
        { "name": "Appeal",          "value": "appeal" }
      ]
    },
    {
      "name": "description",
      "description": "Brief description of your issue",
      "type": 3,
      "required": false
    }
  ]
}`,
  },
  {
    id:"6", name:"userinfo",
    description:"Display detailed information about a server member including roles, join date, account creation date, and badges.",
    type:"Context", framework:"Discord.py", version:"v1.1.0",
    tags:["info","utility"],
    author:{ username:"infobot", id:"777888999" },
    githubUrl:"", websiteUrl:"",
    downloads:890, rating:4.3, ratingCount:67, favourites:198, views:3400,
    createdAt:"2024-10-01", updatedAt:"2024-11-05",
    changelog:"v1.1.0: Added account age calculation and badge display.\nv1.0.0: Initial release.",
    rawData:`{
  "name": "User Info",
  "type": 2
}`,
  },
];

// ─── Utils ───────────────────────────────────────────────────────────────────
const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

// ─── Shared Components ───────────────────────────────────────────────────────

function TagBadge({ tag, onClick, selected }) {
  const [hov, setHov] = useState(false);
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500,
        cursor: onClick ? "pointer" : "default",
        background: selected ? C.blurpleDim : hov && onClick ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
        color: selected ? C.blurple : C.muted,
        border: `1px solid ${selected ? "rgba(88,101,242,0.35)" : "transparent"}`,
        transition: "all 0.15s", userSelect: "none",
      }}
    >
      #{tag}
    </span>
  );
}

function FrameworkBadge({ fw }) {
  const c = FW_COLORS[fw] || FW_COLORS["Custom"];
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, letterSpacing: 0.2,
    }}>
      {fw}
    </span>
  );
}

function TypeBadge({ type }) {
  const icons = { Slash: <Code2 size={10} />, Context: <MousePointer size={10} />, Message: <MessageSquare size={10} /> };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
      background: "rgba(255,255,255,0.06)", color: TYPE_COLORS[type] || C.muted,
    }}>
      {icons[type]} {type}
    </span>
  );
}

function StarRow({ rating, count, size = 12 }) {
  const full = Math.round(rating);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: C.yellow, fontSize: size, lineHeight: 1 }}>
        {"★".repeat(full)}{"☆".repeat(5 - full)}
      </span>
      <span style={{ color: C.muted, fontSize: size }}>{rating.toFixed(1)}</span>
      {count != null && <span style={{ color: C.faint, fontSize: size }}>({count})</span>}
    </div>
  );
}

function CommandCard({ cmd, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onClick(cmd)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.surface,
        border: `1px solid ${hov ? "rgba(88,101,242,0.4)" : C.border}`,
        borderRadius: 12, padding: 20, cursor: "pointer",
        transition: "all 0.18s ease",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? "0 10px 30px rgba(0,0,0,0.4)" : "none",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: C.white }}>
            /{cmd.name}
          </span>
          <TypeBadge type={cmd.type} />
        </div>
        <span style={{ color: C.faint, fontSize: 11, whiteSpace: "nowrap" }}>{cmd.version}</span>
      </div>

      <p style={{
        color: C.muted, fontSize: 13, lineHeight: 1.55, margin: 0,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {cmd.description}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {cmd.tags.map(t => <TagBadge key={t} tag={t} />)}
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 10, borderTop: `1px solid ${C.border}`,
      }}>
        <FrameworkBadge fw={cmd.framework} />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3, color: C.muted, fontSize: 12 }}>
            <Download size={12} /> {fmt(cmd.downloads)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, color: C.muted, fontSize: 12 }}>
            <Heart size={12} /> {fmt(cmd.favourites)}
          </span>
          <StarRow rating={cmd.rating} size={11} />
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, value, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 13 }}>
      {icon}
      <strong style={{ color: C.text }}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ page, user, onNavigate, onLogin, onLogout }) {
  const navBtn = (id, label, icon) => {
    const active = page === id;
    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        style={{
          background: active ? C.blurpleDim : "none",
          border: "none",
          color: active ? C.blurple : C.muted,
          borderRadius: 8, padding: "6px 14px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 14, fontWeight: active ? 600 : 400,
          transition: "all 0.15s",
        }}
      >
        {icon} {label}
      </button>
    );
  };

  return (
    <nav style={{
      background: C.surface, borderBottom: `1px solid ${C.border}`,
      padding: "0 24px", display: "flex", alignItems: "center",
      height: 60, position: "sticky", top: 0, zIndex: 100,
      backdropFilter: "blur(12px)",
    }}>
      <button
        onClick={() => onNavigate("home")}
        style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, marginRight: 28,
        }}
      >
        <div style={{
          width: 32, height: 32, background: C.blurple, borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Code2 size={16} color="#fff" />
        </div>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, color: C.white }}>
          CmdHub
        </span>
      </button>

      <div style={{ display: "flex", gap: 2, flex: 1 }}>
        {navBtn("home",   "Home",   <Home size={15} />)}
        {navBtn("browse", "Browse", <Grid size={15} />)}
        {navBtn("upload", "Upload", <Upload size={15} />)}
      </div>

      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => onNavigate("profile")}
            style={{
              background: page === "profile" ? C.blurpleDim : "none",
              border: "none", cursor: "pointer", borderRadius: 8,
              padding: "5px 10px", display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: C.blurple,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#fff",
            }}>
              {user.username[0].toUpperCase()}
            </div>
            <span style={{ color: page === "profile" ? C.blurple : C.text, fontSize: 14, fontWeight: 500 }}>
              {user.username}
            </span>
          </button>
          <button
            onClick={onLogout}
            title="Log out"
            style={{
              background: "none", border: "none", color: C.faint,
              cursor: "pointer", padding: 6, borderRadius: 6,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={onLogin}
          style={{
            background: C.blurple, color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 18px", fontSize: 14,
            fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7,
            transition: "background 0.15s",
          }}
        >
          <svg width="16" height="12" viewBox="0 0 127.14 96.36" fill="white">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
          </svg>
          Login with Discord
        </button>
      )}
    </nav>
  );
}

// ─── Home Page ───────────────────────────────────────────────────────────────
function HomePage({ onNavigate, onViewCommand }) {
  const featured = [...MOCK_COMMANDS].sort((a, b) => b.downloads - a.downloads).slice(0, 3);
  const totalDownloads = MOCK_COMMANDS.reduce((a, c) => a + c.downloads, 0);

  return (
    <div>
      {/* Hero */}
      <div style={{
        textAlign: "center", padding: "88px 24px 72px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(88,101,242,0.18), transparent)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle, rgba(88,101,242,0.06) 1px, transparent 1px)`,
          backgroundSize: "28px 28px", pointerEvents: "none",
        }} />

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: C.blurpleDim,
          border: "1px solid rgba(88,101,242,0.3)",
          borderRadius: 999, padding: "5px 16px",
          fontSize: 12, color: C.blurple, fontWeight: 700, marginBottom: 24,
          letterSpacing: 0.3,
        }}>
          <Zap size={11} /> The open command registry for Discord bots
        </div>

        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(36px, 6vw, 60px)",
          fontWeight: 800, color: C.white,
          margin: "0 0 18px", lineHeight: 1.1, letterSpacing: -1,
        }}>
          Find & share<br />
          <span style={{ color: C.blurple }}>bot commands</span>
        </h1>

        <p style={{
          color: C.muted, fontSize: 17,
          maxWidth: 520, margin: "0 auto 36px",
          lineHeight: 1.65,
        }}>
          The centralised hub for Discord bot command data. Browse,
          download, and share slash commands across any framework — open to everyone.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => onNavigate("browse")}
            style={{
              background: C.blurple, color: "#fff", border: "none",
              borderRadius: 10, padding: "13px 30px",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(88,101,242,0.4)",
              transition: "all 0.15s",
            }}
          >
            Browse Commands
          </button>
          <button
            onClick={() => onNavigate("upload")}
            style={{
              background: C.surface2, color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "13px 30px",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}
          >
            Upload a Command
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)",
        gap: 14, maxWidth: 620, margin: "0 auto 72px",
        padding: "0 24px",
      }}>
        {[
          { label: "Commands", value: MOCK_COMMANDS.length, color: C.blurple },
          { label: "Downloads", value: fmt(totalDownloads), color: C.green },
          { label: "Frameworks", value: FRAMEWORKS.length, color: C.yellow },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "22px 16px", textAlign: "center",
            }}
          >
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 34, fontWeight: 800, color: s.color, lineHeight: 1,
            }}>
              {s.value}
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Featured */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 72px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 20,
        }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 22,
            fontWeight: 800, color: C.white, margin: 0,
          }}>
            🔥 Most Downloaded
          </h2>
          <button
            onClick={() => onNavigate("browse")}
            style={{
              background: "none", border: "none", color: C.blurple,
              cursor: "pointer", fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            View all <ChevronRight size={15} />
          </button>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {featured.map(cmd => (
            <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />
          ))}
        </div>
      </div>

      {/* Tag cloud */}
      <div style={{
        maxWidth: 800, margin: "0 auto", padding: "0 24px 88px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 22,
          fontWeight: 800, color: C.white, marginBottom: 20,
        }}>
          Browse by Tag
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {ALL_TAGS.map(t => (
            <button
              key={t}
              onClick={() => onNavigate("browse", { tag: t })}
              style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 999, padding: "7px 18px",
                color: C.muted, fontSize: 13, cursor: "pointer",
                transition: "all 0.15s", fontFamily: "inherit",
              }}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Browse Page ──────────────────────────────────────────────────────────────
function BrowsePage({ initialTag, onViewCommand }) {
  const [search, setSearch]           = useState("");
  const [selectedTags, setSelectedTags] = useState(initialTag ? [initialTag] : []);
  const [selectedFW, setSelectedFW]   = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [sort, setSort]               = useState("downloads");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (initialTag) setSelectedTags([initialTag]);
  }, [initialTag]);

  const toggleTag = (t) =>
    setSelectedTags(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );

  const filtered = MOCK_COMMANDS
    .filter(cmd => {
      if (search) {
        const q = search.toLowerCase();
        if (!cmd.name.includes(q) && !cmd.description.toLowerCase().includes(q)) return false;
      }
      if (selectedTags.length && !selectedTags.every(t => cmd.tags.includes(t))) return false;
      if (selectedFW && cmd.framework !== selectedFW) return false;
      if (selectedType && cmd.type !== selectedType) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "downloads") return b.downloads - a.downloads;
      if (sort === "rating")    return b.rating - a.rating;
      if (sort === "newest")    return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

  const activeFilterCount =
    selectedTags.length + (selectedFW ? 1 : 0) + (selectedType ? 1 : 0);

  const inp = {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "10px 14px", color: C.text,
    fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 24px" }}>
      <h1 style={{
        fontFamily: "'Syne', sans-serif", fontSize: 30,
        fontWeight: 800, color: C.white, marginBottom: 28,
      }}>
        Browse Commands
      </h1>

      {/* Controls row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={15} style={{
            position: "absolute", left: 12, top: "50%",
            transform: "translateY(-50%)", color: C.muted,
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search commands…"
            style={{ ...inp, paddingLeft: 36, width: "100%" }}
          />
        </div>

        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{ ...inp, cursor: "pointer" }}
        >
          <option value="downloads">Most Downloaded</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest</option>
        </select>

        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: showFilters ? C.blurpleDim : C.surface,
            border: `1px solid ${showFilters ? "rgba(88,101,242,0.35)" : C.border}`,
            color: showFilters ? C.blurple : C.muted,
            borderRadius: 8, padding: "10px 16px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          <Filter size={14} />
          Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 22, marginBottom: 16,
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              Framework
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {FRAMEWORKS.map(fw => (
                <button
                  key={fw}
                  onClick={() => setSelectedFW(selectedFW === fw ? "" : fw)}
                  style={{
                    background: selectedFW === fw ? C.blurpleDim : "rgba(255,255,255,0.05)",
                    border: `1px solid ${selectedFW === fw ? "rgba(88,101,242,0.35)" : "transparent"}`,
                    borderRadius: 999, padding: "4px 13px",
                    color: selectedFW === fw ? C.blurple : C.muted,
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {fw}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              Command Type
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {CMD_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(selectedType === t ? "" : t)}
                  style={{
                    background: selectedType === t ? C.blurpleDim : "rgba(255,255,255,0.05)",
                    border: `1px solid ${selectedType === t ? "rgba(88,101,242,0.35)" : "transparent"}`,
                    borderRadius: 999, padding: "4px 13px",
                    color: selectedType === t ? C.blurple : C.muted,
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              Tags
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ALL_TAGS.map(t => (
                <TagBadge
                  key={t} tag={t}
                  onClick={() => toggleTag(t)}
                  selected={selectedTags.includes(t)}
                />
              ))}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setSelectedTags([]); setSelectedFW(""); setSelectedType(""); }}
              style={{
                alignSelf: "flex-start", background: "none",
                border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", color: C.muted,
                fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      )}

      <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>
        {filtered.length} command{filtered.length !== 1 ? "s" : ""} found
      </div>

      {filtered.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: 16,
        }}>
          {filtered.map(cmd => (
            <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "80px 20px", color: C.muted }}>
          <Search size={40} style={{ marginBottom: 16, opacity: 0.25 }} />
          <p style={{ fontSize: 16, margin: 0 }}>No commands match your search</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Try adjusting your filters or search term</p>
        </div>
      )}
    </div>
  );
}

// The rest of the file (CommandDetailPage, UploadPage, ProfilePage, Footer, and App) remains unchanged and is appended below.

// ─── Command Detail Page ──────────────────────────────────────────────────────
function CommandDetailPage({ cmd, onBack, user }) {
  const [copied, setCopied]       = useState(false);
  const [faved, setFaved]         = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [activeTab, setActiveTab] = useState("raw");

  const handleCopy = () => {
    try { navigator.clipboard.writeText(cmd.rawData); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([cmd.rawData], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${cmd.name}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const dateStr = (s) =>
    new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px" }}>
      <button
        onClick={onBack}
        style={{
          background: "none", border: "none", color: C.muted,
          cursor: "pointer", display: "flex", alignItems: "center",
          gap: 6, fontSize: 14, marginBottom: 28, padding: 0,
          fontFamily: "inherit",
        }}
      >
        <ArrowLeft size={15} /> Back to Browse
      </button>

      {/* Header card */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 28, marginBottom: 18,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", flexWrap: "wrap", gap: 20,
        }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{
              display: "flex", alignItems: "center",
              gap: 10, flexWrap: "wrap", marginBottom: 12,
            }}>
              <h1 style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 26, fontWeight: 700, color: C.white, margin: 0,
              }}>
                /{cmd.name}
              </h1>
              <TypeBadge type={cmd.type} />
              <FrameworkBadge fw={cmd.framework} />
              <span style={{ color: C.faint, fontSize: 12 }}>{cmd.version}</span>
            </div>
            <p style={{
              color: C.muted, fontSize: 15, lineHeight: 1.65,
              margin: "0 0 16px", maxWidth: 580,
            }}>
              {cmd.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {cmd.tags.map(t => <TagBadge key={t} tag={t} />)}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
            <button
              onClick={handleDownload}
              style={{
                background: C.blurple, color: "#fff", border: "none",
                borderRadius: 8, padding: "11px 20px", fontSize: 14,
                fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                fontFamily: "inherit",
              }}
            >
              <Download size={15} /> Download JSON
            </button>
            <button
              onClick={handleCopy}
              style={{
                background: C.surface2, color: copied ? C.green : C.text,
                border: `1px solid ${copied ? "rgba(87,242,135,0.3)" : C.border}`,
                borderRadius: 8, padding: "11px 20px", fontSize: 14,
                fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                fontFamily: "inherit",
              }}
            >
              {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy JSON</>}
            </button>
            {user && (
              <button
                onClick={() => setFaved(!faved)}
                style={{
                  background: faved ? "rgba(237,66,69,0.12)" : C.surface2,
                  color: faved ? C.red : C.muted,
                  border: `1px solid ${faved ? "rgba(237,66,69,0.3)" : C.border}`,
                  borderRadius: 8, padding: "11px 20px", fontSize: 14,
                  fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  fontFamily: "inherit",
                }}
              >
                <Heart size={15} fill={faved ? "currentColor" : "none"} />
                {faved ? "Favourited" : "Favourite"}
              </button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          display: "flex", gap: 24, flexWrap: "wrap",
          marginTop: 22, paddingTop: 20,
          borderTop: `1px solid ${C.border}`,
        }}>
          <StatPill icon={<Download size={14} />} value={fmt(cmd.downloads)} label="downloads" />
          <StatPill icon={<Eye size={14} />}      value={fmt(cmd.views)}     label="views" />
          <StatPill icon={<Heart size={14} />}    value={fmt(cmd.favourites)} label="favourites" />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={14} color={C.yellow} />
            <strong style={{ color: C.text }}>{cmd.rating.toFixed(1)}</strong>
            <span style={{ color: C.muted, fontSize: 13 }}>({cmd.ratingCount} ratings)</span>
          </div>
          <div style={{ marginLeft: "auto", color: C.faint, fontSize: 12 }}>
            Updated {dateStr(cmd.updatedAt)} · Created {dateStr(cmd.createdAt)}
          </div>
        </div>
      </div>

      {/* Author + Links */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 16, marginBottom: 18,
      }}>
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 20,
        }}>
          <div style={{
            color: C.muted, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 14,
          }}>
            Creator
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: C.blurple,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0,
            }}>
              {cmd.author.username[0].toUpperCase()}
            </div>
            <div>
              <div style={{ color: C.text, fontWeight: 600 }}>{cmd.author.username}</div>
              <div style={{ color: C.faint, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <Shield size={11} /> Discord Verified
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 20,
        }}>
          <div style={{
            color: C.muted, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 14,
          }}>
            Links
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cmd.githubUrl ? (
              <a
                href={cmd.githubUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, color: C.text, textDecoration: "none", fontSize: 13 }}
              >
                <Github size={15} color={C.muted} />
                View on GitHub
                <ExternalLink size={11} color={C.faint} />
              </a>
            ) : (
              <span style={{ color: C.faint, fontSize: 13 }}>No GitHub link provided</span>
            )}
            {cmd.websiteUrl && (
              <a
                href={cmd.websiteUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, color: C.text, textDecoration: "none", fontSize: 13 }}
              >
                <Globe size={15} color={C.muted} />
                Visit Website
                <ExternalLink size={11} color={C.faint} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed content */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: "hidden", marginBottom: 18,
      }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
          {["raw", "changelog"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === tab ? C.blurple : "transparent"}`,
                padding: "14px 22px", fontSize: 14, fontWeight: 600,
                color: activeTab === tab ? C.blurple : C.muted,
                cursor: "pointer", fontFamily: "inherit",
                transition: "color 0.15s",
              }}
            >
              {tab === "raw" ? "Raw JSON" : "Changelog"}
            </button>
          ))}
        </div>
        <div style={{ padding: 22 }}>
          {activeTab === "raw" ? (
            <pre style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: C.text,
              background: C.bg, borderRadius: 8,
              padding: "18px 20px", overflow: "auto",
              maxHeight: 420, lineHeight: 1.7, margin: 0,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {cmd.rawData}
            </pre>
          ) : (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: C.muted,
              whiteSpace: "pre-wrap", lineHeight: 1.9,
            }}>
              {cmd.changelog || "No changelog provided."}
            </div>
          )}
        </div>
      </div>

      {/* Rating (logged in only) */}
      {user ? (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 22,
        }}>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
            Rate this command
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setUserRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: "none", border: "none",
                  fontSize: 28, cursor: "pointer",
                  color: n <= (hoverRating || userRating) ? C.yellow : C.faint,
                  transition: "color 0.1s", lineHeight: 1,
                }}
              >
                ★
              </button>
            ))}
          </div>
          {userRating > 0 && (
            <div style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>
              You rated this {userRating}/5 — thanks!
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 20, textAlign: "center", color: C.muted, fontSize: 14,
        }}>
          <LogIn size={16} style={{ marginBottom: 6, display: "block", margin: "0 auto 8px" }} />
          Log in with Discord to rate and favourite this command
        </div>
      )}
    </div>
  );
}

// ─── Upload Page ──────────────────────────────────────────────────────────────
function UploadPage({ user, onNavigate }) {
  const [form, setForm] = useState({
    name: "", description: "", type: "Slash",
    framework: "Discord.js", version: "v1.0.0",
    tags: [], githubUrl: "", websiteUrl: "",
    changelog: "", rawData: "",
  });
  const [jsonError, setJsonError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!user) return (
    <div style={{ textAlign: "center", padding: "100px 24px" }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: C.blurpleDim, border: `1px solid rgba(88,101,242,0.3)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
      }}>
        <LogIn size={28} color={C.blurple} />
      </div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.white, marginBottom: 8, fontSize: 24 }}>
        Login Required
      </h2>
      <p style={{ color: C.muted, marginBottom: 28, maxWidth: 380, margin: "0 auto 28px" }}>
        You need to log in with Discord to upload commands to CmdHub.
      </p>
      <button
        onClick={() => onNavigate("home")}
        style={{
          background: C.blurple, color: "#fff", border: "none",
          borderRadius: 8, padding: "12px 28px", fontSize: 15,
          fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        Login with Discord
      </button>
    </div>
  );

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "100px 24px" }}>
      <div style={{ fontSize: 52, marginBottom: 18 }}>🎉</div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.white, marginBottom: 8, fontSize: 24 }}>
        Command Submitted!
      </h2>
      <p style={{ color: C.muted, marginBottom: 30 }}>
        Your command is being reviewed and will appear in the registry shortly.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button
          onClick={() => { setSubmitted(false); setForm({ name:"", description:"", type:"Slash", framework:"Discord.js", version:"v1.0.0", tags:[], githubUrl:"", websiteUrl:"", changelog:"", rawData:"" }); }}
          style={{
            background: C.surface, color: C.text, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "11px 22px", cursor: "pointer",
            fontSize: 14, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          Upload Another
        </button>
        <button
          onClick={() => onNavigate("browse")}
          style={{
            background: C.blurple, color: "#fff", border: "none",
            borderRadius: 8, padding: "11px 22px", cursor: "pointer",
            fontSize: 14, fontWeight: 700, fontFamily: "inherit",
          }}
        >
          Browse Commands
        </button>
      </div>
    </div>
  );

  const set     = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTag = (t) => set("tags", form.tags.includes(t) ? form.tags.filter(x => x !== t) : [...form.tags, t]);

  const handleRaw = (v) => {
    set("rawData", v);
    if (!v) { setJsonError(""); return; }
    try { JSON.parse(v); setJsonError(""); }
    catch { setJsonError("Invalid JSON — please check your syntax"); }
  };

  const canSubmit = form.name && form.description && form.rawData && !jsonError;

  const inp = {
    width: "100%", background: C.surface2,
    border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "11px 14px", color: C.text, fontSize: 14,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
  const label = {
    display: "block", color: C.muted, fontSize: 11, fontWeight: 700,
    marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8,
  };

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "44px 24px" }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: C.white, marginBottom: 6 }}>
        Upload a Command
      </h1>
      <p style={{ color: C.muted, marginBottom: 32, fontSize: 15 }}>
        Share your command raw data with the CmdHub community.
      </p>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 30 }}>

        {/* Name + Version */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={label}>Command Name *</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%",
                transform: "translateY(-50%)",
                color: C.blurple, fontFamily: "'JetBrains Mono', monospace", fontSize: 16,
              }}>/</span>
              <input
                value={form.name}
                onChange={e => set("name", e.target.value.replace(/\s/g, "-").toLowerCase())}
                placeholder="command-name"
                style={{ ...inp, paddingLeft: 26, fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
          </div>
          <div>
            <label style={label}>Version</label>
            <input value={form.version} onChange={e => set("version", e.target.value)} placeholder="v1.0.0" style={inp} />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Description *</label>
          <textarea
            value={form.description}
            onChange={e => set("description", e.target.value)}
            placeholder="What does this command do? Be descriptive — this appears in search results."
            rows={3}
            style={{ ...inp, resize: "vertical" }}
          />
        </div>

        {/* Type + Framework */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={label}>Command Type</label>
            <select value={form.type} onChange={e => set("type", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {CMD_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Framework</label>
            <select value={form.framework} onChange={e => set("framework", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {FRAMEWORKS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Tags</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_TAGS.map(t => (
              <TagBadge key={t} tag={t} onClick={() => toggleTag(t)} selected={form.tags.includes(t)} />
            ))}
          </div>
          {form.tags.length === 0 && (
            <p style={{ color: C.faint, fontSize: 12, marginTop: 8 }}>Select at least one tag to help people find your command.</p>
          )}
        </div>

        {/* Links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={label}>GitHub URL</label>
            <input
              value={form.githubUrl}
              onChange={e => set("githubUrl", e.target.value)}
              placeholder="https://github.com/you/repo"
              style={inp}
            />
          </div>
          <div>
            <label style={label}>Website URL</label>
            <input
              value={form.websiteUrl}
              onChange={e => set("websiteUrl", e.target.value)}
              placeholder="https://yoursite.com"
              style={inp}
            />
          </div>
        </div>

        {/* Raw JSON */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
            <label style={{ ...label, marginBottom: 0 }}>Raw JSON Data *</label>
            {jsonError && (
              <span style={{ color: C.red, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                ⚠ {jsonError}
              </span>
            )}
          </div>
          <textarea
            value={form.rawData}
            onChange={e => handleRaw(e.target.value)}
            placeholder={'{\n  "name": "your-command",\n  "description": "...",\n  "options": []\n}'}
            rows={10}
            style={{
              ...inp,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, resize: "vertical",
              border: `1px solid ${jsonError ? C.red : C.border}`,
            }}
          />
        </div>

        {/* Changelog */}
        <div style={{ marginBottom: 20 }}>
          <label style={label}>Changelog / Update Notes</label>
          <textarea
            value={form.changelog}
            onChange={e => set("changelog", e.target.value)}
            placeholder={"v1.0.0: Initial release.\nv1.1.0: Added new option."}
            rows={3}
            style={{ ...inp, resize: "vertical" }}
          />
        </div>

        {/* Screenshot upload (stub) */}
        <div style={{ marginBottom: 28 }}>
          <label style={label}>Preview Screenshot</label>
          <div style={{
            border: `2px dashed ${C.border}`, borderRadius: 10,
            padding: "28px 20px", textAlign: "center", cursor: "pointer",
            transition: "border-color 0.15s",
          }}>
            <Upload size={22} style={{ color: C.faint, marginBottom: 8 }} />
            <div style={{ color: C.muted, fontSize: 14 }}>
              Click to upload a screenshot
            </div>
            <div style={{ color: C.faint, fontSize: 12, marginTop: 4 }}>
              PNG or JPG · Max 2MB
            </div>
          </div>
        </div>

        <button
          onClick={() => { if (canSubmit) setSubmitted(true); }}
          disabled={!canSubmit}
          style={{
            width: "100%", background: canSubmit ? C.blurple : C.surface3,
            color: canSubmit ? "#fff" : C.faint,
            border: "none", borderRadius: 10, padding: "14px",
            fontSize: 15, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "inherit", transition: "all 0.15s",
            boxShadow: canSubmit ? "0 4px 20px rgba(88,101,242,0.4)" : "none",
          }}
        >
          Submit Command
        </button>
      </div>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
function ProfilePage({ user, onViewCommand, onNavigate }) {
  if (!user) return (
    <div style={{ textAlign: "center", padding: "100px 24px" }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
      }}>
        <User size={28} color={C.faint} />
      </div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.white, marginBottom: 8 }}>Not logged in</h2>
      <p style={{ color: C.muted }}>Log in with Discord to view your profile and uploaded commands.</p>
    </div>
  );

  const userCmds      = MOCK_COMMANDS.filter(c => c.author.id === user.id);
  const totalDownloads = userCmds.reduce((a, c) => a + c.downloads, 0);
  const totalFavs      = userCmds.reduce((a, c) => a + c.favourites, 0);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "44px 24px" }}>

      {/* Profile header */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 30, marginBottom: 26,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(88,101,242,0.08), transparent)",
          pointerEvents: "none",
        }} />
        <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
          <div style={{
            width: 76, height: 76, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.blurple}, #7289da)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 34, fontWeight: 800, color: "#fff", flexShrink: 0,
            boxShadow: "0 4px 20px rgba(88,101,242,0.4)",
          }}>
            {user.username[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: "'Syne', sans-serif", fontSize: 26,
              fontWeight: 800, color: C.white, margin: "0 0 4px",
            }}>
              {user.username}
            </h1>
            <div style={{
              color: C.muted, fontSize: 13,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Shield size={13} /> Discord Verified Member
            </div>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {[
              { label: "Commands",  value: userCmds.length },
              { label: "Downloads", value: fmt(totalDownloads) },
              { label: "Favourites",value: fmt(totalFavs) },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: C.white }}>
                  {s.value}
                </div>
                <div style={{ color: C.muted, fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commands header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 18,
      }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: C.white, margin: 0 }}>
          Uploaded Commands
        </h2>
        <button
          onClick={() => onNavigate("upload")}
          style={{
            background: C.blurple, color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 18px", fontSize: 13,
            fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "inherit",
          }}
        >
          <Plus size={14} /> Upload New
        </button>
      </div>

      {userCmds.length === 0 ? (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: "60px 20px",
          textAlign: "center", color: C.muted,
        }}>
          <Package size={36} style={{ marginBottom: 14, opacity: 0.25, display: "block", margin: "0 auto 14px" }} />
          <p style={{ margin: 0, fontSize: 16 }}>No commands uploaded yet</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Be the first to share your work with the community</p>
          <button
            onClick={() => onNavigate("upload")}
            style={{
              marginTop: 20, background: C.blurple, color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 22px", fontSize: 14,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Upload your first command
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: 16,
        }}>
          {userCmds.map(cmd => (
            <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ onNavigate }) {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      padding: "36px 24px", marginTop: 40,
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, background: C.blurple, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Code2 size={14} color="#fff" />
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: C.white, fontSize: 15 }}>
              CmdHub
            </span>
          </div>
          <p style={{ color: C.faint, fontSize: 12, margin: 0, maxWidth: 260, lineHeight: 1.6 }}>
            The open command registry for Discord bots. Browse, share, and download command data across every framework.
          </p>
        </div>
        <div style={{ display: "flex", gap: 40 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Platform
            </div>
            {["home", "browse", "upload"].map(p => (
              <button key={p} onClick={() => onNavigate(p)} style={{
                background: "none", border: "none", color: C.faint,
                cursor: "pointer", display: "block", fontSize: 13,
                textAlign: "left", padding: "3px 0", fontFamily: "inherit",
                textTransform: "capitalize",
              }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center", color: C.faint, fontSize: 12, marginTop: 28 }}>
        © 2025 CmdHub · Built for the Discord bot community
      </div>
    </footer>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
// App has been moved to `src/App.jsx`. This file is retained for reference.

export default null
