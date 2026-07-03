import React, { useState, useEffect, useMemo } from "react";
import { T } from "../theme";
import { getPjMeta, CountryFlag, ETAT_META, MONTHS, MONTHS_FULL, today } from "../pjMeta";
import { fmtMode } from "../parsers";
import { Badge } from "./SharedUI";

export const PHASES=[{k:"arrivee",l:"A",c:T.teal500,t:"Arrivée"},{k:"tests",l:"T",c:T.amber500,t:"Tests"},{k:"finProd",l:"F",c:T.emerald500,t:"Fin prod"},{k:"depart",l:"D",c:T.red500,t:"Départ"}];

export function GanttView({data,progress,df}){
  const year=today.getFullYear();
  const yearStart=new Date(year,0,1);
  const yearEnd=new Date(year,11,31);
  const totalDays=Math.round((yearEnd-yearStart)/86400000)+1;
  const [dayW,setDayW]=useState(26); // px par jour — ajustable via le zoom
  const ZOOM_LEVELS=[10,14,18,26,36,50];
  const zoomOut=()=>setDayW(w=>{const i=ZOOM_LEVELS.indexOf(w);return ZOOM_LEVELS[Math.max(0,i-1)]||ZOOM_LEVELS[0];});
  const zoomIn=()=>setDayW(w=>{const i=ZOOM_LEVELS.indexOf(w);return ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length-1,i+1)]||ZOOM_LEVELS[ZOOM_LEVELS.length-1];});
  const colW=240;
  const rowH=54;
  const [tt,setTt]=useState(null);
  const scrollRef=React.useRef(null);
  const topScrollRef=React.useRef(null);
  const dayOf=d=>Math.round((d-yearStart)/86400000);
  const xOf=d=>dayOf(d)*dayW;

  // positionne le scroll sur "aujourd'hui" au premier rendu
  useEffect(()=>{
    if(scrollRef.current){
      const target=Math.max(0,xOf(today)-220);
      scrollRef.current.scrollLeft=target;
      if(topScrollRef.current)topScrollRef.current.scrollLeft=target;
    }
  },[]);

  // synchronisation bidirectionnelle entre la barre de scroll du haut (factice) et le contenu réel
  const syncFromTop=()=>{if(scrollRef.current&&topScrollRef.current)scrollRef.current.scrollLeft=topScrollRef.current.scrollLeft;};
  const syncFromBottom=()=>{if(scrollRef.current&&topScrollRef.current)topScrollRef.current.scrollLeft=scrollRef.current.scrollLeft;};

  const scrollToDay=dIdx=>{
    if(scrollRef.current){
      const target=Math.max(0,dIdx*dayW-220);
      scrollRef.current.scrollTo({left:target,behavior:"smooth"});
      if(topScrollRef.current)topScrollRef.current.scrollTo({left:target,behavior:"smooth"});
    }
  };

  // graduations : un repère par début de semaine (lundi)
  const weekMarks=useMemo(()=>{
    const marks=[];
    let cur=new Date(yearStart);
    while(cur.getDay()!==1)cur=new Date(cur.getTime()+86400000);
    while(cur<=yearEnd){marks.push(new Date(cur));cur=new Date(cur.getTime()+7*86400000);}
    return marks;
  },[]);

  const bpct=(as,bs)=>{if(!as||!bs)return null;const a=new Date(as),b=new Date(bs);return{left:xOf(a),width:Math.max(xOf(b)-xOf(a),6)};};

  return(<div style={{background:T.surface,borderRadius:16,overflow:"hidden",border:"none",boxShadow:T.neuOut,fontFamily:T.font}}>
    <div style={{display:"flex",gap:10,padding:"14px 18px",borderBottom:"1px solid "+T.line,alignItems:"center",flexWrap:"wrap",background:T.surface}}>
      <span style={{fontSize:16,fontWeight:700,color:T.ink900}}>Planning {year}</span>
      <span style={{fontSize:15,color:T.ink500}}>Faites glisser ou utilisez la molette pour défiler →</span>
      <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
        <button onClick={zoomOut} disabled={dayW<=ZOOM_LEVELS[0]} style={{padding:"6px 12px",borderRadius:10,border:"none",background:T.surface,boxShadow:dayW<=ZOOM_LEVELS[0]?"none":T.neuOutSm,color:dayW<=ZOOM_LEVELS[0]?T.ink300:T.ink700,fontSize:17,fontWeight:700,cursor:dayW<=ZOOM_LEVELS[0]?"default":"pointer"}}>−</button>
        <button onClick={zoomIn} disabled={dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]} style={{padding:"6px 12px",borderRadius:10,border:"none",background:T.surface,boxShadow:dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]?"none":T.neuOutSm,color:dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]?T.ink300:T.ink700,fontSize:17,fontWeight:700,cursor:dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]?"default":"pointer"}}>+</button>
      </div>
      <button onClick={()=>scrollToDay(dayOf(today))} style={{padding:"7px 15px",borderRadius:10,border:"none",background:T.teal100,boxShadow:T.neuOutSm,color:T.teal600,fontSize:15,fontWeight:700,cursor:"pointer"}}>📍 Aujourd'hui</button>
    </div>

    <div ref={topScrollRef} onScroll={syncFromTop} style={{overflowX:"auto",overflowY:"hidden",height:16}}>
      <div style={{width:colW+totalDays*dayW,height:1}}/>
    </div>

    <div ref={scrollRef} onScroll={syncFromBottom} style={{display:"flex",overflowX:"auto",position:"relative"}}>
      <div style={{width:colW,flexShrink:0,position:"sticky",left:0,zIndex:5,background:T.card,borderRight:"1px solid "+T.line,boxShadow:"2px 0 6px rgba(15,40,60,.04)"}}>
        <div style={{height:46,padding:"0 16px",display:"flex",alignItems:"center",fontSize:14,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em",borderBottom:"1px solid "+T.line,background:T.surface}}>Projet</div>
        {data.map((r,ri)=>{
          const c=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
          const pv=progress[r.pj];
          const meta=getPjMeta(r.pj,r);
          return(<div key={ri} style={{height:rowH,padding:"6px 16px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2,borderBottom:"1px solid "+T.surface}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.bar,flexShrink:0}}/>
              <span style={{fontSize:15,fontWeight:700,color:T.teal600,fontFamily:T.fontMono,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{r.pj}</span>
              {pv!=null&&<span style={{fontSize:13,fontWeight:700,color:pv>=100?T.emerald600:T.amber600,background:pv>=100?T.emerald100:T.amber100,padding:"2px 6px",borderRadius:5,flexShrink:0}}>{pv}%</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:16,overflow:"hidden"}}>
              <CountryFlag pays={meta.pays} size={11}/>
              <span style={{fontSize:13,color:T.ink500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.nomProjet} <span style={{fontStyle:"italic",fontSize:11,color:T.ink300}}>({r.gamme})</span></span>
            </div>
          </div>);
        })}
      </div>

      <div style={{position:"relative",width:totalDays*dayW,flexShrink:0}}>
        {/* en-tête mois + semaines */}
        <div style={{height:46,position:"relative",borderBottom:"1px solid "+T.line,background:T.surface}}>
          {MONTHS_FULL.map((mn,mi)=>{const ms=new Date(year,mi,1);const me=new Date(year,mi+1,1);const w=(xOf(me)-xOf(ms));const isCur=mi===today.getMonth();
            return(<div key={mi} style={{position:"absolute",left:xOf(ms),width:w,top:0,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:isCur?T.teal600:T.ink700,borderLeft:"1px solid "+T.line,background:isCur?T.teal100:"transparent"}}>{MONTHS[mi]}</div>);
          })}
          {weekMarks.map((wm,wi)=>(
            <div key={wi} style={{position:"absolute",left:xOf(wm),top:22,height:24,width:dayW*7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:T.ink300,borderLeft:"1px solid "+T.surfaceAlt,fontWeight:500}}>{wm.getDate()}</div>
          ))}
        </div>

        {/* lignes de fond + grille */}
        {data.map((r,ri)=>{
          const c=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
          const mb=bpct(r.arrivee,r.depart);
          return(<div key={ri} style={{height:rowH,position:"relative",borderBottom:"1px solid "+T.surface}}
            onMouseEnter={e=>setTt({r,x:e.clientX,y:e.clientY})} onMouseLeave={()=>setTt(null)}>
            {weekMarks.map((wm,wi)=><div key={wi} style={{position:"absolute",left:xOf(wm),top:0,bottom:0,width:1,background:T.surface}}/>)}
            {MONTHS_FULL.map((_,mi)=><div key={mi} style={{position:"absolute",left:xOf(new Date(year,mi,1)),top:0,bottom:0,width:1,background:T.line}}/>)}
            {mb&&<div style={{position:"absolute",left:mb.left,width:mb.width,top:"50%",transform:"translateY(-50%)",height:20,background:c.bar,borderRadius:6,opacity:.16,zIndex:1}}/>}
            {PHASES.map(ph=>{const dt=r[ph.k];if(!dt)return null;const x=xOf(new Date(dt));
              return(<div key={ph.k} style={{position:"absolute",left:x,top:"50%",transform:"translate(-50%,-50%)",width:24,height:24,borderRadius:"50%",background:ph.c,border:"2.5px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",zIndex:4,cursor:"pointer",boxShadow:"0 2px 5px rgba(0,0,0,.18)"}}>{ph.l}</div>);
            })}
          </div>);
        })}

        {/* ligne "aujourd'hui" */}
        <div style={{position:"absolute",left:xOf(today),top:46,bottom:0,width:2,background:T.red500,opacity:.5,zIndex:3}}/>
      </div>
    </div>

    {tt&&<div style={{position:"fixed",left:Math.min(tt.x+12,window.innerWidth-230),top:tt.y-10,background:T.navy900,color:"#fff",borderRadius:10,padding:"12px 16px",fontSize:16,zIndex:9999,pointerEvents:"none",minWidth:200,fontFamily:T.font,boxShadow:T.shadowLg}}>
      <div style={{fontWeight:700,fontSize:19,marginBottom:8,color:T.teal400}}>{tt.r.pj}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {[["Arrivée",tt.r.arrivee],["Tests",tt.r.tests],["Fin prod",tt.r.finProd],["Départ",tt.r.depart]].map(([l,d])=><div key={l}><span style={{color:T.ink300,fontSize:14}}>{l}</span><br/><b>{fmtMode(d?new Date(d):null,df)}</b></div>)}
      </div>
      <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.15)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Badge etat={tt.r.etat}/><span style={{color:T.ink300,fontSize:14}}>{tt.r.gamme}</span>
      </div>
    </div>}

    {/* mini-frise annuelle de navigation */}
    <div style={{padding:"10px 18px",borderTop:"1px solid "+T.line,background:T.surface}}>
      <div onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();const ratio=(e.clientX-rect.left)/rect.width;scrollToDay(Math.round(ratio*totalDays));}}
        style={{position:"relative",height:22,borderRadius:6,background:T.surfaceAlt,cursor:"pointer",overflow:"hidden"}}>
        {MONTHS.map((mn,mi)=>{const ms=new Date(year,mi,1);const left=(dayOf(ms)/totalDays)*100;return(
          <div key={mi} style={{position:"absolute",left:left+"%",top:0,bottom:0,width:1,background:T.line}}/>
        );})}
        <div style={{position:"absolute",left:(dayOf(today)/totalDays)*100+"%",top:0,bottom:0,width:2,background:T.red500}}/>
        {MONTHS.map((mn,mi)=>{const ms=new Date(year,mi,1);const left=((dayOf(ms)+15)/totalDays)*100;return(
          <span key={mi} style={{position:"absolute",left:left+"%",top:2,fontSize:12,color:T.ink500,fontWeight:600,transform:"translateX(-50%)"}}>{mn}</span>
        );})}
      </div>
    </div>

    <div style={{padding:"10px 18px",borderTop:"1px solid "+T.line,display:"flex",gap:14,flexWrap:"wrap",background:T.surface}}>
      {PHASES.map(ph=><span key={ph.k} style={{display:"flex",alignItems:"center",gap:6,fontSize:15}}><span style={{width:18,height:18,borderRadius:"50%",background:ph.c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:700}}>{ph.l}</span><span style={{color:T.ink500,fontWeight:500}}>{ph.t}</span></span>)}
    </div>
  </div>);
}

