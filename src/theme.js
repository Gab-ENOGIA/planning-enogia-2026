// Les logos ENOGIA sont désormais de vrais fichiers SVG dans /public (enogia-logo-white.svg, enogia-logo-color.svg)

// ── DESIGN TOKENS ──────────────────────────────────────────────
// Palette ancrée sur le dégradé du logo ENOGIA (navy → teal) + un accent "braise"
// qui évoque le cycle thermique ORC (froid → chaud) pour les statuts urgents.
// Rendu plat et net (bordures fines + ombres discrètes) plutôt que néomorphisme :
// l'objectif est un outil industriel qui ressemble à un vrai produit, pas à un tableur.

const SHARED = {
  navy900:"#0B1130", navy800:"#131B49", navy700:"#1E2C66", navy600:"#2C3F8C",
  thermalGradient:"linear-gradient(90deg,#0B1130 0%,#1D2C4E 60%,#46587F 100%)",
  thermalGradientHot:"linear-gradient(90deg,#0B1130 0%,#1D2C4E 45%,#C9703F 100%)",
  // Fraunces en display : empattements fins, lettrage éditorial — le registre "premium" demandé,
  // en rupture avec les sans-serif techniques utilisées jusqu'ici (Space Grotesk/Montserrat/Sora).
  // Inter reste en corps de texte : c'est la police qui doit rester imperceptible et très lisible
  // dans un tableau dense de chiffres et de dates.
  // Roboto partout (demandé explicitement) — remplace Fraunces (titres) et Inter (corps), qui
  // créaient deux registres différents dans l'appli ; un seul token "display" et un seul token
  // "corps" pointent maintenant vers la même police, donc tout ce qui lisait T.fontDisplay/T.font
  // bascule automatiquement, sans toucher chaque composant. T.fontMono reste à part (traitement
  // volontaire "code" pour les identifiants PJ, déjà aligné entre la liste et la fiche projet).
  fontDisplay:"'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  font:"'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  fontMono:"'JetBrains Mono','SF Mono',Consolas,monospace",
  // Montserrat : réservée au titre de l'app et au gros chiffre du bandeau résumé (demande explicite),
  // le reste du registre "display" (ManagerPanel, etc.) reste en Fraunces pour l'instant.
  fontMontserrat:"'Montserrat',-apple-system,sans-serif",
};

const LIGHT = {
  ...SHARED,
  mode:"light",
  // RAL 5011 "Bleu acier" (#1D2C4E) — couleur demandée explicitement, en remplacement du bleu
  // indigo précédent. (le nom des tokens reste `teal*` pour ne pas devoir toucher tous les composants)
  teal600:"#121B30", teal500:"#1D2C4E", teal400:"#4B5D85", teal100:"#E8EAF0",
  // Crème 3e itération (demandé explicitement : "encore plus légère, subtile") — à peine teinté,
  // juste assez pour distinguer la page du blanc mat des cartes/bordures sans attirer l'œil.
  surface:"#FDFBF6", surfaceAlt:"#F8F3E6", card:"#FFFFFF",
  ink900:"#15181C", ink700:"#3D4349", ink500:"#6B7178", ink300:"#A7ACB1", ink100:"#E8E8E5",
  // Plus clair qu'avant et utilisé avec parcimonie désormais (TableView n'a quasi plus de filets) :
  // l'ancienne teinte lue comme une vraie bordure sombre sur le crème, "bizarre" d'après le retour.
  line:"#F2ECDD",
  // Gris neutre de la fiche projet ("blanche mate entièrement", sans le crème de la page) — déplacé
  // ici depuis une constante figée du fichier ProjectModal.js, qui ne changeait jamais en mode
  // sombre ("mettre le mode sombre en adéquation avec le mode clair") : un token T.* réagit comme
  // toutes les autres couleurs quand on bascule de thème.
  neuPanel:"#F5F5F3", neuPanelDim:"#ECECE9",
  amber600:"#9A5B10", amber500:"#C1831E", amber100:"#F8EEDD",
  emerald600:"#157A5E", emerald500:"#2B9C78", emerald100:"#E4F3EC",
  violet600:"#6249A3", violet500:"#7C63B8", violet100:"#EEEAF8",
  red600:"#AE3434", red500:"#CB4848", red100:"#FBEAEA",
  ember600:"#9E5226", ember500:"#C97848", ember100:"#F9EAE0",
  shadowSm:"0 1px 2px rgba(10,20,32,.06)",
  shadowMd:"0 4px 16px rgba(10,20,32,.08), 0 1px 2px rgba(10,20,32,.04)",
  shadowLg:"0 16px 40px rgba(10,20,32,.14), 0 2px 8px rgba(10,20,32,.06)",
  // Cartes plates : un trait fin + une ombre quasi invisible, au lieu du double-relief néomorphique.
  neuOut:"0 0 0 1px rgba(16,24,34,.07), 0 1px 2px rgba(16,24,34,.04)",
  neuOutSm:"0 0 0 1px rgba(16,24,34,.07)",
  neuIn:"inset 0 0 0 1px rgba(16,24,34,.09)",
  neuInSm:"inset 0 0 0 1px rgba(16,24,34,.08)",
};

