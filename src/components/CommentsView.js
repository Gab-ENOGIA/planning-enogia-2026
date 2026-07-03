import React, { useState, useMemo } from "react";
import { T } from "../theme";
import { fmt } from "../parsers";

export function CommentsView({data,comments,addComment,deleteComment}){
  const [author,setAuthor]=useState("");
  const [selectedPj,setSelectedPj]=useState("");
  const [text,setText]=useState("");
  const [filterPj,setFilterPj]=useState("");
  const [err,setErr]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null); // {pj,idx}
  const [pinInput,setPinInput]=useState("");

  const allComments=useMemo(()=>{
    const out=[];
    Object.entries(comments).forEach(([pj,list])=>list.forEach((c,idx)=>out.push({...c,pj,_idx:idx})));
    return out.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[comments]);
  const filtered=filterPj?allComments.filter(c=>c.pj===filterPj):allComments;

  const submit=async ()=>{
    if(!author.trim()){setErr("Le nom est obligatoire pour publier un commentaire.");return;}
    if(!text.trim()||!selectedPj)return;
    setErr("");
    const ok=await addComment(selectedPj,author,text);
    if(ok)setText("");
  };
  const confirmDelete=async ()=>{
    const ok=await deleteComment(deleteTarget.pj,deleteTarget.idx,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };

  return(<div style={{display:"flex",flexDirection:"column",gap:16,fontFamily:T.font}}>
    <div style={{background:T.card,borderRadius:14,padding:20,boxShadow:T.shadowMd}}>
      <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:21,color:T.ink900,marginBottom:14}}>💬 Ajouter un commentaire</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:10}}>
        <div>
          <label style={{fontSize:13,color:T.ink500,fontWeight:600,display:"block",marginBottom:5}}>N° PJ concerné</label>
          <select value={selectedPj} onChange={e=>setSelectedPj(e.target.value)} style={{padding:"9px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:15,fontFamily:T.font,color:T.ink700,background:T.surface,width:"100%"}}>
            <option value="">— Choisir un PJ —</option>
            {data.map(d=><option key={d.pj} value={d.pj}>{d.pj}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:13,color:T.ink500,fontWeight:600,display:"block",marginBottom:5}}>Votre nom (obligatoire)</label>
          <input type="text" value={author} onChange={e=>{setAuthor(e.target.value);setErr("");}} placeholder="Votre nom" maxLength={40}
            style={{padding:"9px 12px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:15,fontFamily:T.font,color:T.ink700,width:"100%"}}/>
        </div>
      </div>
      {err&&<div style={{fontSize:13,color:T.red500,marginBottom:8}}>{err}</div>}
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ajouter un commentaire..." rows={3} maxLength={1000}
        style={{padding:"9px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:15,fontFamily:T.font,color:T.ink700,resize:"vertical",width:"100%",marginBottom:10}}/>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button onClick={submit} disabled={!text.trim()||!selectedPj} style={{padding:"9px 20px",borderRadius:9,border:"none",background:text.trim()&&selectedPj?T.teal500:T.surfaceAlt,color:text.trim()&&selectedPj?"#fff":T.ink300,fontSize:15,fontWeight:700,cursor:text.trim()&&selectedPj?"pointer":"default"}}>Publier</button>
      </div>
    </div>

    <div style={{background:T.card,borderRadius:14,padding:20,boxShadow:T.shadowMd}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:19,color:T.ink900}}>Tous les commentaires ({filtered.length})</div>
        <select value={filterPj} onChange={e=>setFilterPj(e.target.value)} style={{padding:"7px 11px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,background:T.surface}}>
          <option value="">Tous les PJ</option>
          {data.map(d=><option key={d.pj} value={d.pj}>{d.pj}</option>)}
        </select>
      </div>
      {filtered.length===0&&<div style={{color:T.ink300,fontSize:15,textAlign:"center",padding:"30px 0"}}>Aucun commentaire pour l'instant.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(c=>{
          const isTarget=deleteTarget&&deleteTarget.pj===c.pj&&deleteTarget.idx===c._idx;
          return(<div key={c.pj+"-"+c._idx} style={{background:T.surface,borderRadius:10,padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5,flexWrap:"wrap",gap:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontWeight:700,color:T.teal600,fontSize:15}}>{c.pj}</span>
                <span style={{fontWeight:700,color:T.ink900,fontSize:14}}>{c.author}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:T.ink300}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                <button onClick={()=>{setDeleteTarget({pj:c.pj,idx:c._idx});setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
              </div>
            </div>
            <div style={{fontSize:14,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
            {c.linkedDate&&<div style={{marginTop:5,fontSize:12,color:T.ink500,fontWeight:600}}>☁️ Lié au {fmt(new Date(c.linkedDate))}</div>}
            {isTarget&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"6px 10px",borderRadius:7,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,width:120}}/>
              <button onClick={confirmDelete} style={{padding:"6px 12px",borderRadius:7,border:"none",background:T.red500,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Confirmer la suppression</button>
              <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:T.surface,boxShadow:T.neuOutSm,color:T.ink700,fontSize:13,cursor:"pointer"}}>Annuler</button>
            </div>}
          </div>);
        })}
      </div>
    </div>
  </div>);
}

