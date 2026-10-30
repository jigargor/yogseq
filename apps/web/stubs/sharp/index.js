/** Stub: native sharp cannot run on Cloudflare Workers. Keep next/image unoptimized. */
function sharp() {
  throw new Error("sharp is unavailable in the Yogseq Worker runtime");
}

module.exports = sharp;
module.exports.default = sharp;
module.exports.sharp = sharp;
