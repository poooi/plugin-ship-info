# Navy Staff sharing-size experiment

Status: measured experiment, not a released codec or plugin feature. The result supports omitting ship names/types from share payloads and resolving master IDs through a viewer-bundled catalog. It does not finalize the thematic alphabet or prove compatibility with a particular messaging service.

Current scope decision after the PoC: implement reference import/viewing only inside Navy Staff, as a read-only reference rather than an editable workspace import. Website decoding, browser WASM integration, and deployment are deferred. Preserve the measurements and local URL/QR viewer below as experiment artifacts; they do not require shipping a website or adding WASM to the plugin. `fleet.poi.moe` remains the intended future host. Compression selection for plugin use must be checked against the supported poi runtime and is separate from the browser decoder dependency measured here.

## Method

Run from the repository root with the pinned Node runtime:

```sh
node scripts/bench-navy-share.mjs
```

The [standalone script](../scripts/bench-navy-share.mjs) uses only Node built-ins and the [checked-in fixture](../scripts/fixtures/navy-share-benchmark.json). It writes detailed JSON/Markdown reports and a real Base64url sample to `.cache/navy-share/`. No installed poi instance or external service is used.

Measurements below used Node 24.22.0, zlib `1.3.2.1-motley-285e94b`, gzip level 6, and 30 deterministic samples at each of six scales. The fixture contains 840 playable master records and 13 captured activity group labels/colors, extracted from public poi fixtures at commit `540ab37072ea45c2229ef5424ed9c5431feea3f3`. Source paths and filtering are recorded in the fixture. These are generated plans using real identifiers and labels, not sampled user plans or evidence about how often particular sizes occur. The 480-ship case is a stress scenario; its extra labels are generated from the 13 source labels.

Each plan uses varied group populations, levels from 50 through 175, and at least one same-master/same-level duplicate. All formats retain schema version, a short title, distinct capture/export times, locale, and one captured label and color per group. The level-retaining formats preserve group order, row order, master IDs, and levels. The ID-only variant deliberately omits levels. No images, history, account IDs, owned-game IDs, unassigned roster, alternative localized labels, or per-ship observation timestamps are included.

The compact JSON shape is:

```json
{
  "v": 1,
  "t": "Example plan",
  "c": "2026-10-16T00:00:00Z",
  "e": "2026-10-17T00:00:00Z",
  "l": "zh-CN",
  "g": [["Group label", "#6699cc", [[1, 99], [1, 99]]]]
}
```

Rows are occurrences, so the two identical tuples represent two ships. A master ID identifies a game master record/form; it does not identify an owned copy. Reference-local positions distinguish the copies without transmitting account-scoped owned IDs. This example illustrates the shape; measurements use the fixed title and real labels recorded by the script.

## Share-text lengths

Values are median character counts, rounded to the nearest whole character. Every count includes a six-character prefix: `舰队密电一：` for thematic projections or `navy1:` for Base64url. CJK256 means eight bits per approved character; CJK128 means seven bits per character. Those CJK lengths are calculated from measured compressed bytes, conditional on selecting a suitable alphabet. They are not actual thematic copy/paste tests.

| Ships / groups | Compact JSON + gzip + CJK256, with levels | Same data, CJK128 | Same data, Base64url | CJK256 without levels | Varint binary + gzip + CJK256, with levels |
| --- | ---: | ---: | ---: | ---: | ---: |
| 12 / 2 | 225 | 257 | 298 | 190 | 154 |
| 36 / 6 | 417 | 476 | 554 | 327 | 319 |
| 72 / 8 | 601 | 686 | 800 | 442 | 481 |
| 120 / 12 | 886 | 1,012 | 1,179 | 627 | 707 |
| 240 / 13 | 1,350 | 1,542 | 1,798 | 870 | 1,070 |
| 480 / 20 | 2,278 | 2,603 | 3,035 | 1,368 | 1,806 |

Across the 30 generated samples, the 72-ship compact JSON case occupied 586–602 gzip bytes, or 592–608 CJK256 characters including the prefix. The 120-ship case occupied 872–888 bytes, or 878–894 characters. These narrow ranges reflect this generator's fixed metadata and distribution; longer user titles, labels, or extra fields can increase the result.

The main saving comes from payload content, before choosing the outer text alphabet:

