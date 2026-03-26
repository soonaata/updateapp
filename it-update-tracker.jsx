import { useState, useEffect, useCallback } from "react";

const CATEGORIES = ["Network", "Storage", "Backup", "Servers", "Identity", "VDI"];

const STATUS_COLORS = {
  "Up to Date":      { bg: "#0a2e1a", text: "#00e676", border: "#00e676" },
  "Update Available":{ bg: "#2e1f00", text: "#ffab00", border: "#ffab00" },
  "Critical Update": { bg: "#2e0a0a", text: "#ff5252", border: "#ff5252" },
  "EOL Soon":        { bg: "#2e1a2e", text: "#ea80fc", border: "#ea80fc" },
  "EOL Expired":     { bg: "#1a0000", text: "#ff1744", border: "#ff1744" },
};

const CHANGE_STATUS_COLORS = {
  Planned:      { bg: "#0d1f3c", text: "#448aff", border: "#448aff" },
  "In Progress":{ bg: "#2e1f00", text: "#ffab00", border: "#ffab00" },
  Complete:     { bg: "#0a2e1a", text: "#00e676", border: "#00e676" },
  Deferred:     { bg: "#1a1a1a", text: "#9e9e9e", border: "#9e9e9e" },
};

// Feed catalog — the source of truth for what can be auto-ingested
const FEED_CATALOG = [
  { id:"esxi",          label:"VMware ESXi",                      tier:"eol-api", slug:"esxi",         category:"Servers",  vendor:"VMware",       patchUrl:"https://docs.vmware.com/en/VMware-vSphere/index.html" },
  { id:"vcenter",       label:"VMware vCenter",                   tier:"eol-api", slug:"vcenter",      category:"Servers",  vendor:"VMware",       patchUrl:"https://docs.vmware.com/en/VMware-vSphere/index.html" },
  { id:"cisco-iosxe",   label:"Cisco IOS-XE",                     tier:"eol-api", slug:"cisco-ios-xe", category:"Network",  vendor:"Cisco",        patchUrl:"https://software.cisco.com/download/home" },
  { id:"panos",         label:"Palo Alto PAN-OS",                 tier:"eol-api", slug:"panos",        category:"Network",  vendor:"Palo Alto",    patchUrl:"https://docs.paloaltonetworks.com/pan-os/release-notes" },
  { id:"proxmox-ve",    label:"Proxmox VE",                       tier:"eol-api", slug:"proxmox-ve",   category:"Servers",  vendor:"Proxmox",      patchUrl:"https://pve.proxmox.com/wiki/Roadmap" },
  { id:"citrix-vad",    label:"Citrix DaaS (VAD lifecycle)",      tier:"eol-api", slug:"citrix-vad",   category:"VDI",      vendor:"Citrix",       patchUrl:"https://docs.citrix.com/en-us/citrix-daas/whats-new.html" },
  { id:"cisco-eol-rss", label:"Cisco EOL/EOS Notices (ISE, UCM)", tier:"rss",     url:"https://www.cisco.com/web/feeds/products/end_of_life_rss.xml", category:"Network", vendor:"Cisco", patchUrl:"https://www.cisco.com/c/en/us/products/eos-eol-listing.html" },
  { id:"palo-security", label:"Palo Alto Security Advisories",    tier:"rss",     url:"https://security.paloaltonetworks.com/rss.xml",                category:"Network", vendor:"Palo Alto", patchUrl:"https://security.paloaltonetworks.com/" },
  { id:"cohesity",      label:"Cohesity DataProtect",             tier:"manual",  category:"Backup",   vendor:"Cohesity",     patchUrl:"https://docs.cohesity.com" },
  { id:"pure",          label:"Pure Storage Purity",              tier:"manual",  category:"Storage",  vendor:"Pure Storage", patchUrl:"https://support.purestorage.com" },
  { id:"adself",        label:"ManageEngine ADSelfService+",      tier:"manual",  category:"Identity", vendor:"ManageEngine", patchUrl:"https://www.manageengine.com/products/self-service-password/release-notes.html" },
  { id:"cucm",          label:"Cisco UCM (CUCM)",                 tier:"manual",  category:"Network",  vendor:"Cisco",        patchUrl:"https://www.cisco.com/c/en/us/support/unified-communications/unified-communications-manager-callmanager/products-release-notes-list.html" },
  { id:"cisco-ise",     label:"Cisco ISE",                        tier:"manual",  category:"Network",  vendor:"Cisco",        patchUrl:"https://www.cisco.com/c/en/us/support/security/identity-services-engine-software/series.html" },
];

