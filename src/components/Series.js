import React, { useState, useEffect } from "react";
import { T } from "../theme";
import { getPjMeta, CountryFlag } from "../pjMeta";
import { CARD } from "./ManagerParts";
import { SERIE_SEED_TEXT } from "../serieSeed";

// ── N° de série des machines (Manager › Réglages) ─────────────────────────────────────────────────────
// Un numéro par PJ, saisi ici par les accès Manager, puis repris partout où le PJ apparaît (liste, calendrier,
// Gantt, fiches, commentaires, retards, rapport CODIR…). Stocké dans les corrections de fiche projet
// (planning/pjMetaOverrides, champ numSerie) : un import MS Project ne l'écrase jamais.
// Astuce : coller une colonne copiée depuis Excel dans une cellule remplit les lignes suivantes (une valeur par ligne).
function Row({r,meta,value,onSave,onPasteMany}){
  const [v,setV]=useState(value||"");const [st,setSt]=useState("");
  useEffect(()=>{setV(value||"");},[value]);
  const dirty=v.trim()!==(value||"").trim();
  const commit=async()=>{if(!dirty)return;setSt("…");const ok=await onSave(r.pj,v.trim());setSt(ok===false?"échec":"✓");setTimeout(()=>setSt(""),1400);};
  return(<tr style={{borderBottom:"1px solid "+T.line}}>
    <td style={{padding:"6px 12px",fontWeight:700,color:T.teal600,fontFamily:T.fontMono,fontSize:13,whiteSpace:"nowrap"}}>{r.pj}</td>
    <td style={{padding:"6px 12px",fontSize:13,color:T.ink900,fontWeight:600}}>{meta.nomProjet}</td>
    <td style={{padding:"6px 12px",fontSize:12.5,color:T.ink500,whiteSpace:"nowrap"}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><CountryFlag pays={meta.pays} size={12}/>{meta.pays}</span></td>
    <td style={{padding:"6px 12px",fontSize:12.5,color:T.ink500,whiteSpace:"nowrap"}}>{r.gamme}</td>
    <td style={{padding:"4px 12px",whiteSpace:"nowrap"}}>
      <input type="text" value={v} placeholder="N° de série" onChange={e=>setV(e.target.value)} onBlur={commit}
        onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();else if(e.key==="Escape"){setV(value||"");e.currentTarget.blur();}}}
        onPaste={e=>{const t=e.clipboardData.getData("text");if(/[\r\n]/.test(t.trim())){e.preventDefault();onPasteMany(r.pj,t);}}}
        style={{width:170,padding:"5px 9px",borderRadius:8,border:"1.5px solid "+(dirty?T.teal500:T.line),background:T.card,color:T.ink900,fontSize:13,fontFamily:T.fontMono,fontWeight:600}}/>
      <span style={{marginLeft:8,fontSize:12,color:st==="échec"?T.red500:T.emerald600,fontWeight:700}}>{st}</span>
    </td>
  </tr>);
}