| Ships / groups | Descriptive JSON with names/types | Same keyed JSON without names/types | Compact `[masterId, level]` JSON | Compact varint binary |
| --- | ---: | ---: | ---: | ---: |
| 72 / 8 | 1,455.5 B | 729.5 B | 595 B | 475 B |
| 120 / 12 | 2,146.5 B | 1,055 B | 879.5 B | 701 B |

These are gzip-byte medians; fractional medians result from averaging the middle two samples. Omitting names/types roughly halves compressed size in these cases. Short keys and tuples reduce it further. The small binary prototype saves about another 20% over compact JSON at these sizes, while requiring a custom encoder/decoder. It is an experimental comparison, not a proven minimum-size format.

CJK256 uses three UTF-8 bytes and typically two display columns per character. The 601-character case therefore occupies about 1,803 UTF-8 bytes and 1,202 columns, versus 800 bytes/columns for Base64url. Choose it for thematic presentation and fewer characters, not for minimum network bytes or display width. No target platform's message limit has been assumed.

## Catalog and vocabulary implications

The measured catalog is 50,551 bytes of compact JSON or 7,245 gzip bytes for 840 entries. It is bundled once with the viewer, not repeated in every share. This is one fixture snapshot with master names and type labels, not a complete multilingual production catalog. Compression gains rely on using that catalog to recover omitted display information. Updates must retain existing master records; an unknown master ID displays its ID placeholder until an updated catalog recognizes it. Names are not frozen historical labels in the share text.

The source ship names contain 264 distinct basic Han characters before curation. Some are uncommon, negative, or unsuitable as individual code symbols, so this does not establish that 256 acceptable characters can be selected from names alone. A 128-character alphabet costs about 14% more characters than 256 and still produces about 686–1,012 characters for the measured 72–120-ship cases. The final vocabulary can prioritize readability without losing the payload-minimization benefit.

## Verification and limits

- The primary agent independently reran all 900 scale/sample/format cases successfully, including gzip/Base64url decoding, semantic comparisons, duplicate preservation, version checks, and capture/export time preservation.
- Inline name/type fields in the descriptive baseline are checked, and a deliberately corrupted inline name is detected. Catalog-dependent variants are compared using the exact fixture catalog, not a live data source.
- Unknown numeric master ID `999999` remains present and resolves to `#999999`, with no invented name or network fetch. Missing master IDs in legacy rows are a separate schema case, not measured here.
- A final 72-ship sample, including both timestamps, was decoded in offline Chromium 156.0.8078.4 using native `DecompressionStream('gzip')`. The decoded JSON matched exactly, all 72 entries and 8 groups survived, and duplicate same-master/same-level entries remained distinct. That particular Base64url sample is 797 characters; the table reports medians across 30 samples, not that one sample.
- Local Node microbenchmarks used 20 warmups and 200 iterations. Compact JSON encode/decode averages were below 0.1 ms per operation in the primary run. This excludes application rendering, file dialogs, browser decoding, and clipboard interaction and is not an end-to-end latency guarantee.
- DeepSeek implemented the standalone experiment. Codex Sol reviewed the measurement method and found missing inline-label validation, omitted capture-time overhead, and an incorrect seven-bit/eight-bit description. All three were corrected before the final primary run.

No production codec, curated alphabet, chat-service round trip, malicious-input validation suite, live poi installation test, or full application test suite was exercised. The experiment is sufficient to assess payload size and browser gzip feasibility; it is not acceptance evidence for a released sharing feature.

Recommendation: use compact JSON with master IDs and levels as the initial sharing contract, retain essential group metadata, and provide a bundled catalog. Choose the thematic alphabet from actual readable samples. Keep the binary option as a measured tradeoff if reducing another roughly 20% is worth maintaining a custom format; do not drop levels merely to match the lower-information column's size.

## Compression and browser WASM comparison

Run the additional comparison with the pinned Node 24.22.0 runtime:

```sh
node scripts/bench-navy-share.mjs --compression
```

The [compression helper](../scripts/navy-compression-benchmark.mjs) reuses the same generator and serializers: six scales, 30 seeds per scale, compact JSON and varint binary, both retaining master IDs and levels. Every codec receives identical input bytes for a given sample. It tests gzip levels 6/9, Brotli qualities 5/9/11 (generic mode and input-size hint), and Zstd levels 3/9/19 without external dictionaries. Zstd includes its four-byte frame checksum (low 32 bits of XXH64); gzip includes CRC32. Brotli has no built-in checksum, and no additional integrity wrapper is counted. Runtime versions were Brotli 1.2.0 and Zstd 1.5.7.

