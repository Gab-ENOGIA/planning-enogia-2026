import React, { useState, useEffect } from "react";
import { T } from "../theme";
import { ETAT_META, getPjMeta, SerieTag } from "../pjMeta";
import { parseMSProjectRows } from "../parsers";

export function useSheetJS(){
  const [ready,setReady]=useState(!!window.XLSX);
  useEffect(()=>{
    if(window.XLSX){setReady(true);return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=()=>setReady(true);
    document.head.appendChild(s);
  },[]);
  return ready;
}

// Réduit encore (demandé explicitement : "réduire la police pour l'état") — la pastille garde son
// fond/bordure propres mais passe sous la taille du reste des colonnes du tableau.
// Mention demandée à chaque saisie de retard : « en rouge et italique, en petit, que ce retard peut
// mettre en retard uniquement les PJ après » (+ petite icône de danger).
export function DelayScopeNote(){
  return(<div style={{display:"flex",alignItems:"flex-start",gap:5,fontSize:11,fontStyle:"italic",color:T.red500,lineHeight:1.35,margin:"2px 0 6px"}}>
    <span style={{display:"inline-flex",flexShrink:0,marginTop:1}}><NavIcon name="warning" size={12}/></span>
    <span>Attention : ce retard ne peut décaler que les PJ planifiés après celui-ci, jamais ceux d'avant.</span>
  </div>);
}

export function Badge({etat,wrap}){const c=ETAT_META[etat]||ETAT_META["NOT ORDERED"];const urgent=etat==="NOT ORDERED";return <span className={urgent?"enogia-pulse-urgent":""} style={{background:c.bg,color:c.text,border:"1px solid "+c.border,borderRadius:wrap?14:20,padding:"2.5px 10px 2.5px 8px",fontSize:12,fontWeight:600,letterSpacing:".01em",display:"inline-flex",alignItems:"center",gap:5,boxShadow:"0 1px 2px rgba(15,40,60,.08)",maxWidth:"100%",boxSizing:"border-box"}}><span style={{width:6,height:6,borderRadius:"50%",background:c.bar,flexShrink:0}}/><span style={wrap?{lineHeight:1.2,overflowWrap:"break-word",minWidth:0}:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.label||etat}</span></span>;}

export function DropFilter({label,options,selected,onChange,getLabel,icon}){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const all=options.every(o=>selected.has(o));
  const none=options.every(o=>!selected.has(o));
  const toggle=o=>{const s=new Set(selected);s.has(o)?s.delete(o):s.add(o);onChange(s);};
  const disp=o=>getLabel?getLabel(o):o;
  const openMenu=()=>{
    if(btnRef.current){
      const r=btnRef.current.getBoundingClientRect();
      setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-230)});
    }
    setOpen(v=>!v);
  };
  return(
    <span style={{position:"relative",display:"inline-block"}} onClick={e=>e.stopPropagation()}>
      {/* Bouton resserré (demandé explicitement : "les filtres ... sont trop grandes ... plus
          discret") — mêmes proportions sur le Gantt et le Calendrier (et ici, partout où ce
          composant est utilisé). */}
      <button ref={btnRef} onClick={openMenu} style={icon?{padding:"2px 4px",borderRadius:6,border:"none",background:!all?T.teal100:"transparent",color:!all?T.teal600:T.ink300,fontSize:11,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3,verticalAlign:"middle",marginLeft:4}:{padding:"5px 10px",borderRadius:8,border:"1px solid "+(!all||open?T.teal500:T.line),background:!all?T.teal100:T.card,color:!all?T.teal600:T.ink700,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",fontFamily:T.font,transition:"border-color .15s"}}>
        {icon?(<>{!all&&selected.size}<NavIcon name="chevronDown" size={10}/></>):(<>{label}{!all?" ("+selected.size+")":""}<NavIcon name="chevronDown" size={11}/></>)}
      </button>
      {/* Popover affiné (demandé explicitement : "les filtres sur les colonnes sont grossiers quand
          on clique dessus, la police est trop grande") — police et cases à cocher réduites, coins et
          ombre resserrés pour rester dans le même registre que le reste de l'appli. */}
      {open&&<>
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
        <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:10,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,minWidth:190,maxHeight:300,display:"flex",flexDirection:"column",fontFamily:T.font}}>
          <div onClick={()=>onChange(all?new Set():new Set(options))} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderBottom:"1px solid "+T.line,background:T.surface,flexShrink:0,borderRadius:"10px 10px 0 0"}}>
            <div style={{width:13,height:13,borderRadius:4,border:"1.5px solid "+(all?T.teal500:T.ink100),background:all?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {all&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}
              {!all&&!none&&<span style={{color:T.teal600,fontSize:11,fontWeight:700}}>—</span>}
            </div>
            <span style={{fontSize:12.5,fontWeight:700,color:T.ink700}}>Tout sélectionner</span>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {options.map(o=>{const a=selected.has(o);return(
              <div key={o} onClick={()=>toggle(o)} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",cursor:"pointer",background:a?T.teal100:T.card,borderBottom:"1px solid "+T.surface}}>
                <div style={{width:13,height:13,borderRadius:4,border:"1.5px solid "+(a?T.teal500:T.ink100),background:a?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{a&&<span style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</span>}</div>
                <span style={{fontSize:12.5,color:T.ink700,fontWeight:a?600:400}}>{disp(o)}</span>
              </div>
            );})}
          </div>
          <div style={{padding:"7px 12px",borderTop:"1px solid "+T.line,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.surface,flexShrink:0,borderRadius:"0 0 10px 10px"}}>
            <span style={{fontSize:11.5,color:T.ink500,fontWeight:500}}>{selected.size}/{options.length}</span>
            <button onClick={()=>setOpen(false)} style={{padding:"4px 12px",borderRadius:6,border:"none",background:T.teal500,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>OK</button>
          </div>
        </div>
      </>}
    </span>
  );
}

// Liste déroulante "premium" (demandé explicitement : près des commentaires/retards, le choix de
// liste "manque de premium") — un <select> natif reste dessous pour l'accessibilité et le picker
// natif mobile, mais son rendu par défaut (flèche système, look plat) est masqué et remplacé par le
// même habillage que le reste de l'appli (bordure fine, coins arrondis, chevron maison).
export function Select({value,onChange,options,getLabel,placeholder,style,compact}){
  const disp=o=>getLabel?getLabel(o):o;
  return(
    <div style={{position:"relative",display:"inline-block",width:style?.width||"100%"}}>
      <select value={value} onChange={onChange} style={{appearance:"none",WebkitAppearance:"none",MozAppearance:"none",width:"100%",padding:compact?"4px 26px 4px 9px":"8px 30px 8px 11px",borderRadius:8,border:"1px solid "+T.line,fontSize:compact?12.5:13.5,fontWeight:600,fontFamily:T.font,color:T.ink700,background:T.card,cursor:"pointer",...style}}>
        {placeholder&&<option value="" disabled>{placeholder}</option>}
        {options.map(o=>(typeof o==="object"?<option key={o.value} value={o.value}>{o.label}</option>:<option key={o} value={o}>{disp(o)}</option>))}
      </select>
      <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:T.ink300}}><NavIcon name="chevronDown" size={11}/></span>
    </div>
  );
}

// ── Liste de PJ à cocher, toujours visible (pas un menu déroulant caché) — utilisée partout où on
// doit choisir plusieurs PJ à la fois : commentaires groupés, allocation de retard groupée, etc.
export function PjChecklist({data,selected,onChange,maxHeight=220}){
  const [search,setSearch]=useState("");
  const q=search.trim().toLowerCase();
  const filtered=q?data.filter(d=>{
    const meta=getPjMeta(d.pj,d);
    return d.pj.toLowerCase().includes(q)||(meta.nomProjet||"").toLowerCase().includes(q);
  }):data;
  const toggle=pj=>{const s=new Set(selected);s.has(pj)?s.delete(pj):s.add(pj);onChange(s);};
  const allChecked=filtered.length>0&&filtered.every(d=>selected.has(d.pj));
  const toggleAll=()=>{
    const s=new Set(selected);
    if(allChecked)filtered.forEach(d=>s.delete(d.pj));
    else filtered.forEach(d=>s.add(d.pj));
    onChange(s);
  };
  return(<div style={{border:"1px solid "+T.line,borderRadius:10,background:T.card,overflow:"hidden"}}>
    <div style={{padding:8,borderBottom:"1px solid "+T.line,display:"flex",gap:8,alignItems:"center",background:T.surface}}>
      <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un PJ, un projet..." style={{flex:1,padding:"6px 9px",borderRadius:7,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,color:T.ink700,background:T.card}}/>
      <span style={{fontSize:12,color:T.ink500,fontWeight:700,whiteSpace:"nowrap"}}>{selected.size} sélectionné{selected.size!==1?"s":""}</span>
    </div>
    <div onClick={toggleAll} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",cursor:"pointer",borderBottom:"1px solid "+T.line}}>
      <div style={{width:15,height:15,borderRadius:4,border:"1.5px solid "+(allChecked?T.teal500:T.ink100),background:allChecked?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{allChecked&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}</div>
      <span style={{fontSize:12.5,fontWeight:700,color:T.ink700}}>Tout sélectionner{q?" (résultats filtrés)":""}</span>
    </div>
    <div style={{maxHeight,overflowY:"auto"}}>
      {filtered.map(d=>{
        const meta=getPjMeta(d.pj,d);
        const checked=selected.has(d.pj);
        return(<div key={d.pj} onClick={()=>toggle(d.pj)} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",cursor:"pointer",background:checked?T.teal100:"transparent",borderBottom:"1px solid "+T.surface}}>
          <div style={{width:15,height:15,borderRadius:4,border:"1.5px solid "+(checked?T.teal500:T.ink100),background:checked?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}</div>
          <span style={{fontWeight:700,color:T.ink900,fontSize:13,fontFamily:T.fontMono,flexShrink:0}}>{d.pj}</span><SerieTag pj={d.pj}/>
          <span style={{fontSize:12.5,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{meta.nomProjet}</span>
        </div>);
      })}
      {filtered.length===0&&<div style={{padding:14,textAlign:"center",color:T.ink300,fontSize:12.5}}>Aucun résultat.</div>}
    </div>
  </div>);
}


export const PIN="2214";
export function PinGate({onUnlock}){
  const [v,setV]=useState("");const [err,setErr]=useState(false);
  const check=()=>{if(v===PIN)onUnlock();else{setErr(true);setV("");setTimeout(()=>setErr(false),1200);}};
  return(<div style={{background:T.card,borderRadius:16,padding:36,maxWidth:300,margin:"40px auto",boxShadow:T.shadowLg,textAlign:"center",fontFamily:T.font}}>
    <div style={{width:48,height:48,margin:"0 auto 14px",borderRadius:12,background:T.surface,boxShadow:T.neuInSm,color:T.teal600,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon name="lock" size={22}/></div>
    <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:22,color:T.ink900,marginBottom:18}}>Accès Manager</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:190,margin:"0 auto 14px"}}>
      {[1,2,3,4,5,6,7,8,9,"","0","⌫"].map((k,i)=><button key={i} onClick={()=>{if(k==="⌫")setV(x=>x.slice(0,-1));else if(k!=="")setV(x=>x.length<4?x+k:x);}} style={{height:48,borderRadius:12,border:"none",background:k===""?"transparent":T.surface,boxShadow:k===""?"none":T.neuOutSm,fontSize:21,fontWeight:600,cursor:k===""?"default":"pointer",color:T.ink900,transition:"box-shadow .1s ease"}}
        onMouseDown={e=>{if(k!=="")e.currentTarget.style.boxShadow=T.neuInSm;}}
        onMouseUp={e=>{if(k!=="")e.currentTarget.style.boxShadow=T.neuOutSm;}}
        onMouseLeave={e=>{if(k!=="")e.currentTarget.style.boxShadow=T.neuOutSm;}}>{k}</button>)}
    </div>
    <div style={{display:"flex",gap:7,justifyContent:"center",marginBottom:12}}>{[0,1,2,3].map(i=><div key={i} style={{width:11,height:11,borderRadius:"50%",background:i<v.length?T.teal500:T.ink100}}/>)}</div>
    {err&&<div style={{color:T.red500,fontSize:16,marginBottom:8,fontWeight:600}}>Code incorrect</div>}
    <button onClick={check} disabled={v.length<4} style={{padding:"10px 30px",background:v.length<4?T.ink100:T.teal500,color:v.length<4?T.ink300:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:17,cursor:v.length<4?"default":"pointer"}}>Valider</button>
  </div>);
}


export function ImportButton({onImport, busy, label, accent, helpText, warnText, confirmMessage, hasExisting, inputId, iconOnly, iconGlyph}){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const [err,setErr]=useState("");
  const [indice,setIndice]=useState("");
  useSheetJS();
  const fileInputId=inputId||"msp-file";
  const btnLabel=label||"Importer un planning MS Project";
  const bg=accent||"linear-gradient(135deg,"+T.teal500+","+T.navy700+")";
  const openMenu=()=>{
    if(btnRef.current){
      const r=btnRef.current.getBoundingClientRect();
      setPos({top:r.bottom+8,left:Math.min(r.left,window.innerWidth-338)});
    }
    setOpen(v=>!v);
  };

  const proceedImport=parsed=>{
    if(hasExisting&&confirmMessage){
      const ok=window.confirm(confirmMessage);
      if(!ok)return false;
    }
    onImport(parsed,indice.trim());
    return true;
  };

  const handleFile=async file=>{
    setErr("");
    try{
      if(file.name.endsWith(".xlsx")||file.name.endsWith(".xls")){
        if(!window.XLSX){setErr("Librairie Excel en cours de chargement, réessayez dans 2s.");return;}
        const buf=await file.arrayBuffer();
        const wb=window.XLSX.read(buf,{type:"array"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,raw:false});
        // Feuille optionnelle "Table_affectation" : charge de travail par tâche/ressource (Atelier/Autom)
        const affSheetName=wb.SheetNames.find(n=>n.toLowerCase().includes("affectation"));
        const affRows=affSheetName?window.XLSX.utils.sheet_to_json(wb.Sheets[affSheetName],{header:1,raw:false}):null;
        const parsed=parseMSProjectRows(rows,affRows);
        if(!parsed||parsed.length===0){setErr("Aucun PJ reconnu. Vérifiez les colonnes Nom / Début / Niveau hiérarchique.");return;}
        if(proceedImport(parsed))setOpen(false);
      } else {
        const text=await file.text();
        const rows=text.trim().split("\n").map(l=>l.split("\t"));
        const parsed=parseMSProjectRows(rows);
        if(!parsed||parsed.length===0){setErr("Aucun PJ reconnu dans ce fichier texte.");return;}
        if(proceedImport(parsed))setOpen(false);
      }
    }catch(e){setErr("Erreur de lecture : "+e.message);}
  };

  return(<div style={{position:"relative",fontFamily:T.font}}>
    <button ref={btnRef} onClick={openMenu} disabled={busy} title={iconOnly?btnLabel:undefined} style={iconOnly?{width:26,height:26,borderRadius:7,border:"1px solid "+T.line,background:"transparent",color:T.ink500,fontWeight:700,fontSize:15,lineHeight:1,cursor:busy?"default":"pointer",opacity:busy?.6:1,display:"flex",alignItems:"center",justifyContent:"center",padding:0}:{padding:"5px 9px",borderRadius:7,border:"none",background:bg,color:"#fff",fontWeight:700,fontSize:11,cursor:busy?"default":"pointer",opacity:busy?.6:1,display:"flex",alignItems:"center",gap:5,boxShadow:T.shadowSm,transition:"transform .12s ease, box-shadow .12s ease"}}
      onMouseEnter={e=>{if(!busy){e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=T.shadowMd;}}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=T.shadowSm;}}>
      {iconOnly?(busy?"…":(iconGlyph||"⋯")):busy?<span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:"50%",border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",display:"inline-block",animation:"enogiaSpin .8s linear infinite"}}/>Mise à jour...</span>:<span style={{display:"inline-flex",alignItems:"center",gap:5}}><NavIcon name="upload" size={10}/>{btnLabel}</span>}
    </button>
    {open&&!busy&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
      <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:14,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,width:320,padding:18}}>
      <div style={{fontWeight:700,fontSize:19,color:T.ink900,marginBottom:8}}>{btnLabel}</div>
      <div style={{fontSize:15,color:T.ink500,marginBottom:14,lineHeight:1.6}}>
        {helpText||(<>Export Excel (.xlsx) avec colonnes <b>Nom, Début, Niveau hiérarchique</b>.<br/>Niveau 1 = PJ · Niveau 2 = Arrivée / Tests / Fin de production / Départ.</>)}
      </div>
      <div style={{marginBottom:12}}>
        <label style={{fontSize:13,color:T.ink500,fontWeight:600,display:"block",marginBottom:5}}>Indice du document (ex: H)</label>
        <input type="text" value={indice} onChange={e=>setIndice(e.target.value)} maxLength={4} placeholder="H"
          style={{padding:"7px 11px",borderRadius:8,border:"1.5px solid "+T.line,fontSize:15,fontFamily:T.font,color:T.ink700,fontWeight:600,width:80}}/>
      </div>
      <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
        style={{border:"2px dashed "+T.ink100,borderRadius:11,padding:"24px 16px",background:T.surface,textAlign:"center",cursor:"pointer",marginBottom:12}}
        onClick={()=>document.getElementById(fileInputId).click()}>
        <div style={{fontSize:30,marginBottom:6}}>⬆️</div>
        <div style={{fontSize:15,color:T.ink700,fontWeight:500}}>Glisser-déposer ou cliquer</div>
        <input id={fileInputId} type="file" accept=".xlsx,.xls,.txt,.tsv" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)handleFile(f);}}/>
      </div>
      {err&&<div style={{color:T.red500,fontSize:15,background:T.red100,padding:"8px 12px",borderRadius:8,marginBottom:10,fontWeight:500}}>{err}</div>}
      <div style={{fontSize:14,color:T.ink300,lineHeight:1.5,display:"flex",alignItems:"center",gap:6}}>{warnText||<><NavIcon name="warning" size={13}/>Remplace les données pour tous les visiteurs du site.</>}</div>
    </div>
    </>}
  </div>);
}


