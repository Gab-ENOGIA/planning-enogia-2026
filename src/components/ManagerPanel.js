import React, { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { T } from "../theme";
import { getPjMeta, initials, GAMME_COLORS, ETAT_META, ALL_ETATS, ALL_GAMMES, MONTHS, today } from "../pjMeta";
import { fmt, toLocalISO, diffDays, weekStartOf } from "../parsers";
import { DropFilter, ImportButton, NavIcon, Select } from "./SharedUI";
import { CARD, KpiRow, EmptyNote, AvancementTab, StatutTab, KpiAvancement, DelayInsights, DelaysTab, ProductionCalendarManager } from "./ManagerParts";
import { ProjectFileManager } from "./ManagerFiche";

// Filtre de période (mois et/ou année) réutilisable sur chaque graphique temporel
export function PeriodFilter({yearsAvailable,year,setYear,month,setMonth,showMonth=true}){
  return(<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
    <div style={{width:128}}><Select compact value={year||""} onChange={e=>setYear(e.target.value?+e.target.value:null)} options={[{value:"",label:"Toutes années"},...yearsAvailable.map(y=>({value:y,label:String(y)}))]}/></div>
    {showMonth&&<div style={{width:128}}><Select compact value={month==null?"":month} onChange={e=>setMonth(e.target.value===""?null:+e.target.value)} options={[{value:"",label:"Tous les mois"},...MONTHS.map((m,i)=>({value:i,label:m}))]}/></div>}
  </div>);
}
export function ManagerPanel({data,progress,setProgress,initialData,lastInitialImport,onInitialImport,initialImporting,etatChoice,setEtatFor,saveProgress,savingProgress,progressSaved,tab,setTab,clientPresence,setClientPresenceFor,closurePeriods,setClosurePeriods,productionExclusions,setProductionExclusionDays,comments,delays,delayTypes,setDelayTypes,addDelayAllocationMulti,deleteDelayAllocation,managerEmails,setManagerEmails,currentUserEmail,authorName,buildVersion}){
  const [fEtat,setFEtat]=useState(new Set(ALL_ETATS));
  const [kpiStep,setKpiStep]=useState("depart");
  const [kpiTab,setKpiTab]=useState("synthese"); // sous-onglet KPI par famille
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

  // ── Navigation Manager : onglets horizontaux + sous-onglets par famille ──
  // « Il y a bcp de KPI… plusieurs petits onglets par famille de KPI ? » → un sous-onglet par famille.
  const GROUP_OF={fiche:"fiche",derives:"derives",avancement:"suivi",statut:"suivi",retards:"retards",acces:"reglages",vacances:"reglages",production:"reglages"};
  const TOP=[["fiche","Fiche projet","list","fiche"],["derives","KPI","chart","derives"],["suivi","Suivi","gauge","avancement"],["retards","Retards","warning","retards"],["reglages","Réglages","lock","production"]];
  const SUBS={
    derives:[["synthese","Synthèse"],["derives","Dérives"],["charge","Charge"],["avancement","Avancement"],["retards","Retards"]],
    suivi:[["avancement","Avancement"],["statut","Statut & état"]],
    reglages:[["production","Production"],["vacances","Vacances"],["acces","Accès Manager"]],
  };
  const group=GROUP_OF[tab]||"derives";
  const subItems=SUBS[group]||null;
  const subValue=group==="derives"?kpiTab:tab;
  const onSub=id=>{if(group==="derives")setKpiTab(id);else setTab(id);};
  const showFilters=tab==="derives"||tab==="avancement"||tab==="statut";
  const hasInitial=initialData.length>0;

  return(<div style={{display:"flex",flexDirection:"column",gap:14,fontFamily:T.font}}>
    {/* ── Barre d'onglets + petite tuile « planning initial » ── */}
    <div style={{display:"flex",alignItems:"flex-end",gap:18,flexWrap:"wrap",borderBottom:"1px solid "+T.line}}>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        {TOP.map(([id,l,icon,first])=>{const on=group===id;return(
          <button key={id} onClick={()=>{if(!on)setTab(first);}} style={{padding:"10px 14px",border:"none",borderBottom:"2px solid "+(on?T.teal500:"transparent"),marginBottom:-1,background:"transparent",color:on?T.teal600:T.ink500,fontWeight:on?700:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:T.font,transition:"color .15s ease"}}
            onMouseEnter={e=>{if(!on)e.currentTarget.style.color=T.ink900;}} onMouseLeave={e=>{if(!on)e.currentTarget.style.color=T.ink500;}}><NavIcon name={icon} size={15}/>{l}</button>
        );})}
      </div>
      <div style={{marginLeft:"auto",marginBottom:6,display:"flex",alignItems:"center",gap:9,padding:"4px 5px 4px 11px",border:"1px solid "+(hasInitial?T.line:T.amber500),borderRadius:10,background:hasInitial?T.card:T.amber100}}>
        <span style={{color:hasInitial?T.teal600:T.amber600,display:"inline-flex"}}><NavIcon name={hasInitial?"pin":"warning"} size={13}/></span>
        <div style={{lineHeight:1.25}}>
          <div style={{fontSize:12,fontWeight:700,color:T.ink900}}>Planning initial</div>
          <div style={{fontSize:11,color:hasInitial?T.ink500:T.amber600}}>{hasInitial?initialData.length+" unités"+(lastInitialImport?" · "+lastInitialImport:" · figé"):"non importé — dérives indisponibles"}</div>
        </div>
        <ImportButton
          iconOnly
          onImport={onInitialImport}
          busy={initialImporting}
          label="Importer planning initial"
          accent={"linear-gradient(135deg,"+T.teal500+","+T.navy700+")"}
          hasExisting={hasInitial}
          inputId="msp-file-initial"
          confirmMessage={"Un planning initial a déjà été importé"+(lastInitialImport?(" le "+lastInitialImport):"")+".\n\nCe planning sert de référence figée pour calculer les dérives — il ne devrait normalement être importé qu'une seule fois.\n\nÊtes-vous sûr de vouloir l'écraser ?"}
          helpText={<>Export Excel (.xlsx) avec colonnes <b>Nom, Début, Niveau hiérarchique</b>.<br/>Ce planning sera <b>figé</b> et servira de référence pour calculer les dérives par rapport au planning révisé.</>}
          warnText="Ce planning devient la référence figée (dates initiales) — à importer une seule fois normalement."
        />
      </div>
    </div>

    {/* ── Sous-onglets (famille de KPI, pages de suivi, réglages) + filtres ── */}
    {(subItems||showFilters)&&<div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      {subItems&&<div style={{display:"inline-flex",gap:2,padding:3,background:T.surface,border:"1px solid "+T.line,borderRadius:10}}>
        {subItems.map(([id,l])=>{const on=subValue===id;return(
          <button key={id} onClick={()=>onSub(id)} style={{padding:"5px 13px",borderRadius:8,border:"none",background:on?T.card:"transparent",boxShadow:on?T.shadowSm:"none",color:on?T.teal600:T.ink500,fontWeight:on?700:600,fontSize:13,cursor:"pointer",fontFamily:T.font,transition:"background .12s ease"}}>{l}</button>
        );})}
      </div>}
      {showFilters&&<div style={{marginLeft:subItems?"auto":0,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <DropFilter label="Statut" options={ALL_ETATS} selected={fEtat} onChange={setFEtat} getLabel={o=>ETAT_META[o]?.label||o}/>
        <DropFilter label="Gamme" options={ALL_GAMMES} selected={fGamme} onChange={setFGamme}/>
        <button onClick={()=>{setFEtat(new Set(ALL_ETATS));setFGamme(new Set(ALL_GAMMES));}} title="Réinitialiser les filtres" style={{background:"none",border:"none",padding:0,fontSize:10.5,color:T.ink300,cursor:"pointer",textDecoration:"underline",fontFamily:T.font}}>Effacer</button>
        <span style={{fontSize:12.5,color:T.ink500,fontWeight:500}}>{fd.length} unités</span>
      </div>}
    </div>}

    <div style={{minWidth:0}}>
    {tab==="derives"&&kpiTab==="synthese"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <KpiRow items={[[fd.length,"Total",T.teal500],[shipped.length,"Expédiées",T.emerald500],[inProd.length,"En production",T.amber500],[upcoming.length,"Départs < 30j",T.red500],[avgDureeProd==null?"—":avgDureeProd+"j","Durée moy. production",T.violet500]]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:14}}>
        {countByEtat.length>0&&<div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:4}}>Répartition par état</div>
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

        {countByPays.length>0&&<div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:4}}>Répartition par pays</div>
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

        <div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900}}>Explorateur libre</div>
              <div style={{fontSize:13,color:T.ink300}}>Choisissez ce que vous voulez analyser</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <div style={{width:170}}><Select compact value={exploreDim} onChange={e=>setExploreDim(e.target.value)} options={[{value:"gamme",label:"Par gamme"},{value:"etat",label:"Par état"},{value:"pays",label:"Par pays"},{value:"chef",label:"Par chef de projet"},{value:"moisDepart",label:"Par mois de départ"}]}/></div>
              <div style={{width:200}}><Select compact value={exploreMetric} onChange={e=>setExploreMetric(e.target.value)} options={[{value:"count",label:"Nombre de PJ"},{value:"drift",label:"Dérive moyenne départ"},{value:"duree",label:"Durée moyenne production"}]}/></div>
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

      <div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:10}}>Départs par mois</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:84}}>
          {byMonth.map((n,i)=>{const iC=i===today.getMonth();return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{fontSize:14,color:T.ink500,fontWeight:600}}>{n||""}</div>
            <div style={{width:"100%",height:n?(n/maxBar*60)+"px":"0",minHeight:n?4:0,background:i<today.getMonth()?T.ink100:iC?T.teal500:T.teal400,borderRadius:"3px 3px 0 0"}}/>
            <div style={{fontSize:13,color:iC?T.teal600:T.ink300,fontWeight:iC?700:500}}>{MONTHS[i]}</div>
          </div>);})}
        </div>
      </div>
      <div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:10}}>Par gamme</div>
        {Object.entries(gammeCounts).sort((a,b)=>b[1]-a[1]).map(([g,n])=>{const col=GAMME_COLORS[g]||T.ink500;return(<div key={g} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{width:78,fontSize:15,fontWeight:700,color:col,flexShrink:0}}>{g}</span>
          <div style={{flex:1,background:T.surfaceAlt,borderRadius:5,height:18,overflow:"hidden",position:"relative"}}><div style={{width:((n/Math.max(fd.length,1))*100)+"%",height:"100%",background:col}}/><span style={{position:"absolute",left:8,top:1,fontSize:14,color:"#fff",fontWeight:700,lineHeight:"16px"}}>{n}</span></div>
        </div>);})}
      </div>
      </div>
    </div>}

    {tab==="derives"&&kpiTab==="charge"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
        {fd.length>0&&<div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line,gridColumn:"1 / -1"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:4}}>Charge prévisionnelle par étape et par mois</div>
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

        {workloadByPJ.length>0&&<div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line,gridColumn:"1 / -1"}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><NavIcon name="gauge" size={17}/>Charge de travail Atelier / Autom</div>
          <div style={{fontSize:13,color:T.ink300,marginBottom:14}}>Heures de travail par PJ, issues de l'import Excel (feuille Table_affectation)</div>

          <KpiRow items={[[totalHeuresAtelier+"h","Total Atelier",T.teal500],[totalHeuresAutom+"h","Total Autom",T.violet500],[workloadByPJ.length,"PJ avec charge connue",T.ink500]]} min={150}/>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:18}}>
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
      {fd.length===0&&<EmptyNote>Aucune donnée pour la sélection.</EmptyNote>}
    </div>}

    {tab==="derives"&&kpiTab==="derives"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!hasInitial&&<div style={{background:T.amber100,color:T.amber600,borderRadius:12,padding:"16px 18px",fontSize:14,display:"flex",alignItems:"center",gap:10}}><NavIcon name="warning" size={16}/>Aucun planning initial importé — les dérives ne peuvent pas être calculées. Utilisez le menu ⋯ de la tuile « Planning initial » en haut à droite.</div>}
      {initialData.length>0&&<>
          <KpiRow items={[[avgDelay==null?"—":(avgDelay>0?"+":"")+avgDelay+"j","Retard moyen départ",avgDelay>0?T.red500:T.emerald500],[lateCount,"PJ en retard",T.red500],[onTimeOrEarlyCount,"PJ à l'heure / en avance",T.emerald500],[onTimeRate==null?"—":onTimeRate+"%","Taux de respect délais",onTimeRate>=70?T.emerald500:onTimeRate>=40?T.amber500:T.red500],[comparable.length,"PJ comparables",T.ink500]]}/>

        <div style={{background:T.card,borderRadius:14,padding:"18px 20px",border:"1px solid "+T.line}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:2}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:17,color:T.ink900,display:"flex",alignItems:"center",gap:9}}><NavIcon name="chart" size={19}/>Vue CODIR — Promesse vs Réalité</div>
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
          <KpiRow items={[[totalDelayDays+"j","Retard cumulé généré ("+STEP_LABELS[kpiStep]+")",T.red500],[totalGainDays+"j","Avance cumulée gagnée",T.emerald500],[reliabilityRate==null?"—":reliabilityRate+"%","PJ tenus à la date promise",T.teal500],[dureeCompare.ecart==null?"—":(dureeCompare.ecart>0?"+":"")+dureeCompare.ecart+"j","Écart durée moy. production",dureeCompare.ecart>0?T.red500:T.emerald500]]} min={170}/>

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

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:18}}>
          {driftByGamme.length>0&&<div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line}}>
            <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:4}}>Dérive moyenne par gamme</div>
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

          {driftByMilestone.some(d=>d.moyenne!=null)&&<div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line}}>
            <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:4}}>Dérive moyenne par jalon</div>
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

          {comparable.length>0&&<div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:4}}>Dérive moyenne par mois de départ</div>
                <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Périodes où les retards sont les plus fréquents — la situation s'améliore-t-elle dans le temps ?</div>
              </div>
              <div style={{width:128}}><Select compact value={driftMoisYear||""} onChange={e=>setDriftMoisYear(e.target.value?+e.target.value:null)} options={[{value:"",label:"Toutes années"},...yearsInData.map(y=>({value:y,label:String(y)}))]}/></div>
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

        {worstDrifts.length>0&&<div style={{background:T.card,borderRadius:12,padding:14,border:"1px solid "+T.line,maxWidth:520}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:8}}>Top 5 dérives — {STEP_LABELS[kpiStep]} (vs planning initial)</div>
          {worstDrifts.map(r=>{const d=r[kpiStep].delta;const c=d>0?T.red500:d<0?T.emerald500:T.ink500;return(
            <div key={r.pj} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+T.surface}}>
              <span style={{fontWeight:700,color:T.teal600,fontSize:14,minWidth:85}}>{r.pj}</span>
              <span style={{color:T.ink300,fontSize:12,minWidth:50}}>{r.gamme}</span>
              <span style={{fontSize:13,color:T.ink500}}>{fmt(r[kpiStep].ini?new Date(r[kpiStep].ini):null)} → {fmt(r[kpiStep].rev?new Date(r[kpiStep].rev):null)}</span>
              <span style={{marginLeft:"auto",fontWeight:800,fontSize:15,color:c}}>{d>0?"+":""}{d}j</span>
            </div>
          );})}
        </div>}

        <div style={{background:T.card,borderRadius:12,padding:0,border:"1px solid "+T.line,overflow:"auto"}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,padding:"16px 16px 0"}}>Détail par PJ — Initial vs Révisé</div>
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
    </div>}

    {tab==="derives"&&kpiTab==="avancement"&&<KpiAvancement rows={fd} progress={progress}/>}
    {tab==="derives"&&kpiTab==="retards"&&<DelayInsights delays={delays} delayTypes={delayTypes}/>}

    {tab==="avancement"&&<AvancementTab rows={fd} progress={progress} setProgress={setProgress} saveProgress={saveProgress} savingProgress={savingProgress} progressSaved={progressSaved}/>}
    {tab==="statut"&&<StatutTab rows={fd} etatChoice={etatChoice} setEtatFor={setEtatFor} clientPresence={clientPresence} setClientPresenceFor={setClientPresenceFor}/>}
    {tab==="fiche"&&<ProjectFileManager data={data} initialData={initialData} comments={comments} delays={delays} progress={progress}/>}
    {tab==="retards"&&<DelaysTab data={data} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypes} addDelayAllocationMulti={addDelayAllocationMulti} deleteDelayAllocation={deleteDelayAllocation} authorName={authorName}/>}
    {tab==="acces"&&<>
      <ManagerAccessManager managerEmails={managerEmails} setManagerEmails={setManagerEmails} currentUserEmail={currentUserEmail}/>
      {/* Nom du build : réservé au propriétaire (demandé : « uniquement visible par moi, dans l'onglet manager »). */}
      {buildVersion&&<div style={{...CARD,padding:"10px 14px",marginTop:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em"}}>Version du site</span>
        <span style={{fontFamily:"monospace",fontSize:12.5,fontWeight:600,color:T.ink700,background:T.ink100,borderRadius:7,padding:"3px 10px"}}>build {buildVersion}</span>
      </div>}
    </>}
    {tab==="vacances"&&<ClosurePeriodsManager closurePeriods={closurePeriods} setClosurePeriods={setClosurePeriods}/>}
    {tab==="production"&&<ProductionCalendarManager data={data} productionExclusions={productionExclusions} setProductionExclusionDays={setProductionExclusionDays}/>}
    </div>
  </div>);
}