The table shows median compressed bytes, without text encoding or an outer share prefix. Fractional values are medians of 30 integer measurements. Percentages in the generated report are paired per sample, so they need not equal percentages calculated from these marginal medians.

| Ships / groups | JSON gzip 6 | JSON Brotli 11 | JSON Zstd 19 | Binary gzip 6 | Binary Brotli 11 | Binary Zstd 19 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 12 / 2 | 219 | 188 | 212 | 148 | 153 | 143 |
| 36 / 6 | 410.5 | 355.5 | 409.5 | 313 | 302.5 | 304 |
| 72 / 8 | 595 | 517 | 586 | 475 | 445.5 | 462 |
| 120 / 12 | 879.5 | 762.5 | 856.5 | 701 | 656 | 689 |
| 240 / 13 | 1,344 | 1,169.5 | 1,302 | 1,063.5 | 996.5 | 1,054.5 |
| 480 / 20 | 2,271.5 | 1,957.5 | 2,155 | 1,800 | 1,548 | 1,799 |

Brotli 11 saves a paired median of 12.9% and 13.3% on the 72/120-ship JSON cases; Zstd 19 saves 1.5% and 2.6%. Binary plus gzip already beats JSON plus Brotli at those sizes. Adding Brotli to binary saves 6.7% and 6.2%; the 12-ship binary case becomes larger. Gzip 9 makes almost no difference here. Lower Brotli settings save less on JSON; lower Zstd settings sometimes exceed gzip size. These are corpus-specific findings, not a general ranking of compressors.

With the proposed 256-character alphabet and six-character prefix, JSON plus Brotli would still need medians of 523 and 768.5 characters for 72/120 ships, versus 601 and 885.5 with gzip. These are text-sharing projections, not measurements of scan-to-open QR links. For an ordinary camera to open a web viewer, the QR must contain a complete URL: JSON, compression, URL-safe text encoding, and the viewer address/format marker. Raw binary QR is a different interaction requiring a dedicated decoder and is not the current product path. Binary serialization comparisons above also do not decide which compressor to use for the JSON-to-URL path.

### Actual decoder cost

