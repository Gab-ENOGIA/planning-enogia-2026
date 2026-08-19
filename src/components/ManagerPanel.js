import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { T } from "../theme";
import { getPjMeta, initials, PersonIcon, CountryFlag, GAMME_COLORS, ETAT_META, ALL_ETATS, ASSIGNABLE_ETATS, ALL_GAMMES, MONTHS, MONTHS_FULL, today } from "../pjMeta";
import { fmt, toLocalISO, diffDays, weekStartOf } from "../parsers";
import { Badge, DropFilter, ImportButton, NavIcon } from "./SharedUI";

// Filtre de période (mois et/ou année) réutilisable sur chaque graphique temporel
export function PeriodFilter({yearsAvailable,year,setYear,month,setMonth,showMonth=true}){
  return(<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
    <select value={year||""} onChange={e=>setYear(e.target.value?+e.target.value:null)} style={{padding:"4px 8px",borderRadius:7,border:"1px solid "+T.line,fontSize:12,fontFamily:T.font,color:T.ink700,background:T.card}}>
      <option value="">Toutes années</option>
      {yearsAvailable.map(y=><option key={y} value={y}>{y}</option>)}
    </select>
    {showMonth&&<select value={month==null?"":month} onChange={e=>setMonth(e.target.value===""?null:+e.target.value)} style={{padding:"4px 8px",borderRadius:7,border:"1px solid "+T.line,fontSize:12,fontFamily:T.font,color:T.ink700,background:T.card}}>
      <option value="">Tous les mois</option>
      {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
    </select>}
  </div>);
}
export function ManagerPanel({data,progress,setProgress,initialData,lastInitialImport,onInitialImport,initialImporting,etatChoice,setEtatFor,saveProgress,savingProgress,progressSaved,tab,setTab,clientPresence,setClientPresenceFor,closurePeriods,setClosurePeriods,productionExclusions,toggleProductionExclusion,pjMetaSyncInfo,syncingORC,syncORCError,syncFromSuiviORC,comments,delays,delayTypes,setDelayTypes}){
  const [fEtat,setFEtat]=useState(new Set(ALL_ETATS));
  const [kpiStep,setKpiStep]=useState("depart");
  const [chargeYear,setChargeYear]=useState(null);
  const [chargeMonth,setChargeMonth]=useState(null);
  const [satYear,setSatYear]=useState(null);
  const [satMonth,setSatMonth]=useState(null);
  const [driftMoisYear,setDriftMoisYear]=useState(null);
  const yearsInData=useMemo(()=>{
    const ys=new Set();
    data.forEach(r=>["arrivee","tests","finProd","depart"].forEach(k=>{if(r[k])ys.add(new Date(r[k]).getFullYear());}));
    return [...ys].sort();
  },[data]);
  const STEP_LABELS={arrivee:"Arrivée",tests:"Tests",finProd:"Fin de production",depart:"Départ"};
  const [fGamme,setFGamme]=useState(new Set(ALL_GAMMES));
  const fd=useMemo(()=>data.filter(r=>fEtat.has(r.etat)&&fGamme.has(r.gamme)),[data,fEtat,fGamme]);
  const shipped=fd.filter(r=>r.etat==="SHIPPED");
  const inProd=fd.filter(r=>["PROD","En fabrication"].includes(r.etat));
  const upcoming=fd.filter(r=>{const d=r.depart?diffDays(today,new Date(r.depart)):null;return d!=null&&d>=0&&d<=30;});
  const byMonth=Array(12).fill(0);fd.forEach(r=>{if(r.depart)byMonth[new Date(r.depart).getMonth()]++;});
  const maxBar=Math.max(...byMonth,1);
  const gammeCounts={};fd.forEach(r=>{gammeCounts[r.gamme]=(gammeCounts[r.gamme]||0)+1;});

  // ── Rapprochement Initial (figé) ↔ Révisé, par N° PJ ──────────
  const initialByPJ=useMemo(()=>{const m={};initialData.forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const driftRows=useMemo(()=>fd.map(r=>{
    const ini=initialByPJ[r.pj];
    const mk=k=>{
      const iv=ini?ini[k]:null;
      const rv=r[k];
      const delta=(iv&&rv)?diffDays(new Date(iv),new Date(rv)):null;
      return{ini:iv||null,rev:rv||null,delta};
    };
    return{pj:r.pj,gamme:r.gamme,etat:r.etat,hasInitial:!!ini,arrivee:mk("arrivee"),tests:mk("tests"),finProd:mk("finProd"),depart:mk("depart")};
  }),[fd,initialByPJ]);
  const comparable=driftRows.filter(r=>r.hasInitial);
  const stepDeltas=comparable.map(r=>r[kpiStep].delta).filter(d=>d!=null);
  const lateCount=stepDeltas.filter(d=>d>0).length;
  const onTimeOrEarlyCount=stepDeltas.filter(d=>d<=0).length;
  const avgDelay=stepDeltas.length?Math.round(stepDeltas.reduce((a,b)=>a+b,0)/stepDeltas.length):null;
  const worstDrifts=[...comparable].filter(r=>r[kpiStep].delta!=null).sort((a,b)=>b[kpiStep].delta-a[kpiStep].delta).slice(0,5);
  const onTimeRate=stepDeltas.length?Math.round((onTimeOrEarlyCount/stepDeltas.length)*100):null;

  // ── AXE 1 : Promesse vs Réalité ────────────────────────────────
  // Jours de retard cumulés sur tout le portefeuille comparable (somme, pas moyenne), pour l'étape sélectionnée
  const totalDelayDays=stepDeltas.filter(d=>d>0).reduce((a,b)=>a+b,0);
  const totalGainDays=stepDeltas.filter(d=>d<0).reduce((a,b)=>a+Math.abs(b),0);
  // Occurrences par mois : initial (promesse) vs révisé (réalité), sur le même axe de mois (mois de la date INITIALE), pour l'étape sélectionnée
  const promiseVsReality=useMemo(()=>{
    const m={};
    comparable.forEach(r=>{
      const step=r[kpiStep];
      if(!step.ini)return;
      const mo=MONTHS[new Date(step.ini).getMonth()];
      if(!m[mo])m[mo]={mois:mo,promis:0,realise:0};
      m[mo].promis++;
      const revMo=step.rev?MONTHS[new Date(step.rev).getMonth()]:null;
      if(revMo===mo)m[mo].realise++;
    });
    const order=MONTHS;
    return order.filter(mo=>m[mo]).map(mo=>m[mo]);
  },[comparable,kpiStep]);

  // ── AXE 2 : Fiabilité de l'engagement ──────────────────────────
  const zeroDriftCount=stepDeltas.filter(d=>d===0).length;
  const reliabilityRate=stepDeltas.length?Math.round((zeroDriftCount/stepDeltas.length)*100):null;
  const driftBuckets=useMemo(()=>{
    const buckets=[
      {label:"À l'heure / avance",min:-Infinity,max:0,c:T.emerald500,n:0},
      {label:"Léger retard (1-15j)",min:0,max:15,c:T.amber500,n:0},
      {label:"Retard important (15-30j)",min:15,max:30,c:"#e8821a",n:0},
      {label:"Retard critique (30j+)",min:30,max:Infinity,c:T.red500,n:0},
    ];
    stepDeltas.forEach(d=>{
      const b=buckets.find(b=>d>b.min&&d<=b.max)||(d<=0?buckets[0]:buckets[buckets.length-1]);
      if(b)b.n++;
    });
    return buckets.filter(b=>b.n>0);
  },[stepDeltas]);

  // ── AXE 3 : Trajectoire de la dérive (le retard s'aggrave-t-il ou se résorbe-t-il au fil des jalons ?) ─
  const trajectory=useMemo(()=>{
    const steps=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin prod"],["depart","Départ"]];
    return steps.map(([k,label])=>{
      const deltas=comparable.map(r=>r[k].delta).filter(d=>d!=null);
      const moyenne=deltas.length?Math.round((deltas.reduce((a,b)=>a+b,0)/deltas.length)*10)/10:null;
      return{jalon:label,moyenne};
    });
  },[comparable]);

  // ── Comparaison Initial vs Révisé par PJ — pour l'étape sélectionnée, en barres groupées ─
  // On exprime les deux dates en "jour de l'année" pour pouvoir les comparer visuellement sur un même axe
  const yearStart=new Date(today.getFullYear(),0,1);
  const dayOfYear=d=>Math.round((d-yearStart)/86400000);
  const pjCompareChart=useMemo(()=>{
    return comparable.filter(r=>r[kpiStep].ini&&r[kpiStep].rev).map(r=>({
      pj:r.pj,
      initial:dayOfYear(new Date(r[kpiStep].ini)),
      revise:dayOfYear(new Date(r[kpiStep].rev)),
      delta:r[kpiStep].delta,
      dateIni:r[kpiStep].ini,
      dateRev:r[kpiStep].rev,
    })).sort((a,b)=>a.initial-b.initial);
  },[comparable,kpiStep]);

  // ── Durée totale de production (Arrivée → Départ) : initial vs révisé ──
  const dureeCompare=useMemo(()=>{
    const rows=comparable.filter(r=>r.arrivee.ini&&r.depart.ini&&r.arrivee.rev&&r.depart.rev).map(r=>({
      pj:r.pj,
      dureeIni:diffDays(new Date(r.arrivee.ini),new Date(r.depart.ini)),
      dureeRev:diffDays(new Date(r.arrivee.rev),new Date(r.depart.rev)),
    }));
    const avgIni=rows.length?Math.round(rows.reduce((a,b)=>a+b.dureeIni,0)/rows.length):null;
    const avgRev=rows.length?Math.round(rows.reduce((a,b)=>a+b.dureeRev,0)/rows.length):null;
    return{rows,avgIni,avgRev,ecart:avgIni!=null&&avgRev!=null?avgRev-avgIni:null};
  },[comparable]);

  // ── Tableau détaillé : écart sur les 4 jalons pour chaque PJ comparable ──
  // ── Axe 1 : dérive moyenne par gamme ──────────────────────────
  const driftByGamme=useMemo(()=>{
    const m={};
    comparable.forEach(r=>{
      if(r.depart.delta==null)return;
      if(!m[r.gamme])m[r.gamme]={sum:0,n:0};
      m[r.gamme].sum+=r.depart.delta;m[r.gamme].n++;
    });
    return Object.entries(m).map(([gamme,v])=>({gamme,moyenne:Math.round((v.sum/v.n)*10)/10,n:v.n})).sort((a,b)=>b.moyenne-a.moyenne);
  },[comparable]);

  // ── Axe 2 : dérive moyenne par mois de départ révisé ──────────
  const driftByMonth=useMemo(()=>{
    const m={};
    comparable.forEach(r=>{
      if(r.depart.delta==null||!r.depart.rev)return;
      const dt=new Date(r.depart.rev);
      if(driftMoisYear&&dt.getFullYear()!==driftMoisYear)return;
      const mo=MONTHS[dt.getMonth()];
      if(!m[mo])m[mo]={sum:0,n:0};
      m[mo].sum+=r.depart.delta;m[mo].n++;
    });
    return MONTHS.filter(mo=>m[mo]).map(mo=>({mois:mo,moyenne:Math.round((m[mo].sum/m[mo].n)*10)/10,n:m[mo].n}));
  },[comparable,driftMoisYear]);

  // ── Axe 4 : dérive moyenne par jalon (où le retard se creuse) ─
  const driftByMilestone=useMemo(()=>{
    const keys=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin prod"],["depart","Départ"]];
    return keys.map(([k,label])=>{
      const deltas=comparable.map(r=>r[k].delta).filter(d=>d!=null);
      const moyenne=deltas.length?Math.round((deltas.reduce((a,b)=>a+b,0)/deltas.length)*10)/10:null;
      return{jalon:label,moyenne,n:deltas.length};
    });
  },[comparable]);

  // ── Axe 5 : tendance — dérive moyenne mois par mois, dans l'ordre chronologique ─
  const driftTrend=useMemo(()=>{
    const order=["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
    return driftByMonth.slice().sort((a,b)=>order.indexOf(a.mois)-order.indexOf(b.mois));
  },[driftByMonth]);

  // ── Explorateur libre : dimension + métrique au choix ─────────
  const [exploreDim,setExploreDim]=useState("gamme");
  const [exploreMetric,setExploreMetric]=useState("count");
  const DIM_GETTERS={
    gamme:r=>r.gamme,
    etat:r=>ETAT_META[r.etat]?.label||r.etat,
    pays:r=>getPjMeta(r.pj,r).pays,
    chef:r=>initials(getPjMeta(r.pj,r).chefProjet),
    moisDepart:r=>r.depart?MONTHS[new Date(r.depart).getMonth()]:"—",
  };
  const exploreData=useMemo(()=>{
    const getter=DIM_GETTERS[exploreDim];
    const groups={};
    fd.forEach(r=>{
      const key=getter(r);
      if(!groups[key])groups[key]={key,count:0,driftSum:0,driftN:0,durSum:0,durN:0};
      groups[key].count++;
      const driftRow=driftRows.find(d=>d.pj===r.pj);
      if(driftRow&&driftRow.depart.delta!=null){groups[key].driftSum+=driftRow.depart.delta;groups[key].driftN++;}
      if(r.arrivee&&r.depart){const dur=diffDays(new Date(r.arrivee),new Date(r.depart));groups[key].durSum+=dur;groups[key].durN++;}
    });
    return Object.values(groups).map(g=>({
      key:g.key,
      count:g.count,
      drift:g.driftN?Math.round((g.driftSum/g.driftN)*10)/10:null,
      duree:g.durN?Math.round(g.durSum/g.durN):null,
    })).sort((a,b)=>b.count-a.count);
  },[fd,exploreDim,driftRows]);
  const exploreMetricInfo={
    count:{key:"count",label:"Nombre de PJ",fmt:v=>v},
    drift:{key:"drift",label:"Dérive moyenne départ (j)",fmt:v=>v==null?"—":v},
    duree:{key:"duree",label:"Durée moyenne production (j)",fmt:v=>v==null?"—":v},
  };

  // ── Nouveaux KPI : volumétrie, durée moyenne, charge mensuelle ─
  const dureeProdValues=fd.map(r=>r.arrivee&&r.depart?diffDays(new Date(r.arrivee),new Date(r.depart)):null).filter(d=>d!=null);
  const avgDureeProd=dureeProdValues.length?Math.round(dureeProdValues.reduce((a,b)=>a+b,0)/dureeProdValues.length):null;
  const chargeByMonthMulti=useMemo(()=>{
    const steps=[["arrivee","Arrivée",T.teal500],["tests","Tests",T.amber500],["finProd","Fin prod",T.emerald500],["depart","Départ",T.red500]];
    const m={};
    MONTHS.forEach(mo=>{m[mo]={mois:mo};steps.forEach(([k,l])=>{m[mo][l]=0;});m[mo]["Production"]=0;});
    fd.forEach(r=>{
      steps.forEach(([k,l])=>{if(r[k]){const dt=new Date(r[k]);if(chargeYear&&dt.getFullYear()!==chargeYear)return;const mo=MONTHS[dt.getMonth()];m[mo][l]++;}});
      // Production : la machine est en fabrication ce mois-là si le mois chevauche [arrivée, fin prod]
      if(r.arrivee&&r.finProd){
        const start=new Date(r.arrivee),end=new Date(r.finProd);
        const targetYear=chargeYear||start.getFullYear();
        MONTHS.forEach((mo,mi)=>{
          const monthStart=new Date(targetYear,mi,1),monthEnd=new Date(targetYear,mi+1,1);
          if(start<monthEnd&&end>=monthStart)m[mo]["Production"]++;
        });
      }
    });
    return MONTHS.filter(mo=>Object.values(m[mo]).some(v=>typeof v==="number"&&v>0)).map(mo=>m[mo]);
  },[fd,chargeYear]);

  // ── Charge de travail Atelier / Autom par PJ (heures issues de l'import Excel) ──
  const CAPA_ATELIER_SEM=175; // capacité 500% (5 postes) × 35h/semaine
  const CAPA_AUTOM_SEM=35;    // 1 poste × 35h/semaine
  const workloadByPJ=useMemo(()=>{
    return fd.filter(r=>r.heuresAtelier||r.heuresAutom).map(r=>({
      pj:r.pj,gamme:r.gamme,
      heuresAtelier:r.heuresAtelier||0,
      heuresAutom:r.heuresAutom||0,
    })).sort((a,b)=>b.heuresAtelier-a.heuresAtelier);
  },[fd]);
  const totalHeuresAtelier=workloadByPJ.reduce((a,r)=>a+r.heuresAtelier,0);
  const totalHeuresAutom=workloadByPJ.reduce((a,r)=>a+r.heuresAutom,0);

  // Saturation hebdomadaire : répartit la charge Atelier sur [Arrivée→Fin prod] et Autom sur [Tests→TestsFin], semaine par semaine
  const saturationByWeek=useMemo(()=>{
    const weekly={}; // clé = lundi de la semaine en ISO, valeur = {atelier,autom}
    const addToWeeks=(start,end,totalHeures,type)=>{
      if(!start||!end||!totalHeures)return;
      const s=new Date(start),e=new Date(end);
      const totalMs=Math.max(e-s,86400000); // au moins 1 jour pour éviter division par 0
      let cur=weekStartOf(s);
      while(cur<=e){
        const weekEnd=new Date(cur);weekEnd.setDate(weekEnd.getDate()+7);
        const segStart=Math.max(cur,s),segEnd=Math.min(weekEnd,e);
        const overlapMs=Math.max(0,segEnd-segStart);
        const share=overlapMs/totalMs*totalHeures;
        const key=toLocalISO(cur);
        if(!weekly[key])weekly[key]={atelier:0,autom:0,weekStart:new Date(cur)};
        weekly[key][type]+=share;
        cur=weekEnd;
      }
    };
    fd.forEach(r=>{
      if(r.arrivee&&r.finProd)addToWeeks(r.arrivee,r.finProd,r.heuresAtelier,"atelier");
      if(r.tests&&r.testsFin)addToWeeks(r.tests,r.testsFin,r.heuresAutom,"autom");
    });
    return Object.values(weekly)
      .filter(w=>(!satYear||w.weekStart.getFullYear()===satYear)&&(satMonth==null||w.weekStart.getMonth()===satMonth))
      .sort((a,b)=>a.weekStart-b.weekStart).map(w=>({
      semaine:fmt(w.weekStart),
      semaineMois:fmt(w.weekStart)+" "+MONTHS[w.weekStart.getMonth()],
      mois:MONTHS[w.weekStart.getMonth()],
      atelier:Math.round(w.atelier),
      autom:Math.round(w.autom),
      satAtelier:Math.round((w.atelier/CAPA_ATELIER_SEM)*100),
      satAutom:Math.round((w.autom/CAPA_AUTOM_SEM)*100),
    }));
  },[fd,satYear,satMonth]);

  const countByPays=useMemo(()=>{
    const m={};
    fd.forEach(r=>{const p=getPjMeta(r.pj,r).pays;m[p]=(m[p]||0)+1;});
    return Object.entries(m).map(([pays,n])=>({pays,n})).sort((a,b)=>b.n-a.n);
  },[fd]);
  const countByEtat=useMemo(()=>{
    return ALL_ETATS.map(e=>({etat:ETAT_META[e].label,n:fd.filter(r=>r.etat===e).length,c:ETAT_META[e].bar})).filter(d=>d.n>0);
  },[fd]);

  return(<div style={{display:"flex",flexDirection:"column",gap:14,fontFamily:T.font}}>
    <div style={{background:T.card,borderRadius:14,padding:"14px 16px",boxShadow:T.shadowMd}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <DropFilter label="Statut" options={ALL_ETATS} selected={fEtat} onChange={setFEtat} getLabel={o=>ETAT_META[o]?.label||o}/>
        <DropFilter label="Gamme" options={ALL_GAMMES} selected={fGamme} onChange={setFGamme}/>
        <button onClick={()=>{setFEtat(new Set(ALL_ETATS));setFGamme(new Set(ALL_GAMMES));}} style={{padding:"7px 13px",borderRadius:9,border:"1.5px solid "+T.line,background:T.card,fontSize:16,cursor:"pointer",color:T.red500,fontWeight:600}}>✕ Effacer</button>
        <span style={{fontSize:16,color:T.ink500,alignSelf:"center",fontWeight:500}}>{fd.length} unités</span>
        <div style={{marginLeft:"auto"}}>
          <ImportButton
            onImport={onInitialImport}
            busy={initialImporting}
            label="Importer planning initial"
            accent={"linear-gradient(135deg,"+T.teal600+","+T.navy700+")"}
            hasExisting={initialData.length>0}
            inputId="msp-file-initial"
            confirmMessage={"Un planning initial a déjà été importé"+(lastInitialImport?(" le "+lastInitialImport):"")+".\n\nCe planning sert de référence figée pour calculer les dérives — il ne devrait normalement être importé qu'une seule fois.\n\nÊtes-vous sûr de vouloir l'écraser ?"}
            helpText={<>Export Excel (.xlsx) avec colonnes <b>Nom, Début, Niveau hiérarchique</b>.<br/>Ce planning sera <b>figé</b> et servira de référence pour calculer les dérives par rapport au planning révisé.</>}
            warnText="Ce planning devient la référence figée (dates initiales) — à importer une seule fois normalement."
          />
        </div>
      </div>
      {initialData.length>0&&<div style={{fontSize:14,color:T.teal600,marginTop:9,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><NavIcon name="pin" size={14}/>Planning initial figé · {initialData.length} unités{lastInitialImport?" · importé le "+lastInitialImport:""}</div>}
      {initialData.length===0&&<div style={{fontSize:14,color:T.amber600,marginTop:9,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><NavIcon name="warning" size={14}/>Aucun planning initial importé — les dérives ne peuvent pas être calculées.</div>}
    </div>
    <div style={{background:T.card,borderRadius:12,padding:"14px 18px",boxShadow:T.shadowMd,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      <button onClick={syncFromSuiviORC} disabled={syncingORC} style={{padding:"10px 20px",borderRadius:10,border:"none",background:syncingORC?T.surfaceAlt:"linear-gradient(135deg,"+T.teal500+","+T.navy700+")",color:syncingORC?T.ink300:"#fff",fontSize:15,fontWeight:700,cursor:syncingORC?"default":"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:syncingORC?"none":T.shadowSm,transition:"transform .12s, box-shadow .12s"}}
        onMouseDown={e=>{if(!syncingORC)e.currentTarget.style.transform="scale(0.97)";}}
        onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
        {syncingORC?<span style={{display:"inline-flex",alignItems:"center",gap:8}}><span style={{width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",display:"inline-block",animation:"enogiaSpin .8s linear infinite"}}/>Synchronisation...</span>:"Sync depuis Suivi ORC"}
      </button>
      <div style={{fontSize:14,color:T.ink500,lineHeight:1.4}}>
        Récupère noms de projet, pays et chefs de projet depuis l'onglet <b>"Suivi ORC"</b> du Google Sheet officiel.
        {pjMetaSyncInfo&&pjMetaSyncInfo.lastSync&&<><br/><span style={{color:T.teal600,fontWeight:600}}>✓ Dernière synchro : {pjMetaSyncInfo.lastSync} · {pjMetaSyncInfo.count} PJ</span></>}
        {!pjMetaSyncInfo?.lastSync&&<><br/><span style={{color:T.ink300}}>Jamais synchronisé — les données figées dans le code sont utilisées.</span></>}
      </div>
      {syncORCError&&<div style={{fontSize:14,color:T.red600,background:T.red100,padding:"8px 12px",borderRadius:8,width:"100%",display:"flex",alignItems:"center",gap:7}}><NavIcon name="warning" size={14}/>{syncORCError}</div>}
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {[["fiche","list","Fiche Projet"],["retards","warning","Retards"],["derives","chart","KPIs & Dérives"],["avancement","gauge","Avancement"],["statut","tag","Statut & État"],["vacances","sun","Vacances"],["production","factory","Production"]].map(([id,icon,l])=><button key={id} onClick={()=>setTab(id)} style={{padding:"9px 16px",borderRadius:10,border:"none",background:tab===id?"linear-gradient(145deg,"+T.teal500+","+T.teal600+")":T.surface,color:tab===id?"#fff":T.ink700,fontWeight:600,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",gap:7,boxShadow:tab===id?T.neuInSm:T.neuOutSm,transition:"box-shadow .15s ease"}}><NavIcon name={icon} size={15}/>{l}</button>)}
    </div>
    {tab==="derives"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
        {[[fd.length,"Total",T.teal500],[shipped.length,"Expédiées",T.emerald500],[inProd.length,"En production",T.amber500],[upcoming.length,"Départs < 30j",T.red500],[avgDureeProd==null?"—":avgDureeProd+"j","Durée moy. production",T.violet500]].map(([v,l,c])=>(
          <div key={l} style={{background:T.card,borderRadius:12,padding:"14px 16px",borderTop:"3px solid "+c,boxShadow:T.shadowMd}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:36,fontWeight:700,color:T.ink900}}>{v}</div>
            <div style={{fontSize:15,fontWeight:600,color:T.ink500,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:14}}>
        {countByEtat.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:4}}>Répartition par état</div>
          <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Volumétrie actuelle du portefeuille</div>
          <ResponsiveContainer width="100%" height={Math.max(160,countByEtat.length*40)}>
            <BarChart data={countByEtat} layout="vertical" margin={{left:10,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
              <XAxis type="number" allowDecimals={false} tick={{fontSize:12,fill:T.ink500}}/>
              <YAxis type="category" dataKey="etat" width={130} tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
              <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
              <Bar dataKey="n" radius={[0,6,6,0]}>
                {countByEtat.map((d,i)=><Cell key={i} fill={d.c}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>}

        {countByPays.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:4}}>Répartition par pays</div>
          <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Destinations des machines du portefeuille</div>
          <ResponsiveContainer width="100%" height={Math.max(160,countByPays.length*36)}>
            <BarChart data={countByPays} layout="vertical" margin={{left:10,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
              <XAxis type="number" allowDecimals={false} tick={{fontSize:12,fill:T.ink500}}/>
              <YAxis type="category" dataKey="pays" width={90} tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
              <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
              <Bar dataKey="n" radius={[0,6,6,0]} fill={T.teal500}/>
            </BarChart>
          </ResponsiveContainer>
        </div>}

        {fd.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd,gridColumn:"1 / -1"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:4}}>Charge prévisionnelle par étape et par mois</div>
              <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Nombre de machines à chaque étape chaque mois — Production = machines en fabrication ce mois-là</div>
            </div>
            <PeriodFilter yearsAvailable={yearsInData} year={chargeYear} setYear={setChargeYear} showMonth={false}/>
          </div>
          {chargeByMonthMulti.length>0?<ResponsiveContainer width="100%" height={260}>
            <BarChart data={chargeByMonthMulti}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
              <XAxis dataKey="mois" tick={{fontSize:12,fill:T.ink700,fontWeight:600}}/>
              <YAxis allowDecimals={false} tick={{fontSize:12,fill:T.ink500}}/>
              <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
              <Legend wrapperStyle={{fontSize:13}}/>
              <Bar dataKey="Arrivée" fill={T.teal500} radius={[4,4,0,0]}/>
              <Bar dataKey="Production" fill="#5eccc9" radius={[4,4,0,0]}/>
              <Bar dataKey="Tests" fill={T.amber500} radius={[4,4,0,0]}/>
              <Bar dataKey="Fin prod" fill={T.emerald500} radius={[4,4,0,0]}/>
              <Bar dataKey="Départ" fill={T.red500} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:14}}>Aucune donnée pour cette période</div>}
        </div>}

        {workloadByPJ.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd,gridColumn:"1 / -1"}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:17,color:T.ink900,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><NavIcon name="gauge" size={17}/>Charge de travail Atelier / Autom</div>
          <div style={{fontSize:13,color:T.ink300,marginBottom:14}}>Heures de travail par PJ, issues de l'import Excel (feuille Table_affectation)</div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:16}}>
            {[[totalHeuresAtelier+"h","Total Atelier",T.teal500],[totalHeuresAutom+"h","Total Autom",T.violet500],[workloadByPJ.length,"PJ avec charge connue",T.ink500]].map(([v,l,c])=>(
              <div key={l} style={{background:T.surface,borderRadius:10,padding:"12px 16px",borderTop:"3px solid "+c}}>
                <div style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:700,color:T.ink900}}>{v}</div>
                <div style={{fontSize:13,color:T.ink500,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:14}}>
            <div style={{background:T.surface,borderRadius:10,padding:14,overflow:"auto",maxHeight:380}}>
              <div style={{fontSize:14,fontWeight:700,color:T.ink900,marginBottom:8}}>Détail par PJ</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{borderBottom:"1px solid "+T.line,position:"sticky",top:0,background:T.surface}}>
                  {["N° PJ","Gamme","Atelier","Autom"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:h==="N° PJ"||h==="Gamme"?"left":"right",fontWeight:700,color:T.ink500,fontSize:12,textTransform:"uppercase"}}>{h}</th>)}
                </tr></thead>
                <tbody>{workloadByPJ.map(r=>(
                  <tr key={r.pj} style={{borderBottom:"1px solid "+T.surfaceAlt}}>
                    <td style={{padding:"7px 10px",fontWeight:700,color:T.teal600}}>{r.pj}</td>
                    <td style={{padding:"7px 10px",color:T.ink500}}>{r.gamme}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:T.ink900}}>{r.heuresAtelier}h</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:T.violet600}}>{r.heuresAutom}h</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            {workloadByPJ.length>0&&<>
              <div style={{background:T.surface,borderRadius:10,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink900,marginBottom:4}}>Taux de saturation hebdomadaire</div>
                    <div style={{fontSize:12,color:T.ink300,marginBottom:8}}>Atelier (capacité {CAPA_ATELIER_SEM}h/sem.) vs Autom (capacité {CAPA_AUTOM_SEM}h/sem.)</div>
                  </div>
                  <PeriodFilter yearsAvailable={yearsInData} year={satYear} setYear={setSatYear} month={satMonth} setMonth={setSatMonth}/>
                </div>
                {saturationByWeek.length>0?<ResponsiveContainer width="100%" height={220}>
                  <LineChart data={saturationByWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                    <XAxis dataKey="semaineMois" tick={{fontSize:10.5,fill:T.ink500}} angle={-35} textAnchor="end" height={55}/>
                    <YAxis tick={{fontSize:12,fill:T.ink500}} tickFormatter={v=>v+"%"}/>
                    <Tooltip formatter={(v,n)=>[v+"%",n]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:13}}/>
                    <Line type="monotone" dataKey="satAtelier" name="Atelier" stroke={T.teal500} strokeWidth={3} dot={{r:4,fill:T.teal500}}/>
                    <Line type="monotone" dataKey="satAutom" name="Autom" stroke={T.violet500} strokeWidth={3} dot={{r:4,fill:T.violet500}}/>
                  </LineChart>
                </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:14}}>Aucune donnée pour cette période</div>}
              </div>

              <div style={{background:T.surface,borderRadius:10,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink900,marginBottom:4}}>Heures de travail hebdomadaires</div>
                    <div style={{fontSize:12,color:T.ink300,marginBottom:8}}>Volume brut d'heures Atelier et Autom, semaine par semaine</div>
                  </div>
                  <PeriodFilter yearsAvailable={yearsInData} year={satYear} setYear={setSatYear} month={satMonth} setMonth={setSatMonth}/>
                </div>
                {saturationByWeek.length>0?<ResponsiveContainer width="100%" height={220}>
                  <LineChart data={saturationByWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                    <XAxis dataKey="semaineMois" tick={{fontSize:10.5,fill:T.ink500}} angle={-35} textAnchor="end" height={55}/>
                    <YAxis tick={{fontSize:12,fill:T.ink500}} tickFormatter={v=>v+"h"}/>
                    <Tooltip formatter={(v,n)=>[v+"h",n]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:13}}/>
                    <Line type="monotone" dataKey="atelier" name="Atelier" stroke={T.teal500} strokeWidth={3} dot={{r:4,fill:T.teal500}}/>
                    <Line type="monotone" dataKey="autom" name="Autom" stroke={T.violet500} strokeWidth={3} dot={{r:4,fill:T.violet500}}/>
                  </LineChart>
                </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:14}}>Aucune donnée pour cette période</div>}
              </div>
            </>}
          </div>
        </div>}

        <div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900}}>Explorateur libre</div>
              <div style={{fontSize:13,color:T.ink300}}>Choisissez ce que vous voulez analyser</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <select value={exploreDim} onChange={e=>setExploreDim(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,color:T.ink700,background:T.surface}}>
                <option value="gamme">Par gamme</option>
                <option value="etat">Par état</option>
                <option value="pays">Par pays</option>
                <option value="chef">Par chef de projet</option>
                <option value="moisDepart">Par mois de départ</option>
              </select>
              <select value={exploreMetric} onChange={e=>setExploreMetric(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,color:T.ink700,background:T.surface}}>
                <option value="count">Nombre de PJ</option>
                <option value="drift">Dérive moyenne départ</option>
                <option value="duree">Durée moyenne production</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(180,exploreData.length*36)}>
            <BarChart data={exploreData} layout="vertical" margin={{left:10,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
              <XAxis type="number" tick={{fontSize:12,fill:T.ink500}}/>
              <YAxis type="category" dataKey="key" width={100} tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
              <Tooltip formatter={(v,n,p)=>[v,exploreMetricInfo[exploreMetric].label]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
              <Bar dataKey={exploreMetric} radius={[0,6,6,0]} fill={T.violet500}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {initialData.length>0&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
          {[[avgDelay==null?"—":(avgDelay>0?"+":"")+avgDelay+"j","Retard moyen départ",avgDelay>0?T.red500:T.emerald500],[lateCount,"PJ en retard",T.red500],[onTimeOrEarlyCount,"PJ à l'heure / en avance",T.emerald500],[onTimeRate==null?"—":onTimeRate+"%","Taux de respect délais",onTimeRate>=70?T.emerald500:onTimeRate>=40?T.amber500:T.red500],[comparable.length,"PJ comparables",T.ink500]].map(([v,l,c])=>(
            <div key={l} style={{background:T.card,borderRadius:12,padding:"14px 16px",borderTop:"3px solid "+c,boxShadow:T.shadowMd}}>
              <div style={{fontFamily:T.fontDisplay,fontSize:30,fontWeight:700,color:T.ink900}}>{v}</div>
              <div style={{fontSize:15,fontWeight:600,color:T.ink500,marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{background:T.card,borderRadius:14,padding:"18px 20px",boxShadow:T.shadowMd,border:"1px solid "+T.line}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:2}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:21,color:T.ink900}}>📊 Vue CODIR — Promesse vs Réalité</div>
              <div style={{fontSize:14,color:T.ink500}}>Impact cumulé de l'écart entre le planning initial et le planning révisé</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,background:T.surface,borderRadius:10,padding:"6px 10px"}}>
              <span style={{fontSize:13,color:T.ink500,fontWeight:600}}>Étape analysée :</span>
              <div style={{display:"flex",gap:4}}>
                {Object.entries(STEP_LABELS).map(([k,l])=><button key={k} onClick={()=>setKpiStep(k)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:kpiStep===k?T.teal500:T.card,color:kpiStep===k?"#fff":T.ink700,fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
              </div>
            </div>
          </div>
          <div style={{marginBottom:16}}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:18}}>
            {[[totalDelayDays+"j","Retard cumulé généré ("+STEP_LABELS[kpiStep]+")",T.red500],[totalGainDays+"j","Avance cumulée gagnée",T.emerald500],[reliabilityRate==null?"—":reliabilityRate+"%","PJ tenus à la date promise",T.teal500],[dureeCompare.ecart==null?"—":(dureeCompare.ecart>0?"+":"")+dureeCompare.ecart+"j","Écart durée moy. production",dureeCompare.ecart>0?T.red500:T.emerald500]].map(([v,l,c])=>(
              <div key={l} style={{background:T.surface,borderRadius:10,padding:"12px 16px",borderTop:"3px solid "+c}}>
                <div style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:700,color:T.ink900}}>{v}</div>
                <div style={{fontSize:13,color:T.ink500,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>

          {promiseVsReality.length>0&&<div style={{background:T.surface,borderRadius:10,padding:14,marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:T.ink900,marginBottom:8}}>{STEP_LABELS[kpiStep]} promis (initial) vs maintenus dans le mois (révisé)</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={promiseVsReality}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                <XAxis dataKey="mois" tick={{fontSize:12,fill:T.ink700,fontWeight:600}}/>
                <YAxis allowDecimals={false} tick={{fontSize:12,fill:T.ink500}}/>
                <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                <Legend wrapperStyle={{fontSize:13}}/>
                <Line type="monotone" dataKey="promis" name="Promis (initial)" stroke={T.ink300} strokeWidth={2.5} strokeDasharray="5 4" dot={{r:4,fill:T.ink300}}/>
                <Line type="monotone" dataKey="realise" name="Maintenu dans le mois" stroke={T.teal500} strokeWidth={3} dot={{r:5,fill:T.teal500}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>}

          {pjCompareChart.length>0&&<div style={{background:T.surface,borderRadius:10,padding:16,marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:T.ink900,marginBottom:4}}>Date de {STEP_LABELS[kpiStep].toLowerCase()} par PJ — Initial vs Révisé</div>
            <div style={{fontSize:12,color:T.ink300,marginBottom:12}}>Chaque ligne relie la date promise à la date réelle — la longueur et la couleur indiquent l'ampleur du glissement</div>
            {(()=>{
              const rowHd=34,labelW=78,leftPad=20,rightPad=20,topPad=28,bottomPad=4;
              const minD=Math.min(...pjCompareChart.map(p=>Math.min(p.initial,p.revise)));
              const maxD=Math.max(...pjCompareChart.map(p=>Math.max(p.initial,p.revise)));
              const pad=Math.max((maxD-minD)*0.08,3);
              const domainMin=minD-pad,domainMax=maxD+pad;
              const span=Math.max(domainMax-domainMin,1);
              const chartW=720;
              const plotW=chartW-labelW-leftPad-rightPad;
              const chartH=pjCompareChart.length*rowHd+topPad+bottomPad;
              const xOf=v=>labelW+leftPad+((v-domainMin)/span)*plotW;
              // graduations : un repère par début de mois dans la plage couverte
              const monthTicks=[];
              const dStart=new Date(yearStart);dStart.setDate(dStart.getDate()+Math.floor(domainMin));
              let curM=new Date(dStart.getFullYear(),dStart.getMonth(),1);
              const dEnd=new Date(yearStart);dEnd.setDate(dEnd.getDate()+Math.ceil(domainMax));
              while(curM<=dEnd){monthTicks.push(new Date(curM));curM=new Date(curM.getFullYear(),curM.getMonth()+1,1);}
              return(<div style={{overflowX:"auto"}}>
                <svg width="100%" height={chartH} viewBox={"0 0 "+chartW+" "+chartH} preserveAspectRatio="xMinYMin meet" style={{minWidth:600,fontFamily:T.font}}>
                  {/* grille de fond : repères mensuels */}
                  {monthTicks.map((mt,i)=>{const dv=dayOfYear(mt);const x=xOf(dv);if(x<labelW||x>chartW-2)return null;return(
                    <g key={i}>
                      <line x1={x} x2={x} y1={topPad-6} y2={chartH-bottomPad} stroke={T.line} strokeWidth={1} strokeDasharray="3 3"/>
                      <text x={x} y={topPad-12} fontSize={10.5} fontWeight={700} fill={T.ink300} textAnchor="middle">{MONTHS[mt.getMonth()]}</text>
                    </g>
                  );})}
                  {/* lignes alternées pour la lisibilité */}
                  {pjCompareChart.map((p,i)=>i%2===0&&<rect key={"bg"+i} x={0} y={topPad+i*rowHd} width={chartW} height={rowHd} fill={T.card} opacity={0.5}/>)}

                  {pjCompareChart.map((p,i)=>{
                    const y=topPad+i*rowHd+rowHd/2;
                    const x1=xOf(p.initial),x2=xOf(p.revise);
                    const late=p.delta>0;
                    const dotColor=late?T.red500:p.delta<0?T.emerald500:T.ink500;
                    const dIni=new Date(yearStart);dIni.setDate(dIni.getDate()+p.initial);
                    const dRev=new Date(yearStart);dRev.setDate(dRev.getDate()+p.revise);
                    return(<g key={p.pj}>
                      <text x={6} y={y+4} fontSize={13} fontWeight={700} fill={T.teal600}>{p.pj}</text>
                      <line x1={Math.min(x1,x2)} x2={Math.max(x1,x2)} y1={y} y2={y} stroke={dotColor} strokeWidth={2.5} strokeOpacity={0.35}/>
                      <circle cx={x1} cy={y} r={5} fill="#fff" stroke={T.ink300} strokeWidth={2}/>
                      <circle cx={x2} cy={y} r={6} fill={dotColor}/>
                      <text x={x2} y={y-11} fontSize={10.5} fontWeight={700} fill={dotColor} textAnchor="middle">{p.delta===0?"=":(p.delta>0?"+":"")+p.delta+"j"}</text>
                    </g>);
                  })}
                </svg>
              </div>);
            })()}
            <div style={{display:"flex",gap:18,marginTop:12,paddingTop:12,borderTop:"1px solid "+T.line,flexWrap:"wrap"}}>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:T.ink500}}><span style={{width:11,height:11,borderRadius:"50%",background:"#fff",border:"2px solid "+T.ink300,display:"inline-block"}}/>Date initiale</span>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:T.ink500}}><span style={{width:11,height:11,borderRadius:"50%",background:T.red500,display:"inline-block"}}/>Révisée — retard</span>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:T.ink500}}><span style={{width:11,height:11,borderRadius:"50%",background:T.emerald500,display:"inline-block"}}/>Révisée — avance</span>
            </div>
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14,marginBottom:14}}>
            {driftBuckets.length>0&&<div style={{background:T.surface,borderRadius:10,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.ink900,marginBottom:8}}>Répartition par sévérité du retard</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={driftBuckets} layout="vertical" margin={{left:10,right:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                  <XAxis type="number" allowDecimals={false} tick={{fontSize:11,fill:T.ink500}}/>
                  <YAxis type="category" dataKey="label" width={140} tick={{fontSize:12,fill:T.ink700}}/>
                  <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                  <Bar dataKey="n" radius={[0,6,6,0]}>
                    {driftBuckets.map((d,i)=><Cell key={i} fill={d.c}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>}

            {trajectory.some(t=>t.moyenne!=null)&&<div style={{background:T.surface,borderRadius:10,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.ink900,marginBottom:8}}>Trajectoire de la dérive le long de la chaîne</div>
              <div style={{fontSize:12,color:T.ink300,marginBottom:6}}>Le retard s'aggrave-t-il ou se résorbe-t-il entre l'arrivée et le départ ?</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={trajectory}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                  <XAxis dataKey="jalon" tick={{fontSize:12,fill:T.ink700,fontWeight:600}}/>
                  <YAxis tick={{fontSize:11,fill:T.ink500}}/>
                  <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                  <Line type="monotone" dataKey="moyenne" stroke={T.teal500} strokeWidth={3} dot={{r:5,fill:T.teal500}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>}

            {dureeCompare.rows.length>0&&<div style={{background:T.surface,borderRadius:10,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.ink900,marginBottom:4}}>Durée de production : initial vs révisé</div>
              <div style={{fontSize:12,color:T.ink300,marginBottom:8}}>Moyenne sur le portefeuille comparable (Arrivée → Départ)</div>
              <div style={{display:"flex",gap:20,alignItems:"baseline"}}>
                <div><div style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:700,color:T.ink500}}>{dureeCompare.avgIni}j</div><div style={{fontSize:12,color:T.ink300}}>Initial</div></div>
                <div style={{fontSize:20,color:T.ink300}}>→</div>
                <div><div style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:700,color:dureeCompare.ecart>0?T.red500:T.emerald500}}>{dureeCompare.avgRev}j</div><div style={{fontSize:12,color:T.ink300}}>Révisé</div></div>
              </div>
            </div>}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:14}}>
          {driftByGamme.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
            <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:4}}>Dérive moyenne par gamme</div>
            <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Écart moyen (jours) entre départ initial et révisé, par gamme</div>
            <ResponsiveContainer width="100%" height={Math.max(180,driftByGamme.length*38)}>
              <BarChart data={driftByGamme} layout="vertical" margin={{left:10,right:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
                <XAxis type="number" tick={{fontSize:12,fill:T.ink500}}/>
                <YAxis type="category" dataKey="gamme" width={90} tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
                <Tooltip formatter={(v,n,p)=>[v+"j (n="+p.payload.n+")","Dérive moyenne"]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                <Bar dataKey="moyenne" radius={[0,6,6,0]}>
                  {driftByGamme.map((d,i)=><Cell key={i} fill={d.moyenne>0?T.red500:T.emerald500}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>}

          {driftByMilestone.some(d=>d.moyenne!=null)&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
            <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:4}}>Dérive moyenne par jalon</div>
            <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Où le retard se creuse le plus dans la chaîne de production</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={driftByMilestone}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
                <XAxis dataKey="jalon" tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
                <YAxis tick={{fontSize:12,fill:T.ink500}}/>
                <Tooltip formatter={(v,n,p)=>[v+"j (n="+p.payload.n+")","Dérive moyenne"]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                <Bar dataKey="moyenne" radius={[6,6,0,0]}>
                  {driftByMilestone.map((d,i)=><Cell key={i} fill={d.moyenne>0?T.amber500:T.emerald500}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>}

          {comparable.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:4}}>Dérive moyenne par mois de départ</div>
                <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Périodes où les retards sont les plus fréquents — la situation s'améliore-t-elle dans le temps ?</div>
              </div>
              <select value={driftMoisYear||""} onChange={e=>setDriftMoisYear(e.target.value?+e.target.value:null)} style={{padding:"4px 8px",borderRadius:7,border:"1px solid "+T.line,fontSize:12,fontFamily:T.font,color:T.ink700,background:T.card,height:30}}>
                <option value="">Toutes années</option>
                {yearsInData.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {driftTrend.length>0?<ResponsiveContainer width="100%" height={220}>
              <LineChart data={driftTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
                <XAxis dataKey="mois" tick={{fontSize:12,fill:T.ink700,fontWeight:600}}/>
                <YAxis tick={{fontSize:12,fill:T.ink500}}/>
                <Tooltip formatter={(v,n,p)=>[v+"j (n="+p.payload.n+")","Dérive moyenne"]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                <Line type="monotone" dataKey="moyenne" stroke={T.violet500} strokeWidth={3} dot={({cx,cy,payload})=><circle key={payload.mois} cx={cx} cy={cy} r={5} fill={payload.moyenne>0?T.red500:T.emerald500}/>}/>
              </LineChart>
            </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:14}}>Aucune donnée pour cette période</div>}
          </div>}

        </div>

        {worstDrifts.length>0&&<div style={{background:T.card,borderRadius:12,padding:14,boxShadow:T.shadowMd,maxWidth:520}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:16,color:T.ink900,marginBottom:8}}>Top 5 dérives — {STEP_LABELS[kpiStep]} (vs planning initial)</div>
          {worstDrifts.map(r=>{const d=r[kpiStep].delta;const c=d>0?T.red500:d<0?T.emerald500:T.ink500;return(
            <div key={r.pj} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+T.surface}}>
              <span style={{fontWeight:700,color:T.teal600,fontSize:14,minWidth:85}}>{r.pj}</span>
              <span style={{color:T.ink300,fontSize:12,minWidth:50}}>{r.gamme}</span>
              <span style={{fontSize:13,color:T.ink500}}>{fmt(r[kpiStep].ini?new Date(r[kpiStep].ini):null)} → {fmt(r[kpiStep].rev?new Date(r[kpiStep].rev):null)}</span>
              <span style={{marginLeft:"auto",fontWeight:800,fontSize:15,color:c}}>{d>0?"+":""}{d}j</span>
            </div>
          );})}
        </div>}

        <div style={{background:T.card,borderRadius:12,padding:0,boxShadow:T.shadowMd,overflow:"auto"}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:19,color:T.ink900,padding:"16px 16px 0"}}>Détail par PJ — Initial vs Révisé</div>
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:10,tableLayout:"auto"}}>
            <thead><tr style={{background:T.surface,borderBottom:"2px solid "+T.line}}>
              {["N° PJ","Gamme","Arrivée","Δ","Tests","Δ","Fin prod","Δ","Départ","Δ"].map((h,i)=><th key={i} style={{padding:"9px 12px",textAlign:"left",fontWeight:700,color:T.ink500,fontSize:14,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".03em"}}>{h}</th>)}
            </tr></thead>
            <tbody>{driftRows.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid "+T.surface,background:r.hasInitial?T.card:T.surface}}>
                <td style={{padding:"9px 12px",fontWeight:700,color:T.teal600,fontSize:16,whiteSpace:"nowrap"}}>{r.pj}</td>
                <td style={{padding:"9px 12px",color:T.ink500,fontSize:15,whiteSpace:"nowrap"}}>{r.gamme}</td>
                {["arrivee","tests","finProd","depart"].map(k=>{const c=r[k];const d=c.delta;const col=d==null?T.ink300:d>0?T.red500:d<0?T.emerald500:T.ink500;return(<React.Fragment key={k}>
                  <td style={{padding:"9px 12px",fontSize:15,color:T.ink700,whiteSpace:"nowrap"}}>{c.rev?fmt(new Date(c.rev)):"—"}</td>
                  <td style={{padding:"9px 12px",fontSize:15,fontWeight:700,color:col,whiteSpace:"nowrap"}}>{d==null?"—":(d>0?"+":"")+d+"j"}</td>
                </React.Fragment>);})}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}

      <div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:19,color:T.ink900,marginBottom:10}}>Départs par mois</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:84}}>
          {byMonth.map((n,i)=>{const iC=i===today.getMonth();return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{fontSize:14,color:T.ink500,fontWeight:600}}>{n||""}</div>
            <div style={{width:"100%",height:n?(n/maxBar*60)+"px":"0",minHeight:n?4:0,background:i<today.getMonth()?T.ink100:iC?T.teal500:T.teal400,borderRadius:"3px 3px 0 0"}}/>
            <div style={{fontSize:13,color:iC?T.teal600:T.ink300,fontWeight:iC?700:500}}>{MONTHS[i]}</div>
          </div>);})}
        </div>
      </div>
      <div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:19,color:T.ink900,marginBottom:10}}>Par gamme</div>
        {Object.entries(gammeCounts).sort((a,b)=>b[1]-a[1]).map(([g,n])=>{const col=GAMME_COLORS[g]||T.ink500;return(<div key={g} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{width:78,fontSize:15,fontWeight:700,color:col,flexShrink:0}}>{g}</span>
          <div style={{flex:1,background:T.surfaceAlt,borderRadius:5,height:18,overflow:"hidden",position:"relative"}}><div style={{width:((n/Math.max(fd.length,1))*100)+"%",height:"100%",background:col}}/><span style={{position:"absolute",left:8,top:1,fontSize:14,color:"#fff",fontWeight:700,lineHeight:"16px"}}>{n}</span></div>
        </div>);})}
      </div>
    </div>}
    {tab==="avancement"&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <span style={{fontSize:16,color:T.ink500}}>Cliquer sur la barre ou saisir le %</span>
        <button onClick={saveProgress} disabled={savingProgress} style={{marginLeft:"auto",padding:"9px 18px",borderRadius:10,border:"none",background:progressSaved?T.emerald500:T.teal500,color:"#fff",fontSize:15,fontWeight:700,cursor:savingProgress?"default":"pointer",opacity:savingProgress?0.7:1,display:"flex",alignItems:"center",gap:7}}>
          {progressSaved?"✓ Enregistré":savingProgress?"Enregistrement...":"💾 Valider l'avancement"}
        </button>
      </div>
      <div style={{fontSize:13,color:T.amber600,background:T.amber100,padding:"8px 12px",borderRadius:8,marginBottom:14}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:7}}><NavIcon name="warning" size={14}/>Les modifications restent temporaires jusqu'au clic sur « Valider » — sans validation, elles seront perdues si la page est actualisée.</span>
      </div>
      <div style={{fontSize:13,color:T.ink500,background:T.surface,padding:"8px 12px",borderRadius:8,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
        <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:16,height:16,borderRadius:"50%",background:T.ink300,color:"#fff",fontSize:11,fontWeight:700,fontStyle:"italic",flexShrink:0}}>i</span>
        Cet avancement (%) reflète uniquement la production chez ENOGIA — il ne prend pas en compte l'avancement chez les fournisseurs.
      </div>
      {fd.map(r=>{
        const pv=progress[r.pj]!=null?progress[r.pj]:r.etat==="SHIPPED"?100:0;
        return(<div key={r.pj} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+T.surface}}>
          <span style={{fontWeight:700,color:T.teal600,fontSize:16,minWidth:110,flexShrink:0}}>{r.pj}</span>
          <span style={{color:T.ink300,fontSize:14,minWidth:60,flexShrink:0}}>{r.gamme}</span>
          <div style={{flex:1,background:T.surfaceAlt,borderRadius:9,height:13,overflow:"hidden",cursor:"pointer"}} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();const nv=Math.max(0,Math.min(100,Math.round(((e.clientX-rect.left)/rect.width)*100)));setProgress(p=>({...p,[r.pj]:nv}));}}>
            <div style={{width:pv+"%",height:"100%",background:pv>=100?T.emerald500:pv>=50?T.teal500:T.amber500,borderRadius:9}}/>
          </div>
          <input type="number" min={0} max={100} value={pv} onChange={e=>setProgress(p=>({...p,[r.pj]:Math.max(0,Math.min(100,+e.target.value||0))}))} style={{width:54,padding:"5px 6px",borderRadius:7,border:"1px solid "+T.line,fontSize:16,fontWeight:700,textAlign:"center",fontFamily:T.font}}/>
          <span style={{fontSize:15,color:T.ink500,fontWeight:500}}>%</span>
        </div>);
      })}
      <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
        <button onClick={saveProgress} disabled={savingProgress} style={{padding:"9px 18px",borderRadius:10,border:"none",background:progressSaved?T.emerald500:T.teal500,color:"#fff",fontSize:15,fontWeight:700,cursor:savingProgress?"default":"pointer",opacity:savingProgress?0.7:1}}>
          {progressSaved?"✓ Enregistré":savingProgress?"Enregistrement...":"💾 Valider l'avancement"}
        </button>
      </div>
    </div>}
    {tab==="statut"&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
      <div style={{fontSize:16,color:T.ink500,marginBottom:16}}>
        Choisissez l'état de chaque machine. Il n'y a pas de calcul automatique — l'état affiché partout sur le site est exactement celui sélectionné ici, et le changement est immédiatement visible par tous les utilisateurs.
      </div>
      {data.map(r=>{
        const current=etatChoice[r.pj]||"A_DEFINIR";
        const presence=clientPresence[r.pj]||{present:false,date:""};
        return(<div key={r.pj} style={{padding:"11px 0",borderBottom:"1px solid "+T.surface}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,color:T.teal600,fontSize:16,minWidth:110,flexShrink:0}}>{r.pj}</span>
            <span style={{color:T.ink300,fontSize:14,minWidth:60,flexShrink:0}}>{r.gamme}</span>
            <Badge etat={current}/>
            <div style={{display:"flex",gap:6,marginLeft:"auto",flexWrap:"wrap"}}>
              {ASSIGNABLE_ETATS.map(e=>{const m=ETAT_META[e];const active=current===e;return(
                <button key={e} onClick={()=>setEtatFor(r.pj,e)} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid "+(active?m.bar:T.line),background:active?m.bar:T.card,color:active?"#fff":T.ink700,fontSize:13,fontWeight:600,cursor:"pointer"}}>{m.label}</button>
              );})}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:10,paddingLeft:122,flexWrap:"wrap"}}>
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <div onClick={()=>setClientPresenceFor(r.pj,{...presence,present:!presence.present})} style={{width:46,height:26,borderRadius:13,background:presence.present?T.teal500:T.surfaceAlt,position:"relative",transition:"background .15s"}}>
                <div style={{width:21,height:21,borderRadius:"50%",background:"#fff",position:"absolute",top:2.5,left:presence.present?23:2.5,transition:"left .15s",boxShadow:T.shadowSm}}/>
              </div>
              <span style={{fontSize:15,color:T.ink700,fontWeight:700,display:"inline-flex",alignItems:"center",gap:6}}><PersonIcon size={15} color={T.ink700}/> Présence client / NOBO aux tests</span>
            </label>
            {presence.present&&(()=>{
              const minD=r.tests?toLocalISO(new Date(r.tests)):null;
              const maxD=r.testsFin?toLocalISO(new Date(r.testsFin)):minD;
              const noTestsDates=!minD;
              return(<>
                <input type="date" value={presence.date||""} min={minD||undefined} max={maxD||undefined} disabled={noTestsDates}
                  onChange={e=>{
                    const v=e.target.value;
                    if(!v){setClientPresenceFor(r.pj,{...presence,date:""});return;}
                    if(minD&&v<minD){setClientPresenceFor(r.pj,{...presence,date:minD});return;}
                    if(maxD&&v>maxD){setClientPresenceFor(r.pj,{...presence,date:maxD});return;}
                    setClientPresenceFor(r.pj,{...presence,date:v});
                  }}
                  style={{padding:"7px 11px",borderRadius:8,border:"1.5px solid "+T.teal500,fontSize:14,fontFamily:T.font,color:T.ink700,fontWeight:600,opacity:noTestsDates?0.5:1}}/>
                {noTestsDates&&<span style={{fontSize:13,color:T.red500,fontWeight:600}}>Période de Tests non définie pour ce PJ — date impossible à saisir</span>}
                {!noTestsDates&&<span style={{fontSize:12,color:T.ink300}}>Doit être comprise entre {fmt(new Date(r.tests))} et {fmt(new Date(maxD))}</span>}
              </>);
            })()}
          </div>
        </div>);
      })}
    </div>}

    {tab==="fiche"&&<ProjectFileManager data={data} initialData={initialData} comments={comments} delays={delays}/>}
    {tab==="retards"&&<DelaysManager data={data} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypes}/>}
    {tab==="vacances"&&<ClosurePeriodsManager closurePeriods={closurePeriods} setClosurePeriods={setClosurePeriods}/>}
    {tab==="production"&&<ProductionCalendarManager data={data} productionExclusions={productionExclusions} toggleProductionExclusion={toggleProductionExclusion}/>}
  </div>);
}

