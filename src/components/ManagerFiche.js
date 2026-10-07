import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { T } from "../theme";
import { SerieTag, getPjMeta, CountryFlag, Avatar, GAMME_COLORS, ETAT_META, PresenceChip, PRESENCE_META, presenceKind, today } from "../pjMeta";
import { fmt, diffDays } from "../parsers";
import { Badge, NavIcon } from "./SharedUI";
import { CARD, EmptyNote } from "./ManagerParts";
import { FEUX, FeuPicker, feuxOf, patchFeu, worstFeu, feuColor, feuLabel, NOTE_MAX, CODIR_MAX } from "./Feux";

// ── Fiche projet (Manager) ─────────────────────────────────────────────────────────────────────
// Demandé : « la fiche projet manque cruellement de style, fais-nous une fiche plus dense en
// information ». Tout ce qu'on sait d'un PJ tient maintenant sur un seul écran : bandeau d'identité,
// tuiles chiffrées, frise des 4 jalons (initial / révisé / écart), présence aux tests, retards par
// cause et fil de commentaires. Aucune donnée nouvelle : tout vient des lignes déjà chargées.
const MS=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin de prod"],["depart","Départ"]];
const dOf=v=>v?new Date(v):null;
const fmtLong=d=>d?d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}):"—";
const driftColor=d=>d==null?T.ink300:d>0?T.red500:d<0?T.emerald600:T.ink500;
const signed=d=>d==null?"—":(d>0?"+":"")+d+"j";

// Mise en page éditoriale (même langage visuel que le rapport CODIR) : une grande carte unique, des blocs
// séparés par un filet fin, des chiffres généreux, un seul accent (laiton). Les textes saisis ici
// (message clé, commentaires de feux / d'indicateurs) sont repris tels quels dans le rapport CODIR.
const BRASS="#B08D57";
const Cap=({children,style})=><div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:T.ink500,...style}}>{children}</div>;
function Section({title,right,children,style}){
  return(<div style={{minWidth:0,...style}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:9}}>
      <span style={{fontSize:10,fontWeight:800,letterSpacing:".18em",textTransform:"uppercase",color:T.ink900,whiteSpace:"nowrap"}}>{title}</span>
      <span style={{flex:1,height:1,background:T.line}}/>
      {right}
    </div>
    {children}
  </div>);
}
const Big=({children,color})=><div style={{fontFamily:T.font,fontSize:24,fontWeight:500,letterSpacing:"-.02em",lineHeight:1,color:color||T.ink900,whiteSpace:"nowrap"}}>{children}</div>;

function ProgressBar({value,height=8}){
  const c=value>=100?T.emerald500:value>=50?T.teal500:T.amber500;
  return(<div style={{background:T.surfaceAlt,borderRadius:20,height,overflow:"hidden",width:"100%"}}><div style={{width:Math.max(0,Math.min(100,value))+"%",height:"100%",background:c,borderRadius:20,transition:"width .25s ease"}}/></div>);
}
function Donut({v,size=50}){
  const r=(size-8)/2,c=2*Math.PI*r,m=size/2,col=v>=100?T.emerald500:T.teal500;
  return(<svg width={size} height={size} viewBox={"0 0 "+size+" "+size} style={{flexShrink:0}}>
    <circle cx={m} cy={m} r={r} fill="none" stroke={T.surfaceAlt} strokeWidth="6"/>
    {v>0&&<circle cx={m} cy={m} r={r} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeDasharray={(c*Math.min(100,v)/100)+" "+c} transform={"rotate(-90 "+m+" "+m+")"}/>}
    <text x={m} y={m} textAnchor="middle" dominantBaseline="central" fontFamily={T.font} fontSize={size*.27} fontWeight="600" fill={T.ink900}>{v}%</text>
  </svg>);
}

