import React, { useState } from 'react';
import { 
  Copy, Check, Terminal, Globe, Code2, Zap, Shield, 
  ChevronRight, ExternalLink, Package, Key, Truck,
  CheckCircle2, ArrowRight, BookOpen, Cpu
} from 'lucide-react';
import { Logo } from '../components/Logo';

// ─── Reusable copy button ─────────────────────────────────────────────────────
function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-lg transition-all ${copied ? 'text-emerald-400' : 'text-slate-400 hover:text-white'} ${className}`}
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// ─── Code block ───────────────────────────────────────────────────────────────
function CodeBlock({ code, lang = '' }: { code: string; lang?: string }) {
  return (
    <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
      {lang && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{lang}</span>
          <CopyButton text={code} />
        </div>
      )}
      {!lang && (
        <div className="absolute top-3 right-3">
          <CopyButton text={code} />
        </div>
      )}
      <pre className="p-4 text-[12px] font-mono text-cyan-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AgentsMcp() {
  const [activeClient, setActiveClient] = useState<'claude_desktop' | 'claude_code' | 'cursor' | 'windsurf' | 'chatgpt'>('claude_desktop');
  const [liveQuoteOrigin, setLiveQuoteOrigin] = useState('Dallas, TX');
  const [liveQuoteDest, setLiveQuoteDest] = useState('Atlanta, GA');
  const [liveQuoteWeight, setLiveQuoteWeight] = useState('2500');
  const [liveQuoteResult, setLiveQuoteResult] = useState<any>(null);
  const [liveQuoteLoading, setLiveQuoteLoading] = useState(false);

  const remoteUrl = 'https://alvargo.net/api/mcp';
  const npxCmd = 'npx -y alvargo-mcp-server';

  const clientConfigs: Record<string, { label: string; config: string; steps: string[] }> = {
    claude_desktop: {
      label: 'Claude Desktop',
      config: `{
  "mcpServers": {
    "alvargo": {
      "command": "npx",
      "args": ["-y", "alvargo-mcp-server"]
    }
  }
}`,
      steps: [
        'Open Claude Desktop → Settings → Developer → Edit Config',
        'Paste the JSON block below into claude_desktop_config.json',
        'Restart Claude Desktop',
        'Ask Claude: "What Alvargo tools do you have?" to verify',
      ],
    },
    claude_code: {
      label: 'Claude Code',
      config: `{
  "mcpServers": {
    "alvargo": {
      "command": "npx",
      "args": ["-y", "alvargo-mcp-server"]
    }
  }
}`,
      steps: [
        'Create .mcp.json in your project root (team-level) or ~/.claude/settings.json (user-level)',
        'Paste the JSON block below',
        'Restart Claude Code',
        'Run: claude mcp add --transport http alvargo https://alvargo.net/api/mcp (alternative)',
      ],
    },
    cursor: {
      label: 'Cursor',
      config: `{
  "mcpServers": {
    "alvargo": {
      "command": "npx",
      "args": ["-y", "alvargo-mcp-server"]
    }
  }
}`,
      steps: [
        'Create .cursor/mcp.json in your project root',
        'Paste the JSON block below',
        'Open a new Cursor AI chat (Cmd+L)',
        'Alvargo freight tools are now available in your AI chat',
      ],
    },
    windsurf: {
      label: 'Windsurf',
      config: `{
  "mcpServers": {
    "alvargo": {
      "command": "npx",
      "args": ["-y", "alvargo-mcp-server"]
    }
  }
}`,
      steps: [
        'Open Windsurf → Settings → MCP Servers',
        'Add a new server with the config below',
        'Restart Windsurf to pick up the Alvargo tools',
      ],
    },
    chatgpt: {
      label: 'Remote MCP',
      config: `Remote MCP URL:
https://alvargo.net/api/mcp