// ── Vue globale des causes de retard : répartition par type, top PJ contributeurs, gestion des types ──
const DELAY_COLORS=[T.red500,T.amber500,T.violet500,T.teal500,"#e8821a",T.emerald500,T.navy600,T.ink500];
function DelaysManager({data,delays,delayTypes,setDelayTypes}){
  const [newType,setNewType]=useState("");

  const allEntries=useMemo(()=>{
    const out=[];
    Object.entries(delays||{}).forEach(([pj,list])=>(list||[]).forEach(d=>out.push({...d,pj})));
    return out;
  },[delays]);

  const byType=useMemo(()=>{
    const m={};
    allEntries.forEach(e=>{m[e.type]=(m[e.type]||0)+(e.days||0);});
    return Object.entries(m).map(([type,days],i)=>({type,days,c:DELAY_COLORS[i%DELAY_COLORS.length]})).sort((a,b)=>b.days-a.days);
  },[allEntries]);

  const byPj=useMemo(()=>{
    const m={};
    allEntries.forEach(e=>{m[e.pj]=(m[e.pj]||0)+(e.days||0);});
    return Object.entries(m).map(([pj,days])=>({pj,days})).sort((a,b)=>b.days-a.days).slice(0,10);
  },[allEntries]);

  const totalDays=allEntries.reduce((a,e)=>a+(e.days||0),0);
  const maxTypeDays=Math.max(...byType.map(t=>t.days),1);
  const maxPjDays=Math.max(...byPj.map(t=>t.days),1);

  const addType=()=>{
    const v=newType.trim();
    if(!v||delayTypes.includes(v))return;
    setDelayTypes([...delayTypes,v]);
    setNewType("");
  };
  const removeType=t=>{
    if(delayTypes.length<=1)return;
    setDelayTypes(delayTypes.filter(x=>x!==t));
  };

  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
      {[[totalDays+"j","Total jours de retard alloués",T.red500],[allEntries.length,"Allocations enregistrées",T.teal500],[byType.length,"Types de retard utilisés",T.violet500]].map(([v,l,c])=>(
        <div key={l} style={{background:T.card,borderRadius:12,padding:"14px 16px",borderTop:"3px solid "+c,boxShadow:T.shadowMd}}>
          <div style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:700,color:T.ink900}}>{v}</div>
          <div style={{fontSize:14,color:T.ink500,fontWeight:600,marginTop:3}}>{l}</div>
        </div>
      ))}
    </div>

    <div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
      <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:4}}>Répartition globale par cause de retard</div>
      <div style={{fontSize:13,color:T.ink300,marginBottom:12}}>Qu'est-ce qui génère le plus de retard sur l'ensemble du portefeuille ?</div>
      {byType.length===0?<div style={{color:T.ink300,fontSize:15,textAlign:"center",padding:"20px 0"}}>Aucune allocation de retard enregistrée pour l'instant.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {byType.map(t=>(
            <div key={t.type}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:4}}>
                <span style={{fontWeight:600,color:T.ink700}}>{t.type}</span>
                <span style={{fontWeight:700,color:T.ink900}}>{t.days}j · {Math.round(t.days/totalDays*100)}%</span>
              </div>
              <div style={{background:T.surfaceAlt,borderRadius:6,height:12,overflow:"hidden"}}>
                <div style={{width:(t.days/maxTypeDays*100)+"%",height:"100%",background:t.c,borderRadius:6}}/>
              </div>
            </div>
          ))}
        </div>}
    </div>

    <div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
      <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:4}}>Top PJ — jours de retard cumulés</div>
      <div style={{fontSize:13,color:T.ink300,marginBottom:12}}>Les projets qui concentrent le plus de retard, toutes causes confondues</div>
      {byPj.length===0?<div style={{color:T.ink300,fontSize:15,textAlign:"center",padding:"20px 0"}}>Aucune donnée.</div>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {byPj.map(p=>(
            <div key={p.pj} style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{width:90,fontWeight:700,color:T.teal600,fontSize:14,flexShrink:0}}>{p.pj}</span>
              <div style={{flex:1,background:T.surfaceAlt,borderRadius:6,height:12,overflow:"hidden"}}>
                <div style={{width:(p.days/maxPjDays*100)+"%",height:"100%",background:T.red500,borderRadius:6}}/>
              </div>
              <span style={{width:36,textAlign:"right",fontWeight:700,color:T.ink900,fontSize:14,flexShrink:0}}>{p.days}j</span>
            </div>
          ))}
        </div>}
    </div>

    <div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
      <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.ink900,marginBottom:10}}>Types de retard génériques</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
        {delayTypes.map(t=>(
          <span key={t} style={{display:"flex",alignItems:"center",gap:6,background:T.surface,borderRadius:8,padding:"6px 10px 6px 12px",fontSize:14,color:T.ink700,fontWeight:600}}>
            {t}
            <button onClick={()=>removeType(t)} disabled={delayTypes.length<=1} title="Supprimer ce type" style={{background:"none",border:"none",color:delayTypes.length<=1?T.ink100:T.ink300,cursor:delayTypes.length<=1?"default":"pointer",fontSize:14,padding:0}}>✕</button>
          </span>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input type="text" value={newType} onChange={e=>setNewType(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addType();}} placeholder="Nouveau type de retard..." maxLength={60}
          style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700}}/>
        <button onClick={addType} disabled={!newType.trim()} style={{padding:"8px 16px",borderRadius:8,border:"none",background:newType.trim()?T.teal500:T.surfaceAlt,color:newType.trim()?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:newType.trim()?"pointer":"default"}}>Ajouter</button>
      </div>
    </div>
  </div>);
}

