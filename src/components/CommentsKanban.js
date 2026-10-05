import React, { useState, useMemo } from "react";
import { T } from "../theme";
import { getPjMeta, CountryFlag, relTime, Avatar } from "../pjMeta";
import { NavIcon } from "./SharedUI";

// Vue Kanban des commentaires (demandé explicitement : "des tuiles comme un kanban pour chaque PJ
// et des tuiles regroupées pour les commentaires multiples") — une colonne par PJ, une carte par
// commentaire, et une première colonne "Groupés" où chaque commentaire multi-PJ n'apparaît qu'une
// seule fois (au lieu d'être dupliqué dans chaque colonne PJ concernée).
const COL_W=290, COL_W_COMPACT=244;

function Card({c,onDelete,confirming,pinInput,setPinInput,onConfirm,onCancel,onJump,groupColumn,compact}){
  const [expanded,setExpanded]=useState(false);
  const long=(c.text||"").length>(compact?70:180);
  return(<div style={{background:T.card,border:"1px solid "+(groupColumn?T.violet100:T.line),borderLeft:"3px solid "+(c.private?T.amber500:groupColumn?T.violet500:T.teal500),borderRadius:10,padding:compact?"6px 9px":"10px 12px",boxShadow:T.shadowSm}}>
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:compact?3:6}}>
      <Avatar name={c.author} tint={c.private?T.amber500:T.teal500} size={compact?17:22}/>
      <span style={{fontWeight:700,color:T.ink700,fontSize:12.5,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.author}</span>
      <span style={{fontSize:10.5,color:T.ink300,flexShrink:0}}>{relTime(c.date)}</span>
      <button onClick={onDelete} title="Supprimer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:11,padding:0,flexShrink:0}}>✕</button>
    </div>
    {c.private&&<span style={{display:"inline-block",fontSize:10,color:T.amber600,background:T.amber100,borderRadius:5,padding:"1px 6px",fontWeight:700,marginBottom:5}}>Privé</span>}
    <div style={{fontSize:compact?11.5:13,color:T.ink700,whiteSpace:"pre-wrap",lineHeight:1.4,display:expanded?"block":"-webkit-box",WebkitLineClamp:expanded?"unset":(compact?2:5),WebkitBoxOrient:"vertical",overflow:"hidden"}}>{c.text}</div>
    {long&&<button onClick={()=>setExpanded(v=>!v)} style={{background:"none",border:"none",padding:0,marginTop:4,color:T.teal600,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{expanded?"Réduire":"Lire la suite"}</button>}
    {groupColumn&&c.groupPjs&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
      {c.groupPjs.map(p=><span key={p} onClick={()=>onJump&&onJump(p)} style={{fontSize:10.5,fontFamily:T.fontMono,fontWeight:700,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 6px",cursor:onJump?"pointer":"default"}}>{p}</span>)}
    </div>}
    {!groupColumn&&c.groupPjs&&<div title={"Commentaire groupé : "+c.groupPjs.join(", ")} style={{marginTop:7,fontSize:10.5,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 7px",fontWeight:700,display:"inline-block"}}>groupé ×{c.groupPjs.length}</div>}
    {c.linkedDate&&<div style={{marginTop:6,fontSize:11,color:T.ink500,fontWeight:600}}>Lié au {new Date(c.linkedDate).toLocaleDateString("fr-FR")}</div>}
    {confirming&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
      <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"5px 8px",borderRadius:7,border:"1px solid "+T.line,fontSize:12,fontFamily:T.font,width:104}}/>
      <button onClick={onConfirm} style={{padding:"5px 10px",borderRadius:7,border:"none",background:T.red500,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Confirmer</button>
      <button onClick={onCancel} style={{padding:"5px 10px",borderRadius:7,border:"none",background:T.neuPanel,color:T.ink700,fontSize:12,cursor:"pointer"}}>Annuler</button>
    </div>}
  </div>);
}

function Column({title,sub,accent,count,children,headerExtra,onHeaderClick,width,span2}){
  return(<div style={{width,flexShrink:0,gridRow:span2?"1 / span 2":undefined,display:"flex",flexDirection:"column",background:T.surfaceAlt,borderRadius:12,maxHeight:"100%",minHeight:0}}>
    <div onClick={onHeaderClick} style={{padding:"11px 12px 9px",display:"flex",alignItems:"center",gap:8,borderBottom:"2px solid "+accent,cursor:onHeaderClick?"pointer":"default",flexShrink:0}}>
      <div style={{minWidth:0,flex:1}}>
        {/* Nom complet du projet visible (demandé : « on ne voit pas encore les noms complets ») : le titre peut passer sur 2 lignes au lieu d'être tronqué par « … ». */}
        <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",columnGap:6,rowGap:1,minWidth:0}}>{title}</div>
        {sub&&<div style={{fontSize:11.5,color:T.ink500,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub}</div>}
      </div>
      <span style={{fontSize:11,fontWeight:700,color:T.ink500,background:T.card,borderRadius:20,padding:"2px 8px",flexShrink:0}}>{count}</span>
      {headerExtra}
    </div>
    <div style={{padding:8,display:"flex",flexDirection:"column",gap:7,overflowY:"auto",flex:1,minHeight:0}}>{children}</div>
  </div>);
}

export function CommentsKanban({data,comments,addComment,deleteComment,pinOk,authorName,jumpToPj,onOpenThread,search,onGroupCompose,isAdmin,hidePrivate,onTogglePrivate}){
  // Tuiles réduites + 2 étages systématiques (demandé explicitement : "le faire de base").
  const compact=true, twoRows=true;
  const [focusPj,setFocusPj]=useState(null); // filtre la colonne "Groupés" sur un PJ
  const colW=compact?COL_W_COMPACT:COL_W;
  const [deleteTarget,setDeleteTarget]=useState(null); // {pj,idx}
  const [pinInput,setPinInput]=useState("");
  const [composePj,setComposePj]=useState(null);
  const [text,setText]=useState("");
  const [authorInput,setAuthorInput]=useState(()=>{try{return localStorage.getItem("enogia_comment_author")||"";}catch(e){return "";}});
  const [isPrivate,setIsPrivate]=useState(false);
  const [err,setErr]=useState("");
  const author=authorName||authorInput;

  const q=(search||"").trim().toLowerCase();
  const dataPjs=useMemo(()=>new Set(data.map(d=>d.pj)),[data]);

  // Bug signalé : « quand je masque/démasque les privés ça ajoute à chaque fois des nouveaux projets ».
  // Cause : un PJ dont TOUS les commentaires sont privés disparaissait au masquage puis réapparaissait
  // en tête au démasquage. Pour le Manager, l'ensemble ET l'ordre des colonnes sont maintenant fixes
  // (calculés sur tous les commentaires) : masquer ne retire que les cartes privées, jamais une colonne.
  const columns=useMemo(()=>{
    const cols=[];
    data.forEach(d=>{
      const all=(comments?.[d.pj]||[]).map((c,idx)=>({...c,_idx:idx})).filter(c=>!c.groupId);
      const list=all.filter(c=>pinOk||!c.private);
      const basis=isAdmin?all:list;
      const meta=getPjMeta(d.pj,d);
      if(q&&!(d.pj.toLowerCase().includes(q)||(meta.nomProjet||"").toLowerCase().includes(q)))return;
      if(basis.length===0&&composePj!==d.pj)return;
      list.sort((a,b)=>new Date(b.date)-new Date(a.date));
      const last=basis.reduce((m,c)=>Math.max(m,new Date(c.date).getTime()),0);
      cols.push({pj:d.pj,meta,list,last});
    });
    return cols.sort((a,b)=>b.last-a.last);
  },[data,comments,pinOk,isAdmin,q,composePj]);

  // Commentaires multi-PJ : une seule tuile par groupId (le même texte est dupliqué dans chaque PJ).
  const allGroups=useMemo(()=>{
    const m={};
    Object.entries(comments||{}).forEach(([pj,list])=>{
      if(!dataPjs.has(pj))return;
      list.forEach((c,idx)=>{
        if(!c.groupId||(c.private&&!pinOk))return;
        if(!m[c.groupId])m[c.groupId]={...c,_pj:pj,_idx:idx};
      });
    });
    let arr=Object.values(m).sort((a,b)=>new Date(b.date)-new Date(a.date));
    if(q)arr=arr.filter(g=>(g.text||"").toLowerCase().includes(q)||(g.author||"").toLowerCase().includes(q)||(g.groupPjs||[]).some(p=>p.toLowerCase().includes(q)));
    return arr;
  },[comments,dataPjs,pinOk,q]);
  const groups=useMemo(()=>focusPj?allGroups.filter(g=>(g.groupPjs||[]).includes(focusPj)):allGroups,[allGroups,focusPj]);
  // Nombre de commentaires groupés qui concernent chaque PJ (badge dans l'en-tête de colonne, au lieu
  // de dupliquer ces commentaires dans chaque colonne PJ, ce qui devenait illisible).
  const groupCountByPj=useMemo(()=>{const m={};allGroups.forEach(g=>(g.groupPjs||[]).forEach(p=>{m[p]=(m[p]||0)+1;}));return m;},[allGroups]);

  const submit=async pj=>{
    if(!author.trim()){setErr("Le nom est obligatoire.");return;}
    if(!text.trim())return;
    setErr("");
    const ok=await addComment(pj,author,text,null,isPrivate);
    if(ok){setText("");setIsPrivate(false);setComposePj(null);try{if(!authorName)localStorage.setItem("enogia_comment_author",authorInput);}catch(e){}}
  };
  const confirmDelete=async ()=>{
    const ok=await deleteComment(deleteTarget.pj,deleteTarget.idx,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };

  return(<div style={twoRows?{display:"grid",gridTemplateRows:"minmax(0,1fr) minmax(0,1fr)",gridAutoFlow:"column",gridAutoColumns:colW+"px",gap:10,overflowX:"auto",height:"calc(100vh - 260px)",minHeight:480,paddingBottom:6}:{display:"flex",gap:12,overflowX:"auto",alignItems:"stretch",height:"calc(100vh - 260px)",minHeight:460,paddingBottom:6}}>
    {/* Colonne des commentaires groupés (multi-PJ) */}
    <Column accent={T.violet500} count={groups.length} width={colW} span2={twoRows}
      title={<><span style={{color:T.violet600,display:"flex"}}><NavIcon name="layers" size={14}/></span><span style={{fontWeight:700,fontSize:14,color:T.violet600}}>Groupés</span></>}
      sub="Commentaires sur plusieurs PJ"
      headerExtra={<>{isAdmin&&<button onClick={e=>{e.stopPropagation();onTogglePrivate&&onTogglePrivate();}} title={hidePrivate?"Commentaires privés masqués — cliquer pour les afficher":"Masquer les commentaires privés"} style={{width:18,height:18,borderRadius:5,border:"none",background:hidePrivate?T.amber100:"transparent",color:hidePrivate?T.amber600:T.ink300,cursor:"pointer",flexShrink:0,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon name="lock" size={10}/></button>}{onGroupCompose&&<button onClick={onGroupCompose} title="Nouveau commentaire groupé" style={{width:24,height:24,borderRadius:7,border:"none",background:T.violet100,color:T.violet600,fontSize:15,fontWeight:700,cursor:"pointer",flexShrink:0,lineHeight:1}}>+</button>}</>}>
      {focusPj&&<div onClick={()=>setFocusPj(null)} title="Retirer le filtre" style={{alignSelf:"flex-start",cursor:"pointer",fontSize:11,fontWeight:700,color:T.violet600,background:T.violet100,borderRadius:20,padding:"2px 9px"}}>Filtre : {focusPj} ✕</div>}
      {groups.length===0&&<div style={{color:T.ink300,fontSize:12.5,textAlign:"center",padding:"18px 6px"}}>Aucun commentaire groupé.</div>}
      {groups.map(g=>{
        const isT=deleteTarget&&deleteTarget.pj===g._pj&&deleteTarget.idx===g._idx;
        return <Card key={g.groupId} c={g} groupColumn compact={compact} onJump={jumpToPj}
          onDelete={()=>{setDeleteTarget({pj:g._pj,idx:g._idx});setPinInput("");}}
          confirming={isT} pinInput={pinInput} setPinInput={setPinInput} onConfirm={confirmDelete} onCancel={()=>setDeleteTarget(null)}/>;
      })}
    </Column>

    {columns.map(col=>(
      <Column key={col.pj} accent={T.teal500} count={col.list.length} width={colW}
        onHeaderClick={()=>onOpenThread&&onOpenThread(col.pj)}
        title={<><span style={{fontFamily:T.fontMono,fontWeight:700,fontSize:14,color:T.teal600,flexShrink:0}}>{col.pj}</span><CountryFlag pays={col.meta.pays} size={11}/><span title={col.meta.nomProjet} style={{fontSize:12.5,color:T.ink500,lineHeight:1.2,flex:"1 1 auto",minWidth:0,overflowWrap:"anywhere"}}>{col.meta.nomProjet}</span></>}
        headerExtra={<>{groupCountByPj[col.pj]>0&&<button onClick={e=>{e.stopPropagation();setFocusPj(focusPj===col.pj?null:col.pj);}} title={groupCountByPj[col.pj]+" commentaire(s) groupé(s) concernent ce PJ — cliquer pour les filtrer dans la colonne Groupés"} style={{height:18,borderRadius:9,border:"none",background:focusPj===col.pj?T.violet500:T.violet100,color:focusPj===col.pj?"#fff":T.violet600,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0,padding:"0 6px"}}>⧉ {groupCountByPj[col.pj]}</button>}{isAdmin&&<button onClick={e=>{e.stopPropagation();onTogglePrivate&&onTogglePrivate();}} title={hidePrivate?"Commentaires privés masqués — cliquer pour les afficher":"Masquer les commentaires privés"} style={{width:18,height:18,borderRadius:5,border:"none",background:hidePrivate?T.amber100:"transparent",color:hidePrivate?T.amber600:T.ink300,cursor:"pointer",flexShrink:0,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon name="lock" size={10}/></button>}<button onClick={e=>{e.stopPropagation();setComposePj(composePj===col.pj?null:col.pj);setText("");setErr("");}} title="Ajouter un commentaire" style={{width:24,height:24,borderRadius:7,border:"none",background:T.teal100,color:T.teal600,fontSize:15,fontWeight:700,cursor:"pointer",flexShrink:0,lineHeight:1}}>+</button></>}>
        {composePj===col.pj&&<div style={{background:T.card,border:"1px solid "+T.teal500,borderRadius:10,padding:10}}>
          {!authorName&&<input type="text" value={authorInput} onChange={e=>{setAuthorInput(e.target.value);setErr("");}} placeholder="Votre nom" maxLength={40} style={{width:"100%",boxSizing:"border-box",padding:"6px 9px",borderRadius:7,border:"1px solid "+T.line,fontSize:12.5,fontFamily:T.font,marginBottom:6}}/>}
          <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="Nouveau commentaire…" rows={3} maxLength={1000} style={{width:"100%",boxSizing:"border-box",padding:"7px 9px",borderRadius:8,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,color:T.ink700,resize:"vertical"}}/>
          {err&&<div style={{fontSize:12,color:T.red500,marginTop:4}}>{err}</div>}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6,gap:6}}>
            {pinOk?<label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.ink500,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)}/>Privé</label>:<span/>}
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setComposePj(null)} style={{padding:"5px 10px",borderRadius:7,border:"none",background:T.neuPanel,color:T.ink700,fontSize:12,cursor:"pointer"}}>Annuler</button>
              <button onClick={()=>submit(col.pj)} disabled={!text.trim()} style={{padding:"5px 12px",borderRadius:7,border:"none",background:text.trim()?T.teal500:T.surfaceAlt,color:text.trim()?"#fff":T.ink300,fontSize:12,fontWeight:700,cursor:text.trim()?"pointer":"default"}}>Publier</button>
            </div>
          </div>
        </div>}
        {col.list.length===0&&composePj!==col.pj&&<div style={{color:T.ink300,fontSize:12,textAlign:"center",padding:"14px 6px"}}>Aucun commentaire visible.</div>}
        {col.list.map(c=>{
          const isT=deleteTarget&&deleteTarget.pj===col.pj&&deleteTarget.idx===c._idx;
          return <Card key={c._idx} c={c} compact={compact}
            onDelete={()=>{setDeleteTarget({pj:col.pj,idx:c._idx});setPinInput("");}}
            confirming={isT} pinInput={pinInput} setPinInput={setPinInput} onConfirm={confirmDelete} onCancel={()=>setDeleteTarget(null)}/>;
        })}
      </Column>
    ))}
    {columns.length===0&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.ink300,fontSize:14}}>Aucun PJ avec commentaire{q?" pour cette recherche":""}.</div>}
  </div>);
}
