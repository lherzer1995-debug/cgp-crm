"use client";

import { useState, useEffect } from "react";
import {
  Sparkles, Users, Activity, Euro, Zap, ChevronRight,
  LayoutDashboard, Menu, X, Command, Map, Plus, Search, MapPin, Building2,
  Target, RefreshCw, ArrowUpRight, ArrowDownRight, BarChart3, Calendar,
  AlertCircle, CheckCircle2, Clock3, Phone, Mail, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserButton, useUser } from "@clerk/nextjs";

const API = "/api";

async function fetchJSON(url: string, opts?: RequestInit) {
  const r = await fetch(`${API}${url}`, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

type View = "dashboard" | "customers" | "detail" | "map";
interface Customer { id: string; name: string; contactPerson?: string; email?: string; phone?: string; city?: string; industry?: string; notes?: string; contractEnd?: string; riskScore?: number; latitude?: number; longitude?: number; }
interface Activity { id: string; customerId: string; type: string; title: string; done: boolean; createdAt: string; }
interface Commission { id: string; customerId: string; amount: number; date: string; type: string; }

const rings = ["from-accent-400 to-accent-600","from-violet-400 to-fuchsia-500","from-teal-400 to-emerald-500","from-amber-400 to-orange-500","from-rose-400 to-red-500","from-cyan-400 to-blue-500"];
const init = (n: string) => n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();

export default function Home() {
  const { user } = useUser();
  const [view, setView] = useState<View>("dashboard");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ totalCustomers: 0, openActivities: 0, totalCommissions: 0 });
  const [briefing, setBriefing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [filterTag, setFilterTag] = useState("all");

  useEffect(() => {
    fetchJSON("/ai/stats").then(setStats).catch(() => {});
    fetchJSON("/customers").then(setCustomers).catch(() => {});
    fetchJSON("/ai/briefing").then((d:any) => setBriefing(d.briefing)).catch(() => {});
  }, []);

  const nav = (v: View, id?: string) => { setView(v); if (id) setSelectedId(id); setSearch(""); setMobileMenu(false); };
  const c = customers.find(x => x.id === selectedId);
  const tags = ["all", ...new Set(customers.flatMap(c => c.industry ? [c.industry] : []))];
  const filtered = customers.filter(c => filterTag === "all" || c.industry === filterTag)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center"><Command className="w-4 h-4"/></div>
            <span className="font-semibold text-sm">CGP CRM</span>
          </div>
          <button onClick={()=>setMobileMenu(!mobileMenu)} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">{mobileMenu?<X className="w-4 h-4"/>:<Menu className="w-4 h-4"/>}</button>
        </div>
        <AnimatePresence>{mobileMenu&&(
          <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="px-4 pb-3 overflow-hidden">
            <NavBtn active={view==="dashboard"} onClick={()=>nav("dashboard")} icon={<LayoutDashboard className="w-4 h-4"/>} label="Dashboard"/>
            <NavBtn active={view==="customers"} onClick={()=>nav("customers")} icon={<Users className="w-4 h-4"/>} label="Customers" badge={customers.length}/>
            <NavBtn active={view==="map"} onClick={()=>nav("map")} icon={<Map className="w-4 h-4"/>} label="Route Map"/>
          </motion.div>
        )}</AnimatePresence>
      </div>

      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] bg-[#0a0a0f]/70 backdrop-blur-2xl border-r border-white/[0.04] flex-col z-50">
        <div className="px-5 py-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center"><Zap className="w-4 h-4"/></div>
            <div><h1 className="text-sm font-semibold">CGP CRM</h1><p className="text-[10px] text-muted">Enterprise Suite</p></div>
          </div>
          <nav className="space-y-0.5">
            <NavBtn active={view==="dashboard"} onClick={()=>nav("dashboard")} icon={<LayoutDashboard className="w-4 h-4"/>} label="Dashboard"/>
            <NavBtn active={view==="customers"} onClick={()=>nav("customers")} icon={<Users className="w-4 h-4"/>} label="Customers" badge={customers.length}/>
            <NavBtn active={view==="map"} onClick={()=>nav("map")} icon={<Map className="w-4 h-4"/>} label="Route Map"/>
          </nav>
        </div>
        <div className="mt-auto px-5 py-4 border-t border-white/[0.04] flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.fullName || "User"}</p>
            <p className="text-[10px] text-muted">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </aside>

      <main className="lg:pl-[240px] pt-14 lg:pt-0">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 py-6 lg:py-10">
          <AnimatePresence mode="wait">
            {view==="dashboard"&&<Dashboard/>}
            {view==="customers"&&<Customers/>}
            {view==="map"&&<RouteMap/>}
            {view==="detail"&&c&&<Detail customer={c} onBack={()=>nav("customers")}/>}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );

  function Dashboard(){return(
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="space-y-8">
      <header><p className="text-[11px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Field Sales Intelligence</p><h1 className="text-display">Good morning{user?.firstName ? `, ${user.firstName}` : ""}</h1></header>
      {error&&<ErrorBanner msg={error} onClose={()=>setError(null)}/>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users className="w-5 h-5"/>} label="Total Customers" value={String(stats.totalCustomers)} ring="accent"/>
        <StatCard icon={<Activity className="w-5 h-5"/>} label="Open Tasks" value={String(stats.openActivities)} ring="warning"/>
        <StatCard icon={<Euro className="w-5 h-5"/>} label="Commissions" value={`${stats.totalCommissions.toLocaleString("de-DE")} €`} ring="success"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1}} className="lg:col-span-2 bento-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Sparkles className="w-5 h-5"/></div><div><h2 className="font-semibold text-sm">AI Briefing</h2><p className="text-[11px] text-muted">DeepSeek Analysis</p></div></div>
            <button onClick={()=>fetchJSON("/ai/briefing").then((d:any)=>setBriefing(d.briefing)).catch(()=>{})} className="p-2 rounded-lg hover:bg-white/[0.04] text-muted"><RefreshCw className="w-4 h-4"/></button>
          </div>
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{briefing||"Loading..."}</p>
        </motion.div>
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.15}} className="bento-card">
          <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><Target className="w-5 h-5"/></div><div><h2 className="font-semibold text-sm">Quick Stats</h2></div></div>
          <div className="space-y-3">{[
            {icon:BarChart3,label:"Avg Risk",value:`${customers.length?Math.round(customers.reduce((s,c)=>s+(c.riskScore||0),0)/customers.length):0}%`},
            {icon:Euro,label:"Avg Commission",value:`${stats.totalCustomers?Math.round(stats.totalCommissions/stats.totalCustomers):0} €`},
            {icon:Calendar,label:"With Contract",value:String(customers.filter(c=>c.contractEnd).length)},
          ].map((q,i)=>(<div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"><div className="flex items-center gap-2"><q.icon className="w-3.5 h-3.5 text-muted"/><span className="text-xs text-muted">{q.label}</span></div><span className="text-xs font-semibold">{q.value}</span></div>))}</div>
        </motion.div>
      </div>
      <div><h2 className="text-lg font-semibold mb-4">Priority Customers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.filter(c=>(c.riskScore||0)>=25).sort((a,b)=>(b.riskScore||0)-(a.riskScore||0)).slice(0,6).map((c,i)=><CustomerCard key={c.id} customer={c} index={i} onClick={()=>nav("detail",c.id)}/>)}
        </div>
      </div>
    </motion.div>
  );}

  function Customers(){return(
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="text-[11px] font-medium text-muted uppercase tracking-[0.2em] mb-1">Database</p><h1 className="text-display">Customers</h1><p className="text-sm text-muted mt-1">{filtered.length} of {customers.length}</p></div><button onClick={()=>setShowAdd(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4"/>Add Customer</button></header>
      <div className="flex gap-3"><div className="flex-1 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="input-premium pl-11"/></div></div>
      <div className="flex gap-2 overflow-x-auto pb-2">{tags.map(t=><button key={t} onClick={()=>setFilterTag(t)} className={`px-3.5 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all ${filterTag===t?"bg-accent-600/15 text-accent-400 border border-accent-500/20":"glass-surface text-muted hover:text-white"}`}>{t==="all"?"All":t}</button>)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((c,i)=><CustomerCard key={c.id} customer={c} index={i} onClick={()=>nav("detail",c.id)}/>)}</div>
      <AnimatePresence>{showAdd&&<AddModal onClose={()=>setShowAdd(false)} onDone={()=>{setShowAdd(false);fetchJSON("/customers").then(setCustomers).catch(()=>{});}}/>}</AnimatePresence>
    </motion.div>
  );}

  function AddModal({onClose,onDone}:{onClose:()=>void;onDone:()=>void}){
    const [f,setF]=useState({name:"",contact:"",email:"",phone:"",city:"",industry:""});
    const s=async(e:React.FormEvent)=>{e.preventDefault();await fetchJSON("/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});onDone();};
    return(<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}><div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/><motion.form initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.95}} onSubmit={s} onClick={e=>e.stopPropagation()} className="relative glass-raised p-8 w-full max-w-md"><div className="flex items-center justify-between mb-6"><h2 className="text-base font-semibold">New Customer</h2><button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center"><X className="w-4 h-4 text-muted"/></button></div><div className="space-y-4"><input required placeholder="Company *" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} className="input-premium"/><div className="grid grid-cols-2 gap-4"><input placeholder="Contact" value={f.contact} onChange={e=>setF(p=>({...p,contact:e.target.value}))} className="input-premium"/><input placeholder="Industry" value={f.industry} onChange={e=>setF(p=>({...p,industry:e.target.value}))} className="input-premium"/></div><div className="grid grid-cols-2 gap-4"><input type="email" placeholder="Email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} className="input-premium"/><input placeholder="Phone" value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} className="input-premium"/></div><input placeholder="City" value={f.city} onChange={e=>setF(p=>({...p,city:e.target.value}))} className="input-premium"/></div><button type="submit" className="btn-primary w-full mt-6">Create</button></motion.form></motion.div>);
  }

  function RouteMap(){return(<motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="space-y-6"><header><p className="text-[11px] font-medium text-muted uppercase tracking-[0.2em] mb-1">Route Planning</p><h1 className="text-display">Customer Map</h1></header><div className="bento-card p-0 overflow-hidden" style={{height:"60vh"}}><div className="w-full h-full bg-[#18181f] flex items-center justify-center"><div className="text-center"><Map className="w-16 h-16 text-muted/20 mx-auto mb-4"/><p className="text-muted">Map integration ready</p><p className="text-[10px] text-muted/50 mt-2">Set GOOGLE_MAPS_API_KEY</p></div></div></div></motion.div>);}
}

