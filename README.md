# Preventive Health Assessment prototype

A dependency-free, browser-only prototype for a practitioner-led tongue image observation workflow. It supports image capture, descriptive observations, patient-reported symptoms, duration, pain and dry mouth, age, sex, country/region, height, weight, body temperature, blood pressure and heart rate, BMI calculation with age-appropriate reference wording, longitudinal follow-up by demo ID, printable structured reports, clinician-entered impressions and investigation planning, and a source-linked public-health reference panel.

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
- **CDC BMI guidance**: [adult BMI categories](https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html) and [BMI overview](https://www.cdc.gov/bmi/about/index.html). Adult categories appear only for ages 20 and older; BMI remains a screening measure.
- **WHO BMI guidance**: [obesity and overweight](https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight) and the [BMI-for-age growth reference](https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age).
- **NIH**: [institutes and centers directory](https://www.nih.gov/institutes-nih/list-institutes-centers) as a research-source index, not as clinical guidance.
- **ICMR-NIN**: a link to the [Dietary Guidelines for Indians, 2024](https://www.nin.res.in/downloads/DGI_Booklet_English_CMYK.pdf). The original booklet is linked rather than paraphrased into unsupported clinical rules.
- **Mayo Clinic** (assuming “myo clinic” means Mayo Clinic): an external link to [tongue-problem information](https://www.mayoclinic.org/symptoms/tongue-problems/basics/definition/sym-20050676). The page could not be accessed during prototype research, so no claims from it are included; no Mayo Clinic patient records or proprietary datasets are included.

BMI is calculated as weight (kg) / height (m)² and displayed to one decimal place. CDC adult screening categories appear only for ages 20 and older. For children under 20, the prototype indicates that age- and sex-specific growth-chart interpretation is needed; it does not calculate pediatric percentiles or z-scores. Country/region is recorded for clinician context but does not select national or ethnicity-specific cutoffs automatically. BMI is not a diagnosis and should be interpreted with the full clinical picture.

The user-listed research organizations do not share one universal primary-assessment protocol. Other than the explicitly cited WHO, CDC and ICMR-NIN references above, no institution-specific recommendations are claimed or encoded. NIH's directory and the user-provided Wikipedia category can help discover institutions but are not clinical evidence. The evidence panel is informational; no source is used to infer a diagnosis from a tongue image. References are bundled and do not auto-update.

## Prototype limitations and privacy

- There is no trained or validated AI model in this repository. Images are displayed for practitioner-entered description only; no automated image analysis or diagnosis occurs.
- Working diagnoses, tests/investigations considered, and follow-up plans in reports are optional practitioner-entered fields. The prototype does not generate these or recommend specific tests.
- Age, sex, country/region and vital signs are optional clinician-entered information. Basic range checks prevent implausible measurements. BMI is calculated from height and weight; its reference wording is limited by age as described above. No vital-sign interpretation or diagnosis is generated.
- Symptom duration, dry-mouth response and 0–10 pain score are optional patient-reported context; they are recorded for practitioner review and are not interpreted by the prototype.
- Every record requires demo consent and is saved with its image in this browser's unencrypted `localStorage`. Use synthetic data only—never real patient identifiers, photographs or health information.
- This is not a clinical product, secure record system or substitute for professional evaluation. A qualified practitioner must review every report and determine any next steps.
- No remote services are called by the app. External sources open only when a user follows a reference link.