// ── Fiche projet complète (Manager) : dates, historique commentaires (y compris privés), causes de retard, infos ──
function ProjectFileManager({data,initialData,comments,delays}){
  const [search,setSearch]=useState("");
  const [selPj,setSelPj]=useState(data[0]?.pj||null);
  const initialByPj=useMemo(()=>{const m={};(initialData||[]).forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const filteredList=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return data;
    return data.filter(r=>{
      const meta=getPjMeta(r.pj,r);
      return r.pj.toLowerCase().includes(q)||(meta.nomProjet||"").toLowerCase().includes(q)||(meta.pays||"").toLowerCase().includes(q)||(meta.chefProjet||"").toLowerCase().includes(q);
    });
  },[data,search]);
  const r=data.find(x=>x.pj===selPj);
  const meta=r?getPjMeta(r.pj,r):null;
  const ini=r?initialByPj[r.pj]:null;
  const PHASES_F=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin de production"],["depart","Départ"]];
  const pjComments=useMemo(()=>{
    if(!r)return[];
    return (comments?.[r.pj]||[]).map((c,i)=>({...c,_idx:i})).sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[comments,r]);
  const pjDelays=useMemo(()=>{
    if(!r)return[];
    return [...(delays?.[r.pj]||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[delays,r]);
  const totalDelayDays=pjDelays.reduce((a,d)=>a+(d.days||0),0);

  return(<div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
    <div style={{background:T.card,borderRadius:12,boxShadow:T.shadowMd,width:280,flexShrink:0,maxHeight:720,display:"flex",flexDirection:"column"}}>
      <div style={{padding:12,borderBottom:"1px solid "+T.line}}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un PJ, projet, pays, chef..." style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,boxSizing:"border-box"}}/>
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {filteredList.map(row=>{
          const m=getPjMeta(row.pj,row);
          const nCom=(comments?.[row.pj]||[]).length;
          const nDel=(delays?.[row.pj]||[]).length;
          return(<div key={row.pj} onClick={()=>setSelPj(row.pj)} style={{padding:"10px 14px",cursor:"pointer",background:selPj===row.pj?T.teal100:T.card,borderBottom:"1px solid "+T.surface}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:6}}>
              <span style={{fontWeight:700,color:T.teal600,fontSize:15}}>{row.pj}</span>
              <span style={{fontSize:11,color:T.ink300}}>{nCom>0&&"💬"+nCom}{nDel>0&&" ⏱️"+nDel}</span>
            </div>
            <div style={{fontSize:13,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nomProjet}</div>
          </div>);
        })}
        {filteredList.length===0&&<div style={{padding:20,textAlign:"center",color:T.ink300,fontSize:14}}>Aucun résultat.</div>}
      </div>
    </div>

    <div style={{flex:1,minWidth:320,display:"flex",flexDirection:"column",gap:14}}>
      {!r?<div style={{background:T.card,borderRadius:12,padding:30,textAlign:"center",color:T.ink300,boxShadow:T.shadowMd}}>Sélectionnez un PJ dans la liste.</div>:<>
        <div style={{background:T.card,borderRadius:12,padding:18,boxShadow:T.shadowMd}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:24,color:T.ink900}}>{r.pj}</div>
              <div style={{color:T.ink500,fontSize:15,marginTop:3,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>{meta.nomProjet} · <CountryFlag pays={meta.pays} size={13}/> {meta.pays} · {meta.chefProjet}</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <Badge etat={r.etat}/>
              <span style={{fontSize:14,color:T.ink500,fontWeight:600}}>{r.gamme}</span>
            </div>
          </div>
        </div>

        <div style={{background:T.card,borderRadius:12,padding:18,boxShadow:T.shadowMd}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:16,color:T.ink900,marginBottom:10}}>Dates</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr repeat(3,auto)",gap:"8px 16px",fontSize:14,alignItems:"baseline"}}>
            <div style={{fontWeight:700,color:T.ink300,fontSize:12,textTransform:"uppercase"}}>Jalon</div>
            <div style={{fontWeight:700,color:T.ink300,fontSize:12,textTransform:"uppercase"}}>Initial</div>
            <div style={{fontWeight:700,color:T.ink300,fontSize:12,textTransform:"uppercase"}}>Révisé</div>
            <div style={{fontWeight:700,color:T.ink300,fontSize:12,textTransform:"uppercase"}}>Δ</div>
            {PHASES_F.map(([k,label])=>{
              const iv=ini?ini[k]:null;
              const rv=r[k];
              const delta=(iv&&rv)?diffDays(new Date(iv),new Date(rv)):null;
              return(<React.Fragment key={k}>
                <div style={{fontWeight:600,color:T.ink700}}>{label}</div>
                <div style={{color:T.ink500}}>{iv?fmt(new Date(iv)):"—"}</div>
                <div style={{fontWeight:700,color:T.ink900}}>{rv?fmt(new Date(rv)):"—"}</div>
                <div style={{fontWeight:700,color:delta==null?T.ink300:delta>0?T.red500:delta<0?T.emerald600:T.ink500}}>{delta==null?"—":(delta>0?"+":"")+delta+"j"}</div>
              </React.Fragment>);
            })}
          </div>
        </div>

        <div style={{background:T.card,borderRadius:12,padding:18,boxShadow:T.shadowMd}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:16,color:T.ink900,marginBottom:10}}>⏱️ Causes de retard ({pjDelays.length}{totalDelayDays>0?" · "+totalDelayDays+"j":""})</div>
          {pjDelays.length===0?<div style={{color:T.ink300,fontSize:14}}>Aucune cause de retard enregistrée.</div>:
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {pjDelays.map(d=>(
                <div key={d.id} style={{background:T.surface,borderRadius:9,padding:"9px 12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                    <span style={{fontWeight:700,color:T.ink900,fontSize:14}}>{d.type} — {d.days}j</span>
                    <span style={{fontSize:12,color:T.ink300}}>{d.author} · {new Date(d.date).toLocaleDateString("fr-FR")}</span>
                  </div>
                  {d.note&&<div style={{fontSize:13,color:T.ink500,marginTop:3}}>{d.note}</div>}
                </div>
              ))}
            </div>}
        </div>

        <div style={{background:T.card,borderRadius:12,padding:18,boxShadow:T.shadowMd}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:16,color:T.ink900,marginBottom:10}}>💬 Historique commentaires ({pjComments.length})</div>
          {pjComments.length===0?<div style={{color:T.ink300,fontSize:14}}>Aucun commentaire.</div>:
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:400,overflowY:"auto"}}>
              {pjComments.map(c=>(
                <div key={c._idx} style={{background:c.private?T.amber100:T.surface,borderRadius:9,padding:"9px 12px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                    <span style={{fontWeight:700,color:T.teal600,fontSize:13}}>{c.private&&"🔒 "}{c.author}{c.groupPjs&&<span style={{marginLeft:6,fontSize:11,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 6px",fontWeight:700}}>groupé ×{c.groupPjs.length}</span>}</span>
                    <span style={{fontSize:12,color:T.ink300}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  <div style={{fontSize:13,color:T.ink700,whiteSpace:"pre-wrap",marginTop:3}}>{c.text}</div>
                  {c.linkedDate&&<div style={{marginTop:4,fontSize:12,color:T.ink500,fontWeight:600}}>☁️ Lié au {fmt(new Date(c.linkedDate))}</div>}
                </div>
              ))}
            </div>}
        </div>
      </>}
    </div>
  </div>);
}

export function ClosurePeriodsManager({closurePeriods,setClosurePeriods}){
  const [newStart,setNewStart]=useState("");
  const [newEnd,setNewEnd]=useState("");
  const [newLabel,setNewLabel]=useState("");
  const addPeriod=()=>{
    if(!newStart||!newEnd)return;
    if(newEnd<newStart){alert("La date de fin doit être après la date de début.");return;}
    const next=[...closurePeriods,{start:newStart,end:newEnd,label:newLabel.trim()||"Fermeture"}];
    setClosurePeriods(next);
    setNewStart("");setNewEnd("");setNewLabel("");
  };
  const removePeriod=i=>{
    const next=closurePeriods.filter((_,idx)=>idx!==i);
    setClosurePeriods(next);
  };
  return(<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd,marginTop:16}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:18,color:T.ink900,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><NavIcon name="sun" size={17}/>Périodes de fermeture (vacances)</div>
    <div style={{fontSize:14,color:T.ink500,marginBottom:14}}>
      Les semaines/jours concernés seront grisés dans le Calendrier pour tous les utilisateurs.
    </div>
    {closurePeriods.length>0&&<div style={{marginBottom:14}}>
      {closurePeriods.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid "+T.surface}}>
          <span style={{fontSize:14,fontWeight:700,color:T.ink900,minWidth:120}}>{p.label}</span>
          <span style={{fontSize:14,color:T.ink500}}>{fmt(new Date(p.start))} → {fmt(new Date(p.end))}</span>
          <button onClick={()=>removePeriod(i)} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:8,border:"none",background:T.surface,boxShadow:T.neuOutSm,color:T.red500,fontSize:13,fontWeight:600,cursor:"pointer"}}>✕ Retirer</button>
        </div>
      ))}
    </div>}
    <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap",paddingTop:10,borderTop:closurePeriods.length>0?"1px solid "+T.line:"none"}}>
      <div>
        <label style={{fontSize:12,color:T.ink500,fontWeight:600,display:"block",marginBottom:4}}>Libellé</label>
        <input type="text" value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Ex: Vacances été" style={{padding:"7px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,width:140}}/>
      </div>
      <div>
        <label style={{fontSize:12,color:T.ink500,fontWeight:600,display:"block",marginBottom:4}}>Du</label>
        <input type="date" value={newStart} onChange={e=>setNewStart(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font}}/>
      </div>
      <div>
        <label style={{fontSize:12,color:T.ink500,fontWeight:600,display:"block",marginBottom:4}}>Au</label>
        <input type="date" value={newEnd} onChange={e=>setNewEnd(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font}}/>
      </div>
      <button onClick={addPeriod} disabled={!newStart||!newEnd} style={{padding:"8px 16px",borderRadius:8,border:"none",background:newStart&&newEnd?T.teal500:T.surfaceAlt,color:newStart&&newEnd?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:newStart&&newEnd?"pointer":"default"}}>+ Ajouter</button>
    </div>
  </div>);
}