function NavBtn({active,onClick,icon,label,badge}:{active:boolean;onClick:()=>void;icon:React.ReactNode;label:string;badge?:number}){return(<button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${active?"bg-accent-600/10 text-accent-400":"text-muted hover:text-white hover:bg-white/[0.03]"}`}>{icon}<span className="flex-1 text-left">{label}</span>{badge!=null&&<span className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded-full">{badge}</span>}</button>);}
function StatCard({icon,label,value,ring}:{icon:React.ReactNode;label:string;value:string;ring:"accent"|"warning"|"success"}){const b={accent:"border-l-accent-500/40",warning:"border-l-warning/40",success:"border-l-success/40"};return(<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={`glass-raised p-6 border-l-2 ${b[ring]}`}><div className="flex items-start justify-between mb-4">{icon}<div className="w-1.5 h-1.5 rounded-full bg-white/10"/></div><p className="text-3xl font-bold">{value}</p><p className="text-[11px] text-muted font-medium mt-3">{label}</p></motion.div>);}
function CustomerCard({customer,index,onClick}:{customer:Customer;index:number;onClick:()=>void}){const r=rings[index%rings.length];const rc=(customer.riskScore||0)>=50?"text-danger bg-red-500/10":(customer.riskScore||0)>=25?"text-warning bg-amber-500/10":"text-success bg-teal-500/10";return(<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:index*.04}} onClick={onClick} className="glass-raised p-5 cursor-pointer group transition-all hover:border-white/[0.12]"><div className="flex items-start gap-4"><div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${r} flex items-center justify-center text-sm font-bold flex-shrink-0`}>{init(customer.name)}</div><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-sm truncate">{customer.name}</h3>{(customer.riskScore||0)>0&&<span className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold ${rc}`}>{customer.riskScore}%</span>}</div><p className="text-[11px] text-muted mt-0.5">{customer.contactPerson||"—"}</p><div className="flex flex-wrap gap-1.5 mt-3">{customer.city&&<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] text-[10px]"><MapPin className="w-3 h-3"/>{customer.city}</span>}{customer.industry&&<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] text-[10px]"><Building2 className="w-3 h-3"/>{customer.industry}</span>}</div></div></div><div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px] text-muted/50">View details</span><ChevronRight className="w-4 h-4 text-accent-400"/></div></motion.div>);}
function ErrorBanner({msg,onClose}:{msg:string;onClose:()=>void}){return(<motion.div initial={{opacity:0}} animate={{opacity:1}} className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-danger"><AlertCircle className="w-4 h-4"/><span className="flex-1">{msg}</span><button onClick={onClose}>&times;</button></motion.div>);}

function Detail({customer,onBack}:{customer:Customer;onBack:()=>void}){
  const [acts,setActs]=useState<Activity[]>([]);const [comms,setComms]=useState<Commission[]>([]);const [summary,setSummary]=useState("");const [tab,setTab]=useState<"overview"|"activities"|"commissions">("overview");const [newAct,setNewAct]=useState("");
  useEffect(()=>{Promise.all([fetchJSON(`/customers/${customer.id}/activities`),fetchJSON(`/customers/${customer.id}/commissions`),fetchJSON(`/customers/${customer.id}/summary`)]).then(([a,c,s])=>{setActs(a);setComms(c);setSummary(s.summary||"");}).catch(()=>{});},[customer.id]);
  const addAct=async()=>{if(!newAct.trim())return;await fetchJSON(`/customers/${customer.id}/activities`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:newAct})});setNewAct("");setActs(await fetchJSON(`/customers/${customer.id}/activities`));};
  const ring=rings[parseInt(customer.id)%rings.length];const total=comms.reduce((s,c)=>s+c.amount,0);
  return(<motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="space-y-6">
    <div className="flex items-center gap-4"><button onClick={onBack} className="w-10 h-10 rounded-xl glass-surface flex items-center justify-center"><ChevronRight className="w-5 h-5 rotate-180 text-muted"/></button><div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ring} flex items-center justify-center text-lg font-bold flex-shrink-0`}>{init(customer.name)}</div><div className="min-w-0"><h1 className="text-xl font-bold truncate">{customer.name}</h1><p className="text-sm text-muted">{customer.contactPerson||"No contact"}</p></div></div>
    {summary&&<div className="bento-card"><div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Sparkles className="w-4 h-4"/></div><h2 className="text-sm font-semibold">AI Summary</h2></div><p className="text-sm text-white/80 leading-relaxed">{summary}</p></div>}
    <div className="flex gap-1 p-1 glass-surface w-fit">{(["overview","activities","commissions"]as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all capitalize ${tab===t?"bg-accent-600/15 text-accent-400":"text-muted hover:text-white"}`}>{t}</button>)}</div>
    {tab==="overview"&&<div className="glass-raised p-6"><h3 className="text-sm font-semibold mb-4">Contact Details</h3><div className="space-y-2">{[{icon:Building2,label:"Industry",value:customer.industry},{icon:MapPin,label:"City",value:customer.city},{icon:Mail,label:"Email",value:customer.email},{icon:Phone,label:"Phone",value:customer.phone}].map((f,i)=><div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"><div className="flex items-center gap-2"><f.icon className="w-4 h-4 text-muted"/><span className="text-sm text-muted">{f.label}</span></div><span className="text-sm font-medium">{f.value||"—"}</span></div>)}</div></div>}
    {tab==="activities"&&<div className="space-y-3"><form onSubmit={e=>{e.preventDefault();addAct();}} className="glass-raised p-4 flex gap-3"><input value={newAct} onChange={e=>setNewAct(e.target.value)} placeholder="Add activity..." className="flex-1 input-premium"/><button className="btn-primary">Add</button></form><div className="glass-raised divide-y divide-white/[0.04] overflow-hidden">{acts.map(a=><div key={a.id} className="px-5 py-4 flex items-start gap-4"><div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${a.done?"bg-teal-500/10":"bg-accent-600/10"}`}>{a.done?<CheckCircle2 className="w-4 h-4 text-success"/>:<Clock3 className="w-4 h-4 text-accent-400"/>}</div><div className="flex-1 min-w-0"><p className="text-sm text-white/90">{a.title||a.type}</p><span className="text-[10px] text-muted">{new Date(a.createdAt).toLocaleDateString("de-DE")}</span></div></div>)}</div></div>}
    {tab==="commissions"&&<div className="glass-raised divide-y divide-white/[0.04] overflow-hidden"><div className="px-5 py-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center"><Euro className="w-4 h-4 text-success"/></div><div><p className="text-sm font-semibold text-success">{total.toLocaleString("de-DE")} € total</p></div></div></div>{comms.map(c=><div key={c.id} className="px-5 py-4 flex items-center justify-between"><span className="text-sm font-medium">{c.amount.toLocaleString("de-DE")} €</span><span className="text-[10px] text-muted">{new Date(c.date).toLocaleDateString("de-DE")} — {c.type}</span></div>)}</div>}
  </motion.div>);
}