const SEED_PRODUCTS = [
  { id:1,  name:"ESXi Cluster",            feedId:"esxi",        trackedCycle:"8.0",     currentVersion:"8.0.0",      latestVersion:"8.0.3",      eolDate:"2025-10-15", category:"Servers",  vendor:"VMware",       model:"ESXi 8.0",            notes:"12 hosts",                       patchNotesUrl:"https://docs.vmware.com/en/VMware-vSphere/8.0/rn/vmware-esxi-80-release-notes/index.html" },
  { id:2,  name:"vCenter Server",          feedId:"vcenter",     trackedCycle:"8.0",     currentVersion:"8.0.1",      latestVersion:"8.0.3",      eolDate:"2025-10-15", category:"Servers",  vendor:"VMware",       model:"vCenter 8.0",         notes:"",                               patchNotesUrl:"https://docs.vmware.com/en/VMware-vSphere/8.0/rn/vsphere-vcenter-server-80-release-notes/index.html" },
  { id:3,  name:"Core Switch",             feedId:"cisco-iosxe", trackedCycle:"17.12",   currentVersion:"17.9.3",     latestVersion:"17.12.2",    eolDate:"2027-03-01", category:"Network",  vendor:"Cisco",        model:"Catalyst 9500",       notes:"Core distro switch",             patchNotesUrl:"https://www.cisco.com/c/en/us/support/switches/catalyst-9500-series-switches/products-release-notes-list.html" },
  { id:4,  name:"Edge Firewall",           feedId:"panos",       trackedCycle:"11.1",    currentVersion:"10.2.4",     latestVersion:"11.1.3",     eolDate:"2026-09-15", category:"Network",  vendor:"Palo Alto",    model:"PA-3260",             notes:"Internet edge",                  patchNotesUrl:"https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-release-notes" },
  { id:5,  name:"Proxmox Cluster",         feedId:"proxmox-ve",  trackedCycle:"8",       currentVersion:"8.2.0",      latestVersion:"9.0.0",      eolDate:"2026-06-30", category:"Servers",  vendor:"Proxmox",      model:"PVE 8.x",             notes:"",                               patchNotesUrl:"https://pve.proxmox.com/wiki/Roadmap" },
  { id:6,  name:"Citrix Cloud Connectors", feedId:"citrix-vad",  trackedCycle:"Current", currentVersion:"auto-update",latestVersion:"auto-update", eolDate:"2026-12-31", category:"VDI",      vendor:"Citrix",       model:"DaaS Cloud Connector",notes:"Auto-updated by Citrix Cloud",   patchNotesUrl:"https://docs.citrix.com/en-us/citrix-daas/whats-new.html" },
  { id:7,  name:"Cisco ISE",               feedId:"cisco-ise",   trackedCycle:"3.3",     currentVersion:"3.3.0",      latestVersion:"3.4.0",      eolDate:"2027-02-01", category:"Network",  vendor:"Cisco",        model:"ISE 3.x",             notes:"NAC / AAA",                      patchNotesUrl:"https://www.cisco.com/c/en/us/td/docs/security/ise/3-3/release_notes/b_ise_33_RN.html" },
  { id:8,  name:"Cisco UCM",               feedId:"cucm",        trackedCycle:"14",      currentVersion:"14.0.1",     latestVersion:"15.0.0",     eolDate:"2027-06-01", category:"Network",  vendor:"Cisco",        model:"CUCM 14.x",           notes:"Phone system",                   patchNotesUrl:"https://www.cisco.com/c/en/us/support/unified-communications/unified-communications-manager-callmanager/products-release-notes-list.html" },
  { id:9,  name:"Cohesity DataProtect",    feedId:"cohesity",    trackedCycle:"7.x",     currentVersion:"7.1.2",      latestVersion:"7.2.1",      eolDate:"2027-08-01", category:"Backup",   vendor:"Cohesity",     model:"C6000",               notes:"Backup & DR",                    patchNotesUrl:"https://docs.cohesity.com" },
  { id:10, name:"Pure FlashArray",         feedId:"pure",        trackedCycle:"6.x",     currentVersion:"6.3.10",     latestVersion:"6.5.4",      eolDate:"2028-12-01", category:"Storage",  vendor:"Pure Storage", model:"FlashArray//X70",      notes:"Primary SAN",                    patchNotesUrl:"https://support.purestorage.com" },
  { id:11, name:"ADSelfService Plus",      feedId:"adself",      trackedCycle:"6.x",     currentVersion:"6.4.0",      latestVersion:"6.5.0",      eolDate:"2028-01-01", category:"Identity", vendor:"ManageEngine", model:"ADSelfService+ 6.x",  notes:"Password reset portal",          patchNotesUrl:"https://www.manageengine.com/products/self-service-password/release-notes.html" },
  { id:12, name:"Edge Switches (9200)",   feedId:"cisco-iosxe", trackedCycle:"17.12",   currentVersion:"17.9.3",     latestVersion:"17.12.2",    eolDate:"2028-06-01", category:"Network",  vendor:"Cisco",        model:"Catalyst 9200",       notes:"Floor access switches",          patchNotesUrl:"https://www.cisco.com/c/en/us/support/switches/catalyst-9200-series-switches/products-release-notes-list.html" },
];

const SEED_CHANGES = [
  { id:1, title:"VMware ESXi + vCenter Upgrade",   productIds:[1,2], scheduledDate:"2025-04-20", maintenanceWindow:"22:00–04:00", status:"Planned",  notes:"Upgrade vCenter first. Coordinate with storage team.", assignedTo:"You" },
  { id:2, title:"Palo Alto PAN-OS Upgrade",        productIds:[4],   scheduledDate:"2025-04-27", maintenanceWindow:"00:00–03:00", status:"Planned",  notes:"Critical — 2 major versions behind. Full failover plan required.", assignedTo:"You" },
  { id:3, title:"Cisco IOS-XE Switch Upgrade",     productIds:[3],   scheduledDate:"2025-05-11", maintenanceWindow:"22:00–02:00", status:"Planned",  notes:"Rolling upgrade, one switch at a time.", assignedTo:"You" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDaysToEOL(eolDate) {
  if (!eolDate) return null;
  return Math.ceil((new Date(eolDate) - new Date()) / 86400000);
}

function getProductStatus(p) {
  const days = getDaysToEOL(p.eolDate);
  if (days !== null && days < 0)   return "EOL Expired";
  if (days !== null && days < 180) return "EOL Soon";
  if (p.currentVersion === "auto-update" || p.currentVersion === p.latestVersion) return "Up to Date";
  const cur = (p.currentVersion||"").split(".").map(Number);
  const lat = (p.latestVersion||"").split(".").map(Number);
  if (lat[0] > cur[0] || (lat[0] === cur[0] && lat[1] > cur[1] + 1)) return "Critical Update";
  if (p.currentVersion !== p.latestVersion) return "Update Available";
  return "Up to Date";
}

function EOLBadge({ eolDate }) {
  const days = getDaysToEOL(eolDate);
  if (days === null) return null;
  let color = "#00e676", label;
  if (days < 0)        { color = "#ff1744"; label = "EOL EXPIRED"; }
  else if (days < 90)  { color = "#ff5252"; label = `EOL ${days}d`; }
  else if (days < 365) { color = "#ffab00"; label = `EOL ${Math.floor(days/30)}mo`; }
  else                 { label = `EOL ${Math.floor(days/365)}y`; }
  return <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color, border:`1px solid ${color}`, borderRadius:"3px", padding:"1px 5px", letterSpacing:"0.05em" }}>{label}</span>;
}

function TierBadge({ tier }) {
  const map = { "eol-api":{ color:"#00e676", label:"AUTO" }, rss:{ color:"#448aff", label:"RSS" }, manual:{ color:"#9e9e9e", label:"MANUAL" } };
  const { color, label } = map[tier] || map.manual;
  return <span style={{ fontSize:"9px", fontFamily:"'DM Mono',monospace", color, border:`1px solid ${color}33`, background:`${color}11`, borderRadius:"3px", padding:"1px 6px", letterSpacing:"0.08em" }}>{label}</span>;
}