// Zone de commentaire « pour le CODIR » : enregistrée à la sortie du champ (ou Ctrl/Cmd+Entrée), Échap annule.
// Vide = discrète (pointillés) ; remplie = filet laiton. Le texte vide efface la note.
function NoteField({value,onSave,placeholder,max=NOTE_MAX,big}){
  const [v,setV]=useState(value||"");const [foc,setFoc]=useState(false);const [st,setSt]=useState("");
  useEffect(()=>{if(!foc)setV(value||"");},[value,foc]);
  const commit=async()=>{const t=v.trim();if(t===(value||"").trim()){setV(value||"");return;}setSt("…");const ok=await onSave(t);setSt(ok===false?"échec":"enregistré ✓");setTimeout(()=>setSt(""),1600);};
  const filled=!!(v||value);
  const ref=useRef(null);
  // Hauteur automatique : le champ s'agrandit avec le texte (rien de tronqué à l'écran).
  useLayoutEffect(()=>{const el=ref.current;if(!el)return;el.style.height="auto";el.style.height=(el.scrollHeight+2)+"px";},[v,foc]);
  return(<div style={{marginTop:7}}>
    <textarea ref={ref} value={v} maxLength={max} rows={1} placeholder={placeholder||"＋ Commentaire pour le CODIR"}
      onFocus={()=>setFoc(true)} onBlur={()=>{setFoc(false);commit();}} onChange={e=>setV(e.target.value)}
      onKeyDown={e=>{if(e.key==="Escape"){setV(value||"");e.currentTarget.blur();}else if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))e.currentTarget.blur();}}
      style={{width:"100%",boxSizing:"border-box",resize:"none",fontFamily:T.font,fontSize:big?13:11.5,lineHeight:1.4,color:T.ink700,background:foc?T.card:"transparent",
        border:"1px "+(filled||foc?"solid":"dashed")+" "+(foc?T.teal500:filled?"transparent":T.line),borderLeft:filled&&!foc?"2px solid "+BRASS:undefined,borderRadius:8,padding:big?"7px 11px":"3px 8px",outline:"none",display:"block"}}/>
    {(foc||st)&&<div style={{fontSize:10.5,color:T.ink300,textAlign:"right",marginTop:2}}>{st||v.length+"/"+max+" · Échap pour annuler"}</div>}
  </div>);
}

// Frise des 4 jalons : un repère par étape (✓ passé, anneau laiton = en cours), date révisée en grand,
// date initiale barrée si elle a bougé, et l'écart en pastille (rouge = glissement).
function Timeline({r,ini,kind}){
  return(<div style={{position:"relative",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))"}}>
    <div style={{position:"absolute",left:"12.5%",right:"12.5%",top:8,height:2,background:T.line}}/>
    {MS.map(([k,label],i)=>{
      const rv=dOf(r[k]);const iv=ini?dOf(ini[k]):null;
      const delta=rv&&iv?diffDays(iv,rv):null;
      const past=rv&&rv<=today;
      const next=!past&&rv&&(i===0||(dOf(r[MS[i-1][0]])||0)<=today);
      const mk=past?{background:T.navy700,border:"2px solid "+T.navy700}:next?{background:T.card,border:"3px solid "+BRASS,boxShadow:"0 0 0 4px "+BRASS+"33"}:{background:T.card,border:"2px solid "+(rv?T.ink300:T.line)};
      return(<div key={k} style={{position:"relative",textAlign:"center",padding:"0 6px",minWidth:0}}>
        <div style={{width:18,height:18,borderRadius:"50%",boxSizing:"border-box",margin:"0 auto 7px",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:800,...mk}}>{past?"✓":""}</div>
        <Cap>{label}</Cap>
        <div style={{fontSize:14.5,fontWeight:600,color:T.ink900,marginTop:3,whiteSpace:"nowrap",letterSpacing:"-.01em"}}>{rv?fmtLong(rv):"—"}</div>
        {k==="tests"&&r.testsFin&&<div style={{fontSize:11,color:T.ink300,marginTop:1}}>→ {fmtLong(dOf(r.testsFin))}</div>}
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:4,minHeight:18}}>
          {iv&&delta!==0&&<span style={{fontSize:11,color:T.ink300,textDecoration:"line-through"}}>{fmt(iv)}</span>}
          {delta!=null&&delta!==0&&<span style={{fontSize:11,fontWeight:800,color:driftColor(delta),background:delta>0?T.red100:T.emerald100,borderRadius:99,padding:"1px 9px"}}>{signed(delta)}</span>}
          {delta===0&&<span style={{fontSize:11,fontWeight:700,color:T.emerald600}}>conforme</span>}
        </div>
        {k==="tests"&&kind&&<div style={{marginTop:4}}><PresenceChip kind={kind} date={r.clientPresence.date} compact/></div>}
      </div>);
    })}
  </div>);
}


