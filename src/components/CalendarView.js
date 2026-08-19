import React, { useState, useMemo } from "react";
import { T } from "../theme";
import { getPjMeta, DriftDot, PersonIcon, CountryFlag, MONTHS_FULL, today } from "../pjMeta";
import { fmt, toLocalISO, weekStartOf } from "../parsers";

// Palette cyclique pour distinguer chaque machine (PJ) dans le calendrier
export const PJ_PALETTE=["#0d9bb5","#7c3aed","#d97706","#059669","#dc2626","#9333ea","#0e8fa8","#65a30d","#c2761a","#2563eb","#be185d","#0f766e","#b45309","#4338ca","#16a34a"];
export function usePjColors(data){
  return useMemo(()=>{
    const pjs=[...new Set(data.map(r=>r.pj))].sort();
    const m={};
    pjs.forEach((pj,i)=>{m[pj]=PJ_PALETTE[i%PJ_PALETTE.length];});
    return m;
  },[data]);
}
export function getWeekStatus(r,weekStart,weekEnd){
  const a=r.arrivee?new Date(r.arrivee):null;
  const t1=r.tests?new Date(r.tests):null;
  const t2=r.testsFin?new Date(r.testsFin):t1;
  const fp=r.finProd?new Date(r.finProd):null;
  const dp=r.depart?new Date(r.depart):null;
  if(!a&&!dp)return null;
  if(dp&&dp<weekStart)return null; // déjà parti, rien à afficher

  const within=d=>d&&d>=weekStart&&d<weekEnd;
  const overlaps=(s,e)=>s&&e&&s<weekEnd&&e>=weekStart;
  const milestones=[];
  if(within(a))milestones.push("Arrivée");
  if(within(t1)||within(t2)||overlaps(t1,t2))milestones.push("Tests");
  if(within(fp))milestones.push("Fin prod");
  if(within(dp))milestones.push("Départ");

  if(milestones.length>1)return milestones.join(" + ");
  if(milestones.length===1)return milestones[0];
  // "Production" uniquement entre l'arrivée et la fin de production (pas après)
  if(a&&a<weekEnd&&(fp?fp>=weekStart:true)&&(dp?dp>=weekStart:true))return"Production";
  return null;
}
export const SEGMENT_STYLE={
  "Arrivée":{c:"#D8C3AA",t:"#5A4630",bold:false},
  "Production":{c:"#A8C9E0",t:"#1F435C",bold:false},
  "Tests":{c:"#F2DBA0",t:"#7A5A17",bold:true},
  "Fin prod":{c:"#B7D9C0",t:"#2E5B3B",bold:true},
  "Départ":{c:"#F2C2A0",t:"#8A431A",bold:true},
};


