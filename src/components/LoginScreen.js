import React, { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, ALLOWED_EMAIL_DOMAIN } from "../firebase";
import { T } from "../theme";
import { NavIcon } from "./SharedUI";

export const ROBOTO="'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
// Transition d'ouverture/fermeture (demandé explicitement) : durée du fondu de sortie avant de
// basculer réellement de vue — doit correspondre aux keyframes enogiaModalPopOut/enogiaFadeOutDown
// (styles.css, .18s) pour ne pas couper l'animation en cours de route.
const TRANSITION_MS=180;

// Écran de connexion — couleurs/structure de la page liste (fond clair T.surface, logo couleur),
// typographie Roboto (demandé explicitement), logo agrandi et remonté en haut de l'écran, flow en
// deux temps "Entrer" → carte Google avec effets d'ouverture/fermeture entre les deux.
export function LoginScreen(){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [started,setStarted]=useState(false);
  // Anime la sortie de la vue courante avant de basculer, plutôt qu'un changement instantané
  // (demandé explicitement : "effets d'ouverture et de fermeture sur les actions boutons").
  const [introLeaving,setIntroLeaving]=useState(false);
  const [cardLeaving,setCardLeaving]=useState(false);

  const openCard=()=>{
    setIntroLeaving(true);
    setTimeout(()=>{setStarted(true);setIntroLeaving(false);},TRANSITION_MS);
  };
  const closeCard=()=>{
    setCardLeaving(true);
    setTimeout(()=>{setStarted(false);setCardLeaving(false);setError("");},TRANSITION_MS);
  };

  const handleGoogleSignIn=async ()=>{
    setBusy(true);setError("");
    try{
      const result=await signInWithPopup(auth,googleProvider);
      const email=result.user.email||"";
      if(!email.toLowerCase().endsWith("@"+ALLOWED_EMAIL_DOMAIN)){
        await signOut(auth);
        setError("Accès réservé aux comptes @"+ALLOWED_EMAIL_DOMAIN+". Vous étiez connecté avec "+email+".");
      }
    }catch(e){
      if(e && e.code==="auth/popup-closed-by-user"){
        // L'utilisateur a fermé la fenêtre : rien à signaler.
      }else{
        console.error(e);
        setError("Erreur de connexion : "+(e && e.message?e.message:"inconnue"));
      }
    }
    setBusy(false);
  };

  return(
    <div style={{position:"relative",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:"52px 24px 24px",fontFamily:ROBOTO,overflow:"hidden",background:T.surface}}>

      {/* Carte du monde très discrète, en bleu acier, pour rester visible sur ce fond clair. */}
      <img src={process.env.PUBLIC_URL+"/world-map-bg.svg"} alt="" aria-hidden="true" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(1500px,170vw)",maxWidth:"none",pointerEvents:"none",zIndex:0}}/>

      {/* Logo remonté en haut et largement agrandi (demandé explicitement), plutôt que centré avec
          le reste du contenu. */}
      <img src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="ENOGIA" style={{height:92,width:"auto",marginBottom:46,position:"relative",zIndex:1,flexShrink:0}}/>

      <div style={{flex:1,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",zIndex:1}}>
        {!started?(
          /* Écran d'accueil : un seul bouton "Entrer", "incrusté" dans la page (ombre interne au
             lieu d'une ombre portée flottante). Fondu+léger retrait à la sortie vers la carte. */
          <div className={introLeaving?"enogia-fade-out":"enogia-float-in"} style={{textAlign:"center",maxWidth:420}}>
            <div style={{fontFamily:ROBOTO,fontSize:12,letterSpacing:".08em",color:T.ink500,fontWeight:600,textTransform:"uppercase",marginBottom:14}}>BU ORC · Planning Ordonnancement</div>
            {/* Nouvelle phrase d'accroche (demandé explicitement : "Bon retour parmi nous" retiré) —
                confirmée parmi les options proposées. */}
            <div style={{fontFamily:ROBOTO,fontWeight:700,fontSize:25,color:T.teal600,margin:"0 0 12px",letterSpacing:"-.005em",lineHeight:1.3}}>Toute la production BU ORC, en un clin d'œil.</div>
            <div style={{fontSize:15,color:T.ink500,lineHeight:1.5,marginBottom:32,fontFamily:ROBOTO}}>Suivez la production ENOGIA, de l'arrivée à l'expédition.</div>
            <button onClick={openCard} className="enogia-btn-tap" style={{padding:"14px 46px",borderRadius:12,border:"none",background:T.teal600,color:"#fff",fontFamily:ROBOTO,fontSize:16,fontWeight:700,letterSpacing:".01em",cursor:"pointer",boxShadow:"inset 0 1px 0 rgba(255,255,255,.14), 0 1px 3px rgba(18,27,48,.12)",transition:"box-shadow .15s ease, transform .15s ease"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="inset 0 1px 0 rgba(255,255,255,.14), 0 5px 16px rgba(18,27,48,.22)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="inset 0 1px 0 rgba(255,255,255,.14), 0 1px 3px rgba(18,27,48,.12)";}}>
              Entrer
            </button>
          </div>
        ):(
          <div className={cardLeaving?"enogia-modal-pop-out":"enogia-modal-pop"} style={{width:"100%",maxWidth:400,background:T.card,borderRadius:18,padding:"36px 32px 30px",boxShadow:T.shadowLg,border:"1px solid "+T.line,textAlign:"center",fontFamily:ROBOTO}}>
            <div style={{width:52,height:52,margin:"0 auto 20px",borderRadius:14,background:T.surface,boxShadow:T.neuInSm,color:T.teal600,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <NavIcon name="lock" size={24}/>
            </div>
            <div style={{fontSize:15,color:T.ink500,lineHeight:1.5,marginBottom:26,fontFamily:ROBOTO}}>Connectez-vous avec votre compte ENOGIA pour accéder au planning de production.</div>

            {/* Bouton Google "incrusté" : fond T.surface + ombre interne plutôt qu'un blanc pur avec
                ombre portée flottante, pour qu'il se lise comme intégré à la carte. */}
            <button onClick={handleGoogleSignIn} disabled={busy} className="enogia-btn-tap" style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:T.surface,color:T.ink700,border:"1px solid "+T.line,borderRadius:11,padding:"13px 16px",fontFamily:ROBOTO,fontSize:15.5,fontWeight:600,cursor:busy?"default":"pointer",transition:"box-shadow .15s ease",boxShadow:T.neuInSm,opacity:busy?.7:1}}
              onMouseEnter={e=>{if(!busy)e.currentTarget.style.boxShadow=T.neuIn;}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow=T.neuInSm;}}>
              {busy?
                <span style={{width:16,height:16,borderRadius:"50%",border:"2px solid rgba(18,27,48,.18)",borderTopColor:T.teal600,display:"inline-block",animation:"enogiaSpin .8s linear infinite"}}/>
                :<svg viewBox="0 0 20 20" style={{width:19,height:19,flexShrink:0}}><path fill="#4285F4" d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.99-4.33 2.99-7.31z"/><path fill="#34A853" d="M10 20c2.7 0 4.96-.89 6.62-2.42l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H1.07v2.59A10 10 0 0 0 10 20z"/><path fill="#FBBC05" d="M4.41 11.9a6 6 0 0 1 0-3.8V5.51H1.07a10 10 0 0 0 0 8.98l3.34-2.59z"/><path fill="#EA4335" d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 10 0 10 10 0 0 0 1.07 5.51L4.41 8.1C5.2 5.74 7.4 3.98 10 3.98z"/></svg>}
              {busy?"Connexion…":"Continuer avec Google"}
            </button>

            {error&&<div style={{marginTop:16,background:T.red100,border:"1px solid "+T.red500+"40",borderRadius:10,padding:"10px 12px",color:T.red600,fontSize:13,lineHeight:1.4,textAlign:"left",fontFamily:ROBOTO}}>{error}</div>}

            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:20,fontSize:12.5,color:T.ink300,fontWeight:600,fontFamily:ROBOTO}}>
              <NavIcon name="lock" size={12}/>
              Réservé aux comptes @{ALLOWED_EMAIL_DOMAIN}
            </div>

            <button onClick={closeCard} className="enogia-btn-tap" style={{marginTop:16,background:"none",border:"none",color:T.ink300,fontSize:12.5,fontFamily:ROBOTO,cursor:"pointer",padding:0}}>← Retour</button>
          </div>
        )}
      </div>

      <div style={{marginTop:20,display:"flex",justifyContent:"center",gap:16,fontSize:11.5,color:T.ink300,fontFamily:ROBOTO,position:"relative",zIndex:1}}>
        <span>ENOGIA · Marseille</span>
      </div>
    </div>
  );
}

// Popup de transition, affichée après la connexion réussie et avant d'arriver sur le planning
// (demandé explicitement) — logo (agrandi) qui pulse + message de bienvenue (agrandi) avec le
// prénom du compte Google connecté. Remplace le fond clair à formes décoratives (jugé pas assez
// joli) par un vrai calque "verre dépoli" : App.js laisse désormais l'écran de connexion monté en
// dessous (au lieu de le démonter), et ce composant ne dessine plus qu'un voile clair translucide
// avec backdrop-filter:blur — on voit donc réellement, flouté, ce qu'il y a derrière, plutôt qu'un
// décor plat qui l'imite.
export function LoginTransition({name}){
  const firstName=(name||"").trim().split(/\s+/)[0]||"";
  return(
    <div className="enogia-fade-in" style={{position:"fixed",inset:0,zIndex:10000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(253,251,246,.55)",backdropFilter:"blur(26px) saturate(1.15)",WebkitBackdropFilter:"blur(26px) saturate(1.15)",fontFamily:ROBOTO}}>
      <img src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="ENOGIA" style={{height:132,width:"auto",marginBottom:28,filter:"drop-shadow(0 8px 24px rgba(18,27,48,.16))",animation:"enogiaLogoPulse 1.3s ease-in-out infinite"}}/>
      {firstName&&<div className="enogia-float-in" style={{fontSize:28,fontWeight:700,color:T.teal600,letterSpacing:".005em",textShadow:"0 1px 0 rgba(255,255,255,.6)"}}>Bienvenue, {firstName}</div>}
      {/* Phrase d'accroche sur le suivi de projet, demandée explicitement, en plus du message de
          bienvenue. */}
      <div className="enogia-float-in" style={{fontSize:15,color:T.ink500,marginTop:8,textShadow:"0 1px 0 rgba(255,255,255,.6)"}}>Le suivi de vos projets, à jour en temps réel.</div>
    </div>
  );
}
