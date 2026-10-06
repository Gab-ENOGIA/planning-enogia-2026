import React, { useState, useMemo } from "react";
import { T } from "../theme";
import { fmt } from "../parsers";
import { NavIcon } from "./SharedUI";

// Ajout de nouveaux projets au planning initial SANS toucher à ceux déjà ancrés.
// Le fichier importé (même format que l'import initial) sert uniquement à repérer les PJ qui ne
// sont pas encore dans l'initial : ceux-ci sont proposés à l'ancrage (avec les dates du fichier,
// cochables un par un) ; les PJ déjà présents sont ignorés, leurs dates initiales ne bougent jamais.
const d=v=>v?fmt(new Date(v)):"—";
const DATE_KEYS=["arrivee","tests","finProd","depart"];

export function InitialAddReview({parsed,initialData,onConfirm,onCancel,busy}){
  const known=useMemo(()=>{const m={};(initialData||[]).forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const fresh=useMemo(()=>parsed.filter(r=>!known[r.pj]).sort((a,b)=>a.pj.localeCompare(b.pj)),[parsed,known]);
  const kept=useMemo(()=>parsed.filter(r=>known[r.pj]),[parsed,known]);
  const changed=useMemo(()=>kept.filter(r=>DATE_KEYS.some(k=>(r[k]||null)!==(known[r.pj][k]||null))),[kept,known]);
  const [off,setOff]=useState(()=>new Set());
  const chosen=fresh.filter(r=>!off.has(r.pj));
  const toggle=pj=>setOff(s=>{const n=new Set(s);n.has(pj)?n.delete(pj):n.add(pj);return n;});
  const th={textAlign:"left",padding:"6px 10px",fontSize:12,fontWeight:700,color:T.ink500,whiteSpace:"nowrap"};
  const td={padding:"7px 10px",fontSize:13.5,color:T.ink700,whiteSpace:"nowrap"};
  return(<div onClick={onCancel} style={{position:"fixed",inset:0,background:"rgba(10,20,30,.45)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:T.font}}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,boxShadow:T.shadowLg,border:"1px solid "+T.line,width:"min(640px,100%)",maxHeight:"88vh",overflow:"auto",padding:"20px 22px"}}>
      <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:19,color:T.ink900,display:"flex",alignItems:"center",gap:9}}><NavIcon name="pin" size={18}/>Ajouter à l'initial</div>
      <div style={{fontSize:14,color:T.ink500,marginTop:6,lineHeight:1.5}}>
        {fresh.length>0
          ?<>{fresh.length} nouveau{fresh.length>1?"x":""} projet{fresh.length>1?"s":""} trouvé{fresh.length>1?"s":""} dans le fichier. Ils seront ancrés avec les dates ci-dessous.</>
          :<>Aucun nouveau projet : tous les PJ du fichier sont déjà dans le planning initial.</>}
      </div>
      {fresh.length>0&&<div style={{marginTop:12,border:"1px solid "+T.line,borderRadius:11,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.surface}}><th style={th}></th><th style={th}>PJ</th><th style={th}>Arrivée</th><th style={th}>Tests</th><th style={th}>Fin prod</th><th style={th}>Départ</th></tr></thead>
          <tbody>{fresh.map(r=>{const on=!off.has(r.pj);return(
            <tr key={r.pj} onClick={()=>toggle(r.pj)} style={{cursor:"pointer",borderTop:"1px solid "+T.surfaceAlt,opacity:on?1:.45}}>
              <td style={td}><input type="checkbox" checked={on} onChange={()=>toggle(r.pj)} onClick={e=>e.stopPropagation()}/></td>
              <td style={{...td,fontFamily:T.fontMono,fontWeight:600,color:T.ink900}}>{r.pj}</td>
              <td style={td}>{d(r.arrivee)}</td><td style={td}>{d(r.tests)}{r.testsFin?" → "+d(r.testsFin):""}</td><td style={td}>{d(r.finProd)}</td><td style={{...td,fontWeight:600}}>{d(r.depart)}</td>
            </tr>);})}</tbody>
        </table>
      </div>}
      <div style={{marginTop:12,fontSize:13.5,color:T.ink500,lineHeight:1.55,display:"flex",gap:8,alignItems:"flex-start"}}>
        <span style={{color:T.teal600,display:"inline-flex",marginTop:2}}><NavIcon name="pin" size={13}/></span>
        <span><b>{kept.length}</b> PJ déjà ancrés sont conservés tels quels{changed.length>0?<> — dont <b>{changed.length}</b> dont les dates diffèrent dans ce fichier (ignorées : leur référence initiale ne change pas)</>:null}.</span>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:9,marginTop:16}}>
        <button onClick={onCancel} style={{padding:"9px 16px",borderRadius:9,border:"1px solid "+T.line,background:"transparent",color:T.ink700,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:T.font}}>Annuler</button>
        <button disabled={busy||chosen.length===0} onClick={()=>onConfirm(chosen)} style={{padding:"9px 18px",borderRadius:9,border:"none",background:chosen.length===0?T.ink100:"linear-gradient(135deg,"+T.teal500+","+T.navy700+")",color:"#fff",fontWeight:700,fontSize:14,cursor:chosen.length===0||busy?"default":"pointer",fontFamily:T.font,opacity:busy?.7:1}}>{busy?"Ajout…":"Ancrer "+chosen.length+" projet"+(chosen.length>1?"s":"")}</button>
      </div>
    </div>
  </div>);
}