const DARK = {
  ...SHARED,
  mode:"dark",
  // Mode sombre « ardoise douce » (demandé : « trop sombre, plus smooth ») : fond gris-bleu moyen, jamais noir, hiérarchie par la LUMINOSITÉ
  // (page < panneau < carte < panneau neutre) plutôt que par des ombres, filets fins plus lisibles.
  // « teal500 » est l'accent plein (fonds de boutons, aujourd'hui, barres) : choisi assez profond pour
  // que le texte blanc posé dessus reste lisible (≈4,6:1) ; « teal600 » est l'accent clair pour le TEXTE.
  teal600:"#BCC8E8", teal500:"#5C73B8", teal400:"#8FA2D6", teal100:"#2A3558",
  surface:"#222A34", surfaceAlt:"#313B48", card:"#2A333E",
  ink900:"#E9EDF2", ink700:"#C3CBD5", ink500:"#97A2AF", ink300:"#76818E", ink100:"#334050",
  line:"#3C4756",
  // Équivalent sombre du gris neutre de la fiche projet, légèrement plus clair que card/surface
  // pour garder le même effet de "palier" qu'en mode clair sans jamais retomber sur le crème.
  neuPanel:"#323C49", neuPanelDim:"#394453",
  // Les bleus « marine » du logo sont invisibles sur fond sombre : versions éclaircies (texte, dégradés).
  navy800:"#C9D3F0", navy700:"#3B4F94", navy600:"#6F86CC",
  amber600:"#E8B468", amber500:"#D29A33", amber100:"#3A3017",
  emerald600:"#6FD9B0", emerald500:"#2FA67F", emerald100:"#1B3A2F",
  violet600:"#BBA9EE", violet500:"#8A72C8", violet100:"#312A50",
  red600:"#F09A9A", red500:"#D65C5C", red100:"#402528",
  ember600:"#EBA276", ember500:"#C97848", ember100:"#40291C",
  shadowSm:"0 1px 2px rgba(0,0,0,.25)",
  shadowMd:"0 4px 14px rgba(0,0,0,.28), 0 1px 2px rgba(0,0,0,.2)",
  shadowLg:"0 14px 36px rgba(0,0,0,.38), 0 2px 8px rgba(0,0,0,.22)",
  neuOut:"0 0 0 1px rgba(255,255,255,.07), 0 1px 2px rgba(0,0,0,.3)",
  neuOutSm:"0 0 0 1px rgba(255,255,255,.07)",
  neuIn:"inset 0 0 0 1px rgba(255,255,255,.09)",
  neuInSm:"inset 0 0 0 1px rgba(255,255,255,.08)",
};

// T est un objet MUTABLE (même référence tout le temps) : setThemeMode() modifie ses champs en place.
// Comme tous les composants lisent T.xxx à chaque rendu, un changement de darkMode dans App()
// (qui force un re-rendu global) suffit à propager les nouvelles couleurs partout, sans avoir
// à faire transiter le thème par props/contexte dans chaque fichier.
export const T = { ...LIGHT };

export function setThemeMode(dark){
  Object.assign(T, dark ? DARK : LIGHT);
}

export function isDarkMode(){
  return T.mode==="dark";
}
