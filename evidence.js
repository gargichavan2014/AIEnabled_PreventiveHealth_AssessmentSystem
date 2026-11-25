(function (root) {
  root.HealthEvidence = [
    {
      organization: "World Health Organization",
      title: "Global oral health snapshot",
      summary: "WHO estimates that oral diseases affect nearly 3.7 billion people worldwide.",
      points: [
        "WHO lists free-sugar consumption, tobacco, alcohol and poor hygiene among modifiable shared risk factors.",
        "Its prevention guidance includes a balanced diet low in free sugars, water as the main drink, tobacco cessation and twice-daily brushing with fluoride toothpaste.",
      ],
      scope: "Global population-level information from the fact sheet dated March 17, 2025. Not a tongue-image interpretation guide.",
      url: "https://www.who.int/news-room/fact-sheets/detail/oral-health",
    },
    {
      organization: "U.S. Centers for Disease Control and Prevention",
      title: "Oral health in the United States",
      summary: "CDC reports cavities in permanent teeth for 57% of U.S. adolescents aged 12–19 and almost all U.S. adults aged 20 or older (90% or more as age increases).",
      points: [
        "The CDC page describes these as U.S. population figures; they do not estimate an individual patient's risk.",
        "General preventive measures include brushing twice daily, daily flossing, limiting foods and drinks high in added sugar, and routine dental visits.",
      ],
      scope: "United States population statistics on the CDC page (updated May 15, 2024). Not applicable as a tongue-image diagnostic threshold.",
      url: "https://www.cdc.gov/oral-health/about/index.html",
    },
    {
      organization: "U.S. Centers for Disease Control and Prevention",
      title: "BMI screening references",
      summary: "CDC defines adult BMI categories for ages 20+ and recommends age-/sex-specific growth-chart interpretation for children and teens.",
      points: [
        "BMI = weight in kilograms divided by height in metres squared.",
        "CDC adult ranges: underweight <18.5; healthy-weight range 18.5 to <25; overweight 25 to <30; obesity ≥30 kg/m².",
        "CDC describes BMI as a screening measure to consider with other health information, not a stand-alone diagnosis.",
      ],
      scope: "CDC adult categories are for ages 20 and older. Children and teens need age- and sex-specific BMI-for-age assessment; do not apply adult cutoffs.",
      url: "https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html",
    },
    {
      organization: "World Health Organization",
      title: "BMI and age-specific growth references",
      summary: "WHO states BMI is calculated from weight and height and that weight-status cutoffs differ by age group.",
      points: [
        "WHO uses BMI ≥25 for adult overweight and ≥30 for adult obesity.",
        "For children and adolescents, WHO uses age-based growth references rather than adult BMI categories.",
        "This app calculates BMI only; it does not produce child growth z-scores or percentiles.",
      ],
      scope: "WHO global reference. Individual assessment still requires clinical context and the applicable local guidance.",
      url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    },
    {
      organization: "National Institutes of Health",
      title: "NIH institutes and centers directory",
      summary: "An official directory of NIH institutes and centers, provided for research-source discovery.",
      points: [
        "An institutional directory is not itself a clinical guideline or a source for this app's BMI thresholds.",
        "Specific recommendations should cite the relevant primary guideline or study, including population and publication date.",
      ],
      scope: "Directory only. No patient data or proprietary institutional datasets are incorporated.",
      url: "https://www.nih.gov/institutes-nih/list-institutes-centers",
    },
    {
      organization: "ICMR–National Institute of Nutrition",
      title: "Dietary Guidelines for Indians, 2024",
      summary: "The official ICMR-NIN booklet is a national nutrition reference for India.",
      points: [
        "Open the original booklet for its full recommendations and population context.",
        "This prototype does not convert the guidelines into individual nutrition advice or tongue-finding rules.",
      ],
      scope: "ICMR-NIN publication. The source booklet—not a patient-level dataset—is linked here.",
      url: "https://www.nin.res.in/downloads/DGI_Booklet_English_CMYK.pdf",
    },
    {
      organization: "Mayo Clinic · public education",
      title: "Tongue-related patient education",
      summary: "An external patient-education reference; consult a qualified clinician for personal assessment.",
      points: [
        "The link is provided as general public education only.",
        "No Mayo Clinic patient records, proprietary clinical data, or model-training data are included in this prototype.",
      ],
      scope: "External educational resource. Page access was restricted during prototype research; no claims from it are used by the prototype.",
      url: "https://www.mayoclinic.org/symptoms/tongue-problems/basics/definition/sym-20050676",
    },
  ];
}(globalThis));
