import React, { useState } from "react";
import { T } from "../theme";
import { getPjMeta, PersonIcon, CountryFlag, MONTHS_FULL, today } from "../pjMeta";
import { fmt, fmtMode } from "../parsers";
import { Badge } from "./SharedUI";
import { PHASES } from "./GanttView";

export function ProjectModal({pj,data,df,onClose,comments,addComment,deleteComment}){
  const r=data.find(x=>x.pj===pj);
  if(!r)return null;
  const meta=getPjMeta(pj,r);
  const dates=PHASES.map(ph=>({...ph,date:r[ph.k]?new Date(r[ph.k]):null})).filter(p=>p.date);
  if(dates.length===0)return null;
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

  return(<div className="enogia-modal-backdrop" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(12,36,54,.55)",backdropFilter:"blur(3px)",WebkitBackdropFilter:"blur(3px)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:T.font}}>
    <div className="enogia-modal-pop" onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:18,padding:28,maxWidth:640,width:"100%",maxHeight:"86vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(12,36,54,.35), 0 4px 14px rgba(12,36,54,.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:T.fontMono,fontWeight:700,fontSize:24,color:T.ink900,letterSpacing:"-.01em"}}>{pj}</div>
          <div style={{color:T.ink500,fontSize:16,marginTop:3,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>{meta.nomProjet} · <CountryFlag pays={meta.pays} size={14}/> {meta.pays} · {meta.chefProjet}</div>
        </div>
        <button onClick={onClose} style={{background:T.surface,border:"none",borderRadius:9,width:36,height:36,fontSize:18,cursor:"pointer",color:T.ink700,flexShrink:0}}>✕</button>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <Badge etat={r.etat}/>
        <span style={{fontSize:15,color:T.ink500,alignSelf:"center"}}>{r.gamme}</span>
        {r.clientPresence?.present&&<span style={{display:"flex",alignItems:"center",gap:5,fontSize:14,background:T.red100,color:T.red500,borderRadius:7,padding:"4px 10px",fontWeight:700}}><PersonIcon size={14} color={T.red500}/> Client/NOBO présent{r.clientPresence.date?" — "+fmt(new Date(r.clientPresence.date)):""}</span>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:24}}>
        {PHASES.map(ph=>{const d=r[ph.k]?new Date(r[ph.k]):null;const showPresence=ph.k==="tests"&&r.clientPresence?.present;return(
          <div key={ph.k} style={{background:T.surface,borderRadius:10,padding:"11px 14px",borderTop:"3px solid "+ph.c,position:"relative"}}>
            <div style={{color:T.ink500,fontSize:13,fontWeight:600,textTransform:"uppercase",letterSpacing:".03em"}}>{ph.t}</div>
            <div style={{fontWeight:700,color:T.ink900,fontSize:19,marginTop:3}}>{d?fmtMode(d,df):"—"}</div>
            {showPresence&&<span title="Client/NOBO présent" style={{position:"absolute",top:-8,right:-8,fontSize:15,background:T.red100,border:"1.5px solid "+T.red500,borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center"}}><PersonIcon size={13} color={T.red500}/></span>}
          </div>
        );})}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat("+months.length+",1fr)",gap:14}}>
        {months.map((mo,mi)=>{
          const y=mo.getFullYear(),m=mo.getMonth();
          const de=evByDay(y,m);
          const fd=new Date(y,m,1).getDay();
          const adj=(fd+6)%7;
          const dim=new Date(y,m+1,0).getDate();
          const cells=[...Array(adj).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
          return(<div key={mi}>
            <div style={{textAlign:"center",fontWeight:700,fontSize:14,color:T.ink900,marginBottom:8}}>{MONTHS_FULL[m]} {y}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
              {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:T.ink300}}>{d}</div>)}
              {cells.map((day,ci)=>{
                if(!day)return<div key={"e"+ci}/>;
                const evs=de[day]||[];
                const isToday=day===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
                return(<div key={day} style={{aspectRatio:"1",borderRadius:7,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:evs.length?700:500,color:evs.length?"#fff":isToday?T.teal600:T.ink700,background:evs.length?evs[0].c:isToday?T.teal100:"transparent",border:isToday&&!evs.length?"1.5px solid "+T.teal400:"none",position:"relative"}}>
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

      <ProjectComments pj={pj} comments={comments?.[pj]||[]} addComment={addComment} deleteComment={deleteComment}/>
    </div>
  </div>);
}

export function ProjectComments({pj,comments,addComment,deleteComment}){
  const [author,setAuthor]=useState("");
  const [text,setText]=useState("");
  const [err,setErr]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null); // index original du commentaire à supprimer
  const [pinInput,setPinInput]=useState("");
  const submit=async ()=>{
    if(!author.trim()){setErr("Le nom est obligatoire pour publier un commentaire.");return;}
    if(!text.trim())return;
    setErr("");
    const ok=await addComment(pj,author,text);
    if(ok)setText("");
  };
  const confirmDelete=async ()=>{
    const ok=await deleteComment(pj,deleteTarget,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };
  const withIndex=comments.map((c,i)=>({...c,_idx:i}));
  const sorted=[...withIndex].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return(<div style={{marginTop:20,paddingTop:16,borderTop:"1px solid "+T.line}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:10}}>💬 Commentaires ({comments.length})</div>
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
      <input type="text" value={author} onChange={e=>{setAuthor(e.target.value);setErr("");}} placeholder="Votre nom (obligatoire)" maxLength={40}
        style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:14,fontFamily:T.font,color:T.ink700}}/>
      {err&&<span style={{fontSize:13,color:T.red500}}>{err}</span>}
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ajouter un commentaire..." rows={3} maxLength={1000}
        style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,resize:"vertical"}}/>
      <button onClick={submit} disabled={!text.trim()} style={{alignSelf:"flex-end",padding:"8px 18px",borderRadius:8,border:"none",background:text.trim()?T.teal500:T.surfaceAlt,color:text.trim()?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:text.trim()?"pointer":"default"}}>Publier</button>
    </div>
    {sorted.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:300,overflowY:"auto"}}>
      {sorted.map(c=>(
        <div key={c._idx} style={{background:T.surface,borderRadius:10,padding:"10px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,gap:8}}>
            <span style={{fontWeight:700,color:T.teal600,fontSize:14}}>{c.author}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:T.ink300}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
              <button onClick={()=>{setDeleteTarget(c._idx);setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
            </div>
          </div>
          <div style={{fontSize:14,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
          {c.linkedDate&&<div style={{marginTop:5,fontSize:12,color:T.ink500,fontWeight:600}}>☁️ Lié au {fmt(new Date(c.linkedDate))}</div>}
          {deleteTarget===c._idx&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"6px 10px",borderRadius:7,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,width:120}}/>
            <button onClick={confirmDelete} style={{padding:"6px 12px",borderRadius:7,border:"none",background:T.red500,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Confirmer la suppression</button>
            <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.surface,boxShadow:T.neuOutSm,color:T.ink700,fontSize:13,cursor:"pointer"}}>Annuler</button>
          </div>}
        </div>
      ))}
    </div>}
  </div>);
}

