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
  teal600:"#B7C2DE", teal500:"#7C8EB8", teal400:"#95A4C6", teal100:"#1B2235",
  surface:"#12171D", surfaceAlt:"#171D24", card:"#1A2026",
  ink900:"#F0F1F0", ink700:"#C7CBCE", ink500:"#8E959B", ink300:"#565D63", ink100:"#242B32",
  line:"#262D34",
  // Équivalent sombre du gris neutre de la fiche projet, légèrement plus clair que card/surface
  // pour garder le même effet de "palier" qu'en mode clair sans jamais retomber sur le crème.
  neuPanel:"#20262D", neuPanelDim:"#262D34",
  amber600:"#E2A95A", amber500:"#C1831E", amber100:"#332812",
  emerald600:"#5FD4A8", emerald500:"#2B9C78", emerald100:"#132B22",
  violet600:"#B4A2E6", violet500:"#7C63B8", violet100:"#241F38",
  red600:"#E58A8A", red500:"#CB4848", red100:"#331D1D",
  ember600:"#EBA276", ember500:"#C97848", ember100:"#332016",
  shadowSm:"0 1px 2px rgba(0,0,0,.4)",
  shadowMd:"0 4px 16px rgba(0,0,0,.45), 0 1px 2px rgba(0,0,0,.3)",
  shadowLg:"0 16px 40px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.35)",
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