// ── Icônes de navigation vectorielles (identité "instrument technique", pas d'emoji) ──
export function NavIcon({name,size=18}){
  const p={width:size,height:size,viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round",strokeLinejoin:"round"};
  switch(name){
    case"list":return(<svg {...p}><rect x="2.5" y="3.5" width="3" height="3" rx=".5"/><line x1="8" y1="5" x2="17.5" y2="5"/><rect x="2.5" y="8.5" width="3" height="3" rx=".5"/><line x1="8" y1="10" x2="17.5" y2="10"/><rect x="2.5" y="13.5" width="3" height="3" rx=".5"/><line x1="8" y1="15" x2="17.5" y2="15"/></svg>);
    case"gantt":return(<svg {...p}><line x1="3" y1="4" x2="10" y2="4"/><line x1="3" y1="8" x2="16" y2="8"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="3" y1="16" x2="13.5" y2="16"/></svg>);
    case"calendar":return(<svg {...p}><rect x="2.5" y="4" width="15" height="13.5" rx="2"/><line x1="2.5" y1="8" x2="17.5" y2="8"/><line x1="6" y1="2.3" x2="6" y2="5.5"/><line x1="14" y1="2.3" x2="14" y2="5.5"/><line x1="6" y1="11.5" x2="6" y2="11.5"/><line x1="10" y1="11.5" x2="10" y2="11.5"/><line x1="14" y1="11.5" x2="14" y2="11.5"/></svg>);
    case"comments":return(<svg {...p}><path d="M3 5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2v-6z"/></svg>);
    case"lock":return(<svg {...p}><rect x="4" y="9" width="12" height="8.5" rx="2"/><path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3"/></svg>);
    case"layers":return(<svg {...p}><path d="M10 2.5 17.5 7 10 11.5 2.5 7 10 2.5z"/><path d="M2.5 11 10 15.5 17.5 11"/></svg>);
    case"gauge":return(<svg {...p}><path d="M3 13a7 7 0 1 1 14 0"/><line x1="10" y1="13" x2="13.2" y2="9"/><line x1="10" y1="13" x2="10" y2="13"/></svg>);
    case"check":return(<svg {...p}><circle cx="10" cy="10" r="7.2"/><path d="M6.7 10.2l2.2 2.2 4.4-4.6"/></svg>);
    case"chart":return(<svg {...p}><line x1="3" y1="17" x2="17" y2="17"/><rect x="5" y="10" width="3" height="7" rx=".5"/><rect x="9.5" y="6" width="3" height="11" rx=".5"/><rect x="14" y="12" width="3" height="5" rx=".5"/></svg>);
    case"tag":return(<svg {...p}><path d="M10.5 3H4a1 1 0 0 0-1 1v6.5a1 1 0 0 0 .3.7l8 8a1 1 0 0 0 1.4 0l6.5-6.5a1 1 0 0 0 0-1.4l-8-8a1 1 0 0 0-.7-.3z"/><circle cx="7" cy="7" r="1.2"/></svg>);
    case"warning":return(<svg {...p}><path d="M10 3.5 18 16.5H2L10 3.5z"/><line x1="10" y1="8.5" x2="10" y2="12"/><circle cx="10" cy="14.3" r=".2" fill="currentColor"/></svg>);
    case"upload":return(<svg {...p}><path d="M10 13V4"/><path d="M6.5 7.5 10 4l3.5 3.5"/><path d="M4 14v1.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V14"/></svg>);
    case"pin":return(<svg {...p}><path d="M10 17.5S15 12.4 15 8.5a5 5 0 0 0-10 0C5 12.4 10 17.5 10 17.5z"/><circle cx="10" cy="8.5" r="1.8"/></svg>);
    case"sun":return(<svg {...p}><circle cx="10" cy="10" r="3.5"/><line x1="10" y1="2.5" x2="10" y2="4.3"/><line x1="10" y1="15.7" x2="10" y2="17.5"/><line x1="2.5" y1="10" x2="4.3" y2="10"/><line x1="15.7" y1="10" x2="17.5" y2="10"/><line x1="5" y1="5" x2="6.2" y2="6.2"/><line x1="13.8" y1="13.8" x2="15" y2="15"/><line x1="15" y1="5" x2="13.8" y2="6.2"/><line x1="6.2" y1="13.8" x2="5" y2="15"/></svg>);
    case"factory":return(<svg {...p}><path d="M3 17V9l4 2.5V9l4 2.5V7l6 3v7z"/><line x1="3" y1="17" x2="17" y2="17"/></svg>);
    case"sunSm":return(<svg {...p}><circle cx="10" cy="10" r="3.2"/><line x1="10" y1="3" x2="10" y2="4.5"/><line x1="10" y1="15.5" x2="10" y2="17"/><line x1="3" y1="10" x2="4.5" y2="10"/><line x1="15.5" y1="10" x2="17" y2="10"/></svg>);
    case"moon":return(<svg {...p}><path d="M16 11.5A6.5 6.5 0 1 1 8.5 4a5.2 5.2 0 0 0 7.5 7.5z"/></svg>);
    case"download":return(<svg {...p}><path d="M10 3v9"/><path d="M6.5 8.5 10 12l3.5-3.5"/><path d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14"/></svg>);
    case"inbox":return(<svg {...p}><path d="M3 10h4.2l1.3 2.4h2.9L12.7 10H17"/><rect x="3" y="10" width="14" height="6.5" rx="1.5"/><path d="M6 10 8 4h4l2 6"/></svg>);
    case"logout":return(<svg {...p}><path d="M8 17H4.5a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 4.5 3H8"/><path d="M13 14l4-4-4-4"/><line x1="17" y1="10" x2="7.5" y2="10"/></svg>);
    case"clock":return(<svg {...p}><circle cx="10" cy="10" r="7.2"/><path d="M10 5.8V10l3 2"/></svg>);
    case"settings":return(<svg {...p}><circle cx="10" cy="10" r="2.6"/><path d="M10 2.8v2.4M10 14.8v2.4M4.2 6.1l2 1.2M13.8 12.7l2 1.2M2.8 10h2.4M14.8 10h2.4M4.2 13.9l2-1.2M13.8 7.3l2-1.2"/></svg>);
    case"save":return(<svg {...p}><path d="M4 4h9l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M7 4v4h6V4"/><rect x="6.5" y="11.5" width="7" height="5"/></svg>);
    case"close":return(<svg {...p}><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>);
    case"chevronDown":return(<svg {...p}><polyline points="5 7.5 10 12.5 15 7.5"/></svg>);
    default:return null;
  }
}
