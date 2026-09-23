/**
 * Client Supabase du site — MÊME projet que l'app mobile.
 *
 * Un compte créé ici ouvre une session dans l'app, et inversement : c'est tout
 * l'objet du lot 2 (SCRUM-202).
 *
 * L'URL et la clé sont écrites en dur, et c'est voulu. Une clé « publishable »
 * est faite pour être lue par n'importe quel navigateur : elle n'autorise que ce
 * que la RLS autorise au rôle `anon`, rien de plus. La passer par une variable
 * d'environnement n'en ferait pas un secret, et obligerait à la configurer à la
 * main dans Workers Builds, où un oubli produit un site qui se construit très
 * bien et ne sait plus connecter personne.
 *
 * Ce qui ne doit JAMAIS apparaître ici, ni nulle part sous `src/` :
 * `service_role`, `sk_live_`, `sk_test_`, `whsec_`. Ces clés vivent dans les
 * secrets des Edge Functions (lot 4), jamais dans le navigateur.
 *
 * Clé « publishable » (`sb_publishable_…`) et non la clé anon historique que
 * l'app embarque : même droits, mais elle se révoque seule. En cas d'abus depuis
 * le site, on la remplace sans forcer une mise à jour de l'app.
 */
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://lhxgxjkowkaobhuzxctv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DlnElnAVUwQs7NSDypOwgw_LA5Jdi0g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    /* Flux IMPLICITE, et surtout pas PKCE.
     *
     * En PKCE, le lien de confirmation ne marche que dans le navigateur qui a
     * fait l'inscription : il porte un `code` à échanger contre un secret resté
     * dans le localStorage de ce navigateur-là. S'inscrire sur l'ordinateur et
     * ouvrir le mail sur le téléphone — le cas le plus courant — échouerait.
     * En implicite, les jetons arrivent dans le fragment de l'URL, lisibles
     * partout. C'est aussi le flux de l'app (`sessionFromCallbackUrl`).
     *
     * Écrit explicitement même si c'est le défaut de la v2 : la v3 pourrait
     * changer de défaut, et la panne passerait inaperçue sur un seul appareil. */
    flowType: 'implicit',
    persistSession: true,
    autoRefreshToken: true,
    /* Désactivé : /auth/callback lit le fragment LUI-MÊME, puis appelle
     * `setSession`. Le SDK, lui, se lance de façon asynchrone dès l'import et
     * efface le fragment en passant — y compris quand il porte une erreur
     * (`#error_code=otp_expired`), que la page n'aurait alors jamais vue pour
     * l'expliquer. Même parti pris que l'app : `sessionFromCallbackUrl`. */
    detectSessionInUrl: false,
  },
});