A separate local Playwright experiment loaded decoder-only packages [brotli-dec-wasm@2.3.2](https://www.npmjs.com/package/brotli-dec-wasm/v/2.3.2) and [zstddec@0.3.1](https://www.npmjs.com/package/zstddec/v/0.3.1) in Chromium 156.0.8078.4. Registry tarballs were checked against npm SHA-512 integrity metadata and extracted into the ignored experiment directory without installation scripts or project dependency changes.

| Decoder | Required browser assets, raw bytes | Same assets individually gzip-6 compressed | Approximate gzip transfer |
| --- | ---: | ---: | ---: |
| Brotli | 217,929 | 101,514 | 99.1 KiB |
| Zstd | 75,676 | 30,170 | 29.5 KiB |
| Browser-native gzip | No additional decoder asset | No additional decoder asset | 0 |

Brotli counts its entry module, JS wrapper and WASM file. Zstd counts its ESM module containing embedded WASM. These are actual required resource sizes for the tested packages, not package tarball sizes or optimized production-bundle measurements. Transfer estimates assume gzip serving, exclude HTTP headers and do not include the viewer/catalog common to all choices. Other builds or HTTP compression settings can change the costs. The WASM packages are decoders only; browser-side encoding was not tested. A plugin exporter could use native Node codecs if its supported host runtime provides them.

Five fresh browser contexts in one browser process loaded the modules through loopback HTTP, then went offline. Each decoded the seed-0 72/120-ship JSON and binary samples for gzip 9, Brotli 11 and Zstd 19: 60 valid-payload checks passed, byte-for-byte against native Node decompression. Zstd required no separately supplied output size on these frames. Browser-native `CompressionStream` and `DecompressionStream` accepted gzip/deflate/deflate-raw but rejected brotli/zstd in this Chromium build; HTTP content decoding is a separate capability.

Median module-fetch/parse/init times were 8.4 ms for Brotli and 2.8 ms for Zstd over loopback. This is neither cold-network nor fully cold-process latency; WASM compilation caches may benefit later contexts. Warm decoding of the tested small frames took roughly 0.01–0.03 ms for Brotli and 0.001–0.01 ms for Zstd. Native gzip's asynchronous stream path took about 0.2 ms. These API shapes and timer granularity differ, so the numbers establish adequate responsiveness rather than a fair throughput ranking. Native Node Brotli-11 compression averaged approximately 0.5–3.8 ms across the JSON scales, using three warmups and 25 iterations on seed 0; this is not a browser encoder measurement.

Detailed local artifacts are `.cache/navy-share/compression-report.{json,md}`, the 12 saved frames in `.cache/navy-share/compressed/`, and `.cache/navy-share/wasm-report.json`. The browser harness is `.cache/navy-share/check-compression-wasm.mjs`; it is a local experiment artifact, not a checked-in test or a clean-checkout reproduction command. No hostile-input decoder audit or full application suite was run.

### Scope of the initial comparison

These compression-only results do not justify rejecting Brotli for QR sharing. The relevant comparison is the same JSON through gzip/Brotli, URL-safe encoding and a complete viewer URL into an actual QR. Decoder download is a one-time/cacheable cost and must not be charged against each share. The URL/QR PoC below evaluates this complete path; binary serialization and thematic text length are separate questions. No production dependency or wire format is finalized by these experiments.

DeepSeek implemented the comparison; Codex Sol independently reviewed it and identified an imprecise Zstd checksum description, corrected to four bytes/low 32 bits of XXH64. The primary independently reran all 2,880 compression/decompression and semantic checks plus the original 900-case regression, with no failures, and ran the browser experiment above.

## Scan-to-open URL and QR PoC

The intended viewer address is **`https://fleet.poi.moe/`**. The measured path is:

```text
compact JSON -> gzip 6 or Brotli 11 -> unpadded Base64url
             -> https://fleet.poi.moe/#ns1:{g|b}:PAYLOAD -> QR in byte mode
camera/reader -> full URL -> viewer reads location.hash -> decompression -> plan
```

This is the same compact JSON, with master IDs and levels; no binary serialization, CJK encoding, server-side plan storage, or short-link service is involved. The `ns1` prefix and codec letters are experimental. The URL prefix is 29 ASCII bytes including the codec marker. A compressed payload of `n` bytes becomes `ceil(4*n/3)` unpadded Base64url characters, so the complete URL has `29 + ceil(4*n/3)` bytes. Base64url needs no further percent encoding in this fragment. The fragment remains available to the viewer but is not included in the HTTP request for the page; it is not encryption.

The [PoC helper](../scripts/navy-url-qr-poc.mjs) generates actual QR symbols using `qrcode-generator@2.0.4`, explicit byte mode and automatic version selection. The [browser viewer](../scripts/fixtures/navy-url-qr-viewer.html) renders metadata, group labels/colors, and ordered master ID/level rows. It deliberately does not load a ship-name catalog. Gzip uses native `DecompressionStream`; Brotli loads the tested WASM decoder only for Brotli links.

### Complete URL sizes

These are medians across the same 30 samples per scale, including the entire address and fragment prefix. ASCII character count equals URL byte count here.

| Ships / groups | gzip URL bytes | Brotli URL bytes |
| --- | ---: | ---: |
| 12 / 2 | 321 | 280 |
| 36 / 6 | 576.5 | 503.5 |
| 72 / 8 | 823 | 719 |
| 120 / 12 | 1,202 | 1,046 |
| 240 / 13 | 1,821 | 1,588.5 |
| 480 / 20 | 3,058 | 2,639.5 |

### Actual QR symbols

The following are **seed-0 samples**, not median QR versions. Every sample was generated independently at L/M/Q/H error correction; an overflow is recorded without reducing correction strength. Rendering uses four pixels per module and a four-module quiet zone on each side.

| Ships / groups | gzip URL bytes | Brotli URL bytes | gzip QR at M | Brotli QR at M |
| --- | ---: | ---: | --- | --- |
| 12 / 2 | 324 | 280 | V13, 69 x 69 modules | V12, 65 x 65 modules |
| 36 / 6 | 573 | 499 | V19, 93 x 93 modules | V17, 85 x 85 modules |
| 72 / 8 | 820 | 729 | V23, 109 x 109 modules | V22, 105 x 105 modules |
| 120 / 12 | 1,208 | 1,049 | V29, 133 x 133 modules | V26, 121 x 121 modules |
| 240 / 13 | 1,816 | 1,571 | V36, 161 x 161 modules | V33, 149 x 149 modules |
| 480 / 20 | 3,056 | 2,615 | Overflow | Overflow |

For 240 ships, Brotli also fits Q correction at V39 whereas gzip exceeds Q capacity. For 480 ships, gzip exceeds even L capacity; Brotli fits L at V38 (169 x 169 modules), but exceeds M/Q/H. The complete 480-ship URL ranges were 3,027–3,096 bytes for gzip and 2,600–2,665 for Brotli, so that capacity distinction holds across the sampled lengths. QR versions and scan reliability can change with metadata and longer payloads; this is not a guarantee for all plans.

### End-to-end checks and limitations

- The primary reran 360 full URL-fragment/Base64url/decompression/semantic round trips successfully.
- Of 48 seed-0 codec/scale/correction combinations, 38 fit a single symbol and 10 overflow. `jsqr@1.4.0` decoded 37 of the 38 ideal raster images to the exact original URL. One failure is retained: 120 ships, Brotli, L, V23. The benchmark exits with code 1 to expose this result, not a falsely passing summary.
- An independent `@zxing/library@0.23.0` browser reader decoded 30/38 images with normal detection. Its separately reported `PURE_BARCODE` diagnostic decoded all 38/38 when told that the image is an isolated, aligned QR. This verifies symbol contents but does not establish camera-detection reliability. Neither the decoder nor the QR version alone is established as the cause of the failures.
- In Chromium 156.0.8078.4, 11 SVG QR images were rasterized, read with jsQR, and their decoded URLs opened in the viewer (M where available, L for the 480-ship Brotli sample). The 480-ship gzip URL was tested by direct navigation because it cannot fit one QR. All 12 viewer loads preserved metadata, group colors/labels, row order, duplicate entries, IDs and levels. Requests contained no plan fragment; gzip links did not fetch Brotli resources.
- Browser requests for the exact `fleet.poi.moe` URLs were intercepted and fulfilled from local PoC files. This task did not deploy or verify a live site, scan with a physical phone, or exercise a phone camera's URL-recognition/length behavior.
- Codex Sol found stale content after fragment navigation and acceptance of unsupported JSON schema versions. DeepSeek fixed both. Independent browser checks passed for hash changes, delayed Brotli completion after switching plans, schema rejection, clearing old content, and recovery with a valid link.

The compression reduction therefore has a concrete QR benefit, including capacity thresholds. **Brotli WASM is worth considering for this JSON-to-URL path.** Its decoder is a shared, cacheable resource, not part of each QR. The remaining acceptance question is real camera/browser behavior at the intended display size; do not equate valid symbol capacity or software decoding with reliable physical scans.

### Running and inspecting the PoC

Use the pinned Node runtime. Experiment packages are extracted, without installation scripts or project dependency changes, under these directories:

- `.cache/navy-share/qr-deps/qrcode-generator/package`: `qrcode-generator@2.0.4`.
- `.cache/navy-share/qr-deps/jsqr/package`: `jsqr@1.4.0`.
- `.cache/navy-share/decoders/brotli-dec-wasm/package`: `brotli-dec-wasm@2.3.2`.
- `.cache/navy-share/qr-deps/zxing-library/package`: `@zxing/library@0.23.0`, used only for the independent diagnostic.

Registry tarballs were verified against their npm SHA-512 integrity metadata. The cache is not committed: on a clean checkout, obtain these exact npm tarballs and extract each into its parent directory above, retaining the tarball's `package/` folder. This explicit setup avoids adding experiment-only libraries to the workspace dependencies.

```sh
node scripts/bench-navy-share.mjs --url-qr
node scripts/bench-navy-share.mjs --url-qr --serve
```

The second command serves the gallery at `http://127.0.0.1:8123/`, including local viewer links, QR SVGs and reports. It does not publish anything to `fleet.poi.moe`. `NAVY_URL_QR_PORT` changes the local port; `--base-url` changes the measured viewer address. Generated QRs encode the intended address, while the gallery's local-viewer links exercise the same fragments locally.

Artifacts in `.cache/navy-share/url-qr/` include `url-qr-report.{json,md}`, `gallery.html`, seed-0 JSON/URL/compressed samples, 38 SVGs, `browser-report.json`, `zxing-report.json`, `qr-comparison-120.png`, and `viewer-120-brotli.png`. Local browser verification harnesses are `.cache/navy-share/check-url-qr-browser.mjs` and `.cache/navy-share/check-url-qr-zxing.mjs`; these are experiment artifacts, not committed application tests. No production plugin code, package manifests, or lockfiles were changed.
