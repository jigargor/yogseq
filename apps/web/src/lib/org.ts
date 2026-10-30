/** Métier Studio org home — used for light “by Métier Studio” attribution. */
export const ORG_NAME = "Métier Studio";
export const ORG_HOME_URL = "https://metierstudio.com";
export const PRODUCT_NAME = "Yogseq";

/**
 * Live Worker origin.
 * Target hostname is yogseq.metierstudio.com (after Namecheap → Cloudflare NS).
 * Until the .com zone is on the deploy account, production uses .org.
 * See docs/metier-deploy.md.
 */
export const PRODUCTION_ORIGIN = "https://yogseq.metierstudio.org";
export const PRODUCTION_ORIGIN_TARGET = "https://yogseq.metierstudio.com";
