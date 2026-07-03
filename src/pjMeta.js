import React from "react";
import { T } from "./theme";

// Corrections manuelles de gamme, prioritaires sur ce qui est importé/deviné — s'appliquent immédiatement, sans réimport.
export const GAMME_OVERRIDE={
  "PJ503":"100LTV3",
};

export const PJ_META={
  "PJ376":{nomProjet:"GAEC - ADELINE",pays:"France",chefProjet:"Clément MARTOUZET"},
  "PJ382-40":{nomProjet:"SHEFFIELD",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ382-180":{nomProjet:"SHEFFIELD",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ394-4":{nomProjet:"MUNSTER",pays:"Allemagne",chefProjet:"Gabriel VINCENT"},
  "PJ399":{nomProjet:"KALAHARI",pays:"Zambie",chefProjet:"Gabriel VINCENT"},
  "PJ405-3":{nomProjet:"CDA Z34",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ405-4":{nomProjet:"CDA Z34",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ420":{nomProjet:"ST GOBAIN",pays:"France",chefProjet:"Clément MARTOUZET"},
  "PJ421-180LT":{nomProjet:"PERENCO",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ421-180MT":{nomProjet:"PERENCO",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ429":{nomProjet:"HERLIES",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ430":{nomProjet:"AATF - PYROGENESYS",pays:"Nigeria",chefProjet:"Gabriel VINCENT"},
  "PJ432":{nomProjet:"ATAL - SHATIN",pays:"Hong Kong",chefProjet:"Emmy BOURELLY"},
  "PJ437":{nomProjet:"KYUSHU - BEPPU CITY",pays:"Japon",chefProjet:"Clément MARTOUZET"},
  "PJ438":{nomProjet:"ONOMICHI",pays:"Japon",chefProjet:"Gabriel VINCENT"},
  "PJ446-1":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-2":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-3":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-4":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-5":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-6":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-7":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-8":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-9":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-10":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-11":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-12":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ449":{nomProjet:"ADUNA - KELSEN",pays:"Espagne",chefProjet:"Emmy BOURELLY"},
  "PJ456":{nomProjet:"ADDFIELD",pays:"UK",chefProjet:"Emmy BOURELLY"},
  "PJ457":{nomProjet:"GUACAMAYA",pays:"Colombie",chefProjet:"Gabriel VINCENT"},
  "PJ460-1":{nomProjet:"ULMATEC  CLV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ460-2":{nomProjet:"ULMATEC  CLV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ461-1":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-2":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-3":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-4":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-5":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ462-1":{nomProjet:"ULMATEC OCV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ462-2":{nomProjet:"ULMATEC OCV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ468-1":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-2":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-3":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-4":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-5":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ468-6":{nomProjet:"TAEHWA SKI",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ472":{nomProjet:"HANNES",pays:"Islande",chefProjet:"Emmy BOURELLY"},
  "PJ473":{nomProjet:"RIMS",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ479-1":{nomProjet:"EDF PEI",pays:"FR-La Réunion",chefProjet:"Clément MARTOUZET"},
  "PJ479-2":{nomProjet:"EDF PEI",pays:"FR-La Réunion",chefProjet:"Clément MARTOUZET"},
  "PJ485":{nomProjet:"BIOSORRA",pays:"Kenya",chefProjet:"Clément MARTOUZET"},
  "PJ486":{nomProjet:"ALBRET",pays:"France",chefProjet:"Emmy BOURELLY"},
  "PJ493-1":{nomProjet:"CDA E36",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ493-2":{nomProjet:"CDA E36",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ494-1":{nomProjet:"CDA F36",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ494-2":{nomProjet:"CDA F36",pays:"France",chefProjet:"Gabriel VINCENT"},
  "PJ488":{nomProjet:"KAGOSHIMA",pays:"Japon",chefProjet:"Gabriel VINCENT"},
  "PJ502":{nomProjet:"GRADIENT",pays:"Oman",chefProjet:"Emmy BOURELLY"},
  "PJ503":{nomProjet:"NOYA 1",pays:"Japon",chefProjet:"Gabriel VINCENT"},
  "PJ505":{nomProjet:"NOYA 2",pays:"Japon",chefProjet:"Gabriel VINCENT"},
  "PJ476":{nomProjet:"KBS-WP1 (études)",pays:"UK",chefProjet:"Clément BABLON"},
};
// Rempli en mémoire à la connexion, à partir du document Firestore "planning/pjMetaSync"
// (alimenté par le bouton "Sync depuis Suivi ORC" dans l'onglet Manager). Prioritaire sur PJ_META.
export let SYNCED_PJ_META={};
export function getPjMeta(pj,row){
  const synced=SYNCED_PJ_META[pj];
  const base=PJ_META[pj]||(()=>{
    const prefix=pj.split("-")[0];
    const fallbackKey=Object.keys(PJ_META).find(k=>k.split("-")[0]===prefix);
    return fallbackKey?PJ_META[fallbackKey]:{nomProjet:"—",pays:"—",chefProjet:"—"};
  })();
  const merged=synced?{...base,...synced}:base;
  // Si le nom n'est toujours pas renseigné, on utilise celui extrait de l'Excel à l'import (ex: "PJ503 - NOYA 1")
  if((!merged.nomProjet||merged.nomProjet==="—")&&row&&row.nomProjet){
    return{...merged,nomProjet:row.nomProjet};
  }
  return merged;
}
export function initials(name){
  if(!name||name==="—")return"—";
  const parts=name.trim().split(/\s+/);
  if(parts.length<2)return name.slice(0,3).toUpperCase();
  const prenom=parts[0],nom=parts[parts.length-1];
  return(prenom[0]+nom.slice(0,2)).toUpperCase();
}
export const COUNTRY_ISO={
  "France":"fr","UK":"gb","Nigeria":"ng","Corée":"kr","Espagne":"es",
  "Singapore":"sg","Norvège":"no","Islande":"is","Kenya":"ke",
  "FR-La Réunion":"re","Japon":"jp","Oman":"om",
  "Allemagne":"de","Zambie":"zm","Hong Kong":"hk","Colombie":"co",
};
export function driftColor(drift){
  if(drift==null||drift<=0)return null; // pas de décalage ou en avance : pas de pastille
  if(drift<=5)return T.amber500;
  if(drift<=15)return"#e8821a";
  return T.red500;
}
export function DriftDot({drift,size}){
  const c=driftColor(drift);
  if(!c)return null;
  const s=size||9;
  return <span title={"Décalage vs planning initial : +"+drift+"j"} style={{display:"inline-block",width:s,height:s,borderRadius:"50%",background:c,flexShrink:0,boxShadow:"0 0 0 2px #fff"}}/>;
}
export function PersonIcon({size,color}){
  const s=size||14;
  return(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
    <circle cx="12" cy="7.5" r="4.5" fill={color||"currentColor"}/>
    <path d="M4 21c0-4.42 3.58-8 8-8s8 3.58 8 8" fill={color||"currentColor"}/>
  </svg>);
}
export function CountryFlag({pays,size}){
  const iso=COUNTRY_ISO[pays];
  const h=size||14;
  if(!iso)return null;
  return <img src={"https://flagcdn.com/h20/"+iso+".png"} alt={pays} style={{height:h,width:"auto",minWidth:h*1.3,borderRadius:2,verticalAlign:"middle",boxShadow:"0 0 0 1px rgba(0,0,0,.06)",background:T.surfaceAlt}}
    onError={e=>{e.target.style.display="none";}}/>;
}

export const GAMME_COLORS={"180LTV3":T.teal500,"100LTV3":T.violet500,"40LTV3":T.emerald500,"180MT":T.red500,"100MT":"#c2761a","20LTV3":"#0e8fa8","10LTV3":"#6b9b1f","40LTV2R":T.amber500,"100LTV2R":"#9333ea","CONTENEUR":T.ink500};
export const ETAT_META={
  "SHIPPED":{bg:T.emerald100,text:T.emerald600,border:"#8fdcb8",bar:T.emerald500,label:"Expédiée"},
  "PROD":{bg:T.teal100,text:T.teal600,border:"#9bdce8",bar:T.teal500,label:"Production ENOGIA"},
  "En fabrication":{bg:"#fde9d2",text:"#c2630a",border:"#f5c690",bar:"#e8821a",label:"Fabrication FNR"},
  "STOCKAGE_EXT":{bg:"#e2e8f0",text:"#475569",border:"#cbd5e1",bar:"#64748b",label:"Stockage Externe"},
  "NOT ORDERED":{bg:"#fde4e1",text:"#c0392b",border:"#f4b8b1",bar:"#e8736a",label:"Non commandée"},
  "A_DEFINIR":{bg:T.surfaceAlt,text:T.ink500,border:T.ink100,bar:T.ink300,label:"À définir"}
};
export const ALL_ETATS=Object.keys(ETAT_META);
export const ASSIGNABLE_ETATS=ALL_ETATS.filter(e=>e!=="A_DEFINIR");
export const ALL_GAMMES=Object.keys(GAMME_COLORS);
export const MONTHS=["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
export const MONTHS_FULL=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
export const today=new Date();


export function setSyncedPjMeta(v){ SYNCED_PJ_META = v || {}; }
