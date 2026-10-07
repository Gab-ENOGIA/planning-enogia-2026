import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { db, auth, ALLOWED_EMAIL_DOMAIN } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot, updateDoc, FieldPath, deleteField } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import "./styles.css";

import { T, setThemeMode } from "./theme";
import { getPjMeta, ALL_GAMMES, ALL_ETATS, MONTHS, today, setSyncedPjMeta, setPjMetaOverrides, GAMME_OVERRIDE, EXCLUDED_CHEFS } from "./pjMeta";
import { weekStartOf } from "./parsers";
import { ImportButton, PinGate, PIN, NavIcon } from "./components/SharedUI";
import { GanttView } from "./components/GanttView";
import { ProjectModal } from "./components/ProjectModal";
import { CommentsView } from "./components/CommentsView";
import { TableView } from "./components/TableView";
import { CalendarView } from "./components/CalendarView";
import { ManagerPanel } from "./components/ManagerPanel";
import { LoginScreen, LoginTransition } from "./components/LoginScreen";
import { DashboardSummary } from "./components/DashboardSummary";

const DOC_REF=()=>doc(db,"planning","current");
const INITIAL_DOC_REF=()=>doc(db,"planning","initial");
const OVERRIDES_DOC_REF=()=>doc(db,"planning","overrides");
const COMMENTS_DOC_REF=()=>doc(db,"planning","comments");
const PJ_META_SYNC_DOC_REF=()=>doc(db,"planning","pjMetaSync");
const PJ_META_OVERRIDES_DOC_REF=()=>doc(db,"planning","pjMetaOverrides");
const DELAYS_DOC_REF=()=>doc(db,"planning","delays");
const DELAY_TYPES_DOC_REF=()=>doc(db,"planning","delayTypes");
const MANAGER_EMAILS_DOC_REF=()=>doc(db,"planning","managerEmails");

// Types de retard génériques par défaut — éditables depuis le panel Manager (onglet Retards)
const DEFAULT_DELAY_TYPES=[
  "Retard paiement FNR","NC FNR","NC interne","Retard fournisseur",
  "Aléas planning client","Retard études","Manque de main d'œuvre","Autre",
];

const APP_BUILD_VERSION = "2026-10-07-v96-import-liste-numeros-serie";

