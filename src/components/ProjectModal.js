import React, { useState, useEffect } from "react";
import { T } from "../theme";
import { SerieTag, getPjMeta, PresenceChip, presenceKind, CountryFlag, MONTHS_FULL, today, ALL_GAMMES, getAllChefs, ALL_PAYS, relTime, Avatar } from "../pjMeta";
import { fmt, fmtMode } from "../parsers";
import { Badge, NavIcon, Select, DelayScopeNote } from "./SharedUI";
import { PHASES } from "./GanttView";

// La fiche projet (panneau de droite) doit rester "blanche mate entièrement" (demandé
// explicitement) : les sous-blocs internes (onglets, cartes de phase, commentaires...)
// utilisaient T.surface/T.surfaceAlt, c'est-à-dire le crème de la page — remplacé par T.neuPanel/
// T.neuPanelDim (un gris neutre), pour que l'ensemble du panneau reste sur un registre blanc/gris,
// sans crème. Ce sont des tokens de thème (plutôt que des constantes figées comme avant) pour
// rester cohérents en mode sombre ("mettre le mode sombre en adéquation avec le mode clair").

// placeholder affiché par la fiche persistante (mode inline) quand aucune ligne n'est sélectionnée —
// garde la même largeur/chrome que la fiche remplie pour que la mise en page ne saute pas.
function InlinePanelPlaceholder(){
  return(<div style={{position:"sticky",top:16,width:"100%",border:"1px solid "+T.line,borderRadius:12,background:T.card,padding:"32px 18px",textAlign:"center",fontFamily:T.font,boxSizing:"border-box"}}>
    <div style={{width:34,height:34,borderRadius:9,background:T.neuPanel,color:T.ink300,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}><NavIcon name="list" size={15}/></div>
    <div style={{color:T.ink500,fontSize:12.5,lineHeight:1.5}}>Sélectionnez une ligne du tableau pour afficher le détail du projet ici.</div>
  </div>);
}

export function ProjectModal({pj,data,df,onClose,comments,addComment,deleteComment,pinOk,delays,delayTypes,addDelayAllocation,deleteDelayAllocation,addDelayComment,deleteDelayComment,authorName,savePjMetaOverride,inline,canEditMeta}){
  const [editingMeta,setEditingMeta]=useState(false);
  const [tab,setTab]=useState("apercu");
  // Fermeture au clavier (Échap) — demandé explicitement, pour la fiche en mode "popup" (Gantt,
  // Calendrier) ; avant tout retour anticipé pour respecter l'ordre des hooks React. Le mode inline
  // (liste) n'a pas de popup à fermer, mais laisser l'écouteur actif ne fait rien de gênant.
  useEffect(()=>{
    if(!pj||!onClose)return;
    const onKey=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[pj,onClose]);
  const r=pj?data.find(x=>x.pj===pj):null;
  const dates=r?PHASES.map(ph=>({...ph,date:r[ph.k]?new Date(r[ph.k]):null})).filter(p=>p.date):[];
  // Mode "inline" (demandé explicitement) : fiche persistante à côté de la liste plutôt qu'un
  // panneau qui s'ouvre/se ferme par-dessus la page. Sans sélection valide, on affiche un état
  // vide de même gabarit plutôt que de ne rien rendre, pour que la colonne ne disparaisse pas.
  if(!r||dates.length===0){
    if(inline)return <InlinePanelPlaceholder/>;
    return null;
  }
  const meta=getPjMeta(pj,r);
  const minD=new Date(Math.min(...dates.map(d=>d.date)));
  const maxD=new Date(Math.max(...dates.map(d=>d.date)));
  // mois à afficher : du mois de la première étape au mois de la dernière (max 3 pour rester lisible)
  const months=[];
  let cur=new Date(minD.getFullYear(),minD.getMonth(),1);
  const end=new Date(maxD.getFullYear(),maxD.getMonth(),1);
  while(cur<=end&&months.length<3){months.push(new Date(cur));cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);}

  const evByDay=(y,m)=>{
    const map={};
    dates.forEach(d=>{if(d.date.getFullYear()===y&&d.date.getMonth()===m){const day=d.date.getDate();if(!map[day])map[day]=[];map[day].push(d);}});
    return map;
  };

  // Mode inline (demandé explicitement) : fiche toujours présente à côté de la liste, qui se met
  // à jour au clic sur une ligne, plutôt qu'un panneau qui s'ouvre/se ferme par-dessus la page.
  // Pas de fond assombri, pas de position fixe, pas d'animation : c'est un simple bloc du flux de
  // page (position:sticky pour rester visible pendant le scroll de la liste), plus petit et dont
  // la largeur s'adapte (responsive) à la place disponible à côté du tableau.
  const pad=18;
  // height:"100%" ici (avec le parent étiré en pleine hauteur de la liste dans TableView) : c'est
  // ce qui donne au panneau position:sticky ci-dessous assez de hauteur de défilement pour suivre
  // la page jusqu'en bas, au lieu de décrocher après le premier écran.
  // Plus de voile sombre derrière le panneau en mode popup (Gantt/Calendrier) — demandé
  // explicitement ("que cela ne grise pas l'arrière-plan") : le calque reste présent (zone
  // cliquable pour fermer en cliquant à l'extérieur) mais transparent.
  return(<div className={inline?"":"enogia-panel-backdrop"} onClick={inline?undefined:onClose} style={inline?{width:"100%",height:"100%"}:{position:"fixed",inset:0,background:"transparent",zIndex:9998,fontFamily:T.font}}>
    <div className={inline?"":"enogia-panel-slide"} onClick={inline?undefined:e=>e.stopPropagation()} style={inline?{position:"sticky",top:16,width:"100%",maxHeight:"calc(100vh - 32px)",background:T.card,padding:pad,overflowY:"auto",border:"1px solid "+T.line,borderRadius:12,boxSizing:"border-box"}:{position:"fixed",top:0,right:0,bottom:0,width:"min(440px,100vw)",background:T.card,padding:pad,overflowY:"auto",boxShadow:"-10px 0 36px rgba(12,36,54,.28)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div style={{flex:1,minWidth:0}}>
          {/* Retour au mono (demandé explicitement : "la police de la page de droite équivalente à la
              police de la page") — sur la page liste, ce même champ (r.pj) est en T.fontMono ; le
              Fraunces essayé précédemment rendait ce titre différent de son équivalent dans le
              tableau au lieu de l'unifier. Taille/graisse plus marquées que dans le tableau (c'est un
              titre), mais même famille de police et même teinte bleu acier. */}
          <div style={{fontFamily:T.fontMono,fontWeight:700,fontSize:17,color:T.teal600,letterSpacing:"-.01em"}}>{pj}<SerieTag pj={pj} size={11} style={{marginLeft:10,verticalAlign:"middle"}}/></div>
          {editingMeta?
            <EditMetaForm meta={meta} gamme={r.gamme} onCancel={()=>setEditingMeta(false)} onSave={async fields=>{const ok=await savePjMetaOverride(pj,fields);if(ok)setEditingMeta(false);}}/>
            :<div style={{color:T.ink500,fontSize:13.5,marginTop:3,fontWeight:500,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              {meta.nomProjet} · <CountryFlag pays={meta.pays} size={14}/> {meta.pays} · {meta.chefProjet}
              {/* Restreint à canEditMeta (l'email de connexion de Gabriel), pas à pinOk — demandé
                  explicitement : d'autres membres de la BU ORC peuvent avoir pinOk via le code
                  Manager sans devoir pour autant pouvoir modifier la fiche projet. */}
              {canEditMeta&&savePjMetaOverride&&<button onClick={()=>setEditingMeta(true)} title="Modifier le nom, le pays, le chef de projet, la gamme" style={{background:T.neuPanel,border:"none",borderRadius:7,padding:"3px 9px",fontSize:12,fontWeight:700,color:T.teal600,cursor:"pointer"}}>✎ Modifier</button>}
            </div>}
        </div>
        <button onClick={onClose} title={inline?"Désélectionner":"Fermer"} style={{background:T.neuPanel,border:"none",borderRadius:9,width:30,height:30,fontSize:15,cursor:"pointer",color:T.ink700,flexShrink:0}}>✕</button>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <Badge etat={r.etat}/>
        <span style={{fontSize:13.5,color:T.ink500,alignSelf:"center"}}>{r.gamme}</span>
        {presenceKind(r.clientPresence)&&<PresenceChip kind={presenceKind(r.clientPresence)} date={r.clientPresence.date} fontSize={13}/>}
      </div>

      {/* ── Onglets : séparer la vue d'ensemble des commentaires évite d'avoir à
          descendre tout le panneau pour trouver/écrire un commentaire. ── */}
      <div style={{display:"flex",gap:4,marginBottom:14,background:T.neuPanel,borderRadius:11,padding:4}}>
        {[
          {key:"apercu",label:"Aperçu",icon:"calendar"},
          {key:"commentaires",label:"Commentaires",icon:"comments",count:(comments?.[pj]||[]).filter(c=>pinOk||!c.private).length},
          ...(pinOk&&delayTypes?[{key:"retards",label:"Retards",icon:"clock",count:(delays?.[pj]||[]).length}]:[]),
        ].map(t=><button key={t.key} onClick={()=>setTab(t.key)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px 6px",borderRadius:8,border:"none",cursor:"pointer",background:tab===t.key?T.card:"transparent",boxShadow:tab===t.key?T.shadowSm:"none",color:tab===t.key?T.teal600:T.ink500,fontSize:12,fontWeight:700,transition:"background .15s ease,color .15s ease"}}>
          <NavIcon name={t.icon} size={12}/>{t.label}{t.count>0&&<span style={{fontSize:10.5,fontWeight:700,color:tab===t.key?"#fff":T.ink500,background:tab===t.key?T.teal500:T.ink100,borderRadius:20,padding:"1px 6px"}}>{t.count}</span>}
        </button>)}
      </div>

      {tab==="apercu"&&<>
        {/* repeat(4,1fr) forcé en mode inline (plus de auto-fit) : les 4 tuiles doivent toujours
            rester sur une seule ligne quelle que soit la largeur du panneau — demandé explicitement
            ("il faut que les 4 tuiles soient sur la même ligne avec la même taille"). Police et
            padding réduits en conséquence pour que ça tienne même à ~260-300px de large. */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>
          {PHASES.map(ph=>{const d=r[ph.k]?new Date(r[ph.k]):null;const showPresence=ph.k==="tests"&&presenceKind(r.clientPresence);return(
            <div key={ph.k} style={{background:T.neuPanel,borderRadius:9,padding:"6px 5px",borderTop:"3px solid "+ph.c,position:"relative",minWidth:0}}>
              <div style={{color:T.ink500,fontSize:8.5,fontWeight:600,textTransform:"uppercase",letterSpacing:".02em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ph.t}</div>
              <div style={{fontWeight:700,color:T.ink900,fontSize:12,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d?fmtMode(d,df):"—"}</div>
              {showPresence&&<div style={{marginTop:3}}><PresenceChip kind={presenceKind(r.clientPresence)} compact fontSize={9}/></div>}
            </div>
          );})}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat("+months.length+",1fr)",gap:8}}>
          {months.map((mo,mi)=>{
            const y=mo.getFullYear(),m=mo.getMonth();
            const de=evByDay(y,m);
            const fd=new Date(y,m,1).getDay();
            const adj=(fd+6)%7;
            const dim=new Date(y,m+1,0).getDate();
            const cells=[...Array(adj).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
            return(<div key={mi}>
              <div style={{textAlign:"center",fontWeight:700,fontSize:12,color:T.ink900,marginBottom:8}}>{MONTHS_FULL[m]} {y}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:8.5,fontWeight:700,color:T.ink300}}>{d}</div>)}
                {cells.map((day,ci)=>{
                  if(!day)return<div key={"e"+ci}/>;
                  const evs=de[day]||[];
                  const isToday=day===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
                  return(<div key={day} style={{aspectRatio:"1",borderRadius:7,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:evs.length?700:500,color:evs.length?"#fff":isToday?T.teal600:T.ink700,background:evs.length?evs[0].c:isToday?T.teal100:"transparent",border:isToday&&!evs.length?"1.5px solid "+T.teal400:"none",position:"relative"}}>
                    {day}
                    {evs.length>1&&<div style={{position:"absolute",bottom:1,right:2,fontSize:7,color:"#fff"}}>+{evs.length-1}</div>}
                  </div>);
                })}
              </div>
            </div>);
          })}
        </div>

        <div style={{display:"flex",gap:14,marginTop:18,paddingTop:14,borderTop:"1px solid "+T.line,flexWrap:"wrap"}}>
          {PHASES.map(ph=><span key={ph.k} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><span style={{width:13,height:13,borderRadius:4,background:ph.c}}/><span style={{color:T.ink500}}>{ph.t}</span></span>)}
        </div>
      </>}

      {tab==="commentaires"&&<ProjectComments pj={pj} comments={comments?.[pj]||[]} addComment={addComment} deleteComment={deleteComment} pinOk={pinOk} authorName={authorName}/>}
      {tab==="retards"&&pinOk&&delayTypes&&<DelayAllocations pj={pj} delays={delays?.[pj]||[]} delayTypes={delayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation} addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName}/>}
    </div>
  </div>);
}

// ── Édition rapide des infos projet (nom / pays / chef de projet / gamme) depuis la fiche ──
function EditMetaForm({meta,gamme,onSave,onCancel}){
  const [nomProjet,setNomProjet]=useState(meta.nomProjet||"");
  const [pays,setPays]=useState(meta.pays||"");
  const [chefProjet,setChefProjet]=useState(meta.chefProjet||"");
  const [gammeVal,setGammeVal]=useState(gamme||"");
  const allChefs=getAllChefs();
  const [saving,setSaving]=useState(false);
  const submit=async ()=>{
    setSaving(true);
    await onSave({nomProjet:nomProjet.trim(),pays:pays.trim(),chefProjet:chefProjet.trim(),gamme:gammeVal});
    setSaving(false);
  };
  const fieldStyle={padding:"7px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink900,background:T.card};
  return(<div style={{display:"flex",flexDirection:"column",gap:7,marginTop:6,maxWidth:420}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
      <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,fontWeight:700,color:T.ink500,textTransform:"uppercase"}}>Nom du projet
        <input type="text" value={nomProjet} onChange={e=>setNomProjet(e.target.value)} style={fieldStyle}/>
      </label>
      <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,fontWeight:700,color:T.ink500,textTransform:"uppercase"}}>Pays
        {/* Liste déroulante (plutôt qu'un texte libre) — le drapeau se met à jour automatiquement
            dès qu'on choisit un pays (demandé explicitement), garanti puisqu'on ne peut plus taper
            une orthographe qui ne correspond à aucun drapeau connu. */}
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <CountryFlag pays={pays} size={16}/>
          <select value={pays} onChange={e=>setPays(e.target.value)} style={{...fieldStyle,flex:1}}>
            {!ALL_PAYS.includes(pays)&&pays&&<option value={pays}>{pays}</option>}
            {ALL_PAYS.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </label>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
      <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,fontWeight:700,color:T.ink500,textTransform:"uppercase"}}>Chef de projet
        {/* Liste déroulante (plutôt qu'un texte libre) construite à partir des chefs de projet
            connus (référentiel + synchro Suivi ORC + corrections manuelles), déjà stockés en
            "Prénom NOM" complet — demandé explicitement. */}
        <select value={chefProjet} onChange={e=>setChefProjet(e.target.value)} style={fieldStyle}>
          {!allChefs.includes(chefProjet)&&chefProjet&&<option value={chefProjet}>{chefProjet}</option>}
          {allChefs.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11,fontWeight:700,color:T.ink500,textTransform:"uppercase"}}>Gamme
        <select value={gammeVal} onChange={e=>setGammeVal(e.target.value)} style={fieldStyle}>
          {!ALL_GAMMES.includes(gammeVal)&&gammeVal&&<option value={gammeVal}>{gammeVal}</option>}
          {ALL_GAMMES.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
      </label>
    </div>
    <div style={{display:"flex",gap:8,marginTop:2}}>
      <button onClick={submit} disabled={saving} style={{padding:"7px 16px",borderRadius:8,border:"none",background:T.teal500,color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"default":"pointer",opacity:saving?.6:1}}>{saving?"Enregistrement…":"Enregistrer"}</button>
      <button onClick={onCancel} style={{padding:"7px 14px",borderRadius:8,border:"none",background:T.neuPanel,color:T.ink700,fontSize:13,fontWeight:600,cursor:"pointer"}}>Annuler</button>
    </div>
  </div>);
}

export function ProjectComments({pj,comments,addComment,deleteComment,pinOk,authorName}){
  const [authorInput,setAuthorInput]=useState("");
  const author=authorName||authorInput;
  const [text,setText]=useState("");
  const [isPrivate,setIsPrivate]=useState(false);
  const [err,setErr]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null); // index original du commentaire à supprimer
  const [pinInput,setPinInput]=useState("");
  const submit=async ()=>{
    if(!author.trim()){setErr("Le nom est obligatoire pour publier un commentaire.");return;}
    if(!text.trim())return;
    setErr("");
    const ok=await addComment(pj,author,text,null,isPrivate);
    if(ok){setText("");setIsPrivate(false);}
  };
  const confirmDelete=async ()=>{
    const ok=await deleteComment(pj,deleteTarget,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };
  const withIndex=comments.map((c,i)=>({...c,_idx:i}));
  const visible=pinOk?withIndex:withIndex.filter(c=>!c.private);
  const sorted=[...visible].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return(<div>
    {/* Composeur toujours en haut, dans son propre cadre : on écrit un commentaire
        sans avoir à chercher où, ni à faire défiler le fil existant. */}
    <div style={{background:T.neuPanel,borderRadius:12,padding:14,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8,flexWrap:"wrap"}}>
        {authorName?
          <span style={{fontSize:12.5,color:T.ink500}}>En tant que <strong style={{color:T.ink700}}>{authorName}</strong></span>
          :<input type="text" value={authorInput} onChange={e=>{setAuthorInput(e.target.value);setErr("");}} placeholder="Votre nom (obligatoire)" maxLength={40}
            style={{padding:"7px 11px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:13.5,fontFamily:T.font,color:T.ink700}}/>}
        {pinOk?<label style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}}>
          <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)}/> Privé (BU ORC uniquement)
        </label>:<span/>}
      </div>
      {err&&<div style={{fontSize:13,color:T.red500,marginBottom:6}}>{err}</div>}
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ajouter un commentaire..." rows={3} maxLength={1000}
        style={{padding:"9px 12px",borderRadius:9,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,color:T.ink700,resize:"vertical",width:"100%",boxSizing:"border-box",background:T.card}}/>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
        <button onClick={submit} disabled={!text.trim()} style={{padding:"7px 16px",borderRadius:8,border:"none",background:text.trim()?T.teal500:T.neuPanelDim,color:text.trim()?"#fff":T.ink300,fontSize:13,fontWeight:700,cursor:text.trim()?"pointer":"default"}}>Publier</button>
      </div>
    </div>

    <div style={{fontSize:12,fontWeight:700,color:T.ink300,textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>{sorted.length} commentaire{sorted.length!==1?"s":""}</div>
    {/* Refonte "chat" (demandé explicitement : "je vois ça plus comme un chat gmail") — avatar +
        bloc aligné à gauche, même registre que la page Commentaires dédiée. */}
    {sorted.length>0?<div style={{display:"flex",flexDirection:"column",gap:14,maxHeight:430,overflowY:"auto",paddingRight:2}}>
      {sorted.map(c=>(
        <div key={c._idx} style={{display:"flex",gap:10}}>
          <Avatar name={c.author} tint={c.private?T.amber500:T.teal500} size={28}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"baseline",gap:7,flexWrap:"wrap",marginBottom:2}}>
              <span style={{fontWeight:700,color:T.ink700,fontSize:13}}>{c.author}</span>
              {c.private&&<span style={{fontSize:10.5,color:T.amber600,background:T.amber100,borderRadius:5,padding:"1px 6px",fontWeight:700,letterSpacing:".01em"}}>Privé</span>}
              {c.groupPjs&&<span title={"Commentaire groupé : "+c.groupPjs.join(", ")} style={{fontSize:11,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 6px",fontWeight:700}}>groupé ×{c.groupPjs.length}</span>}
              <span style={{fontSize:11,color:T.ink300}}>{relTime(c.date)}</span>
              <button onClick={()=>{setDeleteTarget(c._idx);setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink100,cursor:"pointer",fontSize:12,padding:0,marginLeft:2}}>✕</button>
            </div>
            <div style={{background:c.private?T.amber100:T.neuPanel,borderRadius:"3px 12px 12px 12px",padding:"9px 13px",display:"inline-block",maxWidth:"100%",fontSize:12.5,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
            {c.linkedDate&&<div style={{marginTop:5,fontSize:11.5,color:T.ink500,fontWeight:600}}>Lié au {fmt(new Date(c.linkedDate))}</div>}
            {deleteTarget===c._idx&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"6px 10px",borderRadius:7,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,width:120}}/>
              <button onClick={confirmDelete} style={{padding:"6px 12px",borderRadius:7,border:"none",background:T.red500,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Confirmer la suppression</button>
              <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.neuPanel,boxShadow:T.neuOutSm,color:T.ink700,fontSize:13,cursor:"pointer"}}>Annuler</button>
            </div>}
          </div>
        </div>
      ))}
    </div>:<div style={{textAlign:"center",color:T.ink300,fontSize:13.5,padding:"22px 0"}}>Aucun commentaire pour l'instant sur ce PJ.</div>}
  </div>);
}

// ── Allocation des jours de retard par cause générique, pour un PJ donné (visible Manager uniquement) ──
function DelayAllocations({pj,delays,delayTypes,addDelayAllocation,deleteDelayAllocation,addDelayComment,deleteDelayComment,authorName}){
  const [type,setType]=useState(delayTypes[0]||"");
  const [days,setDays]=useState("");
  const [note,setNote]=useState("");
  const [authorInput,setAuthorInput]=useState("");
  const author=authorName||authorInput;
  const [err,setErr]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [pinInput,setPinInput]=useState("");
  const [openThread,setOpenThread]=useState(null); // id du retard dont le fil de discussion est ouvert
  const submit=async ()=>{
    if(!author.trim()){setErr("Le nom est obligatoire.");return;}
    if(!type){setErr("Choisissez un type de retard.");return;}
    const n=Number(days);
    if(!days||isNaN(n)||n<=0){setErr("Indiquez un nombre de jours valide.");return;}
    setErr("");
    const ok=await addDelayAllocation(pj,type,n,note,author);
    if(ok){setDays("");setNote("");}
  };
  const confirmDelete=async ()=>{
    const ok=await deleteDelayAllocation(pj,deleteTarget,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };
  const byType={};
  delays.forEach(d=>{byType[d.type]=(byType[d.type]||0)+(d.days||0);});
  return(<div style={{marginTop:20,paddingTop:16,borderTop:"1px solid "+T.line}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:10}}>⏱️ Causes de retard ({delays.length})</div>
    {Object.keys(byType).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
      {Object.entries(byType).map(([t,d])=><span key={t} style={{background:T.neuPanel,borderRadius:7,padding:"4px 10px",fontSize:13,color:T.ink700,fontWeight:600}}>{t} · {d}j</span>)}
    </div>}
    {authorName&&<div style={{fontSize:12.5,color:T.ink500,marginBottom:8}}>En tant que <strong style={{color:T.ink700}}>{authorName}</strong></div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:10}}>
      {/* Liste déroulante premium (demandé explicitement : "manque de premium sur le choix de
          liste" près des commentaires/retards) — même habillage que le reste de l'appli. */}
      <Select value={type} onChange={e=>setType(e.target.value)} options={delayTypes}/>
      <input type="number" min="1" value={days} onChange={e=>{setDays(e.target.value);setErr("");}} placeholder="Jours" style={{padding:"8px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700}}/>
      {!authorName&&<input type="text" value={authorInput} onChange={e=>{setAuthorInput(e.target.value);setErr("");}} placeholder="Votre nom" maxLength={40} style={{padding:"8px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700}}/>}
    </div>
    <DelayScopeNote/>
    {/* Zone de note agrandie (textarea, plus input une ligne) — demandé explicitement ("plus de
        place pour les notes") : une note comme "Des absences en production et un test de pression
        capricieux." tenait à peine dans l'ancien champ. */}
    <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optionnel)" rows={2} maxLength={300} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,resize:"vertical",boxSizing:"border-box",marginBottom:8,background:T.card}}/>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
      <button onClick={submit} style={{padding:"8px 18px",borderRadius:8,border:"none",background:T.teal500,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Allouer</button>
    </div>
    {err&&<div style={{fontSize:13,color:T.red500,marginBottom:8}}>{err}</div>}
    {delays.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:220,overflowY:"auto"}}>
      {[...delays].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(d=>(
        <div key={d.id} style={{background:T.neuPanel,borderRadius:10,padding:"9px 12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
            <span style={{fontWeight:700,color:T.ink900,fontSize:14}}>{d.type} — {d.days}j</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:T.ink300}}>{d.author} · {new Date(d.date).toLocaleDateString("fr-FR")}</span>
              <button onClick={()=>{setDeleteTarget(d.id);setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
            </div>
          </div>
          {d.note&&<div style={{fontSize:13,color:T.ink500,marginTop:3}}>{d.note}</div>}
          {addDelayComment&&<button onClick={()=>setOpenThread(openThread===d.id?null:d.id)} style={{marginTop:6,background:"none",border:"none",padding:0,color:T.teal600,fontSize:12.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            {(d.comments||[]).length>0?(d.comments.length+" réponse"+(d.comments.length>1?"s":"")):"Répondre"}
          </button>}
          {openThread===d.id&&<DelayThread d={d} pj={pj} authorName={authorName} addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment}/>}
          {deleteTarget===d.id&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"6px 10px",borderRadius:7,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,width:120}}/>
            <button onClick={confirmDelete} style={{padding:"6px 12px",borderRadius:7,border:"none",background:T.red500,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Confirmer</button>
            <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.neuPanel,boxShadow:T.neuOutSm,color:T.ink700,fontSize:13,cursor:"pointer"}}>Annuler</button>
          </div>}
        </div>
      ))}
    </div>}
  </div>);
}

// ── Fil de discussion d'une cause de retard précise (relances, réponses fournisseur…) ──
function DelayThread({d,pj,authorName,addDelayComment,deleteDelayComment}){
  const [authorInput,setAuthorInput]=useState("");
  const author=authorName||authorInput;
  const [text,setText]=useState("");
  const [delTarget,setDelTarget]=useState(null);
  const [pin,setPin]=useState("");
  const send=async ()=>{
    if(!author.trim()||!text.trim())return;
    const ok=await addDelayComment(pj,d.id,author,text);
    if(ok)setText("");
  };
  const confirmDelete=async idx=>{
    const ok=await deleteDelayComment(pj,d.id,idx,pin);
    if(ok){setDelTarget(null);setPin("");}
  };
  return(<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",flexDirection:"column",gap:7}}>
    {(d.comments||[]).map((c,i)=>(
      <div key={i} style={{background:T.card,borderRadius:8,padding:"7px 10px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8}}>
          <span style={{fontWeight:700,color:T.teal600,fontSize:12.5}}>{c.author}</span>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:T.ink300}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
            {deleteDelayComment&&<button onClick={()=>{setDelTarget(i);setPin("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:12,padding:0}}>✕</button>}
          </div>
        </div>
        <div style={{fontSize:13,color:T.ink700,whiteSpace:"pre-wrap",marginTop:2}}>{c.text}</div>
        {delTarget===i&&<div style={{marginTop:6,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <input type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Code Manager" style={{padding:"5px 8px",borderRadius:6,border:"1px solid "+T.line,fontSize:12,fontFamily:T.font,width:110}}/>
          <button onClick={()=>confirmDelete(i)} style={{padding:"5px 10px",borderRadius:6,border:"none",background:T.red500,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Confirmer</button>
          <button onClick={()=>setDelTarget(null)} style={{padding:"5px 10px",borderRadius:6,border:"none",background:T.neuPanelDim,color:T.ink700,fontSize:12,cursor:"pointer"}}>Annuler</button>
        </div>}
      </div>
    ))}
    <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
      {!authorName&&<input type="text" value={authorInput} onChange={e=>setAuthorInput(e.target.value)} placeholder="Nom" maxLength={40} style={{width:90,padding:"7px 9px",borderRadius:7,border:"1px solid "+T.line,fontSize:12.5,fontFamily:T.font,color:T.ink700}}/>}
      <input type="text" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} placeholder="Répondre sur ce retard... (Entrée pour envoyer)" maxLength={500} style={{flex:1,padding:"7px 10px",borderRadius:7,border:"1px solid "+T.line,fontSize:12.5,fontFamily:T.font,color:T.ink700}}/>
      <button onClick={send} disabled={!text.trim()||!author.trim()} style={{padding:"7px 14px",borderRadius:7,border:"none",background:text.trim()&&author.trim()?T.teal500:T.neuPanelDim,color:text.trim()&&author.trim()?"#fff":T.ink300,fontSize:12.5,fontWeight:700,cursor:text.trim()&&author.trim()?"pointer":"default"}}>Envoyer</button>
    </div>
  </div>);
}