// ── Écriture dans la fiche (accès Manager) : ajouter / supprimer commentaires et causes de retard ──
// Mêmes fonctions et mêmes données que la fiche du tableau et l'onglet Retards, rien de nouveau côté stockage.
const FIELD={padding:"5px 9px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontSize:12.5,fontFamily:T.font,minWidth:0};
const BTN=(on)=>({border:"none",borderRadius:8,padding:"6px 13px",fontSize:12.5,fontWeight:700,fontFamily:T.font,cursor:on?"pointer":"default",background:on?"linear-gradient(135deg,"+T.teal500+","+T.navy700+")":T.ink100,color:"#fff",flexShrink:0});
function CommentComposer({onAdd}){
  const [text,setText]=useState("");const [priv,setPriv]=useState(false);const [busy,setBusy]=useState(false);
  const ok=text.trim().length>0&&!busy;
  const submit=async()=>{if(!ok)return;setBusy(true);const done=await onAdd(text,priv);setBusy(false);if(done)setText("");};
  return(<div style={{marginBottom:8,background:T.surface,borderRadius:10,padding:8}}>
    <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))submit();}} rows={2} placeholder="Écrire un commentaire…" style={{...FIELD,width:"100%",resize:"vertical",boxSizing:"border-box"}}/>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:6,flexWrap:"wrap"}}>
      <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:priv?T.amber600:T.ink500,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={priv} onChange={e=>setPriv(e.target.checked)}/>Privé (visible des seuls accès Manager)</label>
      <button onClick={submit} disabled={!ok} style={BTN(ok)}>{busy?"Envoi…":"Publier"}</button>
    </div>
  </div>);
}
function DelayComposer({types,onAdd}){
  const [type,setType]=useState((types&&types[0])||"");const [days,setDays]=useState("");const [note,setNote]=useState("");const [busy,setBusy]=useState(false);
  const n=Number(days);const ok=!!type&&days!==""&&!isNaN(n)&&n!==0&&!busy;
  const submit=async()=>{if(!ok)return;setBusy(true);const done=await onAdd(type,n,note);setBusy(false);if(done){setDays("");setNote("");}};
  return(<div style={{marginBottom:8,background:T.surface,borderRadius:10,padding:8,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
    <select value={type} onChange={e=>setType(e.target.value)} style={{...FIELD,flex:"1 1 150px"}}>{(types||[]).map(t=><option key={t} value={t}>{t}</option>)}</select>
    <input type="number" value={days} onChange={e=>setDays(e.target.value)} placeholder="jours" style={{...FIELD,width:70}}/>
    <input type="text" value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submit();}} placeholder="Précision (facultatif)" style={{...FIELD,flex:"2 1 160px"}}/>
    <button onClick={submit} disabled={!ok} style={BTN(ok)}>{busy?"…":"Ajouter"}</button>
  </div>);
}
const TrashBtn=({onClick,title})=><button onClick={onClick} title={title} style={{border:"none",background:"transparent",color:T.ink300,cursor:"pointer",fontSize:15,lineHeight:1,padding:"0 3px"}} onMouseEnter={e=>e.currentTarget.style.color=T.red500} onMouseLeave={e=>e.currentTarget.style.color=T.ink300}>×</button>;

