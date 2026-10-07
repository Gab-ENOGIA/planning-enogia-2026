import React, { useState, useMemo } from "react";
import { T } from "../theme";
import { getPjMeta, CountryFlag, SerieTag } from "../pjMeta";
import { fmt, diffDays } from "../parsers";
import { CARD, EmptyNote } from "./ManagerParts";

// ── Niveau de confiance par PJ : 4 feux (comme « Overall Project Status » du reporting PowerPoint) ──
// planning · cash in/out · risques / problèmes · communication client. Un feu = rouge (à risque),
// jaune (vigilance) ou vert (bon) ; pas de feu = non renseigné. Stocké par PJ dans
// planning/pjMetaOverrides (champs feux + feuxAt), donc jamais écrasé par un import MS Project.
export const FEUX=[["planning","Planning"],["cash","Cash in/out"],["risques","Risques / Problèmes"],["com","Communication client"]];
// Commentaires d'explication saisis dans la fiche synthèse (meta.notes) et repris dans le rapport CODIR :
// « codir » = commentaire de synthèse (anciennement « headline ») ; les autres clés accompagnent un feu ou un indicateur chiffré.
export const NOTE_LABELS={codir:"Commentaire CODIR",planning:"Planning",cash:"Cash in/out",risques:"Risques / Problèmes",com:"Communication client",av:"Avancement",dr:"Dérive du départ",rt:"Retards",ct:"Contrat"};
export const NOTE_ORDER=["planning","cash","risques","com","av","dr","rt","ct"];
export const NOTE_MAX=200;
export const CODIR_MAX=450;   // commentaire de synthèse (zone dédiée, visible uniquement dans le rapport CODIR)
export const FEU_LEVELS=[["red","À risque"],["yellow","Vigilance"],["green","Bon"]];
export const feuColor=l=>l==="red"?T.red500:l==="yellow"?"#E3B505":l==="green"?T.emerald500:T.ink100;
export const feuLabel=l=>(FEU_LEVELS.find(x=>x[0]===l)||[0,"Non renseigné"])[1];
export const feuxOf=meta=>(meta&&meta.feux)||{};
const RANK={red:3,yellow:2,green:1};
export const worstFeu=f=>Object.values(f||{}).reduce((w,l)=>(RANK[l]||0)>(RANK[w]||0)?l:w,null);
export const patchFeu=(meta,key,level)=>{
  const next={...feuxOf(meta)};
  if(level)next[key]=level;else delete next[key];
  const d=new Date();
  return{feux:next,feuxAt:d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
};

// Trois pastilles cliquables ; recliquer sur la pastille choisie remet « non renseigné ».
export function FeuPicker({value,onChange,size=16,disabled}){
  return(<span style={{display:"inline-flex",alignItems:"center",gap:6}}>
    {FEU_LEVELS.map(([lv,lab])=>{
      const on=value===lv;const c=feuColor(lv);
      return(<button key={lv} type="button" disabled={disabled} title={lab+(on?" (cliquer pour effacer)":"")} aria-label={lab} onClick={()=>onChange(on?null:lv)}
        style={{width:size,height:size,borderRadius:"50%",border:"2px solid "+c,background:on?c:"transparent",opacity:value&&!on?.35:1,cursor:disabled?"default":"pointer",padding:0,boxShadow:on?"0 0 0 3px "+c+"33":"none",transition:"all .12s ease"}}/>);
    })}
  </span>);
}
export function FeuDot({value,size=12}){
  return <span title={feuLabel(value)} style={{display:"inline-block",width:size,height:size,borderRadius:"50%",background:value?feuColor(value):"transparent",border:"2px solid "+feuColor(value),boxSizing:"border-box"}}/>;
}

// ── Vue d'ensemble : tous les PJ × 4 feux, édition directe ──────────────────────────────────────────
export function SanteTab({rows,onSave}){
  const [hideEmpty,setHideEmpty]=useState(false);
  const metaOf=r=>getPjMeta(r.pj,r);
  const list=useMemo(()=>{
    const l=rows.map(r=>{const m=getPjMeta(r.pj,r);return{r,m,f:feuxOf(m)};});
    const sev=x=>{const v=Object.values(x.f);return v.filter(l=>l==="red").length*100+v.filter(l=>l==="yellow").length*10;};
    l.sort((a,b)=>sev(b)-sev(a)||a.r.pj.localeCompare(b.r.pj));
    return hideEmpty?l.filter(x=>Object.keys(x.f).length>0):l;
  },[rows,hideEmpty]);
  const counts=FEUX.map(([k])=>{const c={red:0,yellow:0,green:0,none:0};rows.forEach(r=>{const l=feuxOf(metaOf(r))[k];c[l||"none"]++;});return c;});
  const COLS="minmax(150px,1.3fr) repeat(4,minmax(96px,1fr)) minmax(90px,.8fr) 78px";
  return(<div style={{...CARD,overflow:"hidden"}}>
    <div style={{padding:"14px 16px 10px",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
      <div>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:17,color:T.ink900}}>Santé des projets</div>
        <div style={{fontSize:13,color:T.ink500,marginTop:2}}>Niveau de confiance par projet : cliquez sur un feu pour le fixer, recliquez pour l'effacer. Les projets les plus à risque sont en tête.</div>
      </div>
      <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",fontSize:12,color:T.ink500,fontWeight:600}}>
        {FEU_LEVELS.map(([lv,lab])=><span key={lv} style={{display:"inline-flex",alignItems:"center",gap:5}}><FeuDot value={lv} size={11}/>{lab}</span>)}
        <button onClick={()=>setHideEmpty(v=>!v)} style={{border:"1px solid "+(hideEmpty?T.teal500:T.line),background:hideEmpty?T.teal100:"transparent",color:hideEmpty?T.teal600:T.ink500,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>Seulement les projets évalués</button>
      </div>
    </div>
    <div style={{overflowX:"auto"}}>
      <div style={{minWidth:760}}>
        <div style={{display:"grid",gridTemplateColumns:COLS,gap:12,padding:"7px 16px",background:T.surface,borderTop:"1px solid "+T.line,borderBottom:"1px solid "+T.line,fontSize:11,fontWeight:700,color:T.ink300,textTransform:"uppercase",letterSpacing:".04em",alignItems:"end"}}>
          <span>PJ</span>
          {FEUX.map(([k,lab],i)=><span key={k} style={{lineHeight:1.2}}>{lab}
            <span style={{display:"flex",gap:7,marginTop:3,textTransform:"none",letterSpacing:0,fontWeight:700}}>
              {["red","yellow","green"].map(lv=><span key={lv} style={{color:feuColor(lv)}}>{counts[i][lv]}</span>)}
              <span style={{color:T.ink300}}>· {counts[i].none} ?</span>
            </span></span>)}
          <span>Écart vs contrat</span><span style={{textAlign:"right"}}>MAJ</span>
        </div>
        {list.length===0&&<EmptyNote>{hideEmpty?"Aucun projet évalué pour le moment.":"Aucun PJ à afficher."}</EmptyNote>}
        {list.map(({r,m,f})=>{
          const tf=m.contratTFin?new Date(m.contratTFin):null;const dep=r.depart?new Date(r.depart):null;
          const ec=tf&&dep?diffDays(tf,dep):null;
          return(<div key={r.pj} style={{display:"grid",gridTemplateColumns:COLS,gap:12,alignItems:"center",padding:"7px 16px",borderBottom:"1px solid "+T.surface}}
            onMouseEnter={e=>e.currentTarget.style.background=T.surface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontFamily:T.fontMono,fontWeight:700,fontSize:13,color:T.teal600}}>{r.pj}</span><SerieTag pj={r.pj}/><CountryFlag pays={m.pays} size={11}/></div>
              <div title={m.nomProjet||""} style={{fontSize:11,color:T.ink300,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nomProjet||""}</div>
            </div>
            {FEUX.map(([k])=><FeuPicker key={k} value={f[k]||null} onChange={lv=>onSave(r.pj,patchFeu(m,k,lv))}/>)}
            <span style={{fontSize:12.5,fontWeight:700,color:ec==null?T.ink300:ec>0?T.red500:T.emerald600}}>{ec==null?(tf?"—":"Tfin non saisie"):ec===0?"dans les temps":(ec>0?"+":"")+ec+"j"}</span>
            <span style={{fontSize:11,color:T.ink300,textAlign:"right"}}>{m.feuxAt?fmt(new Date(m.feuxAt)):"—"}</span>
          </div>);
        })}
      </div>
    </div>
  </div>);
}