// ── UI primitives ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:"12px", width:"100%", maxWidth:"580px", maxHeight:"90vh", overflowY:"auto", padding:"28px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <h2 style={{ margin:0, fontSize:"16px", fontFamily:"'DM Mono',monospace", color:"#e0e6f0" }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666", cursor:"pointer", fontSize:"20px" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const baseInput = { width:"100%", background:"#181c27", border:"1px solid #2a2d3a", borderRadius:"6px", padding:"9px 12px", color:"#e0e6f0", fontSize:"13px", fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box" };
const baseLbl = { display:"block", fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#7b8499", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px" };

const F = ({ label, value, onChange, type="text", placeholder, required }) => (
  <div style={{ marginBottom:"13px" }}>
    <label style={baseLbl}>{label}{required && " *"}</label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={baseInput} />
  </div>
);
const Sel = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom:"13px" }}>
    <label style={baseLbl}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} style={baseInput}>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>
  </div>
);
const TA = ({ label, value, onChange, placeholder }) => (
  <div style={{ marginBottom:"13px" }}>
    <label style={baseLbl}>{label}</label>
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...baseInput, resize:"vertical" }} />
  </div>
);

const emptyProduct = { name:"", vendor:"", model:"", category:"Network", currentVersion:"", latestVersion:"", eolDate:"", patchNotesUrl:"", notes:"", feedId:"", trackedCycle:"" };
const emptyChange  = { title:"", productIds:[], scheduledDate:"", maintenanceWindow:"", status:"Planned", notes:"", assignedTo:"" };

// ── Detail / Quick-Edit Modal ─────────────────────────────────────────────────
function InlineField({ label, value, onChange, type="text", highlight }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid #1a1d2a" }}>
      <span style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#4a5068", textTransform:"uppercase", letterSpacing:"0.06em", flexShrink:0, marginRight:"12px" }}>{label}</span>
      <input
        type={type}
        value={value||""}
        onChange={e=>onChange(e.target.value)}
        style={{
          background: highlight ? "#0d2010" : "#0a0d17",
          border: `1px solid ${highlight ? "#00e67655" : "#2a2d3a"}`,
          borderRadius:"5px", padding:"5px 10px",
          color: highlight ? "#00e676" : "#e0e6f0",
          fontSize:"13px", fontFamily:"'DM Mono',monospace",
          outline:"none", textAlign:"right", width:"220px",
          transition:"border-color 0.15s",
        }}
      />
    </div>
  );
}

