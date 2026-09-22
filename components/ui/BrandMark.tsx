/* Supplied brand artwork is served intact at its original aspect ratio. */
/* eslint-disable @next/next/no-img-element */
export function BrandMark() {
  return (
    <span className="ip-brand-mark" aria-hidden="true">
      <img className="ip-brand-mark-light" src="/brand/icon-light.png" alt="" width={173} height={173} />
      <img className="ip-brand-mark-dark" src="/brand/icon-dark.png" alt="" width={173} height={173} />
    </span>
  );
}
