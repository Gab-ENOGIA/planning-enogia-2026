import React, { useState } from "react";
import { T } from "../theme";
import { getPjMeta, initials, personTint, DriftDot, PresenceChip, presenceKind, CountryFlag, ETAT_META, ALL_ETATS, ALL_GAMMES, GAMME_COLORS, MONTHS, today } from "../pjMeta";
import { diffDays, fmtMode } from "../parsers";
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
    <button ref={btnRef} onClick={openMenu} style={{padding:"6px 12px",borderRadius:8,border:"none",background:hidden.size>0?T.teal100:T.card,color:hidden.size>0?T.teal600:T.ink700,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:hidden.size>0?T.neuInSm:T.neuOutSm}}><span style={{color:T.teal500,display:"flex"}}><NavIcon name="settings" size={12}/></span>Colonnes{hidden.size>0?" ("+(TABLE_COLUMNS.length-hidden.size)+"/"+TABLE_COLUMNS.length+")":""}</button>
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
// Sélecteur d'affichage des dates (Jours / Semaines / Mois), déplacé ici depuis l'en-tête
// global de l'application (qui ne doit plus porter que le titre) — se présente comme les
// autres réglages de la vue liste (bouton + menu flottant, même famille que ColumnPicker).
export function DateFormatPicker({df,setDf}){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const LABELS={date:"Jours",semaine:"Semaines",mois:"Mois"};
  const openMenu=()=>{
    if(btnRef.current){const r=btnRef.current.getBoundingClientRect();setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-170)});}
    setOpen(v=>!v);
  };
  return(<span style={{position:"relative",display:"inline-block"}}>
    <button ref={btnRef} onClick={openMenu} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.card,color:T.ink700,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:T.neuOutSm}}>
      <span style={{color:T.teal500,display:"flex"}}><NavIcon name="calendar" size={12}/></span>Affichage : {LABELS[df]}
    </button>
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
      <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:10,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,minWidth:150,overflow:"hidden",fontFamily:T.font}}>
        {Object.entries(LABELS).map(([k,l])=><div key={k} onClick={()=>{setDf(k);setOpen(false);}} style={{padding:"9px 14px",cursor:"pointer",fontSize:13.5,fontWeight:df===k?700:500,color:df===k?T.teal600:T.ink700,background:df===k?T.teal100:"transparent"}}>{l}</div>)}
      </div>
    </>}
  </span>);
}
// Gamme/Projet/Pays élargis (ils étaient tronqués par l'ellipsis vu leur contenu — "Ajuster
// automatiquement les colonnes pour qu'on puisse voir toutes les données") ; État réduit en
// contrepartie car le badge est déjà compact depuis la réduction de sa police.
// Colonnes de dates élargies : avec l'année (« 20/10/26 ») elles étaient tronquées par « … » (demandé : « dans l'onglet liste on ne voit pas l'année »).
export const DEFAULT_COL_WIDTHS_PCT={pj:7,projet:12,pays:8,chef:5,gamme:7,etat:8,arrivee:9,tests:14,finprod:9,depart:9,avancement:7,commentaires:5};
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
export function TableView({data,progress,df,setDf,selEtats,setSelEtats,selGammes,setSelGammes,allPJs,selPJs,setSelPJs,allProjets,selProjets,setSelProjets,allPays,selPays,setSelPays,allChefs,selChefs,setSelChefs,selMoisArrivee,setSelMoisArrivee,selMoisTests,setSelMoisTests,selMoisFinProd,setSelMoisFinProd,selMoisDepart,setSelMoisDepart,comments,addComment,deleteComment,pinOk,delays,delayTypes,addDelayAllocation,deleteDelayAllocation,addDelayComment,deleteDelayComment,externalSel,setExternalSel,authorName,savePjMetaOverride,canEditMeta}){
  const [selInternal,setSelInternal]=useState(null);
  const sel=externalSel!==undefined?externalSel:selInternal;
  const setSel=setExternalSel||setSelInternal;
  // Volet de droite (fiche projet) réductible (demandé explicitement) — mémorisé entre les visites.
  const [panelCollapsed,setPanelCollapsed]=useState(()=>{try{return localStorage.getItem("enogia_panelCollapsed")==="1";}catch(e){return false;}});
  const togglePanel=()=>setPanelCollapsed(v=>{const n=!v;try{localStorage.setItem("enogia_panelCollapsed",n?"1":"0");}catch(e){}return n;});
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
  const thBase={padding:"12px 16px",textAlign:"left",fontWeight:600,color:T.ink500,fontSize:12.5,whiteSpace:"nowrap",position:"relative",overflow:"hidden"};
  // Pas de cadre ni de carte ici (demandé explicitement : trop de bordures plus foncées que le
  // crème, ça faisait "bizarre") — aucun fond propre sur ce bloc, ni sur la barre d'outils, ni
  // sur l'en-tête du tableau, ni sur les lignes par défaut : tout reste au même crème que la
  // page. Seuls les boutons de la barre d'outils gardent un fond blanc (affordance de clic), et
  // un unique filet fin sépare la barre d'outils du tableau — le reste ne s'appuie que sur
  // l'espacement, pas sur des traits.
  // Mise en page à deux colonnes : la liste (qui peut rétrécir) + la fiche projet persistante à
  // droite (qui se met à jour au clic sur une ligne, demandé explicitement — plus de pop-up qui
  // s'ouvre/se ferme). flexWrap fait repasser la fiche sous le tableau sur un écran étroit plutôt
  // que de l'écraser, pour rester responsive.
  // alignItems par défaut (stretch, pas flex-start) : la colonne de droite doit être aussi haute
  // que la liste pour que son panneau "position:sticky" ait la place de suivre le défilement sur
  // toute la hauteur de la liste, plutôt que de décrocher après le premier écran — demandé
  // explicitement ("ça doit être un élément qui suit le défilement vers le bas").
  return(<div style={{display:"flex",gap:20,flexWrap:"wrap",fontFamily:T.font}}>
  <div style={{flex:"3 1 560px",minWidth:0}}>
    <div style={{padding:"13px 4px",display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10}}>
      {setDf&&<DateFormatPicker df={df} setDf={setDf}/>}
      <button onClick={exportToExcel} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.card,color:T.ink700,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:T.neuOutSm,transition:"box-shadow .15s ease"}}
        onMouseDown={e=>e.currentTarget.style.boxShadow=T.neuInSm} onMouseUp={e=>e.currentTarget.style.boxShadow=T.neuOutSm} onMouseLeave={e=>e.currentTarget.style.boxShadow=T.neuOutSm}><span style={{color:T.teal500,display:"flex"}}><NavIcon name="download" size={12}/></span>Export Excel</button>
      <ColumnPicker hidden={hiddenCols} setHidden={setHiddenCols}/>
    </div>
    <div style={{overflowX:"auto",overflowY:"visible",padding:"0 4px"}}>
    {/* tableLayout:"auto" (plus "fixed") : les largeurs de colonnes ci-dessous ne sont plus que des
        points de départ — le navigateur élargit automatiquement une colonne si son contenu ne
        rentre pas, au lieu de le tronquer avec "..." ("ajuster automatiquement les colonnes pour
        qu'on puisse voir toutes les données"). Le défilement horizontal du conteneur parent prend
        le relais si la somme dépasse la largeur visible. */}
    <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto",fontVariantNumeric:"tabular-nums"}}>
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
      <thead><tr style={{background:T.surface,boxShadow:"0 1px 0 "+T.line,position:"sticky",top:0,zIndex:10}}>
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
        const isSel=sel===r.pj;
        // Même fond que la page (T.surface) par défaut, plutôt qu'une carte blanche — demandé
        // explicitement pour que la liste et la page ne fassent plus qu'un seul aplat.
        const rowBg=isSel?T.teal100:T.surface;
        const [avTint,avTintBg]=personTint(meta.chefProjet);
        return(<tr key={i} onClick={()=>setSel(sel===r.pj?null:r.pj)} style={{borderBottom:"1px solid "+T.surfaceAlt,borderLeft:"2px solid "+(isSel?T.teal500:"transparent"),cursor:"pointer",background:rowBg,transition:"background .1s ease, border-color .1s ease"}}
          onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=T.surfaceAlt;}}
          onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=rowBg;}}>
          <td style={{padding:"10px 16px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:7}}>
              <span style={{fontFamily:T.fontMono,fontWeight:500,color:T.ink900,fontSize:13.5}}>{r.pj}</span>
              <DriftDot drift={r.drift}/>
            </span>
          </td>
          {show("projet")&&<td style={{padding:"10px 16px",color:T.ink900,fontSize:13.5,whiteSpace:"nowrap",fontWeight:600,letterSpacing:"-.005em"}}>{meta.nomProjet}</td>}
          {show("pays")&&<td style={{padding:"10px 16px",color:T.ink500,fontSize:13.5,whiteSpace:"nowrap"}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><CountryFlag pays={meta.pays} size={14}/> {meta.pays}</span></td>}
          {show("chef")&&<td style={{padding:"10px 16px",whiteSpace:"nowrap",textAlign:"center"}}>
            <span title={meta.chefProjet} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:avTintBg,color:avTint,fontSize:10,fontWeight:700,flexShrink:0}}>{initials(meta.chefProjet)}</span>
          </td>}
          {show("gamme")&&<td style={{padding:"10px 16px",color:T.ink500,fontSize:13.5,whiteSpace:"nowrap"}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><span style={{width:7,height:7,borderRadius:"50%",background:GAMME_COLORS[r.gamme]||T.ink300,flexShrink:0}}/>{r.gamme}</span></td>}
          {show("etat")&&<td style={{padding:"10px 16px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><Badge etat={r.etat}/></td>}
          {show("arrivee")&&<td style={{padding:"10px 8px 10px 12px",color:T.ink700,fontSize:13.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmtMode(r.arrivee?new Date(r.arrivee):null,df)}</td>}
          {show("tests")&&<td style={{padding:"10px 8px 10px 12px",color:T.ink700,fontSize:13.5,whiteSpace:"nowrap"}}>
            {r.tests?fmtMode(new Date(r.tests),df):"—"}{r.testsFin?" → "+fmtMode(new Date(r.testsFin),df):""}
            {presenceKind(r.clientPresence)&&<span style={{display:"block",marginTop:3}}><PresenceChip kind={presenceKind(r.clientPresence)} date={r.clientPresence.date} compact/></span>}
          </td>}
          {show("finprod")&&<td style={{padding:"10px 8px 10px 12px",color:T.ink700,fontSize:13.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmtMode(r.finProd?new Date(r.finProd):null,df)}</td>}
          {show("depart")&&<td style={{padding:"10px 8px 10px 12px",fontWeight:600,color:done?T.emerald600:urgent?T.amber600:T.ink900,fontSize:13.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmtMode(r.depart?new Date(r.depart):null,df)}</td>}
          {show("avancement")&&<td style={{padding:"10px 16px",whiteSpace:"nowrap",overflow:"hidden"}}>
            {pval!=null?<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:44,background:T.surfaceAlt,borderRadius:20,height:4,overflow:"hidden"}}><div style={{width:pval+"%",height:"100%",background:pval>=100?T.emerald500:pval>=50?T.teal500:T.amber500,borderRadius:20}}/></div><span style={{fontSize:13.5,fontWeight:600,color:T.ink500}}>{pval}%</span></div>
            :<span style={{color:T.ink300}}>—</span>}
          </td>}
          {show("commentaires")&&<td style={{padding:"10px 16px",whiteSpace:"nowrap"}}>
            {(()=>{const n=(comments?.[r.pj]||[]).length;return n>0?
              <span style={{display:"inline-flex",alignItems:"center",gap:5,color:T.ink500,fontSize:13.5,fontWeight:600}}><NavIcon name="comments" size={11}/>{n}</span>
              :<span style={{color:T.ink100,fontSize:13.5}}>—</span>;})()}
          </td>}
        </tr>);
      })}</tbody>
    </table>
    </div>
  </div>
  {/* flex:"2 1 300px" + maxWidth: colonne nettement plus étroite que la liste, et qui peut
      rétrécir jusqu'à 300px avant de repasser à la ligne — demandé explicitement ("la réduire
      en taille aussi pour que cela soit responsive"). */}
  {panelCollapsed?
    <div style={{flex:"0 0 36px",position:"sticky",top:16,alignSelf:"flex-start"}}>
      <button onClick={togglePanel} title="Afficher le volet de droite" style={{width:36,height:36,borderRadius:9,border:"1px solid "+T.line,background:T.card,color:T.ink500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700}}>‹</button>
    </div>
  :<div style={{flex:"2 1 300px",maxWidth:360,minWidth:260}}>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:6}}>
      <button onClick={togglePanel} title="Réduire le volet" style={{height:26,padding:"0 10px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:T.ink500,cursor:"pointer",fontSize:12,fontWeight:700}}>Réduire ›</button>
    </div>
    <ProjectModal inline pj={sel} data={data} df={df} onClose={()=>setSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}
      pinOk={pinOk} delays={delays} delayTypes={delayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
      addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>
  </div>}
  </div>);
}

