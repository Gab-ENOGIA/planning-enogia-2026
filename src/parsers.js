import { MONTHS } from "./pjMeta";

export function parseDateAny(s){
  if(!s)return null;
  s=String(s).trim();if(!s)return null;
  const mFR={"janvier":0,"février":1,"fevrier":1,"mars":2,"avril":3,"mai":4,"juin":5,"juillet":6,"août":7,"aout":7,"septembre":8,"octobre":9,"novembre":10,"décembre":11,"decembre":11};
  let m=s.match(/(\d+)\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/i);
  if(m){const mo=mFR[m[2].toLowerCase()];if(mo!==undefined)return new Date(+m[3],mo,+m[1]);}
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m)return new Date(+m[3],+m[2]-1,+m[1]);
  const d=new Date(s);return isNaN(d)?null:d;
}
export function fmt(d){if(!d)return"—";return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0");}
export function toLocalISO(d){if(!d)return null;return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
export function diffDays(a,b){if(!a||!b)return null;return Math.round((b-a)/86400000);}
export function fmtMode(d,mode){
  if(!d)return"—";
  if(mode==="semaine"){const j=new Date(d.getFullYear(),0,1);const w=Math.ceil(((d-j)/86400000+j.getDay()+1)/7);return"S"+String(w).padStart(2,"0");}
  if(mode==="mois")return MONTHS[d.getMonth()];
  return fmt(d);
}
export function guessGamme(pj){
  const n=pj.toUpperCase();
  if(n.includes("CONT"))return"CONTENEUR";
  if(n.match(/461|449|479|180MT/))return"180MT";
  if(n.includes("485")||n.includes("100MT"))return"100MT";
  if(n.includes("420"))return"100LTV2R";
  if(n.match(/456|472|460|503|100LT/))return"100LTV3";
  if(n.includes("SAV")||n.includes("40LTV2"))return"40LTV2R";
  if(n.includes("382-40")||n.includes("40LT"))return"40LTV3";
  if(n.includes("473")||n.includes("20LT"))return"20LTV3";
  if(n.includes("486")||n.includes("10LT"))return"10LTV3";
  return"180LTV3";
}

export function parseWorkHours(s){
  if(!s)return 0;
  const m=String(s).replace(",",".").match(/([\d.]+)/);
  return m?parseFloat(m[1]):0;
}
// ── SYNCHRONISATION AVEC LE GOOGLE SHEET "Revue des Affaires ORC/EPC" (onglet "Suivi ORC") ──
export const SUIVI_ORC_SHEET_ID="1Qu-MMsO4IfZ1nMOdLC2sHbussYv349SxjuFSI47fSis";
export const SUIVI_ORC_TAB_NAME="Suivi ORC";
export function parseCSV(text){
  // Parseur CSV minimal gérant les champs entre guillemets (avec virgules/retours à la ligne à l'intérieur)
  const rows=[];let row=[];let field="";let inQuotes=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(inQuotes){
      if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else inQuotes=false; }
      else field+=c;
    }else{
      if(c==='"')inQuotes=true;
      else if(c===','){row.push(field);field="";}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field="";}
      else if(c==='\r'){/* ignoré */}
      else field+=c;
    }
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows;
}
export async function fetchSuiviORC(){
  const url="https://docs.google.com/spreadsheets/d/"+SUIVI_ORC_SHEET_ID+"/gviz/tq?tqx=out:csv&sheet="+encodeURIComponent(SUIVI_ORC_TAB_NAME);
  const res=await fetch(url);
  if(!res.ok)throw new Error("Impossible d'accéder au Google Sheet (HTTP "+res.status+"). Vérifiez que le document est bien partagé en \"Lecteur\" pour toute personne disposant du lien.");
  const csvText=await res.text();
  const rows=parseCSV(csvText);
  if(!rows||rows.length<2)throw new Error("Le Google Sheet semble vide ou l'onglet \""+SUIVI_ORC_TAB_NAME+"\" est introuvable.");
  const header=rows[0].map(h=>(h||"").toString().trim().toLowerCase());
  const iNPJ=header.findIndex(h=>h.includes("n°pj")||h.includes("n° pj"));
  const iNomPJ=header.findIndex(h=>h.includes("nom pj"));
  const iNomProjet=header.findIndex(h=>h.includes("nom projet"));
  const iPays=header.findIndex(h=>h==="pays");
  const iTaille=header.findIndex(h=>h.includes("taille machine"));
  const iChef=header.findIndex(h=>h.includes("chef de projet"));
  if(iNomPJ<0||iNomProjet<0)throw new Error("Colonnes attendues introuvables dans l'onglet \""+SUIVI_ORC_TAB_NAME+"\" (Nom PJ / Nom projet).");
  const meta={};const gamme={};
  for(let i=1;i<rows.length;i++){
    const r=rows[i];if(!r)continue;
    const key=((r[iNomPJ]||r[iNPJ]||"").toString().trim());
    if(!key)continue;
    meta[key]={
      nomProjet:((r[iNomProjet]||"").toString().trim())||"—",
      pays:((r[iPays]||"").toString().trim())||"—",
      chefProjet:((r[iChef]||"").toString().trim())||"—",
    };
    if(iTaille>=0){const t=(r[iTaille]||"").toString().trim();if(t)gamme[key]=t;}
  }
  return{meta,gamme,count:Object.keys(meta).length};
}