Phase 1 availability:
Public tools: quote_freight, get_market_rates, register_shipper
Private shipper tools: use the local NPM client with ALVARGO_MCP_KEY`,
      steps: [
        'Add https://alvargo.net/api/mcp to any Streamable HTTP-compatible client to access public Alvargo tools.',
        'For shipper-private tools, install the local alvargo-mcp-server package using the configuration shown above.',
        'Create and scope your MCP key in Alvargo → Shipper Integrations → AI Agents & MCP.',
        'OAuth browser sign-in for remote private tools is planned for a future release.',
      ],
    },
  };

  const handleLiveQuote = async () => {
    setLiveQuoteLoading(true);
    setLiveQuoteResult(null);
    try {
      const res = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'quote_freight',
          args: {
            origin: liveQuoteOrigin,
            destination: liveQuoteDest,
            cargoType: 'General Freight',
            weightLbs: parseFloat(liveQuoteWeight) || 2500,
            equipmentNeeded: 'DRY_VAN',
          },
        }),
      });
      const data = await res.json();
      setLiveQuoteResult(data.result || data);
    } catch {
      setLiveQuoteResult({ error: 'Could not reach Alvargo API. Make sure you are logged in.' });
    } finally {
      setLiveQuoteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-white font-sans">

      {/* ── Top Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-[#0D1117]/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <a href="/" className="flex min-w-0 items-center gap-3" aria-label="Alvargo MCP home">
            <Logo compact className="h-9 w-8 shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="text-base font-black tracking-[0.12em] text-white sm:text-lg">ALVARGO</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#00D4FF]">AI Agents & MCP</div>
            </div>
          </a>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <a href="https://alvargo.delivery/register" className="hidden text-sm font-bold text-slate-400 transition-colors hover:text-white sm:inline">
              Create Account
            </a>
            <a
              href="https://alvargo.delivery/login"
              className="rounded-xl bg-[#00D4FF] px-3 py-2 text-xs font-black text-[#0D1117] transition-all hover:bg-[#00c0e6] sm:px-4 sm:text-sm"
            >
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-full text-[#00D4FF] text-xs font-black uppercase tracking-widest mb-8">
          <Zap size={12} className="fill-current" />
          Alvargo MCP Server — Secure Gateway
        </div>

        <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none mb-6">
          Book freight inside<br />
          <span className="text-[#00D4FF]">Claude, Cursor & ChatGPT</span>
        </h1>

        <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          Connect your AI assistant to Alvargo's freight OS. Quote any lane, book a shipment, 
          track in real time — all from a single chat message. No portal. No tab switching.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <a
            href="#install"
            className="px-8 py-4 bg-[#00D4FF] text-[#0D1117] font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-[#00c0e6] transition-all shadow-lg shadow-[#00D4FF]/20 flex items-center gap-2"
          >
            <Package size={18} /> Install in 60 Seconds
          </a>
          <a
            href="https://alvargo.delivery/integrations"
            className="px-8 py-4 bg-slate-800 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all flex items-center gap-2"
          >
            <Key size={18} /> Get Your MCP Key
          </a>
        </div>

        {/* Remote URL pill */}
        <div className="inline-flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3 font-mono text-sm text-emerald-400">
          <Globe size={16} className="text-slate-500 flex-shrink-0" />
          <span>{remoteUrl}</span>
          <CopyButton text={remoteUrl} />
        </div>
        <p className="text-xs text-slate-600 mt-2 font-medium">
          Paste into Claude → Settings → Connectors → Add custom connector
        </p>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '10', label: 'Production Tools', sub: 'Quote, book, track, assign, upload' },
            { value: '3', label: 'Public Tools', sub: 'No key required' },
            { value: '5+', label: 'AI Clients', sub: 'Claude, Cursor, ChatGPT, Windsurf, Continue' },
            { value: '90-day', label: 'Key TTL', sub: 'RBAC scoped, revocable anytime' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-black text-[#00D4FF]">{stat.value}</div>
              <div className="text-sm font-black text-white mt-1">{stat.label}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live Quote Demo ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight mb-3">Try a Live Quote — No Login Required</h2>
          <p className="text-slate-400 font-medium">
            This calls the same public endpoint your AI agent will use once connected.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input form */}
          <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="text-[#00D4FF]" size={20} />
              <h3 className="font-black text-base uppercase tracking-tight">Get a Live Rate</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Origin</label>
                <input
                  type="text"
                  value={liveQuoteOrigin}
                  onChange={(e) => setLiveQuoteOrigin(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:border-[#00D4FF] focus:outline-none transition-colors"
                  placeholder="Dallas, TX"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Destination</label>
                <input
                  type="text"
                  value={liveQuoteDest}
                  onChange={(e) => setLiveQuoteDest(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:border-[#00D4FF] focus:outline-none transition-colors"
                  placeholder="Atlanta, GA"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Weight (lbs)</label>
                <input
                  type="number"
                  value={liveQuoteWeight}
                  onChange={(e) => setLiveQuoteWeight(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:border-[#00D4FF] focus:outline-none transition-colors"
                  placeholder="2500"
                />
              </div>
            </div>
            <button
              onClick={handleLiveQuote}
              disabled={liveQuoteLoading}
              className="w-full py-4 bg-[#00D4FF] text-[#0D1117] font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-[#00c0e6] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {liveQuoteLoading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-[#0D1117] border-t-transparent rounded-full" />
              ) : (
                <Zap size={16} />
              )}
              Get Live Rate
            </button>

            {liveQuoteResult && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">API Response:</div>
                <pre>{JSON.stringify(liveQuoteResult, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* What your AI agent calls */}
          <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="text-[#00D4FF]" size={20} />
              <h3 className="font-black text-base uppercase tracking-tight">What Your AI Agent Calls</h3>
            </div>
            <p className="text-sm text-slate-400 font-medium">
              Once installed, your AI agent calls the same endpoint automatically when you ask for a quote.
            </p>
            <CodeBlock
              lang="Tool Call"
              code={`quote_freight({
  origin: "${liveQuoteOrigin}",
  destination: "${liveQuoteDest}",
  cargo_type: "General Freight",
  weight_lbs: ${liveQuoteWeight || 2500},
  equipment_type: "DRY_VAN"
})`}
            />
            <div className="space-y-3 pt-2">
              {[
                { prompt: `"Quote freight ${liveQuoteOrigin} to ${liveQuoteDest}, ${liveQuoteWeight} lbs, dry van."`, tool: 'quote_freight' },
                { prompt: '"Book this shipment for next Monday."', tool: 'create_shipment' },
                { prompt: '"Track my shipment ALV-20260805-XKQR."', tool: 'get_shipment' },
                { prompt: '"Create an Alvargo shipper account for Acme Corp."', tool: 'register_shipper' },
              ].map((ex) => (
                <div key={ex.tool} className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <ChevronRight size={14} className="text-[#00D4FF] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 font-medium italic">"{ex.prompt.replace(/^"|"$/g, '')}"</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">→ calls <code className="text-[#00D4FF]">{ex.tool}</code></p>
                  </div>
                  <CopyButton text={ex.prompt.replace(/^"|"$/g, '')} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Install Section ───────────────────────────────────────────────────── */}
      <section id="install" className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-800">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight mb-3">Add Alvargo to Your AI Client</h2>
          <p className="text-slate-400 font-medium">
            Choose your client. Quote tools work immediately — no key needed.
          </p>
        </div>

        {/* Option 1: Remote (Recommended) */}
        <div className="bg-gradient-to-br from-[#00D4FF]/10 to-transparent border border-[#00D4FF]/20 rounded-[32px] p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-[#00D4FF]" size={24} />
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight">Remote Connector</h3>
              <span className="text-[10px] font-black text-[#00D4FF] bg-[#00D4FF]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Recommended for Claude</span>
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium mb-5">
            Paste one URL into Claude → Settings → Connectors → Add custom connector. No install, no Node.js required.
          </p>
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 font-mono text-sm text-emerald-400">
            <Globe size={16} className="text-slate-500 flex-shrink-0" />
            <span className="flex-1">{remoteUrl}</span>
            <CopyButton text={remoteUrl} />
          </div>
          <p className="text-xs text-slate-600 mt-3 font-medium">
            In Claude Code: <code className="text-slate-400">claude mcp add --transport http alvargo {remoteUrl}</code>
          </p>
        </div>

        {/* Option 2: Local stdio */}
        <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8">
          <div className="flex items-center gap-3 mb-4">
            <Terminal className="text-[#00D4FF]" size={24} />
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight">Local Install (stdio)</h3>
              <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-widest">For Cursor, Windsurf, Continue</span>
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium mb-6">
            One command. No API key to paste. Requires Node.js 18+.
          </p>

          {/* Client tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(Object.keys(clientConfigs) as Array<keyof typeof clientConfigs>).map((key) => (
              <button
                key={key}
                onClick={() => setActiveClient(key as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeClient === key
                    ? 'bg-[#00D4FF] text-[#0D1117]'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {clientConfigs[key].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Steps</h4>
              {clientConfigs[activeClient].steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-300 font-medium">{step}</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Config</h4>
              <CodeBlock lang={clientConfigs[activeClient].label} code={clientConfigs[activeClient].config} />
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-800/60 rounded-2xl border border-slate-700/50">
            <h4 className="text-xs font-black text-[#00D4FF] uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Key size={14} /> To enable booking & tracking (optional)
            </h4>
            <CodeBlock code={`# Step 1: Install and save your MCP key
