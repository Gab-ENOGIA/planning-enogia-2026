import React, { useState, useMemo, useEffect, useRef } from "react";
import { T } from "../theme";
import { fmt } from "../parsers";
import { getPjMeta, CountryFlag, relTime, Avatar } from "../pjMeta";
import { PjChecklist, NavIcon } from "./SharedUI";

export function CommentsView({data,comments,addComment,deleteComment,pinOk,addCommentMulti,jumpToPj,authorName}){
  const [search,setSearch]=useState("");
  const [multiSelectMode,setMultiSelectMode]=useState(false);
  const [viewPjs,setViewPjs]=useState(new Set());
  const [viewAll,setViewAll]=useState(false);
  const [authorInput,setAuthorInput]=useState(()=>{try{return localStorage.getItem("enogia_comment_author")||"";}catch(e){return "";}});
  const author=authorName||authorInput;
  const [text,setText]=useState("");
  const [isPrivate,setIsPrivate]=useState(false);
  const [err,setErr]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null); // {pj,idx}
  const [pinInput,setPinInput]=useState("");
  const feedEndRef=useRef(null);

  useEffect(()=>{if(!authorName)try{localStorage.setItem("enogia_comment_author",authorInput);}catch(e){}},[authorInput,authorName]);

  const allComments=useMemo(()=>{
    const out=[];
    Object.entries(comments).forEach(([pj,list])=>list.forEach((c,idx)=>out.push({...c,pj,_idx:idx})));
    return out;
  },[comments]);
  const visibleComments=pinOk?allComments:allComments.filter(c=>!c.private);

  // Aperçu par PJ pour la liste de gauche : dernier commentaire visible + total
  const perPj=useMemo(()=>{
    const m={};
    visibleComments.forEach(c=>{
      if(!m[c.pj])m[c.pj]={count:0,last:null};
      m[c.pj].count++;
      if(!m[c.pj].last||new Date(c.date)>new Date(m[c.pj].last.date))m[c.pj].last=c;
    });
    return m;
  },[visibleComments]);

  const sidebarList=useMemo(()=>{
    const q=search.trim().toLowerCase();
    let list=data.map(d=>{
      const meta=getPjMeta(d.pj,d);
      const info=perPj[d.pj];
      return {pj:d.pj,meta,count:info?info.count:0,last:info?info.last:null};
    });
    if(q)list=list.filter(r=>r.pj.toLowerCase().includes(q)||(r.meta.nomProjet||"").toLowerCase().includes(q));
    return list.sort((a,b)=>{
      if(a.last&&b.last)return new Date(b.last.date)-new Date(a.last.date);
      if(a.last)return -1;
      if(b.last)return 1;
      return a.pj.localeCompare(b.pj);
    });
  },[data,search,perPj]);

  const feed=useMemo(()=>{
    const targets=viewAll?new Set(data.map(d=>d.pj)):viewPjs;
    const raw=visibleComments.filter(c=>targets.has(c.pj)).sort((a,b)=>new Date(a.date)-new Date(b.date));
    // Un commentaire groupé est dupliqué dans chaque PJ concerné — on n'en affiche qu'une seule fois dans le fil.
    const seenGroups=new Set();
    return raw.filter(c=>{
      if(!c.groupId)return true;
      if(seenGroups.has(c.groupId))return false;
      seenGroups.add(c.groupId);
      return true;
    });
  },[visibleComments,viewPjs,viewAll,data]);

  // Commentaires groupés distincts (un seul représentant par groupId), pour la section dédiée de la barre latérale.
  const groupsList=useMemo(()=>{
    const m={};
    visibleComments.forEach(c=>{
      if(!c.groupId)return;
      if(!m[c.groupId]||new Date(c.date)>new Date(m[c.groupId].date))m[c.groupId]=c;
    });
    return Object.values(m).sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[visibleComments]);

  useEffect(()=>{feedEndRef.current?.scrollIntoView({block:"end"});},[feed.length,viewPjs,viewAll]);

  const selectSingle=pj=>{setViewAll(false);setViewPjs(new Set([pj]));};
  const selectAll=()=>{setViewAll(true);setViewPjs(new Set());};
  const selectGroup=pjList=>{setViewAll(false);setMultiSelectMode(true);setViewPjs(new Set(pjList));};

  const composeTargets=[...viewPjs];
  const canCompose=!viewAll&&composeTargets.length>0;

  const submit=async ()=>{
    if(!author.trim()){setErr("Le nom est obligatoire pour publier un commentaire.");return;}
    if(!text.trim()||!canCompose)return;
    setErr("");
    const ok=composeTargets.length>1
      ?await addCommentMulti(composeTargets,author,text,null,isPrivate)
      :await addComment(composeTargets[0],author,text,null,isPrivate);
    if(ok){setText("");setIsPrivate(false);}
  };
  const onComposerKeyDown=e=>{
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit();}
  };
  const confirmDelete=async ()=>{
    const ok=await deleteComment(deleteTarget.pj,deleteTarget.idx,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };

  const headerLabel=viewAll?"Tous les commentaires":
    composeTargets.length===0?null:
    composeTargets.length===1?composeTargets[0]:
    composeTargets.length+" PJ sélectionnés";

  return(<div style={{display:"flex",gap:14,fontFamily:T.font,height:"calc(100vh - 200px)",minHeight:520}}>

    {/* ── Liste des fils (par PJ) ── */}
    <div style={{width:280,flexShrink:0,background:T.card,borderRadius:14,boxShadow:T.shadowMd,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:12,borderBottom:"1px solid "+T.line,display:"flex",flexDirection:"column",gap:8}}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un PJ, un projet..."
          style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,boxSizing:"border-box"}}/>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}}>
          <input type="checkbox" checked={multiSelectMode} onChange={e=>{setMultiSelectMode(e.target.checked);if(!e.target.checked&&viewPjs.size>1){setViewPjs(new Set([...viewPjs].slice(0,1)));}}}/>
          Sélection multiple (commentaire groupé)
        </label>
      </div>

      {pinOk&&<div onClick={selectAll} style={{padding:"10px 14px",cursor:"pointer",background:viewAll?T.teal100:T.card,borderBottom:"1px solid "+T.line,display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:30,height:30,borderRadius:9,background:T.surface,color:T.teal600,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><NavIcon name="list" size={15}/></div>
        <div style={{minWidth:0}}>
          <div style={{fontWeight:700,color:T.ink900,fontSize:13.5}}>Tous les commentaires</div>
          <div style={{fontSize:11.5,color:T.ink300}}>Vue globale Manager</div>
        </div>
      </div>}

      {groupsList.length>0&&<div style={{borderBottom:"1px solid "+T.line}}>
        <div style={{padding:"8px 14px 4px",fontSize:11,fontWeight:700,color:T.ink300,textTransform:"uppercase",letterSpacing:".04em"}}>Commentaires groupés ({groupsList.length})</div>
        <div style={{maxHeight:180,overflowY:"auto"}}>
          {groupsList.map(g=>{
            const active=!viewAll&&g.groupPjs.every(p=>viewPjs.has(p))&&viewPjs.size===g.groupPjs.length;
            return(<div key={g.groupId} onClick={()=>selectGroup(g.groupPjs)}
              style={{padding:"9px 14px",cursor:"pointer",background:active?T.violet100:"transparent",display:"flex",alignItems:"center",gap:9}}
              onMouseEnter={e=>{if(!active)e.currentTarget.style.background=T.surface;}}
              onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}>
              <div style={{width:30,height:30,borderRadius:9,background:T.violet100,color:T.violet600,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><NavIcon name="layers" size={15}/></div>
              <div style={{minWidth:0,flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:6}}>
                  <span style={{fontWeight:700,color:T.violet600,fontSize:12.5}}>{g.groupPjs.length} PJ</span>
                  <span style={{fontSize:10.5,color:T.ink300,flexShrink:0}}>{relTime(g.date)}</span>
                </div>
                <div style={{fontSize:12,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.text}</div>
              </div>
            </div>);
          })}
        </div>
      </div>}

      <div style={{overflowY:"auto",flex:1}}>
        {sidebarList.map(row=>{
          const active=viewAll?false:(!multiSelectMode&&viewPjs.has(row.pj));
          return(<div key={row.pj} onClick={()=>{if(!multiSelectMode)selectSingle(row.pj);}}
            style={{padding:"10px 14px",cursor:multiSelectMode?"default":"pointer",opacity:multiSelectMode?.55:1,background:active?T.teal100:T.card,borderBottom:"1px solid "+T.surface,display:"flex",alignItems:"center",gap:9}}>
            {row.last?<Avatar name={row.last.author} tint={row.last.private?T.amber500:T.teal500}/>:
              <div style={{width:30,height:30,borderRadius:"50%",background:T.surfaceAlt,flexShrink:0}}/>}
            <div style={{minWidth:0,flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:6}}>
                <span style={{fontWeight:700,color:T.ink900,fontSize:13.5,display:"flex",alignItems:"center",gap:5}}>{row.pj}<CountryFlag pays={row.meta.pays} size={11}/></span>
                {row.last&&<span style={{fontSize:10.5,color:T.ink300,flexShrink:0}}>{relTime(row.last.date)}</span>}
              </div>
              <div style={{fontSize:12,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {row.last?row.last.text:row.meta.nomProjet}
              </div>
            </div>
            {row.count>0&&<span style={{fontSize:11,fontWeight:700,color:T.teal600,background:T.teal100,borderRadius:20,padding:"2px 7px",flexShrink:0}}>{row.count}</span>}
          </div>);
        })}
        {sidebarList.length===0&&<div style={{padding:20,textAlign:"center",color:T.ink300,fontSize:13.5}}>Aucun résultat.</div>}
      </div>
    </div>

    {/* ── Fil sélectionné / composition groupée ── */}
    <div style={{flex:1,minWidth:0,background:T.card,borderRadius:14,boxShadow:T.shadowMd,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {multiSelectMode?<>
        <div style={{padding:"14px 20px",borderBottom:"1px solid "+T.line}}>
          <div style={{fontFamily:T.fontDisplay,textTransform:"uppercase",letterSpacing:".03em",fontWeight:700,fontSize:17,color:T.ink900,marginBottom:10}}>Commentaire groupé — choisir les PJ</div>
          <PjChecklist data={data} selected={viewPjs} onChange={setViewPjs} maxHeight={220}/>
        </div>
        {viewPjs.size>0?<div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {feed.length===0&&<div style={{color:T.ink300,fontSize:14,textAlign:"center",padding:"30px 0"}}>Aucun commentaire pour l'instant sur ces PJ.</div>}
          {feed.map(c=>{
            const isTarget=deleteTarget&&deleteTarget.pj===c.pj&&deleteTarget.idx===c._idx;
            return(<div key={c.pj+"-"+c._idx} style={{display:"flex",gap:10}}>
              <Avatar name={c.author} tint={c.private?T.amber500:T.teal500}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"baseline",gap:7,flexWrap:"wrap",marginBottom:2}}>
                  <span onClick={()=>jumpToPj&&jumpToPj(c.pj)} style={{fontWeight:700,fontSize:13,color:T.teal600,fontFamily:T.fontMono,cursor:jumpToPj?"pointer":"default"}}>{c.pj}</span>
                  <span style={{color:T.ink300,fontSize:12}}>·</span>
                  <span style={{fontWeight:600,color:T.ink700,fontSize:13}}>{c.author}</span>
                  {c.private&&<span title="Privé (BU ORC uniquement)" style={{fontSize:10.5,color:T.amber600,background:T.amber100,borderRadius:5,padding:"1px 6px",fontWeight:700}}>Privé</span>}
                  {c.groupPjs&&(()=>{const others=c.groupPjs.filter(p=>p!==c.pj);return <span style={{fontSize:10.5,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 7px",fontWeight:700}}>groupé avec {others.length>3?others.slice(0,3).join(", ")+" +"+(others.length-3):others.join(", ")}</span>;})()}
                  <span style={{fontSize:11,color:T.ink300}}>{relTime(c.date)}</span>
                  <button onClick={()=>{setDeleteTarget({pj:c.pj,idx:c._idx});setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink100,cursor:"pointer",fontSize:12,padding:0,marginLeft:2}}>✕</button>
                </div>
                <div style={{background:c.private?T.amber100:T.surface,borderRadius:"3px 12px 12px 12px",padding:"9px 13px",display:"inline-block",maxWidth:"100%",fontSize:14,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
                {isTarget&&<div style={{marginTop:7,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"6px 10px",borderRadius:7,border:"1px solid "+T.line,fontSize:12.5,fontFamily:T.font,width:110}}/>
                  <button onClick={confirmDelete} style={{padding:"6px 11px",borderRadius:7,border:"none",background:T.red500,color:"#fff",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Confirmer</button>
                  <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 11px",borderRadius:7,border:"none",background:T.surface,boxShadow:T.neuOutSm,color:T.ink700,fontSize:12.5,cursor:"pointer"}}>Annuler</button>
                </div>}
              </div>
            </div>);
          })}
          <div ref={feedEndRef}/>
        </div>:<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.ink300,fontSize:14,padding:30,textAlign:"center"}}>Cochez au moins un PJ ci-dessus pour composer un commentaire groupé.</div>}

        {canCompose&&<div style={{borderTop:"1px solid "+T.line,padding:"12px 20px",flexShrink:0}}>
          <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            {authorName?
              <span style={{fontSize:12.5,color:T.ink500}}>En tant que <strong style={{color:T.ink700}}>{authorName}</strong></span>
            :<input type="text" value={authorInput} onChange={e=>{setAuthorInput(e.target.value);setErr("");}} placeholder="Votre nom" maxLength={40}
              style={{width:150,padding:"7px 11px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:13,fontFamily:T.font,color:T.ink700}}/>}
            {pinOk&&<label style={{display:"flex",alignItems:"center",gap:5,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}}>
              <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)}/> Privé
            </label>}
            {err&&<span style={{fontSize:12.5,color:T.red500,alignSelf:"center"}}>{err}</span>}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={onComposerKeyDown}
              placeholder={"Message pour les "+composeTargets.length+" PJ sélectionnés... (Entrée pour envoyer)"}
              rows={2} maxLength={1000}
              style={{flex:1,padding:"9px 12px",borderRadius:10,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,resize:"none"}}/>
            <button onClick={submit} disabled={!text.trim()} style={{padding:"10px 18px",borderRadius:10,border:"none",background:text.trim()?T.teal500:T.surfaceAlt,color:text.trim()?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:text.trim()?"pointer":"default",flexShrink:0}}>Envoyer</button>
          </div>
        </div>}
      </>:!headerLabel?
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,color:T.ink300,padding:30,textAlign:"center"}}>
          <div style={{color:T.ink300}}><NavIcon name="comments" size={30}/></div>
          <div style={{fontSize:15,fontWeight:600,color:T.ink500}}>Sélectionnez un PJ pour voir ses commentaires</div>
          <div style={{fontSize:13}}>Ou cochez "Sélection multiple" pour un commentaire groupé sur plusieurs projets.</div>
        </div>
      :<>
        <div style={{padding:"14px 20px",borderBottom:"1px solid "+T.line,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
          <div style={{fontFamily:T.fontDisplay,textTransform:"uppercase",letterSpacing:".03em",fontWeight:700,fontSize:17,color:T.ink900}}>{headerLabel}</div>
          <span style={{fontSize:12.5,color:T.ink300}}>{feed.length} commentaire{feed.length!==1?"s":""}</span>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {feed.length===0&&<div style={{color:T.ink300,fontSize:14,textAlign:"center",padding:"30px 0"}}>Aucun commentaire pour l'instant.</div>}
          {feed.map(c=>{
            const isTarget=deleteTarget&&deleteTarget.pj===c.pj&&deleteTarget.idx===c._idx;
            return(<div key={c.pj+"-"+c._idx} style={{display:"flex",gap:10}}>
              <Avatar name={c.author} tint={c.private?T.amber500:T.teal500}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"baseline",gap:7,flexWrap:"wrap",marginBottom:2}}>
                  <span onClick={()=>jumpToPj&&jumpToPj(c.pj)} style={{fontWeight:700,fontSize:13,color:T.teal600,fontFamily:T.fontMono,cursor:jumpToPj?"pointer":"default"}}>{c.pj}</span>
                  <span style={{color:T.ink300,fontSize:12}}>·</span>
                  <span style={{fontWeight:600,color:T.ink700,fontSize:13}}>{c.author}</span>
                  {c.private&&<span title="Privé (BU ORC uniquement)" style={{fontSize:10.5,color:T.amber600,background:T.amber100,borderRadius:5,padding:"1px 6px",fontWeight:700}}>Privé</span>}
                  {c.groupPjs&&(()=>{const others=c.groupPjs.filter(p=>p!==c.pj);return <span style={{fontSize:10.5,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 7px",fontWeight:700}}>groupé avec {others.length>3?others.slice(0,3).join(", ")+" +"+(others.length-3):others.join(", ")}</span>;})()}
                  <span style={{fontSize:11,color:T.ink300}}>{relTime(c.date)}</span>
                  <button onClick={()=>{setDeleteTarget({pj:c.pj,idx:c._idx});setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink100,cursor:"pointer",fontSize:12,padding:0,marginLeft:2}}>✕</button>
                </div>
                <div style={{background:c.private?T.amber100:T.surface,borderRadius:"3px 12px 12px 12px",padding:"9px 13px",display:"inline-block",maxWidth:"100%",fontSize:14,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
                {c.linkedDate&&<div style={{marginTop:4,fontSize:11.5,color:T.ink500,fontWeight:600}}>Lié au {fmt(new Date(c.linkedDate))}</div>}
                {isTarget&&<div style={{marginTop:7,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"6px 10px",borderRadius:7,border:"1px solid "+T.line,fontSize:12.5,fontFamily:T.font,width:110}}/>
                  <button onClick={confirmDelete} style={{padding:"6px 11px",borderRadius:7,border:"none",background:T.red500,color:"#fff",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Confirmer</button>
                  <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 11px",borderRadius:7,border:"none",background:T.surface,boxShadow:T.neuOutSm,color:T.ink700,fontSize:12.5,cursor:"pointer"}}>Annuler</button>
                </div>}
              </div>
            </div>);
          })}
          <div ref={feedEndRef}/>
        </div>

        {canCompose?<div style={{borderTop:"1px solid "+T.line,padding:"12px 20px",flexShrink:0}}>
          <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            {authorName?
              <span style={{fontSize:12.5,color:T.ink500}}>En tant que <strong style={{color:T.ink700}}>{authorName}</strong></span>
            :<input type="text" value={authorInput} onChange={e=>{setAuthorInput(e.target.value);setErr("");}} placeholder="Votre nom" maxLength={40}
              style={{width:150,padding:"7px 11px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:13,fontFamily:T.font,color:T.ink700}}/>}
            {pinOk&&<label style={{display:"flex",alignItems:"center",gap:5,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}}>
              <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)}/> Privé
            </label>}
            {err&&<span style={{fontSize:12.5,color:T.red500,alignSelf:"center"}}>{err}</span>}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={onComposerKeyDown}
              placeholder="Écrire un commentaire... (Entrée pour envoyer)"
              rows={2} maxLength={1000}
              style={{flex:1,padding:"9px 12px",borderRadius:10,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,resize:"none"}}/>
            <button onClick={submit} disabled={!text.trim()} style={{padding:"10px 18px",borderRadius:10,border:"none",background:text.trim()?T.teal500:T.surfaceAlt,color:text.trim()?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:text.trim()?"pointer":"default",flexShrink:0}}>Envoyer</button>
          </div>
        </div>
        :<div style={{borderTop:"1px solid "+T.line,padding:"14px 20px",flexShrink:0,fontSize:13,color:T.ink300,textAlign:"center"}}>
          Sélectionnez un PJ pour écrire un message.
        </div>}
      </>}
    </div>
  </div>);
}