export function parseMSProjectRows(rows,affectationRows){
  if(!rows||rows.length<2)return null;
  const header=rows[0].map(h=>(h||"").toString().toLowerCase().trim());
  const iNom=header.findIndex(h=>h.includes("nom")||h.includes("name"));
  const iDeb=header.findIndex(h=>h.includes("début")||h.includes("debut")||h.includes("start"));
  const iFin=header.findIndex(h=>h.includes("fin")||h.includes("finish")||h.includes("end"));
  const iNiv=header.findIndex(h=>h.includes("niveau")||h.includes("level")||h.includes("hiérar")||h.includes("hierar"));
  if(iNom<0||iDeb<0)return null;

  // Préparation des lignes d'affectation (charge de travail par tâche/ressource), si fournies
  let affIdx=0,aHeader=null,aNom=-1,aRes=-1,aTrav=-1;
  if(affectationRows&&affectationRows.length>1){
    aHeader=affectationRows[0].map(h=>(h||"").toString().toLowerCase().trim());
    aNom=aHeader.findIndex(h=>h.includes("tâche")||h.includes("tache"));
    aRes=aHeader.findIndex(h=>h.includes("ressource"));
    aTrav=aHeader.findIndex(h=>h==="travail"||(h.includes("travail")&&!h.includes("%")&&!h.includes("achevé")));
  }
  const STEP_NAMES_FR=["arrivée","production","tests","fin de production","départ"];
  const nextAffectationFor=stepNameFR=>{
    // Avance dans Table_affectation tant que le nom de tâche correspond bien à l'étape attendue (alignement séquentiel)
    if(aNom<0||!affectationRows)return null;
    if(affIdx>=affectationRows.length-1)return null;
    const row=affectationRows[affIdx+1];
    if(!row)return null;
    const nom=(row[aNom]||"").toString().trim().toLowerCase();
    if(nom!==stepNameFR)return null; // désynchronisé : on ne consomme pas, on abandonne le suivi pour ce PJ
    affIdx++;
    return{ressource:(row[aRes]||"").toString().trim(),heures:parseWorkHours(row[aTrav])};
  };

  const STEP_MAP={"arrivée":"arrivee","arrivee":"arrivee","tests":"tests","fin de production":"finProd","départ":"depart","depart":"depart"};
  const out=[];let cur=null;

  for(let i=1;i<rows.length;i++){
    const row=rows[i];if(!row||row.length<2)continue;
    const nom=(row[iNom]||"").toString().trim();if(!nom)continue;
    const deb=parseDateAny(row[iDeb]);
    const fin=iFin>=0?parseDateAny(row[iFin]):null;
    const niv=iNiv>=0?parseInt(row[iNiv])||0:0;
    const nomL=nom.toLowerCase().trim();

    if(niv===1||(niv===0&&!STEP_MAP[nomL]&&nomL!=="production")){
      const pjM=nom.match(/PJ[\w-]+/i)||nom.match(/SAV\d+/i);
      const pjCode=pjM?pjM[0].toUpperCase():nom.split(/[-–]/)[0].trim();
      // Récupère le nom de projet éventuellement présent après le code, ex "PJ503 - NOYA 1" → "NOYA 1"
      let nomExtrait=null;
      if(pjM){
        const rest=nom.slice(pjM.index+pjM[0].length).replace(/^[\s\-–:]+/,"").trim();
        if(rest)nomExtrait=rest;
      }
      cur={pj:pjCode,nom:nom,nomExtrait:nomExtrait,gamme:guessGamme(pjCode),etat:"A_DEFINIR",arrivee:null,tests:null,testsFin:null,finProd:null,depart:null,
        heuresAtelier:0,heuresAutom:0,production:null};
      out.push(cur);
    } else if(cur&&(STEP_MAP[nomL]||nomL==="production")){
      const k=STEP_MAP[nomL];
      if(k){cur[k]=deb;if(k==="tests")cur.testsFin=fin;}
      if(nomL==="production")cur.production=deb;
      const aff=nextAffectationFor(nomL);
      if(aff){
        const r=aff.ressource.toLowerCase();
        if(r.includes("atelier"))cur.heuresAtelier+=aff.heures;
        else if(r.includes("autom"))cur.heuresAutom+=aff.heures;
      }
    }
  }
  // L'état n'est plus calculé automatiquement : il démarre à "À définir" et c'est au Manager de le fixer manuellement.
  const filtered=out.filter(p=>p.arrivee||p.depart);
  return filtered.map(p=>({
    pj:p.pj,gamme:p.gamme,etat:p.etat,
    nomProjet:p.nomExtrait||null,
    arrivee:toLocalISO(p.arrivee),
    tests:toLocalISO(p.tests),
    testsFin:toLocalISO(p.testsFin),
    finProd:toLocalISO(p.finProd),
    depart:toLocalISO(p.depart),
    heuresAtelier:p.heuresAtelier,
    heuresAutom:p.heuresAutom,
  }));
}


export function weekStartOf(d){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x;}