// ── Import d'une liste (PJ · client · N° de série) ────────────────────────────────────────────────────
// Colle un tableau Excel (colonnes séparées par des tabulations) ou des lignes « PJ | client | N° de série » :
// le code PJ est lu en début de ligne, le N° de série est le dernier champ qui ressemble à un numéro (chiffres + tirets).
const normPj=s=>String(s||"").trim().toUpperCase().replace(/\s+/g,"");
const looksSerie=s=>/\d/.test(s)&&/^[A-Z0-9]+(-[A-Z0-9]+)+$/i.test(s);
export function parseSerieList(text){
  const out=[];
  String(text||"").replace(/\r/g,"").split("\n").forEach((raw,i)=>{
    const line=raw.trim();if(!line)return;
    const delim=/[\t|;]/.test(line);
    let cols=delim?line.split(/[\t|;]/).map(x=>x.trim()):line.split(/\s+/);
    const code=cols[0];
    if(!/^(PJ|SAV)\s*\d/i.test(code))return;   // en-tête ou ligne sans code PJ
    let sn="";
    if(delim&&cols.length>=3){const l=cols[cols.length-1];if(l&&/\d/.test(l)&&!/\s/.test(l))sn=l;}   // colonne de droite d'un tableau : N° tel quel (ex. 24017)
    else for(let k=cols.length-1;k>=1;k--){if(looksSerie(cols[k])){sn=cols[k];break;}}
    out.push({line:i+1,code:code.trim(),client:cols.length>2?cols.slice(1,-1).filter(Boolean).join(" "):(cols[1]||""),sn});
  });
  return out;
}
function resolvePj(code,byNorm,all){
  const k=normPj(code);if(byNorm.has(k))return {pj:byNorm.get(k),kind:"exact"};
  const [base,...rest]=k.split("-");const suf=rest.join("-");
  const cands=all.filter(p=>{const [b,...r]=normPj(p).split("-");const sf=r.join("-");
    return b===base&&(suf?(sf!==suf&&sf.endsWith(suf)):(sf!==""));});   // PJ421-LT → PJ421-180LT ; PJ409 → PJ409-1 si unique
  if(cands.length===1)return {pj:cands[0],kind:"approx"};
  return {pj:null,kind:"absent"};
}
function ImportPanel({rows,save,onClose,onDone}){
  const [text,setText]=useState("");const [sel,setSel]=useState({});const [withAbsent,setWithAbsent]=useState(false);
  const [run,setRun]=useState(null);   // {done,total,fail}
  const byNorm=new Map(rows.map(x=>[normPj(x.r.pj),x.r.pj]));const allPj=rows.map(x=>x.r.pj);
  const cur=new Map(rows.map(x=>[x.r.pj,x.meta.numSerie||""]));
  const items=(()=>{
    const seen=new Set();
    return parseSerieList(text).filter(e=>e.sn).map((e,idx)=>{
      const m=resolvePj(e.code,byNorm,allPj);
      let status="new",note="";const target=m.pj||normPj(e.code);
      if(m.kind==="absent")status="absent";
      else{
        const c=cur.get(m.pj)||"";
        if(seen.has(m.pj)){status="dup";note="Doublon : "+m.pj+" figure déjà plus haut dans la liste.";}
        else if(c===e.sn)status="same";
        else if(c){status="replace";note="Remplace « "+c+" »";}
        seen.add(m.pj);
        if(m.kind==="approx"&&status==="new")status="approx";
        if(m.kind==="approx")note=("Correspond à "+m.pj+(note?" · "+note:""));
      }
      const def=status==="new"||status==="approx";
      return {...e,idx,target,kind:m.kind,status,note,def};
    });
  })();
  const importable=it=>it.status!=="same"&&(it.status!=="absent"||withAbsent);
  const isOn=it=>importable(it)&&((it.idx in sel)?sel[it.idx]:(it.def||it.status==="absent"));
  const chosen=items.filter(isOn);
  const count=k=>items.filter(it=>it.status===k).length;
  const go=async()=>{
    setRun({done:0,total:chosen.length,fail:0});let fail=0;
    for(let k=0;k<chosen.length;k++){const ok=await save(chosen[k].target,chosen[k].sn);if(ok===false)fail++;setRun({done:k+1,total:chosen.length,fail});}
    onDone(chosen.length-fail,fail);
  };
  const chip=(label,n,col,bg)=>n>0&&<span style={{fontSize:12,fontWeight:700,color:col,background:bg,borderRadius:99,padding:"2px 10px"}}>{n} {label}</span>;
  const STX={new:["Nouveau",T.emerald600],approx:["Correspondance approchée",T.amber600],replace:["Remplace",T.amber600],same:["Déjà à jour",T.ink300],dup:["Doublon",T.red500],absent:["Absent du planning",T.ink300]};
  return(<div style={{padding:"14px 16px",borderBottom:"1px solid "+T.line,background:T.surface}}>
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:8}}>
      <div style={{fontWeight:700,fontSize:14,color:T.ink900,flex:"1 1 auto"}}>Importer une liste de N° de série</div>
      <button onClick={()=>{setText(SERIE_SEED_TEXT);setSel({});}} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink700,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Charger la liste connue (07/10/2026)</button>
      <button onClick={onClose} style={{padding:"5px 12px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink500,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Fermer</button>
    </div>
    <textarea value={text} onChange={e=>{setText(e.target.value);setSel({});}} rows={5} placeholder={"Collez ici les colonnes PJ · Client · N° de série copiées depuis Excel…\nPJ362\tNIMEX\tORC-1233-20-362"}
      style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontSize:12.5,fontFamily:T.fontMono,resize:"vertical"}}/>
    {items.length>0&&<>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",margin:"10px 0"}}>
        {chip("à enregistrer",chosen.length,T.teal600,T.teal100)}
        {chip("déjà à jour",count("same"),T.ink500,T.card)}
        {chip("approchée"+(count("approx")>1?"s":""),count("approx"),T.amber600,T.card)}
        {chip("à remplacer",count("replace"),T.amber600,T.card)}
        {chip("doublon"+(count("dup")>1?"s":""),count("dup"),T.red500,T.card)}
        {chip("absent"+(count("absent")>1?"s":"")+" du planning",count("absent"),T.ink500,T.card)}
        {count("absent")>0&&<label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={withAbsent} onChange={e=>setWithAbsent(e.target.checked)}/>Mémoriser aussi les PJ absents du planning actuel</label>}
      </div>
      <div style={{maxHeight:260,overflow:"auto",border:"1px solid "+T.line,borderRadius:8,background:T.card}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
          <tbody>{items.map(it=>{const [lab,col]=STX[it.status];const can=importable(it);const on=isOn(it);
            return(<tr key={it.idx} style={{borderBottom:"1px solid "+T.line,opacity:can?1:.55}}>
              <td style={{padding:"4px 10px",width:26}}><input type="checkbox" disabled={!can} checked={!!on} onChange={e=>setSel(s=>({...s,[it.idx]:e.target.checked}))}/></td>
              <td style={{padding:"4px 6px",fontFamily:T.fontMono,fontWeight:700,color:T.teal600,whiteSpace:"nowrap"}}>{it.code}</td>
              <td style={{padding:"4px 6px",color:T.ink500,whiteSpace:"nowrap"}}>{it.client}</td>
              <td style={{padding:"4px 6px",fontFamily:T.fontMono,fontWeight:600,color:T.ink900,whiteSpace:"nowrap"}}>{it.sn}</td>
              <td style={{padding:"4px 10px",color:col,fontWeight:700,whiteSpace:"nowrap"}}>{lab}</td>
              <td style={{padding:"4px 6px",color:T.ink500}}>{it.note}</td>
            </tr>);})}</tbody>
        </table>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginTop:10}}>
        <button disabled={!chosen.length||(run&&run.done<run.total)} onClick={go} style={{padding:"7px 16px",borderRadius:8,border:"none",background:chosen.length?T.teal500:T.line,color:"#fff",fontSize:13,fontWeight:700,cursor:chosen.length?"pointer":"default"}}>Enregistrer {chosen.length} N° de série</button>
        {run&&<span style={{fontSize:12.5,fontWeight:700,color:run.fail?T.red500:T.teal600}}>{run.done} / {run.total}{run.fail?" · "+run.fail+" échec"+(run.fail>1?"s":""):""}</span>}
      </div>
    </>}
    {text.trim()&&items.length===0&&<div style={{marginTop:8,fontSize:12.5,color:T.red500}}>Aucune ligne reconnue : chaque ligne doit commencer par un code PJ (ex. PJ362) et contenir un N° de série.</div>}
  </div>);
}

