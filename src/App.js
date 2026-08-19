import React, { useState, useMemo, useCallback, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import "./styles.css";

import { T, setThemeMode } from "./theme";
import { getPjMeta, ALL_GAMMES, ALL_ETATS, MONTHS, today, setSyncedPjMeta, GAMME_OVERRIDE } from "./pjMeta";
import { weekStartOf, fetchSuiviORC } from "./parsers";
import { ImportButton, PinGate, PIN, NavIcon } from "./components/SharedUI";
import { GanttView } from "./components/GanttView";
import { ProjectModal } from "./components/ProjectModal";
import { CommentsView } from "./components/CommentsView";
import { TableView } from "./components/TableView";
import { CalendarView } from "./components/CalendarView";
import { ManagerPanel } from "./components/ManagerPanel";

const DOC_REF=()=>doc(db,"planning","current");
const INITIAL_DOC_REF=()=>doc(db,"planning","initial");
const OVERRIDES_DOC_REF=()=>doc(db,"planning","overrides");
const COMMENTS_DOC_REF=()=>doc(db,"planning","comments");
const PJ_META_SYNC_DOC_REF=()=>doc(db,"planning","pjMetaSync");
const DELAYS_DOC_REF=()=>doc(db,"planning","delays");
const DELAY_TYPES_DOC_REF=()=>doc(db,"planning","delayTypes");

// Types de retard génériques par défaut — éditables depuis le panel Manager (onglet Retards)
const DEFAULT_DELAY_TYPES=[
  "Retard paiement FNR","NC FNR","NC interne","Retard fournisseur",
  "Aléas planning client","Retard études","Manque de main d'œuvre","Autre",
];

const APP_BUILD_VERSION="2026-08-19-v29-manager-privacy-fiche-retards";
console.log("🔵 planning-enogia-2026 build:",APP_BUILD_VERSION);

export default function App(){
  const [darkMode,setDarkMode]=useState(()=>{
    try{return localStorage.getItem("enogia_darkMode")==="1";}catch(e){return false;}
  });
  setThemeMode(darkMode); // mute T en place avant que quoi que ce soit ne le lise pendant ce rendu
  useEffect(()=>{
    try{localStorage.setItem("enogia_darkMode",darkMode?"1":"0");}catch(e){}
  },[darkMode]);

  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [importing,setImporting]=useState(false);
  const [lastImport,setLastImport]=useState(null);
  const [docIndice,setDocIndice]=useState("");
  const [initialData,setInitialData]=useState([]);
  const [initialImporting,setInitialImporting]=useState(false);
  const [lastInitialImport,setLastInitialImport]=useState(null);
  const [view,setView]=useState("table");
  // Format du calendrier (mode semaine/jour, position, zoom) persisté en localStorage :
  // reste identique quand on quitte/revient sur l'onglet Calendrier, et même après rechargement de la page.
  const [calMode,setCalMode]=useState(()=>{
    try{return localStorage.getItem("enogia_calMode")||"week";}catch(e){return"week";}
  });
  const [calAnchor,setCalAnchor]=useState(()=>{
    try{const s=localStorage.getItem("enogia_calAnchor");if(s)return new Date(s);}catch(e){}
    return weekStartOf(today);
  });
  const [calDayAnchor,setCalDayAnchor]=useState(()=>{
    try{const s=localStorage.getItem("enogia_calDayAnchor");if(s)return new Date(s);}catch(e){}
    const d=new Date(today);d.setHours(0,0,0,0);return d;
  });
  const [calZoom,setCalZoom]=useState(()=>{
    try{const s=localStorage.getItem("enogia_calZoom");if(s!=null)return parseInt(s,10);}catch(e){}
    return 1;
  });
  useEffect(()=>{
    try{
      localStorage.setItem("enogia_calMode",calMode);
      localStorage.setItem("enogia_calAnchor",calAnchor.toISOString());
      localStorage.setItem("enogia_calDayAnchor",calDayAnchor.toISOString());
      localStorage.setItem("enogia_calZoom",String(calZoom));
    }catch(e){}
  },[calMode,calAnchor,calDayAnchor,calZoom]);
  const [managerTab,setManagerTab]=useState("derives");
  const [selEtats,setSelEtats]=useState(new Set(ALL_ETATS));
  const [selGammes,setSelGammes]=useState(new Set(ALL_GAMMES));
  const [selMoisArrivee,setSelMoisArrivee]=useState(new Set(MONTHS));
  const [selMoisTests,setSelMoisTests]=useState(new Set(MONTHS));
  const [selMoisFinProd,setSelMoisFinProd]=useState(new Set(MONTHS));
  const [selMoisDepart,setSelMoisDepart]=useState(new Set(MONTHS));
  const [selPJs,setSelPJs]=useState(null);
  const [selProjets,setSelProjets]=useState(null);
  const [selPays,setSelPays]=useState(null);
  const [selChefs,setSelChefs]=useState(null);
  const [df,setDf]=useState("date");
  const [pinOk,setPinOk]=useState(false);
  const [progress,setProgress]=useState({});
  const [calSel,setCalSel]=useState(null);
  const [etatChoice,setEtatChoice]=useState({});
  const [clientPresence,setClientPresence]=useState({});
  const [closurePeriods,setClosurePeriods]=useState([]);
  const [productionExclusions,setProductionExclusions]=useState({});
  const [comments,setComments]=useState({});
  const [delays,setDelays]=useState({});
  const [delayTypes,setDelayTypes]=useState(DEFAULT_DELAY_TYPES);
  const [tableJumpPj,setTableJumpPj]=useState(null);
  const jumpToPj=useCallback(pj=>{setView("table");setTableJumpPj(pj);},[]);

  // Lecture temps réel depuis Firestore
  useEffect(()=>{
    const unsub = onSnapshot(DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setData(d.rows || []);
        setLastImport(d.lastImport || null);
        setDocIndice(d.indice || "");
      }
      setLoading(false);
    }, (err)=>{
      console.error("Erreur Firestore:", err);
      setLoading(false);
    });
    return ()=>unsub();
  },[]);

  // Lecture temps réel du planning initial (figé, Manager uniquement)
  useEffect(()=>{
    const unsub = onSnapshot(INITIAL_DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setInitialData(d.rows || []);
        setLastInitialImport(d.lastImport || null);
      }
    }, (err)=>{
      console.error("Erreur Firestore (initial):", err);
    });
    return ()=>unsub();
  },[]);

  // Lecture temps réel des états choisis manuellement par le Manager (pas de calcul automatique)
  useEffect(()=>{
    const unsub = onSnapshot(OVERRIDES_DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setEtatChoice(d.etatChoice || {});
        setProgress(d.progress || {});
        setClientPresence(d.clientPresence || {});
        setClosurePeriods(d.closurePeriods || []);
        setProductionExclusions(d.productionExclusions || {});
      }
    }, (err)=>{
      console.error("Erreur Firestore (overrides):", err);
    });
    return ()=>unsub();
  },[]);

  const setClosurePeriodsAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { closurePeriods:next }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  },[]);

  const toggleProductionExclusion=useCallback(async (pj,dateIso)=>{
    const current=productionExclusions[pj]||[];
    const next=current.includes(dateIso)?current.filter(d=>d!==dateIso):[...current,dateIso];
    const nextAll={...productionExclusions,[pj]:next};
    try{
      await setDoc(OVERRIDES_DOC_REF(), { productionExclusions:nextAll }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  },[productionExclusions]);

  // Lecture temps réel des commentaires par PJ
  useEffect(()=>{
    const unsub = onSnapshot(COMMENTS_DOC_REF(), (snap)=>{
      if(snap.exists())setComments(snap.data().byPj || {});
    }, (err)=>{
      console.error("Erreur Firestore (comments):", err);
    });
    return ()=>unsub();
  },[]);

  // Lecture temps réel du cache de synchro "Suivi ORC" (noms / pays / chefs de projet), partagé pour tous les utilisateurs
  const [pjMetaSyncInfo,setPjMetaSyncInfo]=useState(null); // {lastSync, count}
  useEffect(()=>{
    const unsub = onSnapshot(PJ_META_SYNC_DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d=snap.data();
        setSyncedPjMeta(d.meta||{});
        setPjMetaSyncInfo({lastSync:d.lastSync||null,count:Object.keys(d.meta||{}).length});
      }
    }, (err)=>{
      console.error("Erreur Firestore (pjMetaSync):", err);
    });
    return ()=>unsub();
  },[]);
  const [syncingORC,setSyncingORC]=useState(false);
  const [syncORCError,setSyncORCError]=useState("");
  const syncFromSuiviORC=useCallback(async ()=>{
    setSyncingORC(true);setSyncORCError("");
    try{
      const{meta,count}=await fetchSuiviORC();
      const lastSync=new Date().toLocaleString("fr-FR");
      await setDoc(PJ_META_SYNC_DOC_REF(), { meta, lastSync, count });
      // SYNCED_PJ_META et pjMetaSyncInfo seront mis à jour automatiquement via onSnapshot ci-dessus
    }catch(e){
      console.error(e);
      setSyncORCError(e.message||"Erreur inconnue lors de la synchronisation.");
    }
    setSyncingORC(false);
  },[]);

  const addComment=useCallback(async (pj,author,text,linkedDate,isPrivate)=>{
    if(!author.trim()||!text.trim())return false;
    const current=comments[pj]||[];
    const next=[...current,{author:author.trim(),text:text.trim(),date:new Date().toISOString(),linkedDate:linkedDate||null,private:!!isPrivate}];
    const nextAll={...comments,[pj]:next};
    try{
      await setDoc(COMMENTS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[comments]);

  // Ajoute le même commentaire à plusieurs PJ à la fois (ex. décalage affectant toute une ligne de projets)
  const addCommentMulti=useCallback(async (pjList,author,text,linkedDate,isPrivate)=>{
    if(!author.trim()||!text.trim()||!pjList||pjList.length===0)return false;
    const groupId=pjList.length>1?(Date.now()+"-"+Math.random().toString(36).slice(2,7)):null;
    const nextAll={...comments};
    pjList.forEach(pj=>{
      const current=nextAll[pj]||comments[pj]||[];
      nextAll[pj]=[...current,{author:author.trim(),text:text.trim(),date:new Date().toISOString(),linkedDate:linkedDate||null,private:!!isPrivate,groupId,groupPjs:pjList.length>1?pjList:undefined}];
    });
    try{
      await setDoc(COMMENTS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[comments]);

  const deleteComment=useCallback(async (pj,index,pin)=>{
    if(pin!==PIN){alert("Code incorrect.");return false;}
    const current=comments[pj]||[];
    const next=current.filter((_,i)=>i!==index);
    const nextAll={...comments,[pj]:next};
    try{
      await setDoc(COMMENTS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de la suppression : " + e.message);
      return false;
    }
  },[comments]);

  // Lecture temps réel des allocations de retard par PJ
  useEffect(()=>{
    const unsub = onSnapshot(DELAYS_DOC_REF(), (snap)=>{
      if(snap.exists())setDelays(snap.data().byPj || {});
    }, (err)=>{
      console.error("Erreur Firestore (delays):", err);
    });
    return ()=>unsub();
  },[]);

  // Lecture temps réel des types de retard génériques (configurables par le Manager)
  useEffect(()=>{
    const unsub = onSnapshot(DELAY_TYPES_DOC_REF(), (snap)=>{
      if(snap.exists()&&Array.isArray(snap.data().types)&&snap.data().types.length>0){
        setDelayTypes(snap.data().types);
      }
    }, (err)=>{
      console.error("Erreur Firestore (delayTypes):", err);
    });
    return ()=>unsub();
  },[]);

  const addDelayAllocation=useCallback(async (pj,type,days,note,author)=>{
    if(!type||!days||isNaN(days))return false;
    const current=delays[pj]||[];
    const entry={id:Date.now()+"-"+Math.random().toString(36).slice(2,7),type,days:Math.round(Number(days)),note:(note||"").trim(),author:(author||"").trim(),date:new Date().toISOString()};
    const nextAll={...delays,[pj]:[...current,entry]};
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement du retard : " + e.message);
      return false;
    }
  },[delays]);

  const deleteDelayAllocation=useCallback(async (pj,id,pin)=>{
    if(pin!==PIN){alert("Code incorrect.");return false;}
    const current=delays[pj]||[];
    const next=current.filter(d=>d.id!==id);
    const nextAll={...delays,[pj]:next};
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de la suppression : " + e.message);
      return false;
    }
  },[delays]);

  const setDelayTypesAndSave=useCallback(async next=>{
    try{
      await setDoc(DELAY_TYPES_DOC_REF(), { types:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement des types de retard : " + e.message);
      return false;
    }
  },[]);

  const setClientPresenceFor=useCallback(async (pj,value)=>{
    const next={...clientPresence,[pj]:value};
    try{
      await setDoc(OVERRIDES_DOC_REF(), { clientPresence:next }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  },[clientPresence]);

  const setEtatFor=useCallback(async (pj,etat)=>{
    const next={...etatChoice,[pj]:etat};
    try{
      await setDoc(OVERRIDES_DOC_REF(), { etatChoice:next }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  },[etatChoice]);

  const [savingProgress,setSavingProgress]=useState(false);
  const [progressSaved,setProgressSaved]=useState(false);
  const saveProgress=useCallback(async ()=>{
    setSavingProgress(true);
    try{
      await setDoc(OVERRIDES_DOC_REF(), { progress }, { merge:true });
      setProgressSaved(true);
      setTimeout(()=>setProgressSaved(false),2500);
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
    setSavingProgress(false);
  },[progress]);

  const handleImport=useCallback(async (rows,indice)=>{
    setImporting(true);
    try{
      const lastImportStr=new Date().toLocaleString("fr-FR");
      await setDoc(DOC_REF(), { rows, lastImport: lastImportStr, indice: indice||"" });
      setSelPJs(rows.length?new Set(rows.map(r=>r.pj)):null);
      // Pas besoin de setData ici : onSnapshot va le faire automatiquement pour tout le monde
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
    setImporting(false);
  },[]);

  const handleInitialImport=useCallback(async rows=>{
    setInitialImporting(true);
    try{
      const lastImportStr=new Date().toLocaleString("fr-FR");
      await setDoc(INITIAL_DOC_REF(), { rows, lastImport: lastImportStr });
      // Pas besoin de setInitialData ici : onSnapshot va le faire automatiquement
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement du planning initial : " + e.message);
    }
    setInitialImporting(false);
  },[]);

  const allPJs=useMemo(()=>[...new Set(data.map(r=>r.pj))].sort(),[data]);
  const allProjets=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj,r).nomProjet))].sort(),[data]);
  const allPays=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj,r).pays))].sort(),[data]);
  const allChefs=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj,r).chefProjet))].sort(),[data]);

  // L'état affiché vient exclusivement du choix manuel du Manager (etatChoice), sinon "À définir"
  const initialByPj=useMemo(()=>{const m={};initialData.forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const dataWithOverrides=useMemo(()=>data.map(r=>{
    const ini=initialByPj[r.pj];
    let drift=null;
    if(ini&&ini.depart&&r.depart){
      drift=Math.round((new Date(r.depart)-new Date(ini.depart))/86400000);
    }
    return{...r,etat:etatChoice[r.pj]||r.etat||"A_DEFINIR",clientPresence:clientPresence[r.pj]||null,drift,gamme:GAMME_OVERRIDE[r.pj]||r.gamme};
  }),[data,etatChoice,clientPresence,initialByPj]);

  const filtered=useMemo(()=>dataWithOverrides.filter(r=>{
    if(!selEtats.has(r.etat))return false;
    if(!selGammes.has(r.gamme))return false;
    if(selPJs&&!selPJs.has(r.pj))return false;
    const meta=getPjMeta(r.pj,r);
    if(selProjets&&!selProjets.has(meta.nomProjet))return false;
    if(selPays&&!selPays.has(meta.pays))return false;
    if(selChefs&&!selChefs.has(meta.chefProjet))return false;
    if(selMoisArrivee.size<MONTHS.length){const m=r.arrivee?MONTHS[new Date(r.arrivee).getMonth()]:null;if(!m||!selMoisArrivee.has(m))return false;}
    if(selMoisTests.size<MONTHS.length){const m=r.tests?MONTHS[new Date(r.tests).getMonth()]:null;if(!m||!selMoisTests.has(m))return false;}
    if(selMoisFinProd.size<MONTHS.length){const m=r.finProd?MONTHS[new Date(r.finProd).getMonth()]:null;if(!m||!selMoisFinProd.has(m))return false;}
    if(selMoisDepart.size<MONTHS.length){const m=r.depart?MONTHS[new Date(r.depart).getMonth()]:null;if(!m||!selMoisDepart.has(m))return false;}
    return true;
  }),[dataWithOverrides,selEtats,selGammes,selPJs,allPJs,selProjets,allProjets,selPays,allPays,selChefs,allChefs,selMoisArrivee,selMoisTests,selMoisFinProd,selMoisDepart]);

  const VIEWS=[{id:"table",icon:"list",l:"Liste"},{id:"gantt",icon:"gantt",l:"Gantt"},{id:"calendar",icon:"calendar",l:"Calendrier"},{id:"comments",icon:"comments",l:"Commentaires"}];

  const heroStats=useMemo(()=>{
    const total=dataWithOverrides.length;
    const enProd=dataWithOverrides.filter(r=>["PROD","En fabrication"].includes(r.etat)).length;
    const shipped=dataWithOverrides.filter(r=>r.etat==="SHIPPED").length;
    const late=dataWithOverrides.filter(r=>r.drift!=null&&r.drift>0).length;
    return{total,enProd,shipped,late};
  },[dataWithOverrides]);

  return(<div className="enogia-fade-in" style={{fontFamily:T.font,fontSize:17,background:T.surface,minHeight:"100vh",padding:20,color:T.ink900}}>
    <style>{"*{box-sizing:border-box;}"}</style>
    <div style={{position:"relative",backgroundColor:T.navy900,backgroundImage:"radial-gradient(ellipse 500px 300px at 12% 10%, rgba(79,178,196,.32), transparent 60%), radial-gradient(ellipse 650px 450px at 90% 100%, rgba(35,148,168,.38), transparent 65%), linear-gradient(165deg,"+T.navy900+" 0%,"+T.navy800+" 55%,"+T.navy700+" 100%)",borderRadius:18,marginBottom:24,color:"#fff",overflow:"hidden",boxShadow:"0 18px 40px -12px rgba(12,36,54,.55)"}}>
      {(loading||data.length===0)&&<div style={{position:"absolute",left:0,right:0,bottom:0,height:2,background:T.thermalGradient}}/>}

      <div style={{padding:(!loading&&data.length>0)?"24px 30px 16px":"24px 30px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <img src={process.env.PUBLIC_URL+"/enogia-logo-white.svg"} alt="ENOGIA" width="150" height="54" style={{height:44,width:"auto",objectFit:"contain",flexShrink:0,imageRendering:"auto"}}/>
        <div style={{width:1,height:26,background:"rgba(255,255,255,.2)"}}/>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:26,letterSpacing:".02em",textTransform:"uppercase",color:"#fff"}}>Planning Ordonnancement</div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <span style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:500,fontFamily:T.fontMono}}>{loading?"Chargement...":data.length+" unités"+(lastImport?" · Import "+lastImport:"")}</span>
          {docIndice&&<span style={{background:"rgba(255,255,255,.12)",color:"#fff",borderRadius:6,padding:"2px 10px",fontSize:12.5,fontWeight:600,fontFamily:T.fontMono}}>Indice {docIndice}</span>}
          <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Passer en mode clair":"Passer en mode sombre"} style={{position:"relative",width:50,height:27,borderRadius:14,border:"none",cursor:"pointer",background:"rgba(255,255,255,.1)",boxShadow:"inset 2px 2px 5px rgba(0,0,0,.35), inset -1px -1px 3px rgba(255,255,255,.06)",transition:"background .2s ease",flexShrink:0}}>
            <span style={{position:"absolute",top:2.5,left:darkMode?25:2.5,width:22,height:22,borderRadius:"50%",background:"linear-gradient(145deg,#fdfdfd,#dfe4e7)",boxShadow:"2px 2px 5px rgba(0,0,0,.4), -1px -1px 2px rgba(255,255,255,.6)",display:"flex",alignItems:"center",justifyContent:"center",color:darkMode?T.navy700:T.amber500,transition:"left .22s cubic-bezier(.4,0,.2,1)"}}>
              <NavIcon name={darkMode?"moon":"sunSm"} size={12.5}/>
            </span>
          </button>
          <ImportButton
            onImport={handleImport}
            busy={importing}
            hasExisting={data.length>0}
            confirmMessage={"Un planning révisé a déjà été importé"+(lastImport?(" le "+lastImport):"")+" ("+data.length+" unités).\n\nCet import va remplacer les données pour tous les visiteurs du site.\n\nÊtes-vous sûr de vouloir continuer ?"}
          />
        </div>
      </div>

      {!loading&&data.length>0&&<div style={{padding:"0 30px 18px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:2,background:"rgba(255,255,255,.08)",border:"none",borderRadius:12,padding:4,backdropFilter:"blur(6px)",boxShadow:"inset 0 1px 4px rgba(0,0,0,.22)"}}>
          {VIEWS.map(v=><button key={v.id} onClick={()=>setView(v.id)} style={{padding:"8px 17px",borderRadius:8,border:"none",cursor:"pointer",fontSize:15.5,fontWeight:700,display:"flex",alignItems:"center",gap:7,background:view===v.id?"#fff":"transparent",color:view===v.id?T.navy800:"rgba(255,255,255,.8)",transition:"background .15s ease, color .15s ease"}}
            onMouseEnter={e=>{if(view!==v.id)e.currentTarget.style.background="rgba(255,255,255,.1)";}}
            onMouseLeave={e=>{if(view!==v.id)e.currentTarget.style.background="transparent";}}><NavIcon name={v.icon}/>{v.l}</button>)}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12.5,color:"rgba(255,255,255,.55)",fontWeight:600,textTransform:"uppercase",letterSpacing:".04em"}}>Dates</span>
            <div style={{display:"flex",gap:2,background:"rgba(255,255,255,.08)",border:"none",borderRadius:10,padding:3,boxShadow:"inset 0 1px 3px rgba(0,0,0,.2)"}}>
              {[["date","Jours"],["semaine","Semaines"],["mois","Mois"]].map(([k,l])=><button key={k} onClick={()=>setDf(k)} style={{padding:"5px 12px",borderRadius:6,border:"none",background:df===k?"#fff":"transparent",color:df===k?T.navy800:"rgba(255,255,255,.8)",fontSize:13.5,fontWeight:700,cursor:"pointer",transition:"background .15s ease, color .15s ease"}}
                onMouseEnter={e=>{if(df!==k)e.currentTarget.style.background="rgba(255,255,255,.1)";}}
                onMouseLeave={e=>{if(df!==k)e.currentTarget.style.background="transparent";}}>{l}</button>)}
            </div>
          </div>
          <button onClick={()=>setView("manager")} style={{padding:"8px 16px",borderRadius:10,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,display:"flex",alignItems:"center",gap:7,background:view==="manager"?"#fff":"rgba(255,255,255,.08)",color:view==="manager"?T.navy800:"rgba(255,255,255,.85)",boxShadow:view==="manager"?"0 2px 8px rgba(0,0,0,.25)":"inset 0 1px 3px rgba(0,0,0,.2)",transition:"background .18s ease, box-shadow .18s ease"}}><NavIcon name="lock" size={15}/>Manager</button>
        </div>
      </div>}
    </div>

    {!loading&&data.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:24}}>
      {[
        {label:"Unités au planning",value:heroStats.total,accent:T.teal600,icon:"layers"},
        {label:"En production",value:heroStats.enProd,accent:T.violet600,icon:"gauge"},
        {label:"Expédiées",value:heroStats.shipped,accent:T.emerald600,icon:"check"},
      ].map((s,i)=>(
        <div key={i} style={{background:T.surface,borderRadius:14,padding:"16px 18px",border:"none",boxShadow:T.neuOutSm,position:"relative",display:"flex",alignItems:"center",gap:13,transition:"box-shadow .18s ease, transform .18s ease"}}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow=T.neuOut;e.currentTarget.style.transform="translateY(-2px)";}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow=T.neuOutSm;e.currentTarget.style.transform="none";}}>
          <div style={{width:34,height:34,borderRadius:9,background:s.accent+"14",color:s.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><NavIcon name={s.icon} size={17}/></div>
          <div>
            <div style={{fontFamily:T.fontMono,fontWeight:600,fontSize:23,color:T.ink900,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:12.5,color:T.ink500,fontWeight:600,marginTop:3}}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>}


    {loading?<div style={{textAlign:"center",padding:80,color:T.ink500}}>
      <div style={{width:44,height:44,margin:"0 auto 18px",borderRadius:"50%",border:"3px solid "+T.line,borderTopColor:T.teal500,animation:"enogiaSpin .8s linear infinite"}}/>
      <div style={{fontSize:18,fontFamily:T.fontMono}}>Connexion à la base de données…</div>
    </div>:
    data.length===0?(
      <div className="enogia-float-in" style={{background:T.surface,borderRadius:16,padding:56,textAlign:"center",border:"none",boxShadow:T.neuOut}}>
        <div style={{width:56,height:56,margin:"0 auto 18px",borderRadius:14,background:T.surface,boxShadow:T.neuInSm,color:T.teal600,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon name="inbox" size={26}/></div>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,color:T.ink900,marginBottom:8,fontSize:20}}>Aucune donnée pour l'instant</div>
        <div style={{color:T.ink500,fontSize:16,marginBottom:20,maxWidth:420,marginLeft:"auto",marginRight:"auto"}}>Importe un planning MS Project pour faire apparaître les projets ici.</div>
      </div>
    ):(
      <>
        {view==="manager"?(pinOk?
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontFamily:T.fontDisplay,fontWeight:700,color:T.ink900,fontSize:21}}>🔓 Espace Manager</span>
              <button onClick={()=>setPinOk(false)} style={{padding:"7px 15px",borderRadius:10,border:"none",background:T.surface,boxShadow:T.neuOutSm,fontSize:15,cursor:"pointer",color:T.ink700,fontWeight:600}}>Verrouiller</button>
            </div>
            <ManagerPanel data={dataWithOverrides} progress={progress} setProgress={setProgress} initialData={initialData} lastInitialImport={lastInitialImport} onInitialImport={handleInitialImport} initialImporting={initialImporting}
              etatChoice={etatChoice} setEtatFor={setEtatFor} saveProgress={saveProgress} savingProgress={savingProgress} progressSaved={progressSaved}
              tab={managerTab} setTab={setManagerTab} clientPresence={clientPresence} setClientPresenceFor={setClientPresenceFor}
              closurePeriods={closurePeriods} setClosurePeriods={setClosurePeriodsAndSave}
              productionExclusions={productionExclusions} toggleProductionExclusion={toggleProductionExclusion}
              pjMetaSyncInfo={pjMetaSyncInfo} syncingORC={syncingORC} syncORCError={syncORCError} syncFromSuiviORC={syncFromSuiviORC}
              comments={comments} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypesAndSave}/>
          </div>
          :<PinGate onUnlock={()=>setPinOk(true)}/>)
        :(
          <div key={view} className="enogia-float-in">
            {view==="table"&&<TableView data={filtered} progress={progress} df={df}
              selEtats={selEtats} setSelEtats={setSelEtats}
              selGammes={selGammes} setSelGammes={setSelGammes}
              allPJs={allPJs} selPJs={selPJs} setSelPJs={setSelPJs}
              allProjets={allProjets} selProjets={selProjets} setSelProjets={setSelProjets}
              allPays={allPays} selPays={selPays} setSelPays={setSelPays}
              allChefs={allChefs} selChefs={selChefs} setSelChefs={setSelChefs}
              selMoisArrivee={selMoisArrivee} setSelMoisArrivee={setSelMoisArrivee}
              selMoisTests={selMoisTests} setSelMoisTests={setSelMoisTests}
              selMoisFinProd={selMoisFinProd} setSelMoisFinProd={setSelMoisFinProd}
              selMoisDepart={selMoisDepart} setSelMoisDepart={setSelMoisDepart}
              comments={comments} addComment={addComment} deleteComment={deleteComment}
              pinOk={pinOk} delays={delays} delayTypes={delayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
              externalSel={tableJumpPj} setExternalSel={setTableJumpPj}/>}
            {view==="gantt"&&<GanttView data={filtered} progress={progress} df={df}/>}
            {view==="calendar"&&<CalendarView data={filtered} onSelectPj={setCalSel}
              mode={calMode} setMode={setCalMode} anchor={calAnchor} setAnchor={setCalAnchor}
              dayAnchor={calDayAnchor} setDayAnchor={setCalDayAnchor} closurePeriods={closurePeriods}
              productionExclusions={productionExclusions} comments={comments} addComment={addComment}
              zoomLevel={calZoom} setZoomLevel={setCalZoom} pinOk={pinOk}/>}
            {view==="comments"&&<CommentsView data={filtered} comments={comments} addComment={addComment} deleteComment={deleteComment}
              pinOk={pinOk} addCommentMulti={addCommentMulti} jumpToPj={jumpToPj}/>}
          </div>
        )}
      </>
    )}
    {calSel&&<ProjectModal pj={calSel} data={dataWithOverrides} df={df} onClose={()=>setCalSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}
      pinOk={pinOk} delays={delays} delayTypes={delayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}/>}
    <span title="Version du code actuellement chargée" style={{position:"fixed",bottom:10,right:12,background:T.ink100,color:T.ink500,borderRadius:7,padding:"3px 11px",fontSize:12,fontWeight:600,fontFamily:"monospace",zIndex:9999,opacity:0.85}}>build {APP_BUILD_VERSION}</span>
  </div>);
}