function DetailModal({ product, onClose, onSave }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(()=>{ if(product){ setDraft({...product}); setSaved(false); } }, [product]);

  if(!product||!draft) return null;

  const st   = getProductStatus(draft);
  const sc   = STATUS_COLORS[st];
  const feed = FEED_CATALOG.find(f=>f.id===draft.feedId);
  const set  = (key,val)=>{ setDraft(d=>({...d,[key]:val})); setSaved(false); };
  const handleSave = ()=>{ onSave(draft); setSaved(true); };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#0f1117", border:"1px solid #2a2d3a", borderRadius:"12px", width:"100%", maxWidth:"560px", maxHeight:"90vh", overflowY:"auto", padding:"28px" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
          <div>
            <div style={{ fontSize:"16px", fontFamily:"'DM Mono',monospace", color:"#e0e6f0", fontWeight:500 }}>{product.name}</div>
            <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#4a5068", marginTop:"3px" }}>{product.vendor} · {product.model}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666", cursor:"pointer", fontSize:"20px", lineHeight:1, marginLeft:"12px" }}>×</button>
        </div>

        {/* Status badges */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ backgroundColor:sc.bg, color:sc.text, border:`1px solid ${sc.border}`, fontSize:"11px", fontFamily:"'DM Mono',monospace", padding:"3px 10px", borderRadius:"4px" }}>{st}</span>
          <EOLBadge eolDate={draft.eolDate}/>
          {feed&&<TierBadge tier={feed.tier}/>}
          {feed?.tier==="manual"&&<span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#ffab00", background:"#2e1f00", border:"1px solid #ffab0033", borderRadius:"3px", padding:"2px 7px" }}>⚠ Manual update required</span>}
        </div>

        {/* Version block — highlighted, most prominent */}
        <div style={{ background:"#080f18", border:"1px solid #1a2d4a", borderRadius:"8px", padding:"14px 16px", marginBottom:"14px" }}>
          <div style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#448aff", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>
            Version Info — edit fields below to update
          </div>
          <InlineField label="Current Version (installed)" value={draft.currentVersion} onChange={v=>set("currentVersion",v)} highlight />
          <InlineField label="Latest Known Version"        value={draft.latestVersion}   onChange={v=>set("latestVersion",v)} />
          <InlineField label="Tracked Release Cycle"       value={draft.trackedCycle}    onChange={v=>set("trackedCycle",v)} />
        </div>

        {/* EOL / URL */}
        <div style={{ background:"#0a0d17", border:"1px solid #1a1d2a", borderRadius:"8px", padding:"14px 16px", marginBottom:"14px" }}>
          <div style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#7b8499", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Details</div>
          <InlineField label="EOL / EOS Date"  value={draft.eolDate}        onChange={v=>set("eolDate",v)} type="date" />
          <InlineField label="Patch Notes URL" value={draft.patchNotesUrl}  onChange={v=>set("patchNotesUrl",v)} />
        </div>

        {/* Notes */}
        <div style={{ marginBottom:"20px" }}>
          <label style={{ display:"block", fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#7b8499", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px" }}>Notes</label>
          <textarea value={draft.notes||""} onChange={e=>set("notes",e.target.value)} rows={2}
            style={{ width:"100%", background:"#0a0d17", border:"1px solid #1a1d2a", borderRadius:"6px", padding:"9px 12px", color:"#e0e6f0", fontSize:"13px", fontFamily:"'DM Mono',monospace", outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            {draft.patchNotesUrl&&<a href={draft.patchNotesUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:"12px", fontFamily:"'DM Mono',monospace", color:"#448aff", textDecoration:"none", border:"1px solid #448aff33", borderRadius:"5px", padding:"7px 12px" }}>View Patch Notes →</a>}
          </div>
          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            {saved&&<span style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#00e676" }}>✓ Saved</span>}
            <button onClick={onClose} style={{ background:"transparent", color:"#7b8499", border:"1px solid #2a2d3a", borderRadius:"6px", padding:"8px 16px", fontSize:"12px", fontFamily:"'DM Mono',monospace", cursor:"pointer" }}>Close</button>
            <button onClick={handleSave} style={{ background:"#448aff", color:"#fff", border:"none", borderRadius:"6px", padding:"8px 18px", fontSize:"12px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer" }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const load = (key, def) => { try { const s=localStorage.getItem(key); return s?JSON.parse(s):def; } catch { return def; } };

  const [products,    setProducts]    = useState(()=>load("itracker_products",   SEED_PRODUCTS));
  const [changes,     setChanges]     = useState(()=>load("itracker_changes",    SEED_CHANGES));
  const [feedItems,   setFeedItems]   = useState(()=>load("itracker_feeditems",  []));
  const [feedStatus,  setFeedStatus]  = useState({});
  const [lastRefresh, setLastRefresh] = useState(()=>load("itracker_lastrefresh",null));

  const [tab,           setTab]           = useState("dashboard");
  const [filterCat,     setFilterCat]     = useState("All");
  const [filterStatus,  setFilterStatus]  = useState("All");
  const [productModal,  setProductModal]  = useState(false);
  const [changeModal,   setChangeModal]   = useState(false);
  const [editProduct,   setEditProduct]   = useState(null);
  const [editChange,    setEditChange]    = useState(null);
  const [productForm,   setProductForm]   = useState(emptyProduct);
  const [changeForm,    setChangeForm]    = useState(emptyChange);
  const [detailProduct, setDetailProduct] = useState(null);

  useEffect(()=>{ localStorage.setItem("itracker_products",   JSON.stringify(products));    },[products]);
  useEffect(()=>{ localStorage.setItem("itracker_changes",    JSON.stringify(changes));     },[changes]);
  useEffect(()=>{ localStorage.setItem("itracker_feeditems",  JSON.stringify(feedItems));   },[feedItems]);
  useEffect(()=>{ localStorage.setItem("itracker_lastrefresh",JSON.stringify(lastRefresh)); },[lastRefresh]);

  const CORS = url=>`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const EOL_BASE = "https://endoflife.date/api/v1/products";

  const fetchEolApi = useCallback(async (feed) => {
    setFeedStatus(s=>({...s,[feed.id]:"loading"}));
    try {
      const res = await fetch(`${EOL_BASE}/${feed.slug}/`);
      if (!res.ok) throw new Error("HTTP "+res.status);
      const cycles = await res.json();
      const items = cycles.slice(0,6).map(c=>({
        id:`${feed.id}-${c.cycle}`,
        feedId:feed.id, vendor:feed.vendor,
        title:`${feed.label} — cycle ${c.cycle}, latest: ${c.latest}`,
        date:c.releaseDate||c.release||"",
        eol:typeof c.eol==="string"?c.eol:(c.eol===true?"Expired":"—"),
        link:c.link||feed.patchUrl,
        latestVersion:c.latest, cycle:String(c.cycle),
      }));
      setFeedItems(prev=>[...prev.filter(i=>i.feedId!==feed.id),...items]);
      // auto-update matching products
      setProducts(prev=>prev.map(p=>{
        if(p.feedId!==feed.id) return p;
        const match=cycles.find(c=>String(c.cycle)===String(p.trackedCycle))||cycles[0];
        return { ...p, latestVersion:match.latest||p.latestVersion, eolDate:(typeof match.eol==="string"?match.eol:p.eolDate) };
      }));
      setFeedStatus(s=>({...s,[feed.id]:"ok"}));
    } catch { setFeedStatus(s=>({...s,[feed.id]:"error"})); }
  },[]);

  const fetchRss = useCallback(async (feed) => {
    setFeedStatus(s=>({...s,[feed.id]:"loading"}));
    try {
      const res = await fetch(CORS(feed.url));
      if (!res.ok) throw new Error("HTTP "+res.status);
      const json = await res.json();
      const xml = new DOMParser().parseFromString(json.contents,"text/xml");
      const items = Array.from(xml.querySelectorAll("item")).slice(0,10).map((el,i)=>({
        id:`${feed.id}-rss-${i}`, feedId:feed.id, vendor:feed.vendor,
        title:el.querySelector("title")?.textContent||"Untitled",
        date:el.querySelector("pubDate")?.textContent||"",
        eol:"—", link:el.querySelector("link")?.textContent||feed.patchUrl,
        latestVersion:null, cycle:null,
      }));
      setFeedItems(prev=>[...prev.filter(i=>i.feedId!==feed.id),...items]);
      setFeedStatus(s=>({...s,[feed.id]:"ok"}));
    } catch { setFeedStatus(s=>({...s,[feed.id]:"error"})); }
  },[]);

  const refreshAll = useCallback(async()=>{
    const autoFeeds = FEED_CATALOG.filter(f=>f.tier!=="manual");
    await Promise.all(autoFeeds.map(f=>f.tier==="eol-api"?fetchEolApi(f):fetchRss(f)));
    setLastRefresh(new Date().toISOString());
  },[fetchEolApi,fetchRss]);

  useEffect(()=>{
    if(!lastRefresh||(Date.now()-new Date(lastRefresh).getTime())>4*3600*1000) refreshAll();
  },[]);

  const saveProduct = ()=>{
    if(!productForm.name) return;
    if(editProduct) setProducts(p=>p.map(x=>x.id===editProduct.id?{...productForm,id:editProduct.id}:x));
    else setProducts(p=>[...p,{...productForm,id:Date.now()}]);
    setProductModal(false); setEditProduct(null); setProductForm(emptyProduct);
  };
  const saveChange = ()=>{
    if(!changeForm.title||!changeForm.scheduledDate) return;
    if(editChange) setChanges(c=>c.map(x=>x.id===editChange.id?{...changeForm,id:editChange.id}:x));
    else setChanges(c=>[...c,{...changeForm,id:Date.now()}]);
    setChangeModal(false); setEditChange(null); setChangeForm(emptyChange);
  };
  const openEditProduct = p=>{ setEditProduct(p); setProductForm({...p}); setProductModal(true); };
  const openEditChange  = c=>{ setEditChange(c);  setChangeForm({...c});  setChangeModal(true); };

  const statusCounts = {"Up to Date":0,"Update Available":0,"Critical Update":0,"EOL Soon":0,"EOL Expired":0};
  products.forEach(p=>{ statusCounts[getProductStatus(p)]++; });

  const filteredProducts = products.filter(p=>{
    if(filterCat!=="All"&&p.category!==filterCat) return false;
    if(filterStatus!=="All"&&getProductStatus(p)!==filterStatus) return false;
    return true;
  });

  const upcomingChanges = [...changes].sort((a,b)=>new Date(a.scheduledDate)-new Date(b.scheduledDate));
  const recentFeedItems = [...feedItems].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,30);
  const anyLoading = Object.values(feedStatus).some(v=>v==="loading");

  const S = {
    app:    { minHeight:"100vh", background:"#080b12", color:"#e0e6f0", fontFamily:"'DM Sans',sans-serif" },
    sidebar:{ width:"220px", background:"#0c0f1a", borderRight:"1px solid #1a1d2a", position:"fixed", top:0, left:0, bottom:0, display:"flex", flexDirection:"column", zIndex:100 },
    main:   { marginLeft:"220px", padding:"32px", minHeight:"100vh" },
    nav: a=>({ display:"flex", alignItems:"center", gap:"10px", padding:"10px 20px", cursor:"pointer", fontSize:"13px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em", color:a?"#e0e6f0":"#4a5068", background:a?"#151929":"transparent", borderLeft:a?"2px solid #448aff":"2px solid transparent", transition:"all 0.15s" }),
    card:   { background:"#0c0f1a", border:"1px solid #1a1d2a", borderRadius:"10px", padding:"20px" },
    btn: c=>({ background:c||"#448aff", color:"#fff", border:"none", borderRadius:"6px", padding:"9px 18px", fontSize:"12px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase", cursor:"pointer" }),
    btnO:   { background:"transparent", color:"#7b8499", border:"1px solid #2a2d3a", borderRadius:"6px", padding:"7px 14px", fontSize:"11px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", cursor:"pointer" },
    lbl:    { fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#7b8499", letterSpacing:"0.08em", textTransform:"uppercase" },
    stag: st=>{ const sc=STATUS_COLORS[st]; return { backgroundColor:sc.bg, color:sc.text, border:`1px solid ${sc.border}22`, fontSize:"10px", fontFamily:"'DM Mono',monospace", padding:"2px 8px", borderRadius:"4px", letterSpacing:"0.04em" }; },
  };

  const PH = ({ sub, title, action }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"24px" }}>
      <div>
        <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#448aff", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"6px" }}>{sub}</div>
        <h1 style={{ margin:0, fontSize:"26px", fontWeight:600, color:"#e0e6f0", letterSpacing:"-0.02em" }}>{title}</h1>
      </div>
      {action}
    </div>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div style={S.app}>

        {/* Sidebar */}
        <div style={S.sidebar}>
          <div style={{ padding:"24px 20px 16px", borderBottom:"1px solid #1a1d2a" }}>
            <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#448aff", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"4px" }}>IT OPS</div>
            <div style={{ fontSize:"18px", fontWeight:600, color:"#e0e6f0", letterSpacing:"-0.01em" }}>Update Tracker</div>
          </div>
          <nav style={{ flex:1, padding:"12px 0" }}>
            {[["dashboard","⬡","Dashboard"],["products","◈","Products"],["changes","◷","Change Windows"],["feeds","⟳","Feed Monitor"]].map(([key,icon,label])=>(
              <div key={key} style={S.nav(tab===key)} onClick={()=>setTab(key)}>
                <span style={{ fontSize:"14px" }}>{icon}</span>
                {label}
                {key==="feeds"&&anyLoading&&<span style={{ marginLeft:"auto", width:"6px", height:"6px", borderRadius:"50%", background:"#ffab00", display:"inline-block", animation:"pulse 1s infinite" }}/>}
              </div>
            ))}
          </nav>
          <div style={{ padding:"16px 20px", borderTop:"1px solid #1a1d2a" }}>
            {lastRefresh&&<div style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#2a2d3a" }}>Last sync: {new Date(lastRefresh).toLocaleTimeString()}</div>}
            <div style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#2a2d3a", marginTop:"2px" }}>{products.length} products · {changes.length} windows</div>
          </div>
        </div>

        <div style={S.main}>

          {/* ═══ DASHBOARD ═══ */}
          {tab==="dashboard"&&(
            <div>
              <PH sub="Overview" title="System Health Dashboard" action={<button style={S.btn(anyLoading?"#2a2d3a":undefined)} onClick={refreshAll} disabled={anyLoading}>{anyLoading?"Syncing…":"↻ Sync Feeds"}</button>}/>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"12px", marginBottom:"28px" }}>
                {Object.entries(statusCounts).map(([st,cnt])=>{
                  const sc=STATUS_COLORS[st];
                  return <div key={st} onClick={()=>{setTab("products");setFilterStatus(st);}} style={{ ...S.card, background:sc.bg, border:`1px solid ${sc.border}22`, cursor:"pointer" }}>
                    <div style={{ fontSize:"28px", fontFamily:"'DM Mono',monospace", fontWeight:500, color:sc.text, lineHeight:1, marginBottom:"8px" }}>{cnt}</div>
                    <div style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:sc.text, opacity:0.8, letterSpacing:"0.06em", textTransform:"uppercase" }}>{st}</div>
                  </div>;
                })}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", marginBottom:"20px" }}>
                <div style={S.card}>
                  <div style={{ ...S.lbl, marginBottom:"16px" }}>Needs Attention</div>
                  {products.filter(p=>["Critical Update","EOL Expired","EOL Soon","Update Available"].includes(getProductStatus(p)))
                    .sort((a,b)=>{ const o={"EOL Expired":0,"Critical Update":1,"EOL Soon":2,"Update Available":3}; return o[getProductStatus(a)]-o[getProductStatus(b)]; })
                    .slice(0,6).map(p=>{
                      const st=getProductStatus(p); const sc=STATUS_COLORS[st];
                      return <div key={p.id} onClick={()=>setDetailProduct(p)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #1a1d2a", cursor:"pointer" }}>
                        <div>
                          <div style={{ fontSize:"13px", color:"#c8d0e0", fontWeight:500 }}>{p.name}</div>
                          <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#4a5068", marginTop:"2px" }}>{p.vendor} · {p.currentVersion} → {p.latestVersion}</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px" }}>
                          <span style={{ backgroundColor:sc.bg, color:sc.text, fontSize:"10px", fontFamily:"'DM Mono',monospace", padding:"2px 8px", borderRadius:"4px" }}>{st}</span>
                          <EOLBadge eolDate={p.eolDate}/>
                        </div>
                      </div>;
                    })}
                </div>
                <div style={S.card}>
                  <div style={{ ...S.lbl, marginBottom:"16px" }}>Upcoming Change Windows</div>
                  {upcomingChanges.filter(c=>c.status!=="Complete").slice(0,5).map(c=>{
                    const cs=CHANGE_STATUS_COLORS[c.status];
                    return <div key={c.id} style={{ padding:"10px 0", borderBottom:"1px solid #1a1d2a" }}>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <div style={{ fontSize:"13px", color:"#c8d0e0", fontWeight:500 }}>{c.title}</div>
                        <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:cs.text, border:`1px solid ${cs.border}`, borderRadius:"3px", padding:"1px 6px", whiteSpace:"nowrap", marginLeft:"8px" }}>{c.status}</span>
                      </div>
                      <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#4a5068", marginTop:"4px" }}>
                        {new Date(c.scheduledDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · {c.maintenanceWindow}
                      </div>
                    </div>;
                  })}
                  {upcomingChanges.filter(c=>c.status!=="Complete").length===0&&<div style={{ fontSize:"13px", color:"#4a5068", fontFamily:"'DM Mono',monospace" }}>No scheduled change windows.</div>}
                </div>
              </div>

              {recentFeedItems.length>0&&(
                <div style={S.card}>
                  <div style={{ ...S.lbl, marginBottom:"16px" }}>Recent Feed Activity</div>
                  {recentFeedItems.slice(0,8).map(item=>{
                    const feed=FEED_CATALOG.find(f=>f.id===item.feedId);
                    return <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid #1a1d2a" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"12px", color:"#c8d0e0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
                        <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#4a5068", marginTop:"2px" }}>{item.vendor}{item.date?` · ${new Date(item.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`:""}</div>
                      </div>
                      <div style={{ display:"flex", gap:"6px", marginLeft:"12px", flexShrink:0 }}>
                        {feed&&<TierBadge tier={feed.tier}/>}
                        {item.link&&<a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#448aff", textDecoration:"none", border:"1px solid #448aff33", borderRadius:"3px", padding:"1px 7px" }}>LINK</a>}
                      </div>
                    </div>;
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ PRODUCTS ═══ */}
          {tab==="products"&&(
            <div>
              <PH sub="Inventory" title="Products & Firmware" action={<button style={S.btn()} onClick={()=>{setEditProduct(null);setProductForm(emptyProduct);setProductModal(true);}}>+ Add Product</button>}/>
              <div style={{ display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap" }}>
                {["All",...CATEGORIES].map(cat=><button key={cat} onClick={()=>setFilterCat(cat)} style={{ ...S.btnO, color:filterCat===cat?"#448aff":"#4a5068", borderColor:filterCat===cat?"#448aff":"#2a2d3a" }}>{cat}</button>)}
                <div style={{ width:"1px", background:"#2a2d3a", margin:"0 4px" }}/>
                {["All","Critical Update","EOL Expired","EOL Soon","Update Available","Up to Date"].map(st=><button key={st} onClick={()=>setFilterStatus(st)} style={{ ...S.btnO, color:filterStatus===st?"#448aff":"#4a5068", borderColor:filterStatus===st?"#448aff":"#2a2d3a" }}>{st}</button>)}
              </div>
              <div style={{ ...S.card, padding:0, overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid #1a1d2a" }}>
                      {["Product","Vendor / Model","Current","Latest","EOL","Status","Feed",""].map(h=><th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#4a5068", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:400 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p,i)=>{
                      const st=getProductStatus(p); const feed=FEED_CATALOG.find(f=>f.id===p.feedId);
                      return <tr key={p.id} style={{ borderBottom:"1px solid #1a1d2a", background:i%2===0?"transparent":"#0a0d17" }}>
                        <td style={{ padding:"12px 14px" }}>
                          <div style={{ fontSize:"13px", color:"#e0e6f0", fontWeight:500, cursor:"pointer" }} onClick={()=>setDetailProduct(p)}>{p.name}</div>
                          <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#4a5068", marginTop:"2px" }}>{p.category}</div>
                        </td>
                        <td style={{ padding:"12px 14px", fontSize:"12px", fontFamily:"'DM Mono',monospace", color:"#7b8499" }}>{p.vendor}<br/><span style={{ color:"#4a5068", fontSize:"11px" }}>{p.model}</span></td>
                        <td style={{ padding:"12px 14px", fontSize:"12px", fontFamily:"'DM Mono',monospace", color:"#c8d0e0" }}>{p.currentVersion}</td>
                        <td style={{ padding:"12px 14px", fontSize:"12px", fontFamily:"'DM Mono',monospace", color:p.currentVersion!==p.latestVersion?"#ffab00":"#00e676" }}>{p.latestVersion}</td>
                        <td style={{ padding:"12px 14px" }}>
                          <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#7b8499" }}>{p.eolDate?new Date(p.eolDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—"}</div>
                          <EOLBadge eolDate={p.eolDate}/>
                        </td>
                        <td style={{ padding:"12px 14px" }}><span style={S.stag(st)}>{st}</span></td>
                        <td style={{ padding:"12px 14px" }}>{feed?<TierBadge tier={feed.tier}/>:<span style={{ fontSize:"10px", color:"#2a2d3a" }}>—</span>}</td>
                        <td style={{ padding:"12px 14px" }}>
                          <div style={{ display:"flex", gap:"5px" }}>
                            {p.patchNotesUrl&&<a href={p.patchNotesUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#448aff", textDecoration:"none", border:"1px solid #448aff33", borderRadius:"3px", padding:"2px 6px" }}>NOTES</a>}
                            <button onClick={()=>openEditProduct(p)} style={{ ...S.btnO, fontSize:"10px", padding:"2px 6px" }}>EDIT</button>
                            <button onClick={()=>setProducts(p2=>p2.filter(x=>x.id!==p.id))} style={{ ...S.btnO, fontSize:"10px", padding:"2px 6px", color:"#ff5252", borderColor:"#ff525233" }}>DEL</button>
                          </div>
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
                {filteredProducts.length===0&&<div style={{ padding:"40px", textAlign:"center", fontSize:"13px", fontFamily:"'DM Mono',monospace", color:"#4a5068" }}>No products match the current filters.</div>}
              </div>
            </div>
          )}

          {/* ═══ CHANGE WINDOWS ═══ */}
          {tab==="changes"&&(
            <div>
              <PH sub="Scheduling" title="Change Windows" action={<button style={S.btn()} onClick={()=>{setEditChange(null);setChangeForm(emptyChange);setChangeModal(true);}}>+ Schedule Change</button>}/>
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                {upcomingChanges.map(c=>{
                  const cs=CHANGE_STATUS_COLORS[c.status];
                  const linked=products.filter(p=>(c.productIds||[]).includes(p.id));
                  return <div key={c.id} style={{ ...S.card, borderLeft:`3px solid ${cs.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
                          <h3 style={{ margin:0, fontSize:"15px", fontWeight:600, color:"#e0e6f0" }}>{c.title}</h3>
                          <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:cs.text, border:`1px solid ${cs.border}`, borderRadius:"3px", padding:"2px 7px" }}>{c.status}</span>
                        </div>
                        <div style={{ display:"flex", gap:"20px", marginBottom:"10px", flexWrap:"wrap" }}>
                          <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#7b8499" }}><span style={{ color:"#4a5068" }}>DATE </span>{new Date(c.scheduledDate).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</div>
                          {c.maintenanceWindow&&<div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#7b8499" }}><span style={{ color:"#4a5068" }}>WINDOW </span>{c.maintenanceWindow}</div>}
                          {c.assignedTo&&<div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#7b8499" }}><span style={{ color:"#4a5068" }}>ASSIGNED </span>{c.assignedTo}</div>}
                        </div>
                        {linked.length>0&&<div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"8px" }}>{linked.map(p=><span key={p.id} style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#448aff", background:"#0d1f3c", border:"1px solid #448aff33", borderRadius:"3px", padding:"2px 7px" }}>{p.name}</span>)}</div>}
                        {c.notes&&<div style={{ fontSize:"12px", color:"#7b8499" }}>{c.notes}</div>}
                      </div>
                      <div style={{ display:"flex", gap:"6px", marginLeft:"16px" }}>
                        <button onClick={()=>openEditChange(c)} style={S.btnO}>EDIT</button>
                        <button onClick={()=>setChanges(c2=>c2.filter(x=>x.id!==c.id))} style={{ ...S.btnO, color:"#ff5252", borderColor:"#ff525233" }}>DEL</button>
                      </div>
                    </div>
                  </div>;
                })}
                {changes.length===0&&<div style={{ ...S.card, textAlign:"center", padding:"48px", fontSize:"13px", fontFamily:"'DM Mono',monospace", color:"#4a5068" }}>No change windows scheduled.</div>}
              </div>
            </div>
          )}

          {/* ═══ FEED MONITOR ═══ */}
          {tab==="feeds"&&(
            <div>
              <PH sub="Auto-Ingestion" title="Feed Monitor" action={
                <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                  {lastRefresh&&<span style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#4a5068" }}>Last sync {new Date(lastRefresh).toLocaleString()}</span>}
                  <button style={S.btn(anyLoading?"#2a2d3a":undefined)} onClick={refreshAll} disabled={anyLoading}>{anyLoading?"Syncing…":"↻ Sync All Feeds"}</button>
                </div>
              }/>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"12px", marginBottom:"28px" }}>
                {FEED_CATALOG.map(feed=>{
                  const st=feedStatus[feed.id]||(feed.tier==="manual"?"manual":"idle");
                  const statusMap={ loading:["#ffab00","Syncing…"], ok:["#00e676","Synced"], error:["#ff5252","Error"], idle:["#4a5068","Not synced"], manual:["#9e9e9e","Manual only"] };
                  const [color,label]=statusMap[st]||statusMap.idle;
                  const fi=feedItems.filter(i=>i.feedId===feed.id);
                  return <div key={feed.id} style={{ ...S.card, borderLeft:`3px solid ${color}33` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
                      <div>
                        <div style={{ fontSize:"13px", color:"#e0e6f0", fontWeight:500 }}>{feed.label}</div>
                        <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#4a5068", marginTop:"2px" }}>{feed.vendor} · {feed.category}</div>
                      </div>
                      <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                        <TierBadge tier={feed.tier}/>
                        <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color, border:`1px solid ${color}33`, borderRadius:"3px", padding:"1px 6px" }}>{label}</span>
                      </div>
                    </div>
                    {feed.tier==="manual"?(
                      <div style={{ fontSize:"11px", color:"#4a5068", fontFamily:"'DM Mono',monospace" }}>No public feed. Check manually:<br/><a href={feed.patchUrl} target="_blank" rel="noopener noreferrer" style={{ color:"#448aff" }}>{feed.patchUrl}</a></div>
                    ):(
                      <>
                        {fi.slice(0,3).map(item=><div key={item.id} style={{ fontSize:"11px", color:"#7b8499", padding:"4px 0", borderTop:"1px solid #1a1d2a", display:"flex", justifyContent:"space-between", gap:"8px" }}>
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, fontFamily:"'DM Mono',monospace" }}>{item.title}</span>
                          {item.link&&<a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color:"#448aff", fontSize:"10px", flexShrink:0 }}>→</a>}
                        </div>)}
                        <button onClick={()=>feed.tier==="eol-api"?fetchEolApi(feed):fetchRss(feed)} style={{ ...S.btnO, marginTop:"10px", fontSize:"10px", padding:"4px 10px" }}>
                          {feedStatus[feed.id]==="loading"?"Syncing…":"↻ Refresh"}
                        </button>
                      </>
                    )}
                  </div>;
                })}
              </div>

              {recentFeedItems.length>0&&(
                <div style={S.card}>
                  <div style={{ ...S.lbl, marginBottom:"16px" }}>Full Feed Log ({recentFeedItems.length} items)</div>
                  {recentFeedItems.map(item=>{
                    const feed=FEED_CATALOG.find(f=>f.id===item.feedId);
                    return <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid #1a1d2a", gap:"12px" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"12px", color:"#c8d0e0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
                        <div style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#4a5068", marginTop:"2px" }}>
                          {item.vendor}{item.cycle&&<> · cycle {item.cycle}</>}{item.eol&&item.eol!=="—"&&<> · EOL {item.eol}</>}{item.date&&<> · {new Date(item.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                        {feed&&<TierBadge tier={feed.tier}/>}
                        {item.link&&<a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#448aff", textDecoration:"none", border:"1px solid #448aff33", borderRadius:"3px", padding:"1px 7px" }}>NOTES</a>}
                      </div>
                    </div>;
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail / Quick-Edit Modal */}
        <DetailModal
          product={detailProduct}
          onClose={()=>setDetailProduct(null)}
          onSave={updated=>{ setProducts(p=>p.map(x=>x.id===updated.id?updated:x)); setDetailProduct(updated); }}
        />

        {/* Add/Edit Product Modal */}
        <Modal open={productModal} onClose={()=>{setProductModal(false);setEditProduct(null);}} title={editProduct?"Edit Product":"Add Product"}>
          <F label="Product Name" value={productForm.name} onChange={v=>setProductForm(f=>({...f,name:v}))} required/>
          <F label="Vendor" value={productForm.vendor} onChange={v=>setProductForm(f=>({...f,vendor:v}))}/>
          <F label="Model" value={productForm.model} onChange={v=>setProductForm(f=>({...f,model:v}))}/>
          <Sel label="Category" value={productForm.category} onChange={v=>setProductForm(f=>({...f,category:v}))} options={CATEGORIES}/>
          <div style={{ marginBottom:"13px" }}>
            <label style={baseLbl}>Auto-Ingest Feed</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
              <button onClick={()=>setProductForm(f=>({...f,feedId:""}))} style={{ ...S.btnO, fontSize:"11px", padding:"4px 10px", color:productForm.feedId===""?"#448aff":"#4a5068", borderColor:productForm.feedId===""?"#448aff":"#2a2d3a" }}>None (manual)</button>
              {FEED_CATALOG.map(f=><button key={f.id} onClick={()=>setProductForm(pf=>({...pf,feedId:f.id,vendor:pf.vendor||f.vendor,category:pf.category||f.category}))}
                style={{ ...S.btnO, fontSize:"11px", padding:"4px 10px", color:productForm.feedId===f.id?"#448aff":"#4a5068", borderColor:productForm.feedId===f.id?"#448aff":"#2a2d3a", display:"flex", alignItems:"center", gap:"5px" }}>
                {f.label} <TierBadge tier={f.tier}/>
              </button>)}
            </div>
          </div>
          <F label="Tracked Release Cycle (e.g. 8.0, 17.12)" value={productForm.trackedCycle} onChange={v=>setProductForm(f=>({...f,trackedCycle:v}))} placeholder="e.g. 8.0"/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <F label="Current Version" value={productForm.currentVersion} onChange={v=>setProductForm(f=>({...f,currentVersion:v}))} required/>
            <F label="Latest Version" value={productForm.latestVersion} onChange={v=>setProductForm(f=>({...f,latestVersion:v}))}/>
          </div>
          <F label="EOL / EOS Date" value={productForm.eolDate} onChange={v=>setProductForm(f=>({...f,eolDate:v}))} type="date"/>
          <F label="Patch Notes URL" value={productForm.patchNotesUrl} onChange={v=>setProductForm(f=>({...f,patchNotesUrl:v}))} placeholder="https://…"/>
          <TA label="Notes" value={productForm.notes} onChange={v=>setProductForm(f=>({...f,notes:v}))}/>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:"10px", marginTop:"8px" }}>
            <button style={S.btnO} onClick={()=>{setProductModal(false);setEditProduct(null);}}>Cancel</button>
            <button style={S.btn()} onClick={saveProduct}>{editProduct?"Save Changes":"Add Product"}</button>
          </div>
        </Modal>

        {/* Add/Edit Change Modal */}
        <Modal open={changeModal} onClose={()=>{setChangeModal(false);setEditChange(null);}} title={editChange?"Edit Change Window":"Schedule Change Window"}>
          <F label="Change Title" value={changeForm.title} onChange={v=>setChangeForm(f=>({...f,title:v}))} required/>
          <div style={{ marginBottom:"13px" }}>
            <label style={baseLbl}>Linked Products</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
              {products.map(p=>{ const sel=(changeForm.productIds||[]).includes(p.id); return <button key={p.id} onClick={()=>setChangeForm(f=>({...f,productIds:sel?f.productIds.filter(id=>id!==p.id):[...(f.productIds||[]),p.id]}))} style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", padding:"4px 10px", borderRadius:"4px", border:`1px solid ${sel?"#448aff":"#2a2d3a"}`, background:sel?"#0d1f3c":"transparent", color:sel?"#448aff":"#4a5068", cursor:"pointer" }}>{p.name}</button>; })}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <F label="Scheduled Date" value={changeForm.scheduledDate} onChange={v=>setChangeForm(f=>({...f,scheduledDate:v}))} type="date" required/>
            <F label="Maintenance Window" value={changeForm.maintenanceWindow} onChange={v=>setChangeForm(f=>({...f,maintenanceWindow:v}))} placeholder="22:00–02:00"/>
          </div>
          <Sel label="Status" value={changeForm.status} onChange={v=>setChangeForm(f=>({...f,status:v}))} options={Object.keys(CHANGE_STATUS_COLORS)}/>
          <F label="Assigned To" value={changeForm.assignedTo} onChange={v=>setChangeForm(f=>({...f,assignedTo:v}))}/>
          <TA label="Notes" value={changeForm.notes} onChange={v=>setChangeForm(f=>({...f,notes:v}))} placeholder="Steps, dependencies, rollback plan…"/>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:"10px", marginTop:"8px" }}>
            <button style={S.btnO} onClick={()=>{setChangeModal(false);setEditChange(null);}}>Cancel</button>
            <button style={S.btn()} onClick={saveChange}>{editChange?"Save Changes":"Schedule"}</button>
          </div>
        </Modal>

        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>
    </>
  );
}