export function SerieTab({data,savePjMetaOverride}){
  const [q,setQ]=useState("");const [onlyMissing,setOnlyMissing]=useState(false);const [msg,setMsg]=useState("");const [imp,setImp]=useState(false);
  const rows=data.map(r=>({r,meta:getPjMeta(r.pj,r)}));   // relu à chaque rendu : les N° saisis arrivent par les corrections de fiche (hors `data`)
  const filled=rows.filter(x=>x.meta.numSerie).length;
  const shown=(()=>{const s=q.trim().toLowerCase();return rows.filter(({r,meta})=>(!onlyMissing||!meta.numSerie)&&(!s||r.pj.toLowerCase().includes(s)||(meta.nomProjet||"").toLowerCase().includes(s)||(meta.numSerie||"").toLowerCase().includes(s)||(meta.pays||"").toLowerCase().includes(s)||(r.gamme||"").toLowerCase().includes(s)));})();
  const save=async(pj,val)=>savePjMetaOverride?savePjMetaOverride(pj,{numSerie:val}):false;
  const pasteMany=async(startPj,text)=>{
    const lines=text.replace(/\r/g,"").split("\n").map(x=>x.trim()).filter((x,i,a)=>x!==""||i<a.length-1);
    const i0=shown.findIndex(x=>x.r.pj===startPj);if(i0<0)return;
    const targets=shown.slice(i0,i0+lines.length);
    setMsg("Enregistrement de "+targets.length+" valeur"+(targets.length>1?"s":"")+"…");
    let ok=0;for(let k=0;k<targets.length;k++){if(lines[k]===""){continue;}if(await save(targets[k].r.pj,lines[k]))ok++;}
    setMsg(ok+" N° de série enregistré"+(ok>1?"s":"")+" à partir de "+startPj+".");setTimeout(()=>setMsg(""),4000);
  };
  return(<div style={{...CARD,padding:0,overflow:"hidden"}}>
    <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",borderBottom:"1px solid "+T.line}}>
      <div style={{flex:"1 1 260px",minWidth:0}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900}}>N° de série des machines</div>
        <div style={{fontSize:12,color:T.ink300,marginTop:2}}>Un numéro par PJ, repris partout dans l'application. Collez une colonne Excel dans une cellule pour remplir les lignes suivantes.</div>
      </div>
      <span style={{fontSize:12.5,fontWeight:700,color:filled===rows.length?T.emerald600:T.ink500,background:filled===rows.length?T.emerald100:T.surface,borderRadius:99,padding:"3px 12px"}}>{filled} / {rows.length} renseignés</span>
      <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un PJ, projet, N° de série…" style={{padding:"6px 10px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontSize:12.5,fontFamily:T.font,width:230}}/>
      <button onClick={()=>setImp(v=>!v)} style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+(imp?T.teal500:T.line),background:imp?T.teal100:T.card,color:imp?T.teal600:T.ink700,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Importer une liste</button>
      <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={onlyMissing} onChange={e=>setOnlyMissing(e.target.checked)}/>Seulement les manquants ({rows.length-filled})</label>
    </div>
    {imp&&<ImportPanel rows={rows} save={save} onClose={()=>setImp(false)} onDone={(ok,fail)=>{setMsg(ok+" N° de série importé"+(ok>1?"s":"")+(fail?" · "+fail+" échec"+(fail>1?"s":""):"")+".");setTimeout(()=>setMsg(""),5000);}}/>}
    {msg&&<div style={{padding:"6px 16px",fontSize:12.5,fontWeight:700,color:T.teal600,background:T.teal100}}>{msg}</div>}
    <div style={{overflow:"auto",maxHeight:"calc(100vh - 290px)"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr>{["N° PJ","Projet","Pays","Gamme","N° de série"].map(h=><th key={h} style={{position:"sticky",top:0,zIndex:2,background:T.surface,boxShadow:"0 1px 0 "+T.line,textAlign:"left",padding:"8px 12px",fontSize:11.5,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>)}</tr></thead>
        <tbody>
          {shown.map(({r,meta})=><Row key={r.pj} r={r} meta={meta} value={meta.numSerie} onSave={save} onPasteMany={pasteMany}/>)}
          {shown.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:T.ink300,fontSize:13}}>Aucun PJ.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>);
}
