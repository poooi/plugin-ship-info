// Stub for the vendored html2canvas capture renderer. Capture is not exercised
// until a later layer; the plugin's captureRect catches and logs failures.
const html2canvas = async () => {
  throw new Error('html2canvas is not available in the browser preview')
}

export default html2canvas