npx alvargo-mcp login

# Step 2: Paste your key when prompted
# Get your key at: https://alvargo.net/integrations`} />
          </div>
        </div>
      </section>

      {/* ── Tools Reference ───────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-800">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight mb-3">10 Production Tools</h2>
          <p className="text-slate-400 font-medium">
            Every tool call hits Alvargo's live freight OS — same network, same pricing, same drivers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'quote_freight', auth: false, desc: 'Get instant freight quote for any lane. Returns cost, transit time, and equipment options.', badge: 'Public' },
            { name: 'create_shipment', auth: true, perm: 'create_shipment', desc: 'Book a live shipment on the Alvargo network. Triggers real driver matching.', badge: 'Shipper' },
            { name: 'get_shipment', auth: true, perm: 'get_shipment_details', desc: 'Track a shipment by ID. Returns status, driver, location, and full event timeline.', badge: 'Shipper' },
            { name: 'update_status', auth: true, perm: 'update_shipment_status', desc: 'Advance a shipment through its lifecycle (loaded → in transit → delivered).', badge: 'Dispatcher' },
            { name: 'find_drivers', auth: true, perm: 'get_shipment_details', desc: 'Find available drivers near any location with vehicle type filtering.', badge: 'Dispatcher' },
            { name: 'assign_driver', auth: true, perm: 'assign_driver_to_shipment', desc: 'Assign a specific driver to a shipment. Dispatcher-level permission required.', badge: 'Dispatcher' },
            { name: 'upload_document', auth: true, perm: 'upload_document', desc: 'Upload BOL, POD, insurance, or compliance documents to Firebase Storage.', badge: 'Shipper' },
            { name: 'get_market_rates', auth: false, desc: 'Live freight market rate benchmarks by lane and equipment type.', badge: 'Public' },
            { name: 'analyze_freight_image', auth: true, perm: 'create_shipment', desc: 'AI photo-to-quote. Send a cargo image and get a full freight quote back.', badge: 'Shipper' },
            { name: 'register_shipper', auth: false, desc: 'Create a new Alvargo shipper account. Public — no key required.', badge: 'Public' },
          ].map((tool) => (
            <div key={tool.name} className="bg-slate-900 rounded-2xl p-5 border border-slate-800 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Code2 size={16} className="text-[#00D4FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <code className="text-sm font-mono font-bold text-white">{tool.name}</code>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    tool.badge === 'Public' 
                      ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800/50' 
                      : tool.badge === 'Dispatcher'
                      ? 'bg-amber-900/50 text-amber-400 border border-amber-800/50'
                      : 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20'
                  }`}>
                    {tool.auth ? `🔑 ${tool.badge}` : `✓ ${tool.badge}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">{tool.desc}</p>
                {tool.perm && (
                  <p className="text-[10px] text-slate-600 font-bold mt-1">Permission: <code className="text-slate-500">{tool.perm}</code></p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Security Section ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-4">
              Enterprise-Grade Security<br />
              <span className="text-[#00D4FF]">Built Into Every Key</span>
            </h2>
            <p className="text-slate-400 font-medium mb-8 leading-relaxed">
              Every MCP key issued by Alvargo is scoped, time-limited, and fully auditable. 
              You control exactly which tools your AI agent can access — and you can revoke instantly.
            </p>
            <div className="space-y-4">
              {[
                { icon: Shield, title: 'RBAC Tool Scoping', desc: 'Enable or disable each tool individually. Your AI agent only sees what you allow.' },
                { icon: Key, title: '90-Day TTL', desc: 'Keys automatically expire after 90 days. Rotate anytime from your dashboard.' },
                { icon: CheckCircle2, title: 'Per-Execution Audit Log', desc: 'Every tool call is logged with timestamp, key ID, and sanitized arguments.' },
                { icon: Zap, title: 'Rate Limiting', desc: 'All MCP endpoints are rate-limited to prevent abuse and runaway agent loops.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-[#00D4FF]" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 space-y-5">
            <h3 className="font-black text-base uppercase tracking-tight flex items-center gap-2">
              <BookOpen size={18} className="text-[#00D4FF]" /> Verify It Yourself
            </h3>
            <p className="text-sm text-slate-400 font-medium">
              Every claim is independently checkable. Alvargo publishes a machine-readable MCP discovery manifest and a live health endpoint.
            </p>
            {[
              { label: 'MCP Discovery Manifest', url: 'https://alvargo.net/.well-known/mcp.json', desc: 'Lists every tool, auth requirements, and endpoints' },
              { label: 'Live Health Endpoint', url: 'https://alvargo.net/api/status', desc: 'No-auth health check — verify the server is live' },
              { label: 'NPM Package', url: 'https://npmjs.com/package/alvargo-mcp-server', desc: 'Published source on npm' },
              { label: 'GitHub (MIT)', url: 'https://github.com/Noewell/alvargo-mcp', desc: 'Open source under MIT license' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 hover:border-[#00D4FF]/30 transition-colors group"
              >
                <ExternalLink size={14} className="text-slate-500 group-hover:text-[#00D4FF] mt-0.5 flex-shrink-0 transition-colors" />
                <div>
                  <p className="text-sm font-black text-white group-hover:text-[#00D4FF] transition-colors">{link.label}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{link.desc}</p>
                  <p className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">{link.url}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-800 bg-gradient-to-b from-slate-900 to-[#0D1117]">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-black tracking-tight mb-4">
            Ready to ship freight<br />
            <span className="text-[#00D4FF]">from your AI chat?</span>
          </h2>
          <p className="text-slate-400 font-medium mb-10 text-lg">
            Create a free Alvargo account, generate your MCP key, and connect in under 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://alvargo.delivery/register"
              className="px-8 py-4 bg-[#00D4FF] text-[#0D1117] font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-[#00c0e6] transition-all shadow-lg shadow-[#00D4FF]/20 flex items-center gap-2"
            >
              Create Free Account <ArrowRight size={18} />
            </a>
            <a
              href="#install"
              className="px-8 py-4 bg-slate-800 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-700 transition-all flex items-center gap-2"
            >
              <Terminal size={18} /> View Install Docs
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo compact className="h-7 w-6 shrink-0" />
            <span className="text-sm font-black tracking-[0.12em] text-slate-300">ALVARGO</span>
            <span className="text-slate-700">·</span>
            <span className="text-xs font-medium text-slate-500">Logistics-as-a-Service</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600 font-medium">
            <a href="https://alvargo.delivery" className="hover:text-slate-400 transition-colors">Platform</a>
            <a href="https://github.com/Noewell/alvargo-mcp" className="hover:text-slate-400 transition-colors">GitHub</a>
            <a href="https://npmjs.com/package/alvargo-mcp-server" className="hover:text-slate-400 transition-colors">npm</a>
            <a href="mailto:support@alvargo.us" className="hover:text-slate-400 transition-colors">support@alvargo.us</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