export function ProductionCalendarManager({data,productionExclusions,toggleProductionExclusion}){
  const [selectedPj,setSelectedPj]=useState("");
  const r=data.find(x=>x.pj===selectedPj);
  const prodRange=useMemo(()=>{
    if(!r||!r.arrivee||!r.finProd)return null;
    return{start:new Date(r.arrivee),end:new Date(r.finProd)};
  },[r]);
  const [viewMonth,setViewMonth]=useState(null);
  useEffect(()=>{
    if(prodRange)setViewMonth(new Date(prodRange.start.getFullYear(),prodRange.start.getMonth(),1));
  },[prodRange]);

  const excluded=productionExclusions[selectedPj]||[];
  const isProdDay=d=>{
    if(!prodRange)return false;
    if(d.getDay()===0||d.getDay()===6)return false;
    return d>=prodRange.start&&d<=prodRange.end;
  };

  const monthGrid=useMemo(()=>{
    if(!viewMonth)return[];
    const y=viewMonth.getFullYear(),m=viewMonth.getMonth();
    const firstDay=new Date(y,m,1);
    const adj=(firstDay.getDay()+6)%7;
    const dim=new Date(y,m+1,0).getDate();
    const cells=[...Array(adj).fill(null),...Array.from({length:dim},(_,i)=>new Date(y,m,i+1))];
    return cells;
  },[viewMonth]);

  const canGoPrev=prodRange&&viewMonth&&new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1)>=new Date(prodRange.start.getFullYear(),prodRange.start.getMonth(),1);
  const canGoNext=prodRange&&viewMonth&&new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1)<=new Date(prodRange.end.getFullYear(),prodRange.end.getMonth(),1);

  return(<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd,marginTop:16}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:18,color:T.ink900,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><NavIcon name="factory" size={17}/>Désactiver des jours de Production</div>
    <div style={{fontSize:14,color:T.ink500,marginBottom:14}}>
      Cliquez sur un jour pour l'exclure de l'affichage « Production » dans le Calendrier (mode Jour) — utile pour un jour férié ponctuel ou une journée sans activité réelle.
    </div>
    <select value={selectedPj} onChange={e=>setSelectedPj(e.target.value)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:15,fontFamily:T.font,color:T.ink700,background:T.surface,marginBottom:14}}>
      <option value="">— Choisir un PJ —</option>
      {data.map(d=><option key={d.pj} value={d.pj}>{d.pj}</option>)}
    </select>
    {selectedPj&&!prodRange&&<div style={{fontSize:14,color:T.red500}}>Période de Production non définie (Arrivée/Fin de prod manquante) pour ce PJ.</div>}
    {prodRange&&viewMonth&&<div style={{maxWidth:340}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>setViewMonth(new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1))} disabled={!canGoPrev} style={{padding:"6px 12px",borderRadius:9,border:"none",background:T.surface,boxShadow:canGoPrev?T.neuOutSm:"none",color:canGoPrev?T.ink700:T.ink300,fontSize:15,cursor:canGoPrev?"pointer":"default"}}>◀</button>
        <span style={{fontWeight:700,color:T.ink900,fontSize:15}}>{MONTHS_FULL[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
        <button onClick={()=>setViewMonth(new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1))} disabled={!canGoNext} style={{padding:"6px 12px",borderRadius:9,border:"none",background:T.surface,boxShadow:canGoNext?T.neuOutSm:"none",color:canGoNext?T.ink700:T.ink300,fontSize:15,cursor:canGoNext?"pointer":"default"}}>▶</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
        {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:11,fontWeight:700,color:T.ink300}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {monthGrid.map((d,i)=>{
          if(!d)return<div key={"e"+i}/>;
          const iso=toLocalISO(d);
          const isProd=isProdDay(d);
          const isExcluded=excluded.includes(iso);
          return(<button key={iso} disabled={!isProd} onClick={()=>toggleProductionExclusion(selectedPj,iso)}
            style={{aspectRatio:"1",borderRadius:8,border:"none",fontSize:13,fontWeight:700,cursor:isProd?"pointer":"default",
              background:isExcluded?T.red500:isProd?"#215275":T.surfaceAlt,
              color:isExcluded||isProd?"#fff":T.ink300,
              opacity:isProd?1:0.5}}>
            {d.getDate()}
          </button>);
        })}
      </div>
      <div style={{display:"flex",gap:14,marginTop:12,fontSize:12,color:T.ink500}}>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:11,height:11,borderRadius:4,background:"#215275",display:"inline-block"}}/>Production active</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:11,height:11,borderRadius:4,background:T.red500,display:"inline-block"}}/>Désactivé</span>
      </div>
    </div>}
  </div>);
}