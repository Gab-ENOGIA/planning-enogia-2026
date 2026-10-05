import React, { useState, useEffect, useMemo } from "react";
import { T } from "../theme";
import { getPjMeta, ETAT_META, ALL_ETATS, MONTHS, today, ProjectLabelCell } from "../pjMeta";
import { DropFilter } from "./SharedUI";
import { ProjectModal } from "./ProjectModal";

// Couleurs lues à chaque rendu (accesseurs) : un tableau figé à l'import garderait le thème clair.
export const PHASES=[
  {k:"arrivee",l:"A",get c(){return T.teal500;},t:"Arrivée"},
  {k:"tests",l:"T",get c(){return T.amber500;},t:"Tests"},
  {k:"finProd",l:"F",get c(){return T.emerald500;},t:"Fin prod"},
  {k:"depart",l:"D",get c(){return T.red500;},t:"Départ"},
];

// selEtats/selPJs (demandé explicitement : "mettre en place un système de filtre pour enlever
// certain PJ ou certain état") — même état que la liste (App.js), donc filtrer ici filtre aussi la
// liste et inversement, sans dupliquer la logique de filtrage.
export function GanttView({data,progress,df,selEtats,setSelEtats,allPJs,selPJs,setSelPJs,comments,addComment,deleteComment,pinOk,delays,delayTypes,addDelayAllocation,deleteDelayAllocation,addDelayComment,deleteDelayComment,authorName,savePjMetaOverride,canEditMeta}){
  const [sel,setSel]=useState(null);
  const todayYear=today.getFullYear();
  // Plage dynamique : couvre toujours l'année en cours, étendue si des machines
  // ont des jalons avant/après (ex. départ en janvier de l'année suivante).
  const {yearStart,yearEnd}=useMemo(()=>{
    let min=null,max=null;
    data.forEach(r=>{
      [r.arrivee,r.tests,r.testsFin,r.finProd,r.depart].forEach(v=>{
        if(!v)return;const dt=new Date(v);
        if(!min||dt<min)min=dt;
        if(!max||dt>max)max=dt;
      });
    });
    let s=min?new Date(min.getFullYear(),0,1):new Date(todayYear,0,1);
    let e=max?new Date(max.getFullYear(),11,31):new Date(todayYear,11,31);
    if(s>new Date(todayYear,0,1))s=new Date(todayYear,0,1);
    if(e<new Date(todayYear,11,31))e=new Date(todayYear,11,31);
    return{yearStart:s,yearEnd:e};
  },[data,todayYear]);
  const totalDays=Math.round((yearEnd-yearStart)/86400000)+1;
  const months=useMemo(()=>{
    const out=[];
    let cur=new Date(yearStart.getFullYear(),yearStart.getMonth(),1);
    const end=new Date(yearEnd.getFullYear(),yearEnd.getMonth(),1);
    while(cur<=end){out.push(new Date(cur));cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);}
    return out;
  },[yearStart,yearEnd]);
  const multiYear=yearStart.getFullYear()!==yearEnd.getFullYear();
  // Dézoom par défaut (demandé explicitement : "voir 6 mois en une fois") — niveau 6px/jour ajouté
  // sous l'ancien minimum (10), et utilisé comme valeur de départ plutôt que le niveau médian.
  const ZOOM_LEVELS=[6,10,14,18,26,36,50];
  const [dayW,setDayW]=useState(ZOOM_LEVELS[0]); // px par jour — ajustable via le zoom
  // Mémorise le jour actuellement affiché à gauche de l'écran avant de changer le zoom,
  // pour recentrer la vue sur la même période après — sinon zoomer fait "sauter" le planning.
  const anchorDayRef=React.useRef(null);
  const captureAnchor=()=>{if(scrollRef.current)anchorDayRef.current=scrollRef.current.scrollLeft/dayW;};
  const zoomOut=()=>{captureAnchor();setDayW(w=>{const i=ZOOM_LEVELS.indexOf(w);return ZOOM_LEVELS[Math.max(0,i-1)]||ZOOM_LEVELS[0];});};
  const zoomIn=()=>{captureAnchor();setDayW(w=>{const i=ZOOM_LEVELS.indexOf(w);return ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length-1,i+1)]||ZOOM_LEVELS[ZOOM_LEVELS.length-1];});};
  const colW=240;
  const rowH=54;
  // En-tête à 3 bandes — mois, puis numéro de semaine ("SXX", demandé explicitement : "rajouter les
  // SXX (numéro de semaine) dans la page gantt"), puis le repère jour existant — plutôt que de
  // remplacer ce dernier, pour ne pas perdre le détail jour tout en ajoutant le numéro de semaine.
  const MONTH_BAND_H=22, WEEK_NUM_BAND_H=14, DAY_TICK_H=24;
  const HEADER_H=MONTH_BAND_H+WEEK_NUM_BAND_H+DAY_TICK_H;
  // Même formule que CalendarView (weekNum) — numéro ISO-like de semaine à partir du 1er janvier.
  const weekNum=d=>{const j=new Date(d.getFullYear(),0,1);return Math.ceil(((d-j)/86400000+j.getDay()+1)/7);};
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // recentre la vue sur la même période après un changement de zoom (dayW)
  useEffect(()=>{
    if(anchorDayRef.current==null)return;
    const target=Math.max(0,anchorDayRef.current*dayW);
    if(scrollRef.current)scrollRef.current.scrollLeft=target;
    if(topScrollRef.current)topScrollRef.current.scrollLeft=target;
  },[dayW]);

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
  },[yearStart,yearEnd]);

  const bpct=(as,bs)=>{if(!as||!bs)return null;const a=new Date(as),b=new Date(bs);return{left:xOf(a),width:Math.max(xOf(b)-xOf(a),6)};};
  // Hauteur calculée explicitement (plutôt que de laisser le flex/sticky la déduire du contenu) —
  // le trait "aujourd'hui" s'appuyait sur bottom:0, qui ne retombait pas toujours exactement en bas
  // de la dernière ligne ("le trait rouge ne va pas au bout") ; une hauteur numérique garantit que
  // la colonne de gauche, la zone du planning et le trait font tous exactement la même hauteur.
  const ganttH=HEADER_H+data.length*rowH;

  return(<div style={{background:T.surface,borderRadius:12,overflow:"hidden",border:"1px solid "+T.line,fontFamily:T.font}}>
    <div style={{display:"flex",gap:10,padding:"14px 18px",borderBottom:"1px solid "+T.line,alignItems:"center",flexWrap:"wrap",background:T.surface}}>
      <span style={{fontSize:16,fontWeight:700,color:T.ink900}}>Planning {multiYear?yearStart.getFullYear()+" – "+yearEnd.getFullYear():yearStart.getFullYear()}</span>
      {/* Plus petite + italique (demandé explicitement) : une note d'usage secondaire, pas un titre. */}
      <span style={{fontSize:12,fontStyle:"italic",color:T.ink500}}>Faites glisser ou utilisez la molette pour défiler → · cliquez une ligne pour la fiche projet</span>
      {/* Filtres État + PJ (demandé explicitement : "système de filtre pour enlever certain PJ ou
          certain état") — même état que la liste (App.js), donc filtrer ici filtre aussi la liste. */}
      <div style={{display:"flex",gap:8,marginLeft:"auto",alignItems:"center",flexWrap:"wrap"}}>
        {setSelEtats&&<DropFilter label="État" options={ALL_ETATS} selected={selEtats} onChange={setSelEtats} getLabel={o=>ETAT_META[o]?.label||o}/>}
        {allPJs&&<DropFilter label="PJ" options={allPJs} selected={selPJs||new Set(allPJs)} onChange={setSelPJs}/>}
        <div style={{display:"flex",gap:4}}>
          <button onClick={zoomOut} disabled={dayW<=ZOOM_LEVELS[0]} style={{padding:"5px 9px",borderRadius:7,border:"1px solid "+T.line,background:"transparent",color:dayW<=ZOOM_LEVELS[0]?T.ink300:T.ink700,fontSize:14,fontWeight:700,cursor:dayW<=ZOOM_LEVELS[0]?"default":"pointer"}}>−</button>
          <button onClick={zoomIn} disabled={dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]} style={{padding:"5px 9px",borderRadius:7,border:"1px solid "+T.line,background:"transparent",color:dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]?T.ink300:T.ink700,fontSize:14,fontWeight:700,cursor:dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]?"default":"pointer"}}>+</button>
        </div>
        <button onClick={()=>scrollToDay(dayOf(today))} style={{padding:"5px 11px",borderRadius:7,border:"1px solid "+T.teal400,background:"transparent",color:T.teal600,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Aujourd'hui</button>
      </div>
    </div>

    <div ref={topScrollRef} onScroll={syncFromTop} style={{overflowX:"auto",overflowY:"hidden",height:16}}>
      <div style={{width:colW+totalDays*dayW,height:1}}/>
    </div>

    <div ref={scrollRef} onScroll={syncFromBottom} style={{display:"flex",overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 300px)",position:"relative"}}>
      <div style={{width:colW,height:ganttH,flexShrink:0,position:"sticky",left:0,zIndex:8,background:T.surface,borderRight:"1px solid "+T.line,boxShadow:"2px 0 6px rgba(15,40,60,.04)"}}>
        <div style={{height:HEADER_H,padding:"0 16px",display:"flex",alignItems:"center",fontSize:14,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em",borderBottom:"1px solid "+T.line,background:T.surface,position:"sticky",top:0,zIndex:9}}>Projet</div>
        {data.map((r,ri)=>{
          const meta=getPjMeta(r.pj,r);
          const isSel=sel===r.pj;
          return(<div key={ri} onClick={()=>setSel(isSel?null:r.pj)} style={{height:rowH,padding:"6px 16px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2,borderBottom:"1px solid "+T.surfaceAlt,borderLeft:"3px solid "+(isSel?T.teal500:"transparent"),background:isSel?T.surfaceAlt:"transparent",cursor:"pointer",transition:"background .12s ease, border-color .12s ease"}}
            onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=T.surfaceAlt;}}
            onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background="transparent";}}>
            <ProjectLabelCell pj={r.pj} r={r} meta={meta}/>
          </div>);
        })}
      </div>

      {/* Sans overflow:"hidden" ici (retiré) : un ancestor avec overflow≠visible — même "hidden" —
          devient lui-même le conteneur de référence pour tout position:sticky à l'intérieur, donc
          l'en-tête mois/semaines ci-dessous ne restait plus accroché au défilement réel (celui du
          conteneur englobant, scrollRef) mais à cette boîte-ci, qui ne défile jamais elle-même
          ("il faut que les mois ... restent figés" — régression introduite par le correctif précédent
          contre le débordement des marqueurs). Les marqueurs ne peuvent de toute façon pas avoir une
          position x négative (xOf est calculé à partir de yearStart, qui couvre toujours la date la
          plus ancienne), donc ce correctif n'était pas nécessaire pour eux. */}
      <div style={{position:"relative",width:totalDays*dayW,height:ganttH,flexShrink:0}}>
        {/* en-tête mois + numéro de semaine + semaines (repère jour) */}
        <div style={{height:HEADER_H,position:"sticky",top:0,zIndex:7,borderBottom:"1px solid "+T.line,background:T.surface}}>
          {months.map((ms,mi)=>{const me=new Date(ms.getFullYear(),ms.getMonth()+1,1);const w=(xOf(me)-xOf(ms));const isCur=ms.getFullYear()===todayYear&&ms.getMonth()===today.getMonth();
            return(<div key={mi} style={{position:"absolute",left:xOf(ms),width:w,top:0,height:MONTH_BAND_H,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:isCur?T.teal600:T.ink700,borderLeft:"1px solid "+T.line,background:isCur?T.teal100:"transparent"}}>{MONTHS[ms.getMonth()]}{multiYear?" "+ms.getFullYear():""}</div>);
          })}
          {/* Bande "SXX" (demandé explicitement), une fois par semaine, séparée du repère jour
              ci-dessous plutôt que de le remplacer. */}
          {weekMarks.map((wm,wi)=>(
            <div key={wi} style={{position:"absolute",left:xOf(wm),top:MONTH_BAND_H,height:WEEK_NUM_BAND_H,width:dayW*7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10.5,fontWeight:700,color:T.ink300,borderLeft:"1px solid "+T.surfaceAlt}}>S{weekNum(wm)}</div>
          ))}
          {weekMarks.map((wm,wi)=>(
            <div key={"d"+wi} style={{position:"absolute",left:xOf(wm),top:MONTH_BAND_H+WEEK_NUM_BAND_H,height:DAY_TICK_H,width:dayW*7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:T.ink300,borderLeft:"1px solid "+T.surfaceAlt,fontWeight:500}}>{wm.getDate()}</div>
          ))}
        </div>

        {/* lignes de fond + grille */}
        {data.map((r,ri)=>{
          const c=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
          const mb=bpct(r.arrivee,r.depart);
          const isSel=sel===r.pj;
          return(<div key={ri} onClick={()=>setSel(isSel?null:r.pj)} style={{height:rowH,position:"relative",borderBottom:"1px solid "+T.surfaceAlt,background:isSel?T.surfaceAlt:"transparent",cursor:"pointer"}}>
            {weekMarks.map((wm,wi)=><div key={wi} style={{position:"absolute",left:xOf(wm),top:0,bottom:0,width:1,background:T.surfaceAlt}}/>)}
            {months.map((ms,mi)=><div key={mi} style={{position:"absolute",left:xOf(ms),top:0,bottom:0,width:1,background:T.line}}/>)}
            {mb&&<div style={{position:"absolute",left:mb.left,width:mb.width,top:"50%",transform:"translateY(-50%)",height:20,background:c.bar,borderRadius:6,opacity:.16,zIndex:1}}/>}
            {/* Marqueurs affinés (demandé explicitement, registre "premium épuré") : pastille claire
                à contour coloré plutôt qu'un disque plein — plus petit, plus plat, ombre quasi
                invisible comme le reste de l'appli au lieu de l'ombre portée marquée d'origine. */}
            {PHASES.map(ph=>{const dt=r[ph.k];if(!dt)return null;const x=xOf(new Date(dt));
              return(<div key={ph.k} style={{position:"absolute",left:x,top:"50%",transform:"translate(-50%,-50%)",width:18,height:18,borderRadius:"50%",background:T.card,border:"2px solid "+ph.c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:ph.c,zIndex:4,cursor:"pointer",boxShadow:T.shadowSm}}>{ph.l}</div>);
            })}
          </div>);
        })}

        {/* ligne "aujourd'hui" — hauteur explicite (ganttH-HEADER_H) plutôt que bottom:0, pour être
            sûr qu'elle descend exactement jusqu'à la dernière ligne quel que soit le nombre de PJ. */}
        <div style={{position:"absolute",left:xOf(today),top:HEADER_H,height:ganttH-HEADER_H,width:2,background:T.red500,opacity:.5,zIndex:3}}/>
      </div>
    </div>


    {/* Légende alignée sur le même traitement "contour" que les marqueurs ci-dessus. */}
    <div style={{padding:"10px 18px",borderTop:"1px solid "+T.line,display:"flex",gap:14,flexWrap:"wrap",background:T.surface}}>
      {PHASES.map(ph=><span key={ph.k} style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><span style={{width:16,height:16,borderRadius:"50%",background:T.card,border:"2px solid "+ph.c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,color:ph.c,fontWeight:700}}>{ph.l}</span><span style={{color:T.ink500,fontWeight:500}}>{ph.t}</span></span>)}
    </div>

    {sel&&<ProjectModal pj={sel} data={data} df={df} onClose={()=>setSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}
      pinOk={pinOk} delays={delays} delayTypes={delayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
      addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>}
  </div>);
}

