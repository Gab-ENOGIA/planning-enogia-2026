import React, { useState } from "react";
import { T } from "../theme";
import { getPjMeta, initials, DriftDot, PersonIcon, CountryFlag, ETAT_META, ALL_ETATS, ALL_GAMMES, MONTHS, today } from "../pjMeta";
import { fmt, diffDays, fmtMode } from "../parsers";
import { useSheetJS, Badge, DropFilter, NavIcon } from "./SharedUI";
import { ProjectModal } from "./ProjectModal";

export const TABLE_COLUMNS=[
  {id:"projet",label:"Projet"},
  {id:"commentaires",label:"Commentaires"},
  {id:"pays",label:"Pays"},
  {id:"chef",label:"Chef de Projet"},
  {id:"gamme",label:"Gamme"},
  {id:"etat",label:"État"},
  {id:"arrivee",label:"Arrivée"},
  {id:"tests",label:"Tests"},
  {id:"finprod",label:"Fin prod"},
  {id:"depart",label:"Départ"},
  {id:"avancement",label:"Avancement"},
];
export function ColumnPicker({hidden,setHidden}){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const toggle=id=>{const s=new Set(hidden);s.has(id)?s.delete(id):s.add(id);setHidden(s);};
  const openMenu=()=>{
    if(btnRef.current){const r=btnRef.current.getBoundingClientRect();setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-230)});}
    setOpen(v=>!v);
  };
  return(<span style={{position:"relative",display:"inline-block"}}>
    <button ref={btnRef} onClick={openMenu} style={{padding:"8px 15px",borderRadius:10,border:"none",background:hidden.size>0?T.teal100:T.surface,color:hidden.size>0?T.teal600:T.ink700,fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:hidden.size>0?T.neuInSm:T.neuOutSm}}>⚙ Colonnes{hidden.size>0?" ("+(TABLE_COLUMNS.length-hidden.size)+"/"+TABLE_COLUMNS.length+")":""}</button>
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
      <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:12,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,minWidth:200,maxHeight:340,overflowY:"auto",fontFamily:T.font}}>
        <div style={{padding:"9px 14px",fontSize:13,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".03em",borderBottom:"1px solid "+T.line,background:T.surface}}>Colonnes visibles</div>
        {TABLE_COLUMNS.map(c=>{const visible=!hidden.has(c.id);return(
          <div key={c.id} onClick={()=>toggle(c.id)} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 14px",cursor:"pointer",borderBottom:"1px solid "+T.surface}}>
            <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(visible?T.teal500:T.ink100),background:visible?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{visible&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}</div>
            <span style={{fontSize:15,color:T.ink700,fontWeight:visible?600:400}}>{c.label}</span>
          </div>
        );})}
      </div>
    </>}
  </span>);
}
export const DEFAULT_COL_WIDTHS_PCT={pj:7,projet:11,pays:8,chef:7,gamme:5,etat:13,arrivee:7,tests:10,finprod:7,depart:7,avancement:8,commentaires:7};
export function ResizeHandle({colId,nextColId,colWidths,setColWidths}){
  const onMouseDown=e=>{
    e.preventDefault();
    const startX=e.clientX;
    const table=e.target.closest("table");
    const tableW=table?table.getBoundingClientRect().width:1000;
    const startW=colWidths[colId];
    const startNextW=nextColId?colWidths[nextColId]:null;
    const onMove=ev=>{
      const deltaPct=((ev.clientX-startX)/tableW)*100;
      setColWidths(w=>{
        const next={...w};
        const newW=Math.max(5,startW+deltaPct);
        if(nextColId&&startNextW!=null){
          // Transfère la largeur entre la colonne courante et la suivante, la somme totale reste constante
          const newNextW=Math.max(5,startNextW-deltaPct);
          const actualDelta=newW-startW;
          next[colId]=startW+actualDelta;
          next[nextColId]=startNextW-actualDelta;
        }else{
          next[colId]=newW;
        }
        return next;
      });
    };
    const onUp=()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };
  return <div onMouseDown={onMouseDown} style={{position:"absolute",right:-3,top:0,bottom:0,width:6,cursor:"col-resize",zIndex:3}}/>;
}
export function TableView({data,progress,df,selEtats,setSelEtats,selGammes,setSelGammes,allPJs,selPJs,setSelPJs,allProjets,selProjets,setSelProjets,allPays,selPays,setSelPays,allChefs,selChefs,setSelChefs,selMoisArrivee,setSelMoisArrivee,selMoisTests,setSelMoisTests,selMoisFinProd,setSelMoisFinProd,selMoisDepart,setSelMoisDepart,comments,addComment,deleteComment}){
  const [sel,setSel]=useState(null);
  const [hiddenCols,setHiddenCols]=useState(new Set());
  const [colWidths,setColWidths]=useState(DEFAULT_COL_WIDTHS_PCT);
  useSheetJS();
  const show=id=>!hiddenCols.has(id);
  const cw=id=>(colWidths[id]||DEFAULT_COL_WIDTHS_PCT[id])+"%";
  const exportToExcel=()=>{
    if(!window.XLSX){alert("Librairie Excel en cours de chargement, réessayez dans 2 secondes.");return;}
    const headers=["N° PJ","Projet","Pays","Chef de Projet","Gamme","État","Arrivée","Tests","Fin prod","Départ","Avancement (%)"];
    const rows=data.map(r=>{
      const meta=getPjMeta(r.pj,r);
      const pval=progress[r.pj];
      return [
        r.pj,
        meta.nomProjet,
        meta.pays,
        meta.chefProjet,
        r.gamme||"",
        ETAT_META[r.etat]?.label||r.etat||"",
        r.arrivee?new Date(r.arrivee).toLocaleDateString("fr-FR"):"",
        (r.tests?new Date(r.tests).toLocaleDateString("fr-FR"):"")+(r.testsFin?" → "+new Date(r.testsFin).toLocaleDateString("fr-FR"):""),
        r.finProd?new Date(r.finProd).toLocaleDateString("fr-FR"):"",
        r.depart?new Date(r.depart).toLocaleDateString("fr-FR"):"",
        pval!=null?pval:""
      ];
    });
    const ws=window.XLSX.utils.aoa_to_sheet([headers,...rows]);
    ws["!cols"]=headers.map(()=>({wch:17}));
    const wb=window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb,ws,"Planning");
    const dateStr=new Date().toLocaleDateString("fr-FR").replaceAll("/","-");
    window.XLSX.writeFile(wb,"Planning_Enogia_"+dateStr+".xlsx");
  };
  // Liste ordonnée des colonnes actuellement visibles, pour savoir quelle est "la suivante" lors du redimensionnement
  const visibleColOrder=["pj","projet","pays","chef","gamme","etat","arrivee","tests","finprod","depart","avancement"].filter(id=>id==="pj"||show(id));
  const nextVisible=id=>{const i=visibleColOrder.indexOf(id);return i>=0&&i<visibleColOrder.length-1?visibleColOrder[i+1]:null;};
  const thBase={padding:"10px 14px",textAlign:"left",fontWeight:700,color:T.ink500,fontSize:15,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".04em",position:"relative",overflow:"hidden"};
  return(<div style={{background:T.surface,borderRadius:16,boxShadow:T.neuOut,fontFamily:T.font}}>
    <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.line,display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10}}>
      <button onClick={exportToExcel} style={{padding:"9px 17px",borderRadius:10,border:"none",background:T.surface,color:T.teal600,fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:7,boxShadow:T.neuOutSm,transition:"box-shadow .15s ease"}}
        onMouseDown={e=>e.currentTarget.style.boxShadow=T.neuInSm} onMouseUp={e=>e.currentTarget.style.boxShadow=T.neuOutSm} onMouseLeave={e=>e.currentTarget.style.boxShadow=T.neuOutSm}><NavIcon name="download" size={15}/>Export Excel</button>
      <ColumnPicker hidden={hiddenCols} setHidden={setHiddenCols}/>
    </div>
    <div style={{overflowX:"auto",overflowY:"visible"}}>
    <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
      <colgroup>
        <col style={{width:cw("pj")}}/>
        {show("projet")&&<col style={{width:cw("projet")}}/>}
        {show("pays")&&<col style={{width:cw("pays")}}/>}
        {show("chef")&&<col style={{width:cw("chef")}}/>}
        {show("gamme")&&<col style={{width:cw("gamme")}}/>}
        {show("etat")&&<col style={{width:cw("etat")}}/>}
        {show("arrivee")&&<col style={{width:cw("arrivee")}}/>}
        {show("tests")&&<col style={{width:cw("tests")}}/>}
        {show("finprod")&&<col style={{width:cw("finprod")}}/>}
        {show("depart")&&<col style={{width:cw("depart")}}/>}
        {show("avancement")&&<col style={{width:cw("avancement")}}/>}
      </colgroup>
      <thead><tr style={{background:T.surface,borderBottom:"2px solid "+T.line,position:"sticky",top:0,zIndex:10}}>
        <th style={thBase}>N° PJ {allPJs&&<DropFilter label="" icon options={allPJs} selected={selPJs||new Set(allPJs)} onChange={setSelPJs}/>}<ResizeHandle colId="pj" nextColId={nextVisible("pj")} colWidths={colWidths} setColWidths={setColWidths}/></th>
        {show("projet")&&<th style={thBase}>Projet {allProjets&&<DropFilter label="" icon options={allProjets} selected={selProjets||new Set(allProjets)} onChange={setSelProjets}/>}<ResizeHandle colId="projet" nextColId={nextVisible("projet")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("pays")&&<th style={thBase}>Pays {allPays&&<DropFilter label="" icon options={allPays} selected={selPays||new Set(allPays)} onChange={setSelPays}/>}<ResizeHandle colId="pays" nextColId={nextVisible("pays")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("chef")&&<th style={thBase}>Chef de Projet {allChefs&&<DropFilter label="" icon options={allChefs} selected={selChefs||new Set(allChefs)} onChange={setSelChefs} getLabel={o=>initials(o)+" — "+o}/>}<ResizeHandle colId="chef" nextColId={nextVisible("chef")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("gamme")&&<th style={thBase}>Gamme {setSelGammes&&<DropFilter label="" icon options={ALL_GAMMES} selected={selGammes} onChange={setSelGammes}/>}<ResizeHandle colId="gamme" nextColId={nextVisible("gamme")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("etat")&&<th style={thBase}>État {setSelEtats&&<DropFilter label="" icon options={ALL_ETATS} selected={selEtats} onChange={setSelEtats} getLabel={o=>ETAT_META[o]?.label||o}/>}<ResizeHandle colId="etat" nextColId={nextVisible("etat")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("arrivee")&&<th style={thBase}>Arrivée {setSelMoisArrivee&&<DropFilter label="" icon options={MONTHS} selected={selMoisArrivee} onChange={setSelMoisArrivee}/>}<ResizeHandle colId="arrivee" nextColId={nextVisible("arrivee")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("tests")&&<th style={thBase}>Tests {setSelMoisTests&&<DropFilter label="" icon options={MONTHS} selected={selMoisTests} onChange={setSelMoisTests}/>}<ResizeHandle colId="tests" nextColId={nextVisible("tests")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("finprod")&&<th style={thBase}>Fin prod {setSelMoisFinProd&&<DropFilter label="" icon options={MONTHS} selected={selMoisFinProd} onChange={setSelMoisFinProd}/>}<ResizeHandle colId="finprod" nextColId={nextVisible("finprod")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("depart")&&<th style={thBase}>Départ {setSelMoisDepart&&<DropFilter label="" icon options={MONTHS} selected={selMoisDepart} onChange={setSelMoisDepart}/>}<ResizeHandle colId="depart" nextColId={nextVisible("depart")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("avancement")&&<th style={thBase}>Avancement <span title="Cet avancement (%) reflète uniquement la production chez ENOGIA. Il ne prend pas en compte l'avancement chez les fournisseurs." style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:16,height:16,borderRadius:"50%",background:T.ink300,color:"#fff",fontSize:11,fontWeight:700,fontStyle:"italic",cursor:"help",verticalAlign:"middle"}}>i</span><ResizeHandle colId="avancement" nextColId={nextVisible("avancement")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("commentaires")&&<th style={thBase}>Commentaires<ResizeHandle colId="commentaires" nextColId={nextVisible("commentaires")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
      </tr></thead>
      <tbody>{data.map((r,i)=>{
        const dl=r.depart?diffDays(today,new Date(r.depart)):null;
        const urgent=dl!=null&&dl>=0&&dl<=30;
        const done=r.etat==="SHIPPED";
        const pval=progress[r.pj];
        const meta=getPjMeta(r.pj,r);
        const rowBg=sel===r.pj?T.teal100:(i%2===0?T.card:T.surface);
        return(<tr key={i} onClick={()=>setSel(sel===r.pj?null:r.pj)} style={{borderBottom:"1px solid "+T.surface,cursor:"pointer",background:rowBg,transition:"background .12s ease"}}
          onMouseEnter={e=>{if(sel!==r.pj)e.currentTarget.style.background=T.teal100+"80";}}
          onMouseLeave={e=>{if(sel!==r.pj)e.currentTarget.style.background=rowBg;}}>
          <td style={{padding:"13px 16px",fontWeight:700,color:T.teal600,fontSize:16,fontFamily:T.fontMono,letterSpacing:"-.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}>{r.pj}<DriftDot drift={r.drift}/></span></td>
          {show("projet")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:16,whiteSpace:"nowrap",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis"}}>{meta.nomProjet}</td>}
          {show("pays")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:16,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><CountryFlag pays={meta.pays} size={13}/> {meta.pays}</span></td>}
          {show("chef")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:16,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{initials(meta.chefProjet)}</td>}
          {show("gamme")&&<td style={{padding:"13px 16px",color:T.ink500,fontSize:15,fontFamily:T.fontMono,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.gamme}</td>}
          {show("etat")&&<td style={{padding:"13px 16px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><Badge etat={r.etat}/></td>}
          {show("arrivee")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:16,fontFamily:T.fontMono,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmtMode(r.arrivee?new Date(r.arrivee):null,df)}</td>}
          {show("tests")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:16,fontFamily:T.fontMono,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {r.tests?fmtMode(new Date(r.tests),df):"—"}{r.testsFin?" → "+fmtMode(new Date(r.testsFin),df):""}
            {r.clientPresence?.present&&<span title={"Client/NOBO présent"+(r.clientPresence.date?" le "+r.clientPresence.date:"")} style={{marginLeft:7,fontSize:13,background:T.red100,color:T.red500,borderRadius:5,padding:"2px 6px",fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}><PersonIcon size={12} color={T.red500}/>{r.clientPresence.date?" "+fmt(new Date(r.clientPresence.date)):""}</span>}
          </td>}
          {show("finprod")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:16,fontFamily:T.fontMono,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmtMode(r.finProd?new Date(r.finProd):null,df)}</td>}
          {show("depart")&&<td style={{padding:"13px 16px",fontWeight:700,color:done?T.emerald600:urgent?T.amber600:T.ink900,fontSize:16,fontFamily:T.fontMono,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmtMode(r.depart?new Date(r.depart):null,df)}</td>}
          {show("avancement")&&<td style={{padding:"13px 16px",whiteSpace:"nowrap",overflow:"hidden"}}>
            {pval!=null?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:48,background:T.surfaceAlt,borderRadius:5,height:7,overflow:"hidden"}}><div style={{width:pval+"%",height:"100%",background:pval>=100?T.emerald500:pval>=50?T.teal500:T.amber500}}/></div><span style={{fontSize:15,fontWeight:700,color:T.ink700,fontFamily:T.fontMono}}>{pval}%</span></div>
            :<span style={{color:T.ink300}}>—</span>}
          </td>}
          {show("commentaires")&&<td style={{padding:"13px 16px",whiteSpace:"nowrap"}}>
            {(()=>{const n=(comments?.[r.pj]||[]).length;return n>0?
              <span style={{display:"inline-flex",alignItems:"center",gap:6,background:T.teal100,color:T.teal600,borderRadius:20,padding:"3px 10px 3px 8px",fontSize:14,fontWeight:700}}><NavIcon name="comments" size={13}/>{n}</span>
              :<span style={{color:T.ink300,fontSize:14}}>—</span>;})()}
          </td>}
        </tr>);
      })}</tbody>
    </table>
    </div>
    {sel&&<ProjectModal pj={sel} data={data} df={df} onClose={()=>setSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}/>}
  </div>);
}