export default function App(){
  // Utilisateur connecté via Google, restreint aux comptes @enogia.com (null tant que non connecté).
  const [currentUser,setCurrentUser]=useState(null);
  const [authChecked,setAuthChecked]=useState(false); // évite un flash de l'écran de connexion pendant la vérification initiale

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,user=>{
      if(user&&user.email&&user.email.toLowerCase().endsWith("@"+ALLOWED_EMAIL_DOMAIN)){
        setCurrentUser(user);
      }else{
        if(user)signOut(auth); // compte connecté mais hors domaine autorisé : on déconnecte
        setCurrentUser(null);
      }
      setAuthChecked(true);
    });
    return ()=>unsub();
  },[]);

  const loggedIn=!!currentUser;
  // Nom à utiliser automatiquement pour les commentaires/retards : celui du compte Google connecté.
  const authorName=currentUser?.displayName||currentUser?.email||"";

  // Popup de transition légère après la connexion, avant d'arriver sur le planning (demandé
  // explicitement) — déclenchée seulement sur un vrai clic "se connecter" depuis l'écran de
  // connexion, pas au chargement de la page quand une session était déjà active (sinon la popup
  // réapparaîtrait à chaque rafraîchissement). initialAuthResolvedRef distingue la toute première
  // résolution de onAuthStateChanged (restauration de session) d'un passage false→true ultérieur
  // (vraie connexion en cours de visite).
  const [justLoggedIn,setJustLoggedIn]=useState(false);
  const wasLoggedInRef=useRef(false);
  const initialAuthResolvedRef=useRef(false);
  useEffect(()=>{
    const wasLoggedIn=wasLoggedInRef.current;
    const isInitialResolution=!initialAuthResolvedRef.current;
    wasLoggedInRef.current=loggedIn;
    if(authChecked)initialAuthResolvedRef.current=true;
    if(loggedIn&&!wasLoggedIn&&!isInitialResolution){
      setJustLoggedIn(true);
      const t=setTimeout(()=>setJustLoggedIn(false),2200);
      return ()=>clearTimeout(t);
    }
  },[loggedIn,authChecked]);
  // "L'option de modifier [la fiche projet] doit être disponible uniquement par moi" — restreint à
  // l'email de connexion de Gabriel, pas à pinOk (que d'autres membres de la BU ORC peuvent aussi
  // avoir en entrant le code Manager). À AJUSTER si ce n'est pas exactement ton adresse @enogia.com.
  const OWNER_EMAILS=["gabriel.vincent@enogia.com"];
  const canEditMeta=!!(currentUser?.email&&OWNER_EMAILS.includes(currentUser.email.toLowerCase()));

  const [darkMode,setDarkMode]=useState(()=>{
    try{return localStorage.getItem("enogia_darkMode")==="1";}catch(e){return false;}
  });
  setThemeMode(darkMode); // mute T en place avant que quoi que ce soit ne le lise pendant ce rendu
  useEffect(()=>{
    try{localStorage.setItem("enogia_darkMode",darkMode?"1":"0");}catch(e){}
    // Contrôles natifs (barres de défilement, sélecteurs de date, listes déroulantes) et fond de page
    // suivent le thème ; variables CSS lues par les infobulles/légendes des graphiques (styles.css).
    const root=document.documentElement;
    root.style.colorScheme=darkMode?"dark":"light";
    document.body.style.background=T.surface;
    root.style.setProperty("--e-card",T.card);
    root.style.setProperty("--e-line",T.line);
    root.style.setProperty("--e-ink900",T.ink900);
    root.style.setProperty("--e-ink700",T.ink700);
    root.style.setProperty("--e-ink300",T.ink300);
  },[darkMode]);

  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [importing,setImporting]=useState(false);
  const [lastImport,setLastImport]=useState(null);
  const [docIndice,setDocIndice]=useState("");
  const [initialData,setInitialData]=useState([]);
  const [initialImporting,setInitialImporting]=useState(false);
  const [lastInitialImport,setLastInitialImport]=useState(null);
  const [lastInitialAdd,setLastInitialAdd]=useState(null);
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
    return 2; // dézoomé par défaut pour une vue d'ensemble plus large à l'ouverture
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
  const [managerEmails,setManagerEmails]=useState([]);
  const [tableJumpPj,setTableJumpPj]=useState(null);
  const jumpToPj=useCallback(pj=>{setView("table");setTableJumpPj(pj);},[]);

  // Déverrouille automatiquement l'espace Manager pour les emails autorisés — le code
  // PIN reste disponible en repli (utile tant que la liste n'est pas encore renseignée).
  useEffect(()=>{
    if(currentUser?.email&&managerEmails.includes(currentUser.email))setPinOk(true);
  },[currentUser,managerEmails]);

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
        setLastInitialAdd(d.lastAdd || null);
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

  // Exclusion/réactivation de plusieurs jours d'un coup (clic-glisser dans le mini-calendrier Production).
  // On applique tous les jours en une seule écriture : des appels successifs repartiraient du même état « productionExclusions »
  // (fermeture figée) et seul le dernier jour serait enregistré (défaut de l'ancienne gestion « période »). entries = { pj: [dateIso, …] }.
  const setProductionExclusionDays=useCallback(async (entries,exclude)=>{
    const nextAll={...productionExclusions};
    Object.entries(entries).forEach(([pj,dates])=>{
      const cur=new Set(nextAll[pj]||[]);
      dates.forEach(d=>{if(exclude)cur.add(d);else cur.delete(d);});
      nextAll[pj]=[...cur].sort();
    });
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
  // (Bouton « Sync depuis Suivi ORC » retiré du Manager pour l'instant — on garde seulement la lecture du cache déjà synchronisé.)
  useEffect(()=>{
    const unsub = onSnapshot(PJ_META_SYNC_DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d=snap.data();
        setSyncedPjMeta(d.meta||{});
      }
    }, (err)=>{
      console.error("Erreur Firestore (pjMetaSync):", err);
    });
    return ()=>unsub();
  },[]);

  // Lecture temps réel des corrections manuelles de fiche projet (nom/pays/chef), saisies dans l'app.
  // Prioritaires sur la synchro Suivi ORC — c'est la dernière main humaine sur la donnée.
  const [pjOverridesState,setPjOverridesState]=useState({});
  useEffect(()=>{
    const unsub = onSnapshot(PJ_META_OVERRIDES_DOC_REF(), (snap)=>{
      const v=snap.exists()?(snap.data().meta||{}):{};
      setPjMetaOverrides(v);
      setPjOverridesState(v);
    }, (err)=>{
      console.error("Erreur Firestore (pjMetaOverrides):", err);
    });
    return ()=>unsub();
  },[]);
  // N'écrit QUE les champs modifiés du PJ concerné (chemin meta.<PJ>.<champ>, valeur remplacée en bloc). Avant, on réécrivait
  // toute la table des PJ depuis l'état local : deux enregistrements rapprochés (saisie en série, collage de plusieurs
  // N° de série) pouvaient s'écraser l'un l'autre avec des valeurs périmées, et un feu effacé restait en base (fusion profonde).
  // En cas d'échec (document absent, règles…), on retombe sur l'ancienne écriture.
  const savePjMetaOverride=useCallback(async (pj,fields)=>{
    try{
      const args=[];
      Object.entries(fields).forEach(([k,v])=>{args.push(new FieldPath("meta",pj,k),v===undefined?deleteField():v);});
      await updateDoc(PJ_META_OVERRIDES_DOC_REF(),...args);
      return true;
    }catch(e0){
      const next={...pjOverridesState,[pj]:{...(pjOverridesState[pj]||{}),...fields}};
      try{
        await setDoc(PJ_META_OVERRIDES_DOC_REF(), { meta:next }, { merge:true });
        return true;
      }catch(e){
        console.error(e);
        alert("Erreur lors de l'enregistrement des infos projet : " + e.message);
        return false;
      }
    }
  },[pjOverridesState]);

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

  // Lecture temps réel de la liste des emails autorisés à l'espace Manager
  useEffect(()=>{
    const unsub = onSnapshot(MANAGER_EMAILS_DOC_REF(), (snap)=>{
      if(snap.exists()&&Array.isArray(snap.data().emails)){
        setManagerEmails(snap.data().emails);
      }
    }, (err)=>{
      console.error("Erreur Firestore (managerEmails):", err);
    });
    return ()=>unsub();
  },[]);

  const setManagerEmailsAndSave=useCallback(async next=>{
    try{
      await setDoc(MANAGER_EMAILS_DOC_REF(), { emails:next }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement de la liste des accès Manager : " + e.message);
      return false;
    }
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

  // Alloue la même cause de retard (même type, mêmes jours) à plusieurs PJ à la fois — ex. un décalage qui affecte toute une ligne de projets.
  // Les entrées partagent un groupId/groupPjs, exactement comme les commentaires groupés, pour un traçage identique.
  const addDelayAllocationMulti=useCallback(async (pjList,type,days,note,author)=>{
    if(!type||!days||isNaN(days)||!pjList||pjList.length===0)return false;
    const groupId=pjList.length>1?(Date.now()+"-"+Math.random().toString(36).slice(2,7)):null;
    const nextAll={...delays};
    pjList.forEach(pj=>{
      const current=nextAll[pj]||delays[pj]||[];
      nextAll[pj]=[...current,{id:Date.now()+"-"+Math.random().toString(36).slice(2,7)+"-"+pj,type,days:Math.round(Number(days)),note:(note||"").trim(),author:(author||"").trim(),date:new Date().toISOString(),groupId,groupPjs:pjList.length>1?pjList:undefined}];
    });
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

  // Vrai fil de discussion sur une cause de retard précise (au-delà de la note initiale) :
  // suivi des relances, réponses fournisseur, etc. au fil du temps.
  const addDelayComment=useCallback(async (pj,delayId,author,text)=>{
    if(!author.trim()||!text.trim())return false;
    const current=delays[pj]||[];
    const next=current.map(d=>d.id===delayId?{...d,comments:[...(d.comments||[]),{author:author.trim(),text:text.trim(),date:new Date().toISOString()}]}:d);
    const nextAll={...delays,[pj]:next};
    try{
      await setDoc(DELAYS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[delays]);

  const deleteDelayComment=useCallback(async (pj,delayId,idx,pin)=>{
    if(pin!==PIN){alert("Code incorrect.");return false;}
    const current=delays[pj]||[];
    const next=current.map(d=>d.id===delayId?{...d,comments:(d.comments||[]).filter((_,i)=>i!==idx)}:d);
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

  // GARANTIE (demandé : « même si je fais un import de planning je souhaite que ça ne change rien » pour
  // les MAJ faites sur le site) : un import n'écrit QUE le document des lignes du planning (dates, noms
  // MS Project). Tout ce qui est saisi dans l'app — pays, chef de projet, nom, gamme (pjMetaOverrides),
  // état, avancement, présence aux tests, jours de production, retards, commentaires — vit dans des
  // documents Firestore séparés, clés par n° de PJ, et passe toujours PAR-DESSUS les données importées.
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

  // AJOUT au planning initial (nouveau, ne remplace pas l'import initial ci-dessus) : n'ajoute que les
  // PJ absents — ceux déjà ancrés ne sont jamais modifiés. On relit le document juste avant d'écrire
  // (pas l'état local, qui peut être en retard) et on garde une copie de l'initial précédent.
  const handleInitialAdd=useCallback(async newRows=>{
    setInitialImporting(true);
    try{
      const snap=await getDoc(INITIAL_DOC_REF());
      const cur=snap.exists()?snap.data():{};
      const curRows=cur.rows||[];
      const have=new Set(curRows.map(r=>r.pj));
      const stamp=new Date().toLocaleString("fr-FR");
      const added=newRows.filter(r=>!have.has(r.pj)).map(r=>({...r,anchoredAt:stamp}));
      if(added.length===0){setInitialImporting(false);return;}
      try{await setDoc(doc(db,"planning","initialBackup"),{rows:curRows,lastImport:cur.lastImport||null,savedAt:stamp,reason:"avant ajout de "+added.length+" projet(s)"});}
      catch(e){console.warn("Sauvegarde de l'initial impossible (l'ajout continue, rien n'est écrasé) :",e);}
      await setDoc(INITIAL_DOC_REF(),{...cur,rows:[...curRows,...added],lastImport:cur.lastImport||stamp,lastAdd:stamp});
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'ajout au planning initial : "+e.message);
    }
    setInitialImporting(false);
  },[]);

  const allPJs=useMemo(()=>[...new Set(data.map(r=>r.pj))].sort(),[data]);
  const allProjets=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj,r).nomProjet))].sort(),[data]);
  const allPays=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj,r).pays))].sort(),[data]);
  // Mêmes noms exclus que dans le sélecteur d'édition (demandé explicitement : "enlever CMA et
  // Clément Bablon du choix du chef de projet") — n'affecte que la liste proposée au filtre, pas
  // les projets déjà assignés à ces noms.
  const allChefs=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj,r).chefProjet))].filter(c=>!EXCLUDED_CHEFS.has(c)).sort(),[data]);

  // L'état affiché vient exclusivement du choix manuel du Manager (etatChoice), sinon "À définir"
  const initialByPj=useMemo(()=>{const m={};initialData.forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const dataWithOverrides=useMemo(()=>data.map(r=>{
    const ini=initialByPj[r.pj];
    let drift=null;
    if(ini&&ini.depart&&r.depart){
      drift=Math.round((new Date(r.depart)-new Date(ini.depart))/86400000);
    }
    return{...r,etat:etatChoice[r.pj]||r.etat||"A_DEFINIR",clientPresence:clientPresence[r.pj]||null,drift,gamme:(pjOverridesState[r.pj]&&pjOverridesState[r.pj].gamme)||GAMME_OVERRIDE[r.pj]||r.gamme};
  }),[data,etatChoice,clientPresence,initialByPj,pjOverridesState]);

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

  if(!authChecked)return null; // évite un flash de l'écran de connexion pendant la vérification initiale
  if(!loggedIn) return <LoginScreen/>;
  // Fond flouté réel (demandé explicitement : "un transparent flou ... la vision en flou derrière
  // de la première page") plutôt qu'un fond plat à formes décoratives : l'écran de connexion reste
  // monté en dessous, et LoginTransition n'est plus qu'un calque "verre dépoli" (backdrop-filter)
  // superposé par-dessus, qui laisse donc transparaître — flouté — ce qu'il y a vraiment derrière.
  if(justLoggedIn) return (<><LoginScreen/><LoginTransition name={authorName}/></>);

  return(<div className="enogia-fade-in" style={{fontFamily:T.font,fontSize:17,background:T.surface,minHeight:"100vh",color:T.ink900,display:"flex"}}>
    <style>{"*{box-sizing:border-box;}"}</style>

    {/* ── Rail de navigation : icônes de vue + accès Manager + mode sombre ── */}
    <nav style={{width:64,flexShrink:0,background:T.card,borderRight:"1px solid "+T.line,display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 0",gap:4,position:"sticky",top:0,height:"100vh"}}>
      {/* Plus de logo ici (demandé explicitement : trop petit pour être lisible) — il ne reste
          qu'au seul endroit où il est bien lisible, agrandi, dans l'en-tête. */}
      {VIEWS.map(v=><button key={v.id} onClick={()=>setView(v.id)} title={v.l} style={{width:40,height:40,borderRadius:10,border:"none",borderLeft:"3px solid "+(view===v.id?T.teal500:"transparent"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",background:view===v.id?T.teal100:"transparent",color:view===v.id?T.teal600:T.ink300,transition:"background .15s ease, color .15s ease, border-color .15s ease"}}
        onMouseEnter={e=>{if(view!==v.id)e.currentTarget.style.background=T.surface;}}
        onMouseLeave={e=>{if(view!==v.id)e.currentTarget.style.background="transparent";}}><NavIcon name={v.icon} size={19}/></button>)}
      <div style={{flex:1}}/>
      <button onClick={()=>setView("manager")} title="Manager" style={{width:40,height:40,borderRadius:10,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",background:view==="manager"?T.teal100:T.surface,color:view==="manager"?T.teal600:T.ink300,transition:"background .15s ease, color .15s ease"}}><NavIcon name="lock" size={18}/></button>
      <button onClick={()=>setDarkMode(d=>!d)} title={darkMode?"Passer en mode clair":"Passer en mode sombre"} style={{width:40,height:36,borderRadius:10,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",color:T.ink300,marginTop:4}}
        onMouseEnter={e=>{e.currentTarget.style.background=T.surface;}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}><NavIcon name={darkMode?"moon":"sunSm"} size={16}/></button>
    </nav>

    {/* ── Colonne principale ── */}
    <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",minHeight:"100vh"}}>

      {/* Barre de marque — fine, claire, sans dégradé : l'identité tient au logo + à la typo, pas à un bloc de couleur */}
      <div style={{flexShrink:0,minHeight:60,display:"flex",alignItems:"center",gap:16,padding:"10px 28px",background:T.card,borderBottom:"1px solid "+T.line,flexWrap:"wrap"}}>
        {/* Le fichier logo d'origine a énormément de marge transparente autour du dessin réel
            (~24% de sa hauteur seulement est visible) : l'agrandir ne suffisait donc pas, il
            paraissait toujours minuscule. enogia-logo-color-crop.svg est recadré au plus près
            du dessin (mark + "enogia"), donc la même hauteur rend un logo visuellement ~3x
            plus grand qu'avant, comme demandé — sans avoir à démesurer toute la barre d'en-tête. */}
        <img src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="ENOGIA" width="105" height="42" style={{height:42,width:"auto",objectFit:"contain",flexShrink:0,filter:darkMode?"brightness(0) invert(1)":"none"}}/>
        <div style={{width:1,height:26,background:T.teal400,opacity:.35,flexShrink:0}}/>
        {/* Fraunces (empattements fins) : même police que tous les autres titres/intitulés de
            section de l'appli (ManagerPanel, fiche projet, etc.) — déjà "la police utilisée partout"
            pour un titre, donc inchangée ici. Couleur passée en bleu acier foncé (T.teal600, plus
            sombre que le gris-noir T.ink900 d'avant, demandé explicitement : "le titre doit être plus
            sombre") et tracking aligné sur celui des intitulés de section (.03em) pour que ce titre se
            lise comme le même registre typographique que le reste, pas comme une police à part. */}
        <div style={{display:"flex",flexDirection:"column",gap:1}}>
          {/* Taille augmentée (demandé explicitement : "police plus grande") — police Roboto en
              attendant la confirmation (Roboto ou Abel, les deux proposées) ; bleu acier foncé déjà en
              place. "Production" retiré du sous-titre, qui ne garde que "BU ORC" (demandé
              explicitement). */}
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:26,color:T.teal600,letterSpacing:".01em",textTransform:"uppercase",whiteSpace:"nowrap"}}>Planning Ordonnancement</div>
          <span style={{fontFamily:T.fontDisplay,fontSize:12,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",color:T.teal500,whiteSpace:"nowrap"}}>BU ORC</span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1}}>
            <span style={{color:T.ink700,fontSize:13,fontWeight:600,fontFamily:T.font}}>{loading?"Chargement...":data.length+" unités"}</span>
            {!loading&&lastImport&&<span style={{color:T.ink300,fontSize:11,fontFamily:T.font}}>Import {lastImport}</span>}
          </div>
          {/* Police mono remplacée par l'Inter standard (demandé explicitement : "la police de l'indice M
              n'est pas conforme") — elle jurait seule au milieu d'un en-tête en Fraunces/Inter. */}
          {docIndice&&<span style={{background:T.surfaceAlt,color:T.ink700,borderRadius:7,padding:"5px 11px",fontSize:12,fontWeight:700,fontFamily:T.font,letterSpacing:".01em",border:"1px solid "+T.line}}>Indice {docIndice}</span>}
          <ImportButton
            onImport={handleImport}
            busy={importing}
            hasExisting={data.length>0}
            confirmMessage={"Un planning révisé a déjà été importé"+(lastImport?(" le "+lastImport):"")+" ("+data.length+" unités).\n\nCet import va remplacer les données pour tous les visiteurs du site.\n\nÊtes-vous sûr de vouloir continuer ?"}
          />
          {currentUser&&<div style={{width:1,height:22,background:T.line}}/>}
          {currentUser&&<UserChip user={currentUser} onSignOut={()=>signOut(auth)}/>}
        </div>
      </div>

      <div style={{padding:"22px 28px",flex:1}}>


    {loading?<div style={{textAlign:"center",padding:80,color:T.ink500}}>
      <div style={{width:44,height:44,margin:"0 auto 18px",borderRadius:"50%",border:"3px solid "+T.line,borderTopColor:T.teal500,animation:"enogiaSpin .8s linear infinite"}}/>
      <div style={{fontSize:18,fontFamily:T.fontMono}}>Connexion à la base de données…</div>
    </div>:
    data.length===0?(
      <div className="enogia-float-in" style={{background:T.surface,borderRadius:16,padding:56,textAlign:"center",border:"none",boxShadow:T.neuOut}}>
        <div style={{width:56,height:56,margin:"0 auto 18px",borderRadius:14,background:T.surface,boxShadow:T.neuInSm,color:T.teal600,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon name="inbox" size={26}/></div>
        <div style={{fontFamily:T.fontDisplay,textTransform:"uppercase",letterSpacing:".03em",fontWeight:600,color:T.ink900,marginBottom:8,fontSize:20}}>Aucune donnée pour l'instant</div>
        <div style={{color:T.ink500,fontSize:16,marginBottom:20,maxWidth:420,marginLeft:"auto",marginRight:"auto"}}>Importe un planning MS Project pour faire apparaître les projets ici.</div>
      </div>
    ):(
      <>
        {view==="manager"?(pinOk?
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontFamily:T.fontDisplay,fontWeight:600,color:T.ink900,fontSize:22,display:"flex",alignItems:"center",gap:9}}><NavIcon name="lock" size={20}/>Espace Manager</span>
              <button onClick={()=>setPinOk(false)} style={{padding:"7px 15px",borderRadius:10,border:"none",background:T.surface,boxShadow:T.neuOutSm,fontSize:15,cursor:"pointer",color:T.ink700,fontWeight:600}}>Verrouiller</button>
            </div>
            <ManagerPanel data={dataWithOverrides} progress={progress} setProgress={setProgress} initialData={initialData} lastInitialImport={lastInitialImport} lastInitialAdd={lastInitialAdd} onInitialImport={handleInitialImport} onInitialAdd={handleInitialAdd} initialImporting={initialImporting}
              etatChoice={etatChoice} setEtatFor={setEtatFor} saveProgress={saveProgress} savingProgress={savingProgress} progressSaved={progressSaved}
              tab={managerTab} setTab={setManagerTab} clientPresence={clientPresence} setClientPresenceFor={setClientPresenceFor}
              closurePeriods={closurePeriods} setClosurePeriods={setClosurePeriodsAndSave}
              productionExclusions={productionExclusions} setProductionExclusionDays={setProductionExclusionDays}
              comments={comments} delays={delays} delayTypes={delayTypes} setDelayTypes={setDelayTypesAndSave} addDelayAllocationMulti={addDelayAllocationMulti} deleteDelayAllocation={(pj,id)=>deleteDelayAllocation(pj,id,PIN)}
              managerEmails={managerEmails} setManagerEmails={setManagerEmailsAndSave} currentUserEmail={currentUser?.email} authorName={authorName} buildVersion={canEditMeta?APP_BUILD_VERSION:null} savePjMetaOverride={savePjMetaOverride} addComment={addComment} deleteComment={(pj,idx)=>deleteComment(pj,idx,PIN)}/>
          </div>
          :<PinGate onUnlock={()=>setPinOk(true)}/>)
        :(
          <div key={view} className="enogia-float-in">
            {/* allData (non filtré) pour le compteur "expédiées depuis le 1er janvier" : il ne doit
                jamais varier selon les filtres actifs sur la liste, demandé explicitement — seules
                les 4 répartitions en camembert, elles, continuent de suivre les filtres. */}
            {view==="table"&&<DashboardSummary data={filtered} allData={dataWithOverrides}/>}
            {view==="table"&&<TableView data={filtered} progress={progress} df={df} setDf={setDf}
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
              addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment}
              externalSel={tableJumpPj} setExternalSel={setTableJumpPj} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>}
            {/* selEtats/selPJs (même état que la liste) pour afficher un filtre État + PJ directement
                dans la barre d'outils du Gantt (demandé explicitement) — partage le même état que la
                liste, donc filtrer ici filtre aussi la liste et inversement. */}
            {view==="gantt"&&<GanttView data={filtered} progress={progress} df={df}
              selEtats={selEtats} setSelEtats={setSelEtats} allPJs={allPJs} selPJs={selPJs} setSelPJs={setSelPJs}
              comments={comments} addComment={addComment} deleteComment={deleteComment}
              pinOk={pinOk} delays={delays} delayTypes={delayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
              addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>}
            {/* Même filtre État + PJ que le Gantt (demandé explicitement : "le même format au même
                emplacement") — partage le même état que la liste/le Gantt, donc filtrer ici filtre
                aussi les autres vues et inversement. */}
            {view==="calendar"&&<CalendarView data={filtered} onSelectPj={setCalSel}
              mode={calMode} setMode={setCalMode} anchor={calAnchor} setAnchor={setCalAnchor}
              dayAnchor={calDayAnchor} setDayAnchor={setCalDayAnchor} closurePeriods={closurePeriods}
              productionExclusions={productionExclusions} comments={comments} addComment={addComment}
              zoomLevel={calZoom} setZoomLevel={setCalZoom} pinOk={pinOk} authorName={authorName}
              selEtats={selEtats} setSelEtats={setSelEtats} allPJs={allPJs} selPJs={selPJs} setSelPJs={setSelPJs}/>}
            {view==="comments"&&<CommentsView data={filtered} comments={comments} addComment={addComment} deleteComment={deleteComment}
              pinOk={pinOk} addCommentMulti={addCommentMulti} jumpToPj={jumpToPj} authorName={authorName}/>}
          </div>
        )}
      </>
    )}
    {calSel&&<ProjectModal pj={calSel} data={dataWithOverrides} df={df} onClose={()=>setCalSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}
      pinOk={pinOk} delays={delays} delayTypes={delayTypes} addDelayAllocation={addDelayAllocation} deleteDelayAllocation={deleteDelayAllocation}
      addDelayComment={addDelayComment} deleteDelayComment={deleteDelayComment} authorName={authorName} savePjMetaOverride={savePjMetaOverride} canEditMeta={canEditMeta}/>}
      </div>
    </div>
  </div>);
}

// ── Identité de l'utilisateur connecté, en haut de l'appli : on voit tout de suite
// sous quel compte on est, avec un accès direct à la déconnexion. ──
function UserChip({user,onSignOut}){
  const [open,setOpen]=useState(false);
  const ref=React.useRef(null);
  useEffect(()=>{
    const onClick=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",onClick);
    return ()=>document.removeEventListener("mousedown",onClick);
  },[]);
  const name=user.displayName||user.email;
  const initial=(name||"?").trim().charAt(0).toUpperCase();
  return(<div ref={ref} style={{position:"relative"}}>
    <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:9,background:T.surfaceAlt,border:"none",borderRadius:20,padding:"5px 13px 5px 6px",cursor:"pointer",color:T.ink900}}>
      <span style={{width:26,height:26,borderRadius:"50%",background:T.teal500,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{initial}</span>
      <span style={{fontSize:13.5,fontWeight:600,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:T.ink900}}>{name}</span>
    </button>
    {open&&<div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:T.card,borderRadius:10,boxShadow:T.shadowLg,padding:8,minWidth:200,zIndex:50}}>
      <div style={{padding:"6px 10px 10px",borderBottom:"1px solid "+T.line,marginBottom:6}}>
        <div style={{fontSize:13.5,fontWeight:700,color:T.ink900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
        <div style={{fontSize:12,color:T.ink500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
      </div>
      <button onClick={onSignOut} style={{width:"100%",display:"flex",alignItems:"center",gap:8,background:"none",border:"none",borderRadius:7,padding:"8px 10px",fontSize:13.5,fontWeight:600,color:T.red500,cursor:"pointer",textAlign:"left"}}><NavIcon name="logout" size={15}/>Se déconnecter</button>
    </div>}
  </div>);
}
