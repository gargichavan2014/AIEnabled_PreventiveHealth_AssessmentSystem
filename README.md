# Preventive Health Assessment prototype

A dependency-free, browser-only prototype for a practitioner-led tongue image observation workflow. It supports image capture, descriptive observations, patient-provided context, longitudinal follow-up by demo ID, printable structured reports, and a small source-linked public-health reference panel.

## Install as a browser app

The app is a Progressive Web App (PWA): it includes an install manifest, app icon, and a service worker for caching the static app shell. On Windows, run `serve.ps1` from this folder in PowerShell, open **http://localhost:4173/** in a supported browser, and choose **Install app** (or the browser's install option). Keep the PowerShell window open while using the app; press Ctrl+C to stop the local server. The server binds to loopback only and serves files from this folder. The in-app install button appears when the browser supports the install prompt. Opening `index.html` directly using `file://` is for preview only; browsers do not allow PWA installation or service workers from a file URL. On mobile, use the browser's **Add to Home Screen** option when available.

There are no app dependencies or build step. The service worker caches only the static HTML/CSS/JavaScript/manifest/icon shell; assessment photos and patient records are not sent to or cached by the service worker. For a local preview, opening `index.html` in a modern browser is sufficient. The unit tests use Node.js:

```sh
npm test
```

## Included public-health references

`evidence.js` contains a small, static set of references and explicitly scoped summaries:

- **WHO**: global oral-health burden, shared risk factors and general prevention guidance from the [Oral health fact sheet](https://www.who.int/news-room/fact-sheets/detail/oral-health).
- **CDC**: U.S.-specific cavity prevalence estimates and general prevention information from [About Oral Health](https://www.cdc.gov/oral-health/about/index.html).
- **ICMR-NIN**: a link to the [Dietary Guidelines for Indians, 2024](https://www.nin.res.in/downloads/DGI_Booklet_English_CMYK.pdf). The original booklet is linked rather than paraphrased into unsupported clinical rules.
- **Mayo Clinic** (assuming “myo clinic” means Mayo Clinic): an external link to [tongue-problem information](https://www.mayoclinic.org/symptoms/tongue-problems/basics/definition/sym-20050676). The page could not be accessed during prototype research, so no claims from it are included; no Mayo Clinic patient records or proprietary datasets are included.

The evidence panel is informational only. Its contents are not used to interpret tongue photographs, generate diagnoses, calculate patient risk, or provide individualized advice. The CDC numbers are explicitly U.S. population figures; consult each original source for its methods, population and current recommendations. References are bundled in the prototype and do not auto-update.

## Prototype limitations and privacy

- There is no trained or validated AI model in this repository. Images are displayed for practitioner-entered description only; no automated image analysis or diagnosis occurs.
- Every record requires demo consent and is saved with its image in this browser's unencrypted `localStorage`. Use synthetic data only—never real patient identifiers, photographs or health information.
- This is not a clinical product, secure record system or substitute for professional evaluation. A qualified practitioner must review every report and determine any next steps.
- No remote services are called by the app. External sources open only when a user follows a reference link.
