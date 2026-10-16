// Host-provided ship image path boundary. The browser preview returns a local
// data-URI SVG so previews never issue external requests or 404s.
const SHIP_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="24" role="img">' +
    '<rect width="60" height="24" rx="3" fill="#394b59"/>' +
    '<rect x="6" y="9" width="48" height="6" rx="3" fill="#5f6b7c"/>' +
    '</svg>',
)}`

export const getShipImgPath = () => SHIP_IMAGE
