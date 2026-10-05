import React, { useState, useMemo, useEffect } from "react";
import { T } from "../theme";
import { getPjMeta, PresenceChip, presenceKind, presenceRing, PRESENCE_META, MONTHS_FULL, today, ETAT_META, ALL_ETATS, ProjectLabelCell, relTime, Avatar } from "../pjMeta";
import { NavIcon, DropFilter } from "./SharedUI";
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
// Couleurs par étape légèrement désaturées (demandé explicitement : "garder des couleurs distinctes
// par étape, mais plus douces"). Tuiles de nouveau remplies ("essaye de les remplir" — la liseré +
// texte neutre essayée juste avant ne convenait pas) : "c" est la couleur de fond, "t" un ton foncé
// de la même teinte prévu dès l'origine pour rester lisible dessus.
const segThemed=(light,dark,bold)=>({
  get c(){return(T.mode==="dark"?dark:light).c;},
  get t(){return(T.mode==="dark"?dark:light).t;},
  bold,
});
// En sombre : fond de tuile foncé teinté + texte clair de la même teinte (au lieu de pastels clairs
// éblouissants avec du texte foncé).
export const SEGMENT_STYLE={
  "Arrivée":segThemed({c:"#C9B79C",t:"#5A4630"},{c:"#3B3226",t:"#E6CDA8"},false),
  "Production":segThemed({c:"#9DBBD1",t:"#1F435C"},{c:"#1F3A50",t:"#A3CDEB"},false),
  "Tests":segThemed({c:"#E6CC8E",t:"#7A5A17"},{c:"#4A3C17",t:"#F2D68A"},true),
  "Fin prod":segThemed({c:"#A8CBB2",t:"#2E5B3B"},{c:"#1D3F2B",t:"#A4E0B6"},true),
  "Départ":segThemed({c:"#E6B291",t:"#8A431A"},{c:"#4A2A1A",t:"#F5B995"},true),
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
export function CalendarView({data,onSelectPj,mode,setMode,anchor,setAnchor,dayAnchor,setDayAnchor,closurePeriods,productionExclusions,comments,addComment,zoomLevel,setZoomLevel,pinOk,authorName,selEtats,setSelEtats,allPJs,selPJs,setSelPJs}){
  const isClosurePeriod=(colStart,colEnd)=>{
    if(!closurePeriods||!closurePeriods.length)return false;
    return closurePeriods.some(p=>{
      const ps=new Date(p.start),pe=new Date(p.end);pe.setHours(23,59,59,999);
      return colStart<pe&&colEnd>=ps;
    });
  };
  // Lignes agrandies (demandé explicitement : "agrandir la hauteur des lignes projets, ça
  // permettra d'écrire en diagonale") — donne la place verticale nécessaire au texte en diagonale
  // dans les cellules jour (voir plus bas). Encore un peu plus haut qu'avant (64→72) : les tuiles
  // sont de nouveau remplies et le mot complet doit toujours tenir, sans jamais être coupé.
  const rowH=46;
  // Bande "numéro de semaine" groupée (mode Jour uniquement, cf. plus bas) — décale d'autant les
  // lignes d'en-tête sticky qui suivent (Machine / en-tête semaine ou jour).
  const MONTH_H=26;
  const WEEK_BAND_H=18;
  const headerTop=MONTH_H+(mode==="day"?WEEK_BAND_H:0);
  // zoomLevel est désormais géré au niveau de App (props) pour persister quand on quitte/revient sur cet onglet
  const [commentPopup,setCommentPopup]=useState(null); // {pj, dateIso}
  // Fermeture au clavier (Échap), même comportement que la fiche projet (ProjectModal) — cohérence
  // demandée explicitement ("même registre que Gantt/liste").
  useEffect(()=>{
    if(!commentPopup)return;
    const onKey=e=>{if(e.key==="Escape")setCommentPopup(null);};
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[commentPopup]);
  const [commentAuthor,setCommentAuthor]=useState("");
  const [commentText,setCommentText]=useState("");
  const [commentErr,setCommentErr]=useState("");
  const [commentPrivate,setCommentPrivate]=useState(false);
  const WEEK_COUNTS=[6,8,14,24,36];
  // Niveau "6" ajouté devant (demandé explicitement : "il faut dézoomer pour avoir une vision plus
  // claire") — colonnes jour nettement plus larges pour une vue moins chargée ; décale aussi le
  // niveau par défaut (App.js) vers des colonnes plus larges sans changer son code.
  const DAY_COUNTS=[6,9,14,21,35,52,84,168,252];
  const maxZoomLevel=mode==="week"?WEEK_COUNTS.length-1:DAY_COUNTS.length-1;
  const nWeeks=WEEK_COUNTS[Math.min(zoomLevel,WEEK_COUNTS.length-1)];
  const nDays=DAY_COUNTS[Math.min(zoomLevel,DAY_COUNTS.length-1)];
  // Le défilement horizontal ne marchait pas (demandé explicitement : "je n'arrive pas à voir les
  // prochaines semaines à droite") : seules nDays/nWeeks colonnes étaient générées, en largeur
  // flexible (1fr) — elles remplissaient donc toujours exactement l'écran, sans rien à faire défiler.
  // Désormais le niveau de zoom fixe le nombre de colonnes VISIBLES à l'écran (donc leur largeur en
  // px), et on génère une plage bien plus longue à défiler vers la droite.
  const TOTAL_WEEKS=60, TOTAL_DAYS=300;
  const [viewW,setViewW]=useState(1100);
  const zoomIn=()=>setZoomLevel(z=>Math.max(0,z-1));
  const zoomOut=()=>setZoomLevel(z=>Math.min(maxZoomLevel,z+1));

  const weeks=useMemo(()=>{
    const out=[];
    for(let i=0;i<TOTAL_WEEKS;i++){const s=new Date(anchor);s.setDate(s.getDate()+i*7);out.push(s);}
    return out;
  },[anchor,TOTAL_WEEKS]);
  const days=useMemo(()=>{
    const out=[];
    for(let i=0;i<TOTAL_DAYS;i++){const d=new Date(dayAnchor);d.setDate(d.getDate()+i);out.push(d);}
    return out;
  },[dayAnchor,TOTAL_DAYS]);

  const cols=mode==="week"?weeks:days;
  const pjs=useMemo(()=>[...new Set(data.map(r=>r.pj))].sort((a,b)=>{
    const ra=data.find(r=>r.pj===a),rb=data.find(r=>r.pj===b);
    const da=ra&&ra.arrivee?new Date(ra.arrivee):new Date(9999,0,1);
    const db=rb&&rb.arrivee?new Date(rb.arrivee):new Date(9999,0,1);
    return da-db;
  }),[data]);
  // Largeurs calées sur les MOTS LES PLUS LONGS (demandé : « les colonnes se mettent parfaitement avec
  // les mots les plus grands dans la ligne ») : on mesure le texte réel au canvas. Colonne « Machine » =
  // plus long « PJ + gamme » / nom de projet ; colonnes de dates = plus long mot d'étape (« Production »…).
  const measure=useMemo(()=>{
    let ctx=null;try{ctx=document.createElement("canvas").getContext("2d");}catch(e){}
    return (txt,font)=>{if(!ctx)return txt.length*7;ctx.font=font;return ctx.measureText(txt).width;};
  },[]);
  const LEFT_W=useMemo(()=>{
    let w=0;
    pjs.forEach(pj=>{
      const r=data.find(x=>x.pj===pj);const m=getPjMeta(pj,r);
      const l1=measure(pj,"700 13px "+T.fontMono)+8+measure(r?.gamme||"","italic 11px "+T.font);
      const l2=measure(m.nomProjet||"","500 13px "+T.font);
      w=Math.max(w,l1,l2);
    });
    return Math.min(300,Math.max(190,Math.ceil(w+14*2+22)));
  },[pjs,data,measure]);
  const longestWordPx=useMemo(()=>{
    const f=mode==="week"?"700 13px "+T.font:"700 10.5px "+T.font;
    let w=0;Object.keys(SEGMENT_STYLE).forEach(k=>k.split(" ").forEach(word=>{w=Math.max(w,measure(word,f));}));
    return w;
  },[mode,measure]);
  const weekNum=d=>{const j=new Date(d.getFullYear(),0,1);return Math.ceil(((d-j)/86400000+j.getDay()+1)/7);};
  const todayWeekIdx=weeks.findIndex(w=>{const e=new Date(w);e.setDate(e.getDate()+7);return today>=w&&today<e;});
  const todayDayIdx=days.findIndex(d=>d.toDateString()===today.toDateString());
  const DAY_NAMES=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

  const goToday=()=>{
    if(mode==="week")setAnchor(weekStartOf(today));
    else{const d=new Date(today);d.setHours(0,0,0,0);setDayAnchor(d);}
    if(scrollRef.current)scrollRef.current.scrollLeft=0;
  };

  const scrollRef=React.useRef(null);
  useEffect(()=>{
    const el=scrollRef.current;
    if(!el)return;
    const measure=()=>setViewW(el.clientWidth||1100);
    measure();
    if(typeof ResizeObserver==="undefined"){window.addEventListener("resize",measure);return ()=>window.removeEventListener("resize",measure);}
    const ro=new ResizeObserver(measure);
    ro.observe(el);
    return ()=>ro.disconnect();
  },[]);
  const visCount=mode==="week"?nWeeks:nDays;
  // Les colonnes doivent occuper TOUTE la largeur de la page (demandé explicitement : « les tuiles
  // prennent la totalité de la largeur ») : on répartit la largeur disponible exactement sur les
  // visCount colonnes visibles — jour ouvré = 1 part, week-end = 0,6 part — au lieu d'arrondir à
  // l'entier inférieur, ce qui laissait un vide à droite. Le minimum garde les mots lisibles.
  const WE_RATIO=0.6;
  // Cause du « ça ne prend toujours pas toute la page » : un plancher de largeur (92/110 px) forçait
  // les colonnes à dépasser dès que le zoom demandait trop de colonnes pour l'écran → la dernière
  // était coupée et la grille ne tombait jamais juste. Désormais on compte les poids EXACTS des
  // colonnes visibles (jours ouvrés 1, week-end 0,6) et, si l'écran est trop étroit pour le zoom
  // demandé, on affiche quelques colonnes de moins plutôt que de déborder.
  const MIN_COL=Math.ceil(longestWordPx+3*2+3*2+6); // inset de tuile + marge intérieure + filet
  const avail=Math.max(200,viewW-LEFT_W);
  const weightOf=n=>mode==="week"?n:days.slice(0,n).reduce((a,d)=>a+((d.getDay()===0||d.getDay()===6)?WE_RATIO:1),0);
  let effCount=visCount;
  while(effCount>1&&avail/weightOf(effCount)<MIN_COL)effCount--;
  const unit=Math.floor((avail/weightOf(effCount))*100)/100;
  const colPx=unit;
  const wePx=Math.floor(unit*WE_RATIO*100)/100;
  // Page précédente / suivante : défile d'environ une largeur d'écran.
  const pageScroll=dir=>{if(scrollRef.current)scrollRef.current.scrollBy({left:dir*Math.round((viewW-LEFT_W)*0.85),behavior:"smooth"});};

  return(<div style={{background:T.surface,borderRadius:12,overflow:"hidden",border:"1px solid "+T.line,fontFamily:T.font}}>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderBottom:"1px solid "+T.line,background:T.surface,flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:4,background:T.surfaceAlt,borderRadius:9,padding:3}}>
        <button onClick={()=>setMode("week")} style={{padding:"6px 14px",borderRadius:7,border:"none",background:mode==="week"?T.card:"transparent",color:mode==="week"?T.ink900:T.ink500,fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:mode==="week"?T.shadowSm:"none"}}>Semaine</button>
        <button onClick={()=>setMode("day")} style={{padding:"6px 14px",borderRadius:7,border:"none",background:mode==="day"?T.card:"transparent",color:mode==="day"?T.ink900:T.ink500,fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:mode==="day"?T.shadowSm:"none"}}>Jour</button>
      </div>
      <span style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:18,color:T.ink900,minWidth:220,textAlign:"center"}}>
        {mode==="week"
          ?"Sem. "+weekNum(weeks[0])+" → "+weekNum(weeks[Math.min(effCount,weeks.length)-1])+", "+weeks[0].getFullYear()
          :days[0].toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" → "+days[Math.min(effCount,days.length)-1].toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}
      </span>
      <div style={{display:"flex",gap:4}}>
        <button onClick={()=>pageScroll(-1)} title="Période précédente" style={{padding:"5px 10px",borderRadius:7,border:"1px solid "+T.line,background:"transparent",color:T.ink700,fontSize:14,fontWeight:700,cursor:"pointer"}}>‹</button>
        <button onClick={()=>pageScroll(1)} title="Période suivante" style={{padding:"5px 10px",borderRadius:7,border:"1px solid "+T.line,background:"transparent",color:T.ink700,fontSize:14,fontWeight:700,cursor:"pointer"}}>›</button>
      </div>
      {/* Même filtre État + PJ que le Gantt, au même format et au même emplacement (demandé
          explicitement : "je veux le même format au même emplacement quelque chose de simple et
          discret") — partage le même état que la liste/le Gantt, donc filtrer ici filtre aussi les
          autres vues et inversement. */}
      <div style={{display:"flex",gap:8,marginLeft:"auto",alignItems:"center",flexWrap:"wrap"}}>
        {setSelEtats&&<DropFilter label="État" options={ALL_ETATS} selected={selEtats} onChange={setSelEtats} getLabel={o=>ETAT_META[o]?.label||o}/>}
        {allPJs&&<DropFilter label="PJ" options={allPJs} selected={selPJs||new Set(allPJs)} onChange={setSelPJs}/>}
        <div style={{display:"flex",gap:4}}>
          <button onClick={zoomOut} disabled={zoomLevel>=maxZoomLevel} style={{padding:"5px 9px",borderRadius:7,border:"1px solid "+T.line,background:"transparent",color:zoomLevel>=maxZoomLevel?T.ink300:T.ink700,fontSize:14,fontWeight:700,cursor:zoomLevel>=maxZoomLevel?"default":"pointer"}}>−</button>
          <button onClick={zoomIn} disabled={zoomLevel<=0} style={{padding:"5px 9px",borderRadius:7,border:"1px solid "+T.line,background:"transparent",color:zoomLevel<=0?T.ink300:T.ink700,fontSize:14,fontWeight:700,cursor:zoomLevel<=0?"default":"pointer"}}>+</button>
        </div>
        <button onClick={goToday} style={{padding:"5px 11px",borderRadius:7,border:"1px solid "+T.teal400,background:"transparent",color:T.teal600,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Aujourd'hui</button>
      </div>
    </div>

    <div ref={scrollRef}
      style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 260px)"}}>
      <div style={{display:"grid",width:"max-content",minWidth:"100%",gridTemplateColumns:LEFT_W+"px "+(mode==="week"
        ?"repeat("+cols.length+","+colPx+"px)"
        :cols.map(d=>(d.getDay()===0||d.getDay()===6)?wePx+"px":colPx+"px").join(" ")
      )}}>
        <div style={{padding:"4px 14px",fontSize:12,fontWeight:700,color:T.ink300,background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,position:"sticky",left:0,top:0,zIndex:12,height:MONTH_H,width:LEFT_W,minWidth:LEFT_W,maxWidth:LEFT_W,boxSizing:"border-box"}}/>
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
            <div key={gi} style={{gridColumn:"span "+g.span,padding:"2px 4px",textAlign:"center",fontSize:12,fontWeight:700,color:g.m===today.getMonth()&&g.y===today.getFullYear()?T.teal600:T.ink500,background:g.m===today.getMonth()&&g.y===today.getFullYear()?T.teal100:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,position:"sticky",top:0,zIndex:10,height:MONTH_H,boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center"}}>{MONTHS_FULL[g.m]} {g.y}</div>
          ));
        })()}

        {/* Bande "numéro de semaine" séparée, une seule fois par semaine (mode Jour uniquement) —
            demandé explicitement : "séparer le numéro de semaine et le numéro du jour (regroupé le
            numéro de semaine en 1 fois)" plutôt que de le répéter dans chaque cellule de jour. */}
        {mode==="day"&&<div style={{background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,position:"sticky",left:0,top:MONTH_H,zIndex:12,height:WEEK_BAND_H,width:LEFT_W,minWidth:LEFT_W,maxWidth:LEFT_W,boxSizing:"border-box"}}/>}
        {mode==="day"&&(()=>{
          const wgroups=[];
          days.forEach(d=>{
            const wn=weekNum(d),wy=d.getFullYear();
            const last=wgroups[wgroups.length-1];
            if(last&&last.wn===wn&&last.wy===wy)last.span++;
            else wgroups.push({wn,wy,span:1});
          });
          return wgroups.map((g,gi)=>(
            <div key={gi} style={{gridColumn:"span "+g.span,padding:"1px 4px",textAlign:"center",fontSize:10.5,fontWeight:700,color:T.ink500,background:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,position:"sticky",top:MONTH_H,zIndex:9,height:WEEK_BAND_H,boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center"}}>S{g.wn}</div>
          ));
        })()}

        <div style={{padding:"6px 14px",fontSize:11.5,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".03em",background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,position:"sticky",left:0,top:headerTop,zIndex:12,width:LEFT_W,minWidth:LEFT_W,maxWidth:LEFT_W,boxSizing:"border-box"}}>Machine</div>
        {mode==="week"?weeks.map((w,wi)=>{
          const we=new Date(w);we.setDate(we.getDate()+7);
          const closed=isClosurePeriod(w,we);
          return(<div key={wi} style={{padding:"6px 4px",textAlign:"center",fontSize:12,fontWeight:700,color:wi===todayWeekIdx?"#fff":closed?T.ink300:T.ink500,background:wi===todayWeekIdx?T.teal500:closed?T.ink100:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:wi===todayWeekIdx?"inset 0 -3px 0 "+T.navy900:"none",position:"sticky",top:headerTop,zIndex:10}}>S{weekNum(w)}</div>);
        }):days.map((d,di)=>{
          const isWE=d.getDay()===0||d.getDay()===6;
          const dEnd=new Date(d);dEnd.setDate(dEnd.getDate()+1);
          const closed=isClosurePeriod(d,dEnd);
          return(<div key={di} style={{padding:"3px 1px",textAlign:"center",background:di===todayDayIdx?T.teal500:closed?T.ink100:isWE?T.ink100:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:di===todayDayIdx?"inset 0 -3px 0 "+T.navy900:"none",position:"sticky",top:headerTop,zIndex:10}}>
            {/* Numéro de semaine retiré d'ici (demandé explicitement) : il vit désormais uniquement
                dans la bande groupée au-dessus. */}
            <div style={{fontSize:9.5,fontWeight:600,lineHeight:1.2,color:di===todayDayIdx?"rgba(255,255,255,.85)":closed?T.ink300:T.ink300}}>{DAY_NAMES[d.getDay()]}</div>
            <div style={{fontSize:12,fontWeight:700,lineHeight:1.25,color:di===todayDayIdx?"#fff":closed?T.ink300:T.ink700}}>{d.getDate()}</div>
          </div>);
        })}

        {pjs.map((pj,pjIdx)=>{
          const r=data.find(x=>x.pj===pj);
          const meta=getPjMeta(pj,r);
          const rowBg=T.surface;
          return(<React.Fragment key={pj}>
            {/* Même bloc "Projet" que le Gantt (demandé explicitement : "même type de projet entre le
                gantt et le calendrier, ça doit être un copier-coller") — composant partagé, voir
                pjMeta.js. */}
            <div onClick={()=>onSelectPj&&onSelectPj(pj)} style={{padding:"6px 14px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2,height:rowH,width:LEFT_W,minWidth:LEFT_W,maxWidth:LEFT_W,boxSizing:"border-box",borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,background:rowBg,position:"sticky",left:0,cursor:"pointer",overflow:"hidden",zIndex:5}}>
              <ProjectLabelCell pj={pj} r={r} meta={meta}/>
            </div>
            {mode==="week"?weeks.map((w,wi)=>{
              const we=new Date(w);we.setDate(we.getDate()+7);
              const status=getWeekStatus(r,w,we);
              const isTodayCol=wi===todayWeekIdx;
              const closed=isClosurePeriod(w,we);
              const cellBg=closed?T.ink100:isTodayCol?T.teal500+"18":rowBg;
              if(!status)return<div key={wi} style={{height:rowH,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,background:cellBg}}/>;
              const lastMilestone=status.split(" + ").pop();
              const st=SEGMENT_STYLE[lastMilestone]||SEGMENT_STYLE["Production"];
              const pKind=presenceKind(r.clientPresence);
              const presenceDate=pKind&&r.clientPresence.date?new Date(r.clientPresence.date):null;
              const showPresence=presenceDate&&presenceDate>=w&&presenceDate<we;
              return(<div key={wi} onClick={()=>onSelectPj&&onSelectPj(pj)} onMouseEnter={e=>{e.currentTarget.style.background=T.teal100+"50";}} onMouseLeave={e=>{e.currentTarget.style.background=cellBg;}} style={{height:rowH,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,padding:3,cursor:"pointer",position:"relative",background:cellBg,transition:"background .12s ease"}}>
                {/* Tuile de nouveau remplie (demandé explicitement : "essaye de les remplir") — le mot
                    complet doit toujours rester lisible ("je dois toujours réussir à lire l'intégralité
                    des mots"), donc texte qui s'enroule sur 2 lignes plutôt qu'une troncature. */}
                <div title={status+(showPresence?" · Présence "+PRESENCE_META[pKind].label+" aux tests":"")} style={{height:"100%",background:st.c,borderRadius:4,boxShadow:showPresence?presenceRing(pKind):T.mode==="dark"?"inset 0 0 0 1px "+st.t+"33":"none",display:"flex",flexDirection:"column",gap:3,alignItems:"center",justifyContent:"center",textAlign:"center",fontSize:status.includes("+")?11:13,fontWeight:st.bold?700:600,color:st.t,overflow:"visible",whiteSpace:"normal",lineHeight:1.15,padding:"2px 6px",opacity:closed?0.45:1}}><span>{status}</span>{showPresence&&<PresenceChip kind={pKind} compact tiny/>}</div>
              </div>);
            }):days.map((d,di)=>{
              const isWE=d.getDay()===0||d.getDay()===6;
              const status=getDayStatus(r,d,productionExclusions?.[pj]);
              const isTodayCol=di===todayDayIdx;
              const dEnd=new Date(d);dEnd.setDate(dEnd.getDate()+1);
              const closed=isClosurePeriod(d,dEnd);
              const cellBg=closed?T.ink100:isTodayCol?T.teal500+"22":isWE?T.ink100:rowBg;
              const iso=toLocalISO(d);
              const dayComments=(comments?.[pj]||[]).filter(c=>c.linkedDate===iso&&(pinOk||!c.private));
              const hasComment=dayComments.length>0;
              const openCommentPopup=e=>{
                e.stopPropagation();
                setCommentPopup({pj,dateIso:iso});
                setCommentAuthor("");setCommentText("");setCommentErr("");
              };
              if(!status)return(<div key={di} className="enogia-cal-daycell" style={{height:rowH,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,background:cellBg,position:"relative"}}>
                <button onClick={openCommentPopup} className={"enogia-cal-commentbtn"+(hasComment?" has-comment":"")} title={hasComment?dayComments.length+" commentaire(s) ce jour":"Ajouter un commentaire ce jour"} style={{position:"absolute",bottom:2,right:2,background:hasComment?T.card:"none",border:hasComment?"1.5px solid "+T.teal500:"none",borderRadius:hasComment?"50%":0,boxShadow:hasComment?T.shadowSm:"none",width:hasComment?22:16,height:hasComment?22:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:hasComment?T.teal600:T.ink300,padding:0,zIndex:8}}><NavIcon name="comments" size={hasComment?12:11}/></button>
              </div>);
              const lastMilestone=status.split(" + ").pop();
              const st=SEGMENT_STYLE[lastMilestone]||SEGMENT_STYLE["Production"];
              const pKind=presenceKind(r.clientPresence);
              const showPresence=pKind&&r.clientPresence.date&&new Date(r.clientPresence.date).toDateString()===d.toDateString();
              // Texte en diagonale (demandé explicitement : "agrandir la hauteur des lignes ... ça
              // permettra d'écrire en diagonale") pour que le mot complet tienne dans la colonne jour,
              // étroite. Centré au milieu de la tuile (pivot au centre, plutôt qu'ancré au coin
              // bas-gauche) et contenu dans la tuile (overflow:"hidden" sur le conteneur) — demandé
              // explicitement : "les étapes sont pas au milieu des tiles et dépassent de celles-ci".
              return(<div key={di} className="enogia-cal-daycell" onClick={()=>onSelectPj&&onSelectPj(pj)} onMouseEnter={e=>{e.currentTarget.style.background=T.teal100+"50";}} onMouseLeave={e=>{e.currentTarget.style.background=cellBg;}} style={{height:rowH,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,cursor:"pointer",background:cellBg,position:"relative",transition:"background .12s ease"}}>
                <div title={status+(showPresence?" · Présence "+PRESENCE_META[pKind].label+" aux tests":"")} style={{position:"absolute",inset:3,borderRadius:4,background:st.c,boxShadow:showPresence?presenceRing(pKind):T.mode==="dark"?"inset 0 0 0 1px "+st.t+"33":"none",overflow:"hidden",opacity:closed?0.45:1,display:"flex",flexDirection:"column",gap:2,alignItems:"center",justifyContent:"center",padding:"0 3px"}}>
                  <span style={{fontSize:10.5,fontWeight:st.bold?700:600,color:st.t,textAlign:"center",lineHeight:1.15}}>{status}</span>
                  {showPresence&&<PresenceChip kind={pKind} compact tiny fontSize={9.5}/>}
                </div>
                <button onClick={openCommentPopup} className={"enogia-cal-commentbtn"+(hasComment?" has-comment":"")} title={hasComment?dayComments.length+" commentaire(s) ce jour":"Ajouter un commentaire ce jour"} style={{position:"absolute",bottom:-6,left:-4,background:hasComment?T.card:"none",border:hasComment?"1.5px solid "+T.teal500:"none",borderRadius:hasComment?"50%":0,boxShadow:hasComment?T.shadowSm:"none",width:hasComment?24:16,height:hasComment?24:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:hasComment?T.teal600:T.ink300,padding:0,zIndex:8}}><NavIcon name="comments" size={hasComment?13:11}/></button>
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
      <span style={{display:"flex",alignItems:"center",gap:8,paddingLeft:16,borderLeft:"1px solid "+T.line}}>
        <span style={{fontSize:14,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".03em"}}>Présence tests :</span>
        <PresenceChip kind="client" compact fontSize={12}/><PresenceChip kind="nobo" compact fontSize={12}/><PresenceChip kind="both" compact fontSize={12}/>
      </span>
      <span style={{fontSize:14,color:T.ink300,marginLeft:"auto"}}>Couleur de la tuile = étape · Clic = détail</span>
    </div>

    {commentPopup&&<div onClick={()=>setCommentPopup(null)} style={{position:"fixed",inset:0,background:"transparent",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:T.font}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,padding:22,maxWidth:440,width:"100%",boxShadow:T.shadowLg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:18,color:T.ink900}}>Commentaire — {commentPopup.pj}</div>
            <div style={{color:T.ink500,fontSize:14,marginTop:2}}>{fmt(new Date(commentPopup.dateIso))}</div>
          </div>
          <button onClick={()=>setCommentPopup(null)} style={{background:T.surface,border:"none",borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.ink700}}><NavIcon name="close" size={14}/></button>
        </div>

        {/* Composeur toujours en haut, dans son propre cadre — même pattern que la fiche projet
            (onglet Commentaires) pour une gestion cohérente partout dans l'appli. */}
        <div style={{background:T.surface,borderRadius:12,padding:14,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8,flexWrap:"wrap"}}>
            {authorName?
              <span style={{fontSize:12.5,color:T.ink500}}>En tant que <strong style={{color:T.ink700}}>{authorName}</strong></span>
              :<input type="text" value={commentAuthor} onChange={e=>{setCommentAuthor(e.target.value);setCommentErr("");}} placeholder="Votre nom (obligatoire)" maxLength={40}
                style={{padding:"7px 11px",borderRadius:8,border:"1px solid "+(commentErr?T.red500:T.line),fontSize:13.5,fontFamily:T.font,color:T.ink700}}/>}
            {pinOk?<label style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}}>
              <input type="checkbox" checked={commentPrivate} onChange={e=>setCommentPrivate(e.target.checked)}/> Privé
            </label>:<span/>}
          </div>
          {commentErr&&<div style={{fontSize:13,color:T.red500,marginBottom:6}}>{commentErr}</div>}
          <textarea value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Votre commentaire..." rows={3} maxLength={1000}
            style={{padding:"9px 12px",borderRadius:9,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,resize:"vertical",width:"100%",boxSizing:"border-box",background:T.card}}/>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
            <button onClick={async ()=>{
              const author=authorName||commentAuthor;
              if(!author.trim()){setCommentErr("Le nom est obligatoire pour publier un commentaire.");return;}
              if(!commentText.trim())return;
              const ok=await addComment(commentPopup.pj,author,commentText,commentPopup.dateIso,commentPrivate);
              if(ok){setCommentText("");setCommentAuthor("");setCommentPrivate(false);}
            }} disabled={!commentText.trim()} style={{padding:"8px 18px",borderRadius:8,border:"none",background:commentText.trim()?T.teal500:T.surfaceAlt,color:commentText.trim()?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:commentText.trim()?"pointer":"default"}}>Publier</button>
          </div>
        </div>

        {(()=>{
          const dayComments=(comments?.[commentPopup.pj]||[]).filter(c=>c.linkedDate===commentPopup.dateIso&&(pinOk||!c.private));
          return(<>
            <div style={{fontSize:12,fontWeight:700,color:T.ink300,textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>{dayComments.length} commentaire{dayComments.length!==1?"s":""}</div>
            {/* Refonte "chat" (demandé explicitement : "je vois ça plus comme un chat gmail") — même
                registre que la page Commentaires et la fiche projet. */}
            {dayComments.length>0?<div style={{display:"flex",flexDirection:"column",gap:12,maxHeight:220,overflowY:"auto",paddingRight:2}}>
              {dayComments.map((c,i)=>(
                <div key={i} style={{display:"flex",gap:9}}>
                  <Avatar name={c.author} tint={c.private?T.amber500:T.teal500} size={26}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap",marginBottom:2}}>
                      <span style={{fontWeight:700,color:T.ink700,fontSize:13}}>{c.author}</span>
                      {c.private&&<span style={{fontSize:9.5,color:T.amber600,background:T.amber100,borderRadius:4,padding:"1px 5px",fontWeight:700}}>Privé</span>}
                      <span style={{fontSize:10.5,color:T.ink300}}>{relTime(c.date)}</span>
                    </div>
                    <div style={{background:c.private?T.amber100:T.card,borderRadius:"3px 12px 12px 12px",padding:"8px 12px",display:"inline-block",maxWidth:"100%",fontSize:13,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>:<div style={{textAlign:"center",color:T.ink300,fontSize:13.5,padding:"18px 0"}}>Aucun commentaire pour l'instant sur ce jour.</div>}
          </>);
        })()}
      </div>
    </div>}
  </div>);
}

