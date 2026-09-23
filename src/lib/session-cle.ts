/**
 * Clé du localStorage où Supabase Auth range la session.
 *
 * Dans un fichier à part pour une seule raison : l'en-tête, présent sur TOUTES
 * les pages, lit cette clé pour afficher « Mon compte » plutôt que « Se
 * connecter ». L'importer depuis `supabase.ts` ferait entrer les 55 Ko du SDK
 * dans chaque page, landing comprise.
 */
export const CLE_SESSION = 'sb-lhxgxjkowkaobhuzxctv-auth-token';