// ── Statut global : 4 feux de confiance (planning / cash / risques / communication client) ──────────
function StatutGlobal({meta,onSave,onNote}){
  const f=feuxOf(meta);
  const w=worstFeu(f);
  const notes=meta.notes||{};
  return(<Section title="Statut global" right={<span style={{fontSize:11.5,color:T.ink300,whiteSpace:"nowrap"}}>{meta.feuxAt?"évalué le "+fmt(new Date(meta.feuxAt)):"non évalué"}{w?" · pire niveau : "+feuLabel(w).toLowerCase():""}</span>}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>
      {FEUX.map(([k,lab])=>{const lv=f[k]||null;return(
        <div key={k} style={{background:T.surface,borderRadius:10,padding:"8px 11px",minWidth:0}}>
          <Cap>{lab}</Cap>
          <div style={{marginTop:5,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <span style={{fontSize:14,fontWeight:600,color:lv?feuColor(lv):T.ink300,letterSpacing:"-.01em"}}>{lv?feuLabel(lv):"Non évalué"}</span>
            <FeuPicker value={lv} onChange={v=>onSave(patchFeu(meta,k,v))} size={16}/>
          </div>
          <NoteField value={notes[k]} onSave={t=>onNote(k,t)} placeholder="＋ Commentaire CODIR"/>
        </div>);})}
    </div>
  </Section>);
}

// ── Contrat & échéances (T0 / Tfin contractuels) ────────────────────────────────────────────────
// Demandé : pouvoir saisir, pour chaque PJ, les dates contractuelles (T0 = début, Tfin = fin) — par
// tous les accès Manager. Stockées avec les autres corrections de fiche projet (planning/pjMetaOverrides,
// champs contratT0 / contratTFin), donc jamais écrasées par un import MS Project. La fin projetée est le
// départ prévu du planning à jour ; l'écart avec Tfin est en rouge quand le départ dépasse le contrat.
// Les futurs champs de reporting (confiance planning / finance / risques / communication client) viendront
// s'ajouter dans le même emplacement.
function DateField({label,value,onSave,hint}){
  const [v,setV]=useState(value||"");
  React.useEffect(()=>{setV(value||"");},[value]);
  const dirty=(v||"")!==(value||"");
  return(<div style={{minWidth:0}}>
    <div style={{fontSize:10,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em"}}>{label}</div>
    <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}>
      <input type="date" value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{if(dirty)onSave(v||null);}}
        onKeyDown={e=>{if(e.key==="Enter"&&dirty){onSave(v||null);e.currentTarget.blur();}}}
        style={{padding:"4px 7px",borderRadius:8,border:"1.5px solid "+(dirty?T.teal500:T.line),background:T.card,color:T.ink900,fontSize:13,fontWeight:700,fontFamily:T.font,colorScheme:T.mode==="dark"?"dark":"light",minWidth:0,width:"100%",maxWidth:150}}/>
      {value&&<button title="Effacer" onClick={()=>onSave(null)} style={{border:"none",background:"transparent",color:T.ink300,cursor:"pointer",fontSize:15,lineHeight:1,padding:"0 2px"}}>×</button>}
    </div>
    {hint&&<div style={{fontSize:10.5,color:T.ink300,marginTop:2}}>{hint}</div>}
  </div>);
}
function ContratSection({r,meta,onSave,onNote}){
  const t0=meta.contratT0||"",tf=meta.contratTFin||"";
  const dT0=dOf(t0),dTf=dOf(tf),dep=dOf(r.depart);
  const ecart=dTf&&dep?diffDays(dTf,dep):null;     // + = départ prévu après la fin contractuelle
  const duree=dT0&&dTf?diffDays(dT0,dTf):null;
  const bad=dT0&&dTf&&dTf<dT0;
  // Frise : T0 → Tfin (contrat) puis dépassement éventuel jusqu'au départ prévu ; repère « aujourd'hui »
  const pts=[dT0||dOf(r.arrivee),dTf,dep,today].filter(Boolean);
  const lo=pts.length?Math.min(...pts.map(d=>+d)):+today,hi=pts.length?Math.max(...pts.map(d=>+d)):+today;
  const span=Math.max(hi-lo,86400000*7);
  const pos=d=>d?Math.max(0,Math.min(100,(+d-lo)/span*100)):null;
  const a=pos(dT0||dOf(r.arrivee)),b=pos(dTf),c=pos(dep),n=pos(today);
  const late=ecart!=null&&ecart>0;
  return(<Section title="Contrat & roadmap" right={<span style={{fontSize:11.5,color:T.ink300,whiteSpace:"nowrap"}}>T0 / Tfin saisis par les accès Manager</span>}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,alignItems:"start"}}>
      <DateField label="T0 · début contractuel" value={t0} onSave={v=>onSave({contratT0:v})} hint={dT0?"":"non renseigné"}/>
      <DateField label="Tfin · fin contractuelle" value={tf} onSave={v=>onSave({contratTFin:v})} hint={dTf?"":"non renseignée"}/>
      <div style={{minWidth:0}}>
        <div style={{fontSize:10,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em"}}>Fin projetée</div>
        <div style={{fontWeight:600,fontSize:16,letterSpacing:"-.01em",color:late?T.red500:T.ink900,marginTop:4}}>{dep?fmt(dep):"—"}</div>
        <div style={{fontSize:10.5,color:T.ink300,marginTop:2}}>départ prévu du planning</div>
      </div>
      <div style={{minWidth:0}}>
        <div style={{fontSize:10,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em"}}>Écart vs contrat</div>
        <div style={{fontWeight:600,fontSize:16,letterSpacing:"-.01em",color:ecart==null?T.ink300:late?T.red500:T.emerald600,marginTop:4}}>{ecart==null?"—":ecart===0?"dans les temps":signed(ecart)}</div>
        <div style={{fontSize:10.5,color:T.ink300,marginTop:2}}>{duree!=null?"durée contrat "+duree+" j":bad?"Tfin avant T0 ?":"renseignez T0 et Tfin"}</div>
      </div>
    </div>
    {bad&&<div style={{marginTop:8,fontSize:12,color:T.amber600,background:T.amber100,borderRadius:7,padding:"4px 9px",display:"inline-flex",alignItems:"center",gap:6}}><NavIcon name="warning" size={12}/>La date de fin contractuelle est avant le début : vérifiez la saisie.</div>}
    {(dTf||dT0)&&<div style={{marginTop:12,position:"relative",height:34}}>
      <div style={{position:"absolute",left:0,right:0,top:12,height:6,background:T.surfaceAlt,borderRadius:6}}/>
      {a!=null&&b!=null&&b>a&&<div style={{position:"absolute",left:a+"%",width:(b-a)+"%",top:12,height:6,background:T.teal500,borderRadius:6}}/>}
      {b!=null&&c!=null&&c>b&&<div style={{position:"absolute",left:b+"%",width:(c-b)+"%",top:12,height:6,background:T.red500,borderRadius:6}} title={"Dépassement "+(ecart)+" j"}/>}
      {[[a,"T0",T.teal600],[b,"Tfin",T.teal600],[c,"Fin proj.",late?T.red500:T.ink700]].map(([x,lab,col],i)=>x==null?null:
        <div key={i} style={{position:"absolute",left:x+"%",top:6,transform:x>90?"translateX(-100%)":x<10?"none":"translateX(-50%)",textAlign:x>90?"right":x<10?"left":"center"}}>
          <div style={{width:2,height:18,background:col,margin:x>90?"0 0 0 auto":x<10?"0":"0 auto"}}/>
          <div style={{fontSize:9.5,fontWeight:800,color:col,marginTop:1,whiteSpace:"nowrap"}}>{lab}</div>
        </div>)}
      {n!=null&&<div title="Aujourd'hui" style={{position:"absolute",left:n+"%",top:7,width:10,height:10,borderRadius:"50%",background:T.card,border:"2px solid "+T.ember500,transform:"translateX(-50%)"}}/>}
    </div>}
    <NoteField value={(meta.notes||{}).ct} onSave={t=>onNote("ct",t)} placeholder="＋ Commentaire CODIR sur le contrat / l'écart avec Tfin"/>
  </Section>);
}

export function ProjectFileManager({data,initialData,comments,delays,progress,savePjMetaOverride,addComment,deleteComment,addDelayAllocationMulti,deleteDelayAllocation,delayTypes,authorName}){
  const [search,setSearch]=useState("");
  const [selPj,setSelPj]=useState(data[0]?.pj||null);
  const [onlyPrivate,setOnlyPrivate]=useState(false);
  const pendingNotes=useRef({});   // dernières notes envoyées (évite d'écraser une note par une autre si deux sauvegardes se suivent)
  const initialByPj=useMemo(()=>{const m={};(initialData||[]).forEach(x=>{m[x.pj]=x;});return m;},[initialData]);
  const pvOf=row=>progress&&progress[row.pj]!=null?progress[row.pj]:row.etat==="SHIPPED"?100:0;
  const filteredList=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return data;
    return data.filter(row=>{
      const m=getPjMeta(row.pj,row);
      return row.pj.toLowerCase().includes(q)||(m.nomProjet||"").toLowerCase().includes(q)||(m.pays||"").toLowerCase().includes(q)||(m.chefProjet||"").toLowerCase().includes(q)||(row.gamme||"").toLowerCase().includes(q);
    });
  },[data,search]);
  const r=data.find(x=>x.pj===selPj);
  const meta=r?getPjMeta(r.pj,r):null;
  const ini=r?initialByPj[r.pj]:null;
  const pjComments=useMemo(()=>{
    if(!r)return[];
    return (comments?.[r.pj]||[]).map((c,i)=>({...c,_idx:i})).sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[comments,r]);
  const pjDelays=useMemo(()=>{
    if(!r)return[];
    return [...(delays?.[r.pj]||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[delays,r]);
  const totalDelayDays=pjDelays.reduce((a,d)=>a+(d.days||0),0);
  const byType=useMemo(()=>{
    const m={};pjDelays.forEach(d=>{m[d.type]=(m[d.type]||0)+(d.days||0);});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[pjDelays]);
  const nPrivate=pjComments.filter(c=>c.private).length;
  const shownComments=onlyPrivate?pjComments.filter(c=>c.private):pjComments;

  // Chiffres clés calculés à partir des jalons
  const kpi=useMemo(()=>{
    if(!r)return null;
    const a=dOf(r.arrivee),t=dOf(r.tests),tf=dOf(r.testsFin),fp=dOf(r.finProd),dp=dOf(r.depart);
    const di=ini?dOf(ini.depart):null;
    return{
      pv:pvOf(r),
      driftDepart:di&&dp?diffDays(di,dp):null,
      atelier:a&&dp?diffDays(a,dp):null,
      tests:t?(tf?diffDays(t,tf)+1:1):null,
      toDepart:dp?diffDays(today,dp):null,
      prod:a&&fp?diffDays(a,fp):null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[r,ini,progress]);

  const saveNote=async(key,text)=>{
    if(!savePjMetaOverride||!r)return false;
    const base=pendingNotes.current[r.pj]||(meta&&meta.notes)||{};
    const next={...base,[key]:text||""};
    if(key==="codir"&&base.headline)next.headline="";   // ancienne clé du même champ     // "" (et non suppression) : la fusion Firestore est profonde
    pendingNotes.current[r.pj]=next;
    try{await savePjMetaOverride(r.pj,{notes:next,notesAt:new Date().toISOString()});return true;}
    catch(e){return false;}
    finally{setTimeout(()=>{if(pendingNotes.current[r.pj]===next)delete pendingNotes.current[r.pj];},1200);}
  };
  const notes=(meta&&meta.notes)||{};
  const worst=meta?worstFeu(feuxOf(meta)):null;
  const kind=r?presenceKind(r.clientPresence):null;
  const gc=r?(GAMME_COLORS[r.gamme]||T.teal500):T.teal500;

  return(<div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap",justifyContent:"center"}}>
    {/* ── Liste : avancement, état et compteurs visibles sans ouvrir la fiche ── */}
    <div style={{...CARD,width:250,flexShrink:0,maxHeight:"calc(100vh - 200px)",minHeight:300,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:9,borderBottom:"1px solid "+T.line}}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un PJ, projet, pays, chef, gamme…" style={{width:"100%",padding:"6px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:12.5,fontFamily:T.font,color:T.ink700,boxSizing:"border-box"}}/>
        <div style={{fontSize:11.5,color:T.ink300,marginTop:4}}>{filteredList.length} PJ</div>
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {filteredList.map(row=>{
          const m=getPjMeta(row.pj,row);
          const nCom=(comments?.[row.pj]||[]).length;
          const nDel=(delays?.[row.pj]||[]).length;
          const pk=presenceKind(row.clientPresence);
          const sel=selPj===row.pj;
          const ec=(ETAT_META[row.etat]||ETAT_META["NOT ORDERED"]);
          const pv=pvOf(row);
          return(<div key={row.pj} onClick={()=>setSelPj(row.pj)} style={{padding:"6px 10px 6px 9px",cursor:"pointer",background:sel?T.teal100:"transparent",borderLeft:"3px solid "+(sel?T.teal500:"transparent"),borderBottom:"1px solid "+T.line}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:ec.text,flexShrink:0}} title={ec.label}/>
              <span style={{fontFamily:T.fontMono,fontWeight:700,color:T.teal600,fontSize:13}}>{row.pj}</span><SerieTag pj={row.pj} size={10}/>
              <CountryFlag pays={m.pays} size={12}/>
              <span style={{marginLeft:"auto",fontSize:11,color:T.ink300,display:"inline-flex",alignItems:"center",gap:7}}>
                {pk&&<span title={"Présence aux tests : "+pk} style={{width:8,height:8,borderRadius:"50%",background:pk==="both"?"linear-gradient(90deg,"+PRESENCE_META.both.color+" 50%,"+PRESENCE_META.both.color2+" 50%)":PRESENCE_META[pk].color}}/>}
                {nCom>0&&<span style={{display:"inline-flex",alignItems:"center",gap:2}}><NavIcon name="comments" size={11}/>{nCom}</span>}
                {nDel>0&&<span style={{display:"inline-flex",alignItems:"center",gap:2,color:T.red500}}><NavIcon name="clock" size={11}/>{nDel}</span>}
              </span>
            </div>
            <div style={{fontSize:11.5,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:1}}>{m.nomProjet}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
              <div style={{flex:1}}><ProgressBar value={pv} height={3}/></div>
              <span style={{fontSize:10.5,fontWeight:700,color:T.ink500,width:30,textAlign:"right"}}>{pv}%</span>
              <span style={{fontSize:10.5,color:T.ink300}}>{row.depart?fmt(new Date(row.depart)):"—"}</span>
            </div>
          </div>);
        })}
        {filteredList.length===0&&<EmptyNote>Aucun résultat.</EmptyNote>}
      </div>
    </div>

    <div style={{flex:"1 1 340px",minWidth:340,maxWidth:880}}>
      {!r?<div style={{...CARD,padding:30,textAlign:"center",color:T.ink300}}>Sélectionnez un PJ dans la liste.</div>:
      <div style={{...CARD,overflow:"hidden"}}>
        <div style={{height:4,background:T.navy800,position:"relative"}}><span style={{position:"absolute",left:26,top:0,bottom:0,width:56,background:BRASS}}/></div>
        <div style={{padding:"16px 22px 22px",display:"flex",flexDirection:"column",gap:20}}>

        {/* ── En-tête : identité, avancement, message clé ── */}
        <div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{minWidth:0,flex:"1 1 300px"}}>
              <div style={{display:"flex",alignItems:"baseline",gap:16,flexWrap:"wrap"}}>
                <span style={{fontSize:32,fontWeight:700,letterSpacing:"-.02em",lineHeight:1,color:T.ink900}}>{r.pj}</span>
                <span style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:24,fontWeight:500,letterSpacing:"-.01em",lineHeight:1,color:T.ink700}}><span style={{width:11,height:11,borderRadius:"50%",background:gc,flexShrink:0}}/>{r.gamme}</span>
                <SerieTag pj={r.pj} size={14} style={{alignSelf:"center",padding:"2px 10px",lineHeight:"20px",borderRadius:7}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginTop:7,fontSize:14.5,fontWeight:500,color:T.ink500}}>
                <span>{meta.nomProjet}</span>
                {meta.chefProjet&&meta.chefProjet!=="—"&&<span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12.5,fontWeight:400}}><Avatar name={meta.chefProjet} size={16}/>{meta.chefProjet}</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:8,fontSize:12,color:T.ink500}}>
                <Badge etat={r.etat}/>
                {meta.pays&&meta.pays!=="—"&&<span style={{display:"inline-flex",alignItems:"center",gap:6}}><CountryFlag pays={meta.pays} size={13}/>{meta.pays}</span>}
                {kind?<PresenceChip kind={kind} date={r.clientPresence.date} fontSize={11.5}/>:<span style={{fontSize:11.5,color:T.ink300}}>Pas de présence aux tests</span>}
              </div>
            </div>
            {worst&&<span style={{display:"inline-flex",alignItems:"center",gap:7,background:feuColor(worst)+"22",color:feuColor(worst),borderRadius:99,padding:"4px 13px 4px 9px",fontSize:12,fontWeight:800}}><span style={{width:9,height:9,borderRadius:"50%",background:feuColor(worst)}}/>Statut global : {feuLabel(worst)}</span>}
          </div>
        </div>

        {/* ── Statut global : 4 feux + explication de chacun ── */}
        {savePjMetaOverride?<StatutGlobal meta={meta} onSave={f=>savePjMetaOverride(r.pj,f)} onNote={saveNote}/>:null}

        {/* ── Indicateurs clés + explication de chacun ── */}
        <Section title="Indicateurs clés" right={<span style={{fontSize:11.5,color:T.ink300,whiteSpace:"nowrap"}}>{kpi.toDepart==null?"":(kpi.toDepart>=0?"J-"+kpi.toDepart+" avant départ":"départ dépassé de "+Math.abs(kpi.toDepart)+" j")}{kpi.atelier!=null?" · séjour atelier "+kpi.atelier+" j":""}{kpi.tests!=null?" · fenêtre tests "+kpi.tests+" j":""}</span>}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>
            {[
              ["av","Avancement",<div style={{display:"flex",alignItems:"center",gap:10}}><Donut v={kpi.pv}/><span style={{fontSize:10.5,color:T.ink300,lineHeight:1.35}}>{r.etat==="SHIPPED"?"expédié":"production chez ENOGIA"}</span></div>,null],
              ["dr","Dérive du départ",<Big color={kpi.driftDepart>0?T.red500:kpi.driftDepart<0?T.emerald600:T.ink900}>{ini?signed(kpi.driftDepart):"—"}</Big>,ini?(kpi.driftDepart===0?"conforme au planning initial":"initial : "+fmtLong(dOf(ini.depart))):"pas de planning initial"],
              ["rt","Retards déclarés",<Big color={totalDelayDays>0?T.red500:T.ink900}>{totalDelayDays>0?totalDelayDays+" j":"0"}</Big>,totalDelayDays>0?pjDelays.length+" cause"+(pjDelays.length>1?"s":"")+" consignée"+(pjDelays.length>1?"s":""):"aucun retard consigné"],
            ].map(([k,lab,val,sub])=>
              <div key={k} style={{background:T.surface,borderRadius:10,padding:"8px 11px",minWidth:0}}>
                <Cap style={{marginBottom:6}}>{lab}</Cap>{val}
                {sub&&<div style={{fontSize:10.5,color:T.ink300,marginTop:4}}>{sub}</div>}
                {savePjMetaOverride&&<NoteField value={notes[k]} onSave={t=>saveNote(k,t)} placeholder="＋ Commentaire CODIR"/>}
              </div>)}
          </div>
        </Section>

        {/* ── Jalons ── */}
        <Section title="Jalons" right={<span style={{fontSize:11.5,color:T.ink300,whiteSpace:"nowrap"}}>révisé · initial barré · écart</span>}>
          <Timeline r={r} ini={ini} kind={kind}/>
        </Section>

        {/* ── Contrat & roadmap (T0 / Tfin) ── */}
        {savePjMetaOverride?<ContratSection r={r} meta={meta} onSave={f=>savePjMetaOverride(r.pj,f)} onNote={saveNote}/>:null}

        {/* ── Commentaire CODIR : visible uniquement dans le rapport CODIR (ni dans les commentaires, ni ailleurs) ── */}
        {savePjMetaOverride&&<Section title="Commentaire CODIR" right={<span style={{fontSize:10.5,fontWeight:800,letterSpacing:".06em",color:BRASS,background:BRASS+"22",borderRadius:99,padding:"2px 10px",whiteSpace:"nowrap"}}>Visible uniquement dans le rapport CODIR</span>}>
          <NoteField big max={CODIR_MAX} value={notes.codir||notes.headline} onSave={t=>saveNote("codir",t)} placeholder="Commentaire de synthèse pour le CODIR : contexte, décisions attendues, points à arbitrer…"/>
        </Section>}

        {/* ── Retards + commentaires côte à côte ── */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-start"}}>
          <div style={{flex:"1 1 320px",minWidth:0}}>
            <Section icon="clock" title={"Causes de retard"+(pjDelays.length?" ("+pjDelays.length+")":"")} right={totalDelayDays>0&&<span style={{fontSize:12.5,fontWeight:800,color:T.red500,background:T.red100,borderRadius:6,padding:"2px 9px"}}>{totalDelayDays} j</span>}>
              {addDelayAllocationMulti&&<DelayComposer key={r.pj} types={delayTypes} onAdd={(t,d,n)=>addDelayAllocationMulti([r.pj],t,d,n,authorName)}/>}
              {pjDelays.length===0?<div style={{color:T.ink300,fontSize:13.5}}>Aucune cause de retard enregistrée.</div>:<>
                <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
                  {byType.map(([type,days])=>(
                    <div key={type} style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{width:130,fontSize:12.5,fontWeight:600,color:T.ink700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={type}>{type}</span>
                      <div style={{flex:1,background:T.surfaceAlt,borderRadius:5,height:8,overflow:"hidden"}}><div style={{width:(days/byType[0][1]*100)+"%",height:"100%",background:T.red500,borderRadius:5}}/></div>
                      <span style={{width:34,textAlign:"right",fontSize:12.5,fontWeight:800,color:T.ink900}}>{days}j</span>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:220,overflowY:"auto"}}>
                  {pjDelays.map(d=>{
                    const others=d.groupPjs?d.groupPjs.filter(p=>p!==r.pj):[];
                    return(<div key={d.id} style={{background:T.surface,borderRadius:9,padding:"5px 9px",borderLeft:"3px solid "+T.red500}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,color:T.ink900,fontSize:12.5,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{d.type} — {d.days}j{others.length>0&&<span style={{fontSize:11,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 8px",fontWeight:700}}>aussi : {others.join(", ")}</span>}</span>
                        <span style={{fontSize:11.5,color:T.ink300,display:"inline-flex",alignItems:"center",gap:4}}>{d.author} · {new Date(d.date).toLocaleDateString("fr-FR")}{deleteDelayAllocation&&<TrashBtn title="Supprimer cette cause de retard" onClick={()=>{if(window.confirm("Supprimer cette cause de retard ("+d.type+", "+d.days+" j) ?"))deleteDelayAllocation(r.pj,d.id);}}/>}</span>
                      </div>
                      {d.note&&<div style={{fontSize:12,color:T.ink500,marginTop:2}}>{d.note}</div>}
                    </div>);
                  })}
                </div>
              </>}
            </Section>
          </div>

          <div style={{flex:"1 1 320px",minWidth:0}}>
            <Section icon="comments" title={"Commentaires ("+pjComments.length+")"} right={nPrivate>0&&<button onClick={()=>setOnlyPrivate(v=>!v)} style={{border:"1px solid "+(onlyPrivate?T.amber500:T.line),background:onlyPrivate?T.amber100:"transparent",color:onlyPrivate?T.amber600:T.ink500,borderRadius:7,padding:"2px 9px",fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>Privés ({nPrivate})</button>}>
              {addComment&&<CommentComposer key={r.pj} onAdd={(t,pv)=>addComment(r.pj,authorName||"Manager",t,null,pv)}/>}
              {shownComments.length===0?<div style={{color:T.ink300,fontSize:13.5}}>{onlyPrivate?"Aucun commentaire privé.":"Aucun commentaire."}</div>:
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:260,overflowY:"auto"}}>
                  {shownComments.map(c=>{
                    const others=c.groupPjs?c.groupPjs.filter(p=>p!==r.pj):[];
                    return(<div key={c._idx} style={{background:c.private?T.amber100:T.surface,borderRadius:9,padding:"5px 9px",borderLeft:"3px solid "+(c.private?T.amber500:T.teal500)}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,color:T.teal600,fontSize:12.5,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{c.author}{c.private&&<span style={{fontSize:10.5,color:T.amber600,background:T.amber100,borderRadius:5,padding:"1px 6px",fontWeight:700}}>Privé</span>}{others.length>0&&<span style={{fontSize:10.5,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 6px",fontWeight:700}}>aussi : {others.join(", ")}</span>}</span>
                        <span style={{fontSize:11.5,color:T.ink300,display:"inline-flex",alignItems:"center",gap:4}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}{deleteComment&&<TrashBtn title="Supprimer ce commentaire" onClick={()=>{if(window.confirm("Supprimer ce commentaire ?"))deleteComment(r.pj,c._idx);}}/>}</span>
                      </div>
                      <div style={{fontSize:12.5,color:T.ink700,whiteSpace:"pre-wrap",marginTop:2}}>{c.text}</div>
                      {c.linkedDate&&<div style={{marginTop:4,fontSize:11.5,color:T.ink500,fontWeight:600}}>Lié au {fmt(new Date(c.linkedDate))}</div>}
                    </div>);
                  })}
                </div>}
            </Section>
          </div>
        </div>
        </div>
      </div>}
    </div>
  </div>);
}
