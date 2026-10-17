// Navy Staff read-only reference module.
//
// Wire: DecodedReference -> compact JSON -> Brotli q11 -> Base64url -> ns1:b:...
// Decode accepts the exact current `ns1:b:` code (raw or the exact
// `https://fleet.poi.moe/#ns1:b:...` URL); older/newer versions and other
// codecs are rejected. There is no bundled master catalog: names/types come from
// the current poi Redux master data at display time, and missing metadata shows a
// `???` fallback while preserving the master ID and level. Import is read-only
// and never writes an editable workspace or persistence.

export {
  REFERENCE_SCHEMA_VERSION,
  type DecodedReference,
  type DecodedReferenceGroup,
  type DecodedReferenceShip,
  type ReferenceGroupTuple,
  type ReferenceLevel,
  type ReferenceMasterId,
  type ReferenceRow,
  type SerializedReferenceV1,
} from './types.ts'

export {
  decodeReference,
  encodeReference,
  isNavyReferenceError,
  NavyReferenceError,
  REFERENCE_LIMITS,
  type NavyReferenceErrorCode,
} from './codec.ts'

export {
  projectReference,
  resolveShip,
  UNKNOWN_SHIP_NAME,
  type MasterCatalog,
  type ProjectedGroup,
  type ProjectedReference,
  type ProjectedShip,
  type ReferenceMaster,
  type ReferenceTypeCount,
  type ResolvedShip,
} from './catalog.ts'

export { captureReference, type CaptureReferenceOptions } from './capture.ts'

export {
  ReferenceTools,
  type ReferenceToolsProps,
} from './reference-tools.tsx'

export {
  ShareTools,
  type ShareToolsProps,
} from './share-tools.tsx'

export {
  ReferenceView,
  type ReferenceViewProps,
} from './reference-view.tsx'

export {
  createRequestGuard,
  errorMessageKey,
  filterProjectedReference,
  groupShipsByType,
  inputWithinLimit,
  shareFileName,
  type AreaShip,
  type ReferenceErrorMessageKey,
  type RequestGuard,
  type TypeGroup,
} from './helpers.ts'