export function getDayStatus(r,day,excludedDates){
  const dayEnd=new Date(day);dayEnd.setDate(dayEnd.getDate()+1);
  const status=getWeekStatus(r,day,dayEnd);
  if(!status)return null;
  const isWeekend=day.getDay()===0||day.getDay()===6;
  const isExcluded=excludedDates&&excludedDates.includes(toLocalISO(day));
  if(!isWeekend&&!isExcluded)return status;
  // Le week-end ou un jour exclu manuellement : pas de Production ni de Tests (le week-end seulement pour Tests), mais les jalons ponctuels restent affichés
  const milestones=status.split(" + ").filter(m=>{
    if(m==="Production")return false; // toujours exclu si week-end OU exclusion manuelle
    if(m==="Tests"&&isWeekend)return false;
    return true;
  });
  return milestones.length?milestones.join(" + "):null;
}
export function CalendarView({data,onSelectPj,mode,setMode,anchor,setAnchor,dayAnchor,setDayAnchor,closurePeriods,productionExclusions,comments,addComment,zoomLevel,setZoomLevel,pinOk}){
  const isClosurePeriod=(colStart,colEnd)=>{
    if(!closurePeriods||!closurePeriods.length)return false;
    return closurePeriods.some(p=>{
      const ps=new Date(p.start),pe=new Date(p.end);pe.setHours(23,59,59,999);
      return colStart<pe&&colEnd>=ps;
    });
  };
  const rowH=54;
  // zoomLevel est désormais géré au niveau de App (props) pour persister quand on quitte/revient sur cet onglet
  const [commentPopup,setCommentPopup]=useState(null); // {pj, dateIso}
  const [commentAuthor,setCommentAuthor]=useState("");
  const [commentText,setCommentText]=useState("");
  const [commentErr,setCommentErr]=useState("");
  const [commentPrivate,setCommentPrivate]=useState(false);
  const WEEK_COUNTS=[6,8,14,24,36];
  const DAY_COUNTS=[9,14,21,35,52,84,168,252];
  const maxZoomLevel=mode==="week"?WEEK_COUNTS.length-1:DAY_COUNTS.length-1;
  const nWeeks=WEEK_COUNTS[Math.min(zoomLevel,WEEK_COUNTS.length-1)];
  const nDays=DAY_COUNTS[Math.min(zoomLevel,DAY_COUNTS.length-1)];
  const zoomIn=()=>setZoomLevel(z=>Math.max(0,z-1));
  const zoomOut=()=>setZoomLevel(z=>Math.min(maxZoomLevel,z+1));
  const pjColors=usePjColors(data);

  const weeks=useMemo(()=>{
    const out=[];
    for(let i=0;i<nWeeks;i++){const s=new Date(anchor);s.setDate(s.getDate()+i*7);out.push(s);}
    return out;
  },[anchor,nWeeks]);
  const days=useMemo(()=>{
    const out=[];
    for(let i=0;i<nDays;i++){const d=new Date(dayAnchor);d.setDate(d.getDate()+i);out.push(d);}
    return out;
  },[dayAnchor,nDays]);

  const cols=mode==="week"?weeks:days;
  const pjs=useMemo(()=>[...new Set(data.map(r=>r.pj))].sort((a,b)=>{
    const ra=data.find(r=>r.pj===a),rb=data.find(r=>r.pj===b);
    const da=ra&&ra.arrivee?new Date(ra.arrivee):new Date(9999,0,1);
    const db=rb&&rb.arrivee?new Date(rb.arrivee):new Date(9999,0,1);
    return da-db;
  }),[data]);
  const weekNum=d=>{const j=new Date(d.getFullYear(),0,1);return Math.ceil(((d-j)/86400000+j.getDay()+1)/7);};
  const todayWeekIdx=weeks.findIndex(w=>{const e=new Date(w);e.setDate(e.getDate()+7);return today>=w&&today<e;});
  const todayDayIdx=days.findIndex(d=>d.toDateString()===today.toDateString());
  const DAY_NAMES=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

  const goPrev=()=>{
    if(mode==="week")setAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()-7*4);return n;});
    else setDayAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()-7);return n;});
    if(scrollRef.current)scrollRef.current.scrollLeft=0;
  };
  const goNext=()=>{
    if(mode==="week")setAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()+7*4);return n;});
    else setDayAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()+7);return n;});
    if(scrollRef.current)scrollRef.current.scrollLeft=0;
  };
  const goToday=()=>{
    if(mode==="week")setAnchor(weekStartOf(today));
    else{const d=new Date(today);d.setHours(0,0,0,0);setDayAnchor(d);}
    if(scrollRef.current)scrollRef.current.scrollLeft=0;
  };

  const scrollRef=React.useRef(null);

  return(<div style={{background:T.card,borderRadius:12,overflow:"hidden",border:"1px solid "+T.line,fontFamily:T.font}}>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderBottom:"1px solid "+T.line,background:T.surface,flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:4,background:T.surfaceAlt,borderRadius:9,padding:3}}>
        <button onClick={()=>setMode("week")} style={{padding:"6px 14px",borderRadius:7,border:"none",background:mode==="week"?T.card:"transparent",color:mode==="week"?T.navy800:T.ink500,fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:mode==="week"?T.shadowSm:"none"}}>Semaine</button>
        <button onClick={()=>setMode("day")} style={{padding:"6px 14px",borderRadius:7,border:"none",background:mode==="day"?T.card:"transparent",color:mode==="day"?T.navy800:T.ink500,fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:mode==="day"?T.shadowSm:"none"}}>Jour</button>
      </div>
      <button onClick={goPrev} style={{padding:"7px 14px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",fontSize:17,cursor:"pointer",color:T.ink700}}>◀</button>
      <span style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:18,color:T.ink900,minWidth:220,textAlign:"center"}}>
        {mode==="week"
          ?"Sem. "+weekNum(weeks[0])+" → "+weekNum(weeks[weeks.length-1])+", "+weeks[0].getFullYear()
          :days[0].toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" → "+days[days.length-1].toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}
      </span>
      <button onClick={goNext} style={{padding:"7px 14px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",fontSize:17,cursor:"pointer",color:T.ink700}}>▶</button>
      <span style={{fontSize:14,color:T.ink300}}>Faites défiler horizontalement pour naviguer →</span>
      <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
        <button onClick={zoomOut} disabled={zoomLevel>=maxZoomLevel} style={{padding:"7px 13px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:zoomLevel>=maxZoomLevel?T.ink300:T.ink700,fontSize:17,fontWeight:700,cursor:zoomLevel>=maxZoomLevel?"default":"pointer"}}>−</button>
        <button onClick={zoomIn} disabled={zoomLevel<=0} style={{padding:"7px 13px",borderRadius:8,border:"1px solid "+T.line,background:"transparent",color:zoomLevel<=0?T.ink300:T.ink700,fontSize:17,fontWeight:700,cursor:zoomLevel<=0?"default":"pointer"}}>+</button>
      </div>
      <button onClick={goToday} style={{padding:"7px 15px",borderRadius:8,border:"1px solid "+T.teal400,background:"transparent",color:T.teal600,fontSize:15,fontWeight:700,cursor:"pointer"}}>Aujourd'hui</button>
    </div>

    <div ref={scrollRef}
      style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 260px)",transform:"translateZ(0)"}}>
      <div style={{display:"grid",gridTemplateColumns:"210px "+(mode==="week"
        ?"repeat("+cols.length+",minmax(92px,1fr))"
        :cols.map(d=>(d.getDay()===0||d.getDay()===6)?"minmax(34px,0.55fr)":"minmax(64px,1fr)").join(" ")
      )}}>
        <div style={{padding:"6px 14px",fontSize:13,fontWeight:700,color:T.ink300,background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,position:"sticky",left:0,top:0,zIndex:12,height:34,width:210,minWidth:210,maxWidth:210,boxSizing:"border-box",transform:"translateZ(0)",backfaceVisibility:"hidden"}}/>
        {(()=>{
          // Regroupe les colonnes consécutives par mois pour afficher une bande "Mois Année" au-dessus
          const groups=[];
          cols.forEach((c,i)=>{
            const m=c.getMonth(),y=c.getFullYear();
            const last=groups[groups.length-1];
            if(last&&last.m===m&&last.y===y)last.span++;
            else groups.push({m,y,span:1});
          });
          return groups.map((g,gi)=>(
            <div key={gi} style={{gridColumn:"span "+g.span,padding:"6px 4px",textAlign:"center",fontSize:14,fontWeight:700,color:g.m===today.getMonth()&&g.y===today.getFullYear()?T.teal600:T.ink500,background:g.m===today.getMonth()&&g.y===today.getFullYear()?T.teal100:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,position:"sticky",top:0,zIndex:10,height:34,boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center",transform:"translateZ(0)",backfaceVisibility:"hidden"}}>{MONTHS_FULL[g.m]} {g.y}</div>
          ));
        })()}
        <div style={{padding:"9px 14px",fontSize:14,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".03em",background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,boxShadow:"0 2px 0 "+T.surface,position:"sticky",left:0,top:34,zIndex:12,width:210,minWidth:210,maxWidth:210,boxSizing:"border-box",transform:"translateZ(0)",backfaceVisibility:"hidden"}}>Machine</div>
        {mode==="week"?weeks.map((w,wi)=>{
          const we=new Date(w);we.setDate(we.getDate()+7);
          const closed=isClosurePeriod(w,we);
          return(<div key={wi} style={{padding:"9px 4px",textAlign:"center",fontSize:14,fontWeight:700,color:wi===todayWeekIdx?"#fff":closed?T.ink300:T.ink500,background:wi===todayWeekIdx?T.teal500:closed?T.ink100:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:(wi===todayWeekIdx?"inset 0 -3px 0 "+T.navy900+", ":"")+"0 2px 0 "+(wi===todayWeekIdx?T.teal500:closed?T.ink100:T.surface),position:"sticky",top:34,zIndex:10,transform:"translateZ(0)",backfaceVisibility:"hidden"}}>S{weekNum(w)}{closed&&" 🏖️"}</div>);
        }):days.map((d,di)=>{
          const isWE=d.getDay()===0||d.getDay()===6;
          const dEnd=new Date(d);dEnd.setDate(dEnd.getDate()+1);
          const closed=isClosurePeriod(d,dEnd);
          return(<div key={di} style={{padding:"6px 2px",textAlign:"center",background:di===todayDayIdx?T.teal500:closed?T.ink100:isWE?T.surfaceAlt:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:(di===todayDayIdx?"inset 0 -3px 0 "+T.navy900+", ":"")+"0 2px 0 "+(di===todayDayIdx?T.teal500:closed?T.ink100:isWE?T.surfaceAlt:T.surface),position:"sticky",top:34,zIndex:10,transform:"translateZ(0)",backfaceVisibility:"hidden"}}>
            <div style={{fontSize:12,fontWeight:600,color:di===todayDayIdx?"rgba(255,255,255,.85)":T.ink300}}>S{weekNum(d)}</div>
            <div style={{fontSize:13,fontWeight:600,color:di===todayDayIdx?"rgba(255,255,255,.85)":closed?T.ink300:T.ink300}}>{DAY_NAMES[d.getDay()]}</div>
            <div style={{fontSize:17,fontWeight:700,color:di===todayDayIdx?"#fff":closed?T.ink300:T.ink700}}>{d.getDate()}</div>
          </div>);
        })}

        {pjs.map((pj,pjIdx)=>{
          const r=data.find(x=>x.pj===pj);
          const color=pjColors[pj]||T.ink500;
          const meta=getPjMeta(pj,r);
          const rowBg=pjIdx%2===0?T.card:T.surface;
          return(<React.Fragment key={pj}>
            <div onClick={()=>onSelectPj&&onSelectPj(pj)} style={{padding:"6px 14px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2,height:rowH,width:210,minWidth:210,maxWidth:210,boxSizing:"border-box",borderBottom:"1px solid "+T.surface,borderRight:"1px solid "+T.line,background:rowBg,position:"sticky",left:0,cursor:"pointer",overflow:"hidden",transform:"translateZ(0)",backfaceVisibility:"hidden",zIndex:5}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                <span style={{fontSize:15,fontWeight:700,color:T.teal600,fontFamily:T.fontMono,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pj}</span>
                <DriftDot drift={r.drift}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:16,overflow:"hidden"}}>
                <CountryFlag pays={meta.pays} size={11}/>
                <span style={{fontSize:14,color:T.ink500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.nomProjet} <span style={{fontStyle:"italic",fontSize:11,color:T.ink300}}>({r.gamme})</span></span>
              </div>
            </div>
            {mode==="week"?weeks.map((w,wi)=>{
              const we=new Date(w);we.setDate(we.getDate()+7);
              const status=getWeekStatus(r,w,we);
              const isTodayCol=wi===todayWeekIdx;
              const closed=isClosurePeriod(w,we);
              const cellBg=closed?T.ink100:isTodayCol?T.teal500+"18":rowBg;
              if(!status)return<div key={wi} style={{height:rowH,borderBottom:"1px solid "+T.surface,borderLeft:"1px solid "+T.line,background:cellBg}}/>;
              const lastMilestone=status.split(" + ").pop();
              const st=SEGMENT_STYLE[lastMilestone]||SEGMENT_STYLE["Production"];
              const presenceDate=r.clientPresence?.present&&r.clientPresence.date?new Date(r.clientPresence.date):null;
              const showPresence=presenceDate&&presenceDate>=w&&presenceDate<we;
              return(<div key={wi} onClick={()=>onSelectPj&&onSelectPj(pj)} onMouseEnter={e=>{e.currentTarget.style.background=T.teal100+"50";}} onMouseLeave={e=>{e.currentTarget.style.background=cellBg;}} style={{height:rowH,borderBottom:"1px solid "+T.surface,borderLeft:"1px solid "+T.line,padding:3,cursor:"pointer",position:"relative",background:cellBg,transition:"background .12s ease"}}>
                <div title={status+(showPresence?" · Client/NOBO présent":"")} style={{height:"100%",background:st.c,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:status.includes("+")?11:13,fontWeight:st.bold?700:600,color:st.t,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",padding:"0 4px",opacity:closed?0.45:1}}>{status}</div>
                {showPresence&&<span style={{position:"absolute",top:-8,right:-8,fontSize:20,background:T.red500,border:"2px solid #fff",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:T.shadowMd,zIndex:5}}><PersonIcon size={18} color="#fff"/></span>}
              </div>);
            }):days.map((d,di)=>{
              const isWE=d.getDay()===0||d.getDay()===6;
              const status=getDayStatus(r,d,productionExclusions?.[pj]);
              const isTodayCol=di===todayDayIdx;
              const dEnd=new Date(d);dEnd.setDate(dEnd.getDate()+1);
              const closed=isClosurePeriod(d,dEnd);
              const cellBg=closed?T.ink100:isTodayCol?T.teal500+"22":isWE?T.surfaceAlt:rowBg;
              const iso=toLocalISO(d);
              const dayComments=(comments?.[pj]||[]).filter(c=>c.linkedDate===iso&&(pinOk||!c.private));
              const hasComment=dayComments.length>0;
              const openCommentPopup=e=>{
                e.stopPropagation();
                setCommentPopup({pj,dateIso:iso});
                setCommentAuthor("");setCommentText("");setCommentErr("");
              };
              if(!status)return(<div key={di} style={{height:rowH,borderBottom:"1px solid "+T.surface,borderLeft:"1px solid "+T.line,background:cellBg,position:"relative"}}>
                <button onClick={openCommentPopup} title={hasComment?dayComments.length+" commentaire(s) ce jour":"Ajouter un commentaire ce jour"} style={{position:"absolute",bottom:2,right:2,background:hasComment?"#fff":"none",border:hasComment?"2.5px solid #4a7fd6":"none",borderRadius:hasComment?"50%":0,boxShadow:hasComment?"0 0 0 2px #fff, 0 3px 8px rgba(74,127,214,.45)":"none",width:hasComment?25:"auto",height:hasComment?25:"auto",display:hasComment?"flex":"inline-block",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:hasComment?14:10,opacity:hasComment?1:0.25,padding:hasComment?0:1,zIndex:8}}>☁️</button>
              </div>);
              const lastMilestone=status.split(" + ").pop();
              const st=SEGMENT_STYLE[lastMilestone]||SEGMENT_STYLE["Production"];
              const showPresence=r.clientPresence?.present&&r.clientPresence.date&&new Date(r.clientPresence.date).toDateString()===d.toDateString();
              return(<div key={di} onClick={()=>onSelectPj&&onSelectPj(pj)} onMouseEnter={e=>{e.currentTarget.style.background=T.teal100+"50";}} onMouseLeave={e=>{e.currentTarget.style.background=cellBg;}} style={{height:rowH,borderBottom:"1px solid "+T.surface,borderLeft:"1px solid "+T.line,padding:3,cursor:"pointer",background:cellBg,position:"relative",transition:"background .12s ease"}}>
                <div title={status+(showPresence?" · Client/NOBO présent":"")} style={{height:"100%",background:st.c,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:status.includes("+")?9:10.5,fontWeight:st.bold?700:600,color:st.t,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",padding:"0 2px",opacity:closed?0.45:1}}>{status}</div>
                {showPresence&&<span style={{position:"absolute",top:-7,right:-7,fontSize:17,background:T.red500,border:"2px solid #fff",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:T.shadowMd,zIndex:5}}><PersonIcon size={14} color="#fff"/></span>}
                <button onClick={openCommentPopup} title={hasComment?dayComments.length+" commentaire(s) ce jour":"Ajouter un commentaire ce jour"} style={{position:"absolute",bottom:-6,left:-4,background:hasComment?"#fff":"none",border:hasComment?"2.5px solid #4a7fd6":"none",borderRadius:hasComment?"50%":0,boxShadow:hasComment?"0 0 0 2px #fff, 0 3px 8px rgba(74,127,214,.45)":"none",width:hasComment?27:"auto",height:hasComment?27:"auto",display:hasComment?"flex":"inline-block",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:hasComment?16:11,opacity:hasComment?1:0.5,padding:hasComment?0:1,zIndex:8}}>☁️</button>
              </div>);
            })}
          </React.Fragment>);
        })}
      </div>
    </div>

    <div style={{padding:"11px 18px",borderTop:"1px solid "+T.line,display:"flex",gap:16,flexWrap:"wrap",background:T.surface,alignItems:"center"}}>
      <span style={{fontSize:14,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".03em"}}>Étapes :</span>
      {Object.entries(SEGMENT_STYLE).map(([label,st])=><span key={label} style={{display:"flex",alignItems:"center",gap:6,fontSize:15}}>
        <span style={{width:14,height:14,borderRadius:4,background:st.c}}/>
        <span style={{color:T.ink700,fontWeight:500}}>{label}</span>
      </span>)}
      <span style={{fontSize:14,color:T.ink300,marginLeft:"auto"}}>Point coloré = machine · Couleur du segment = étape · Clic = détail</span>
    </div>

    {commentPopup&&<div onClick={()=>setCommentPopup(null)} style={{position:"fixed",inset:0,background:"rgba(12,36,54,.55)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:T.font}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,padding:22,maxWidth:440,width:"100%",boxShadow:T.shadowLg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:18,color:T.ink900}}>☁️ Commentaire — {commentPopup.pj}</div>
            <div style={{color:T.ink500,fontSize:14,marginTop:2}}>{fmt(new Date(commentPopup.dateIso))}</div>
          </div>
          <button onClick={()=>setCommentPopup(null)} style={{background:T.surface,border:"none",borderRadius:8,width:30,height:30,fontSize:15,cursor:"pointer",color:T.ink700}}>✕</button>
        </div>

        {(()=>{
          const dayComments=(comments?.[commentPopup.pj]||[]).filter(c=>c.linkedDate===commentPopup.dateIso&&(pinOk||!c.private));
          return dayComments.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14,maxHeight:180,overflowY:"auto"}}>
            {dayComments.map((c,i)=>(
              <div key={i} style={{background:c.private?T.amber100:T.surface,borderRadius:9,padding:"9px 12px"}}>
                <div style={{fontWeight:700,color:T.teal600,fontSize:13,marginBottom:3}}>{c.private&&"🔒 "}{c.author}</div>
                <div style={{fontSize:13,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
              </div>
            ))}
          </div>;
        })()}

        <input type="text" value={commentAuthor} onChange={e=>{setCommentAuthor(e.target.value);setCommentErr("");}} placeholder="Votre nom (obligatoire)" maxLength={40}
          style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+(commentErr?T.red500:T.line),fontSize:14,fontFamily:T.font,color:T.ink700,width:"100%",marginBottom:6,boxSizing:"border-box"}}/>
        {commentErr&&<div style={{fontSize:13,color:T.red500,marginBottom:6}}>{commentErr}</div>}
        <textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Votre commentaire..." rows={3} maxLength={1000}
          style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,resize:"vertical",width:"100%",boxSizing:"border-box",marginBottom:10}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
          {pinOk?<label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.ink500,fontWeight:600,cursor:"pointer"}}>
            <input type="checkbox" checked={commentPrivate} onChange={e=>setCommentPrivate(e.target.checked)}/> 🔒 Privé
          </label>:<span/>}
          <button onClick={async ()=>{
            if(!commentAuthor.trim()){setCommentErr("Le nom est obligatoire pour publier un commentaire.");return;}
            if(!commentText.trim())return;
            const ok=await addComment(commentPopup.pj,commentAuthor,commentText,commentPopup.dateIso,commentPrivate);
            if(ok){setCommentText("");setCommentAuthor("");setCommentPrivate(false);}
          }} disabled={!commentText.trim()} style={{padding:"8px 18px",borderRadius:8,border:"none",background:commentText.trim()?T.teal500:T.surfaceAlt,color:commentText.trim()?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:commentText.trim()?"pointer":"default"}}>Publier</button>
        </div>
      </div>
    </div>}
  </div>);
}