// ── Liste des emails autorisés à l'espace Manager : accès automatique sans PIN pour ces comptes ──
function ManagerAccessManager({managerEmails,setManagerEmails,currentUserEmail}){
  const [newEmail,setNewEmail]=useState("");
  const [err,setErr]=useState("");

  const addEmail=()=>{
    const v=newEmail.trim().toLowerCase();
    if(!v)return;
    if(!v.endsWith("@enogia.com")){setErr("L'email doit être une adresse @enogia.com.");return;}
    if(managerEmails.includes(v)){setErr("Cet email est déjà dans la liste.");return;}
    setErr("");
    setManagerEmails([...managerEmails,v]);
    setNewEmail("");
  };
  const removeEmail=email=>{
    setManagerEmails(managerEmails.filter(e=>e!==email));
  };

  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{background:T.card,borderRadius:12,padding:18,border:"1px solid "+T.line}}>
      <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:4}}>Accès automatique à l'espace Manager</div>
      <div style={{fontSize:13.5,color:T.ink500,marginBottom:14,lineHeight:1.5}}>
        Les comptes Google listés ci-dessous entrent directement dans l'espace Manager après connexion, sans avoir besoin du code PIN. Le code PIN reste utilisable en secours pour tout le monde.
      </div>

      {managerEmails.length===0&&<div style={{background:T.amber100,color:T.amber600,borderRadius:9,padding:"10px 14px",fontSize:13.5,marginBottom:14}}>
        Aucun email enregistré pour l'instant — tout le monde doit encore utiliser le code PIN pour accéder au Manager.
      </div>}

      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        {managerEmails.map(email=>(
          <div key={email} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:T.surface,borderRadius:9,padding:"9px 14px"}}>
            <span style={{fontSize:14,color:T.ink700,fontWeight:600}}>{email}{email===currentUserEmail&&<span style={{marginLeft:8,fontSize:11.5,color:T.teal600,background:T.teal100,borderRadius:5,padding:"1px 7px",fontWeight:700}}>vous</span>}</span>
            <button onClick={()=>removeEmail(email)} title="Retirer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:15,padding:0}}>✕</button>
          </div>
        ))}
        {managerEmails.length===0&&<div style={{color:T.ink300,fontSize:14,textAlign:"center",padding:"10px 0"}}>Aucun email pour l'instant.</div>}
      </div>

      <div style={{display:"flex",gap:8}}>
        <input type="email" value={newEmail} onChange={e=>{setNewEmail(e.target.value);setErr("");}} onKeyDown={e=>{if(e.key==="Enter")addEmail();}}
          placeholder="prenom.nom@enogia.com" style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:14,fontFamily:T.font,color:T.ink700}}/>
        <button onClick={addEmail} disabled={!newEmail.trim()} style={{padding:"8px 18px",borderRadius:8,border:"none",background:newEmail.trim()?T.teal500:T.surfaceAlt,color:newEmail.trim()?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:newEmail.trim()?"pointer":"default",whiteSpace:"nowrap"}}>Ajouter</button>
      </div>
      {err&&<div style={{fontSize:13,color:T.red500,marginTop:8}}>{err}</div>}
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
  return(<div style={{background:T.card,borderRadius:14,padding:20,border:"1px solid "+T.line,marginTop:16}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><NavIcon name="sun" size={17}/>Périodes de fermeture (vacances)</div>
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
