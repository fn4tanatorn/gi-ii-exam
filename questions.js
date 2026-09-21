// Question bank. Add questions by appending objects to this array.
//
//   image:   path/URL to a picture (e.g. "images/cxr-01.jpg"), or omit for a text-only question.
//            If the file is missing, a placeholder is shown instead.
//   caption: text shown under the image.
//   answer:  index of the correct option (0 = A, 1 = B, ...).
//   points:  score awarded for a correct answer (default 250).
window.QUESTIONS = [
  {
    image: "images/cxr-01.jpg",
    caption: "Fig. 01 — Chest X-ray (AP view)",
    stem: "A 58-year-old male presents with sudden-onset substernal chest pain radiating to his left arm, with shortness of breath and diaphoresis. Based on the clinical presentation and imaging, what is the most likely diagnosis?",
    options: [
      "Acute Myocardial Infarction",
      "Aortic Dissection",
      "Pulmonary Embolism",
      "Tension Pneumothorax",
      "Acute Pericarditis",
    ],
    answer: 0,
    explanation: "Crushing substernal pain radiating to the left arm with diaphoresis is the classic picture of acute coronary syndrome. The chest X-ray is essentially normal (no widened mediastinum, no pneumothorax, no effusion), which argues against dissection and tension pneumothorax. Next step: 12-lead ECG and troponin.",
  },
  {
    stem: "A 45-year-old woman has episodic right upper quadrant pain after fatty meals. She now has fever, jaundice, and RUQ pain. Which is the most likely diagnosis?",
    options: [
      "Acute cholecystitis",
      "Ascending cholangitis",
      "Acute pancreatitis",
      "Hepatitis A infection",
      "Peptic ulcer perforation",
    ],
    answer: 1,
    explanation: "Fever, jaundice and RUQ pain form Charcot's triad, which points to ascending cholangitis, usually from a stone blocking the common bile duct. Treat with antibiotics and urgent biliary drainage (ERCP).",
  },
  {
    stem: "A 62-year-old man with longstanding GERD undergoes endoscopy, which shows salmon-colored mucosa extending above the gastroesophageal junction. Biopsy is most likely to show which change?",
    options: [
      "Squamous cell hyperplasia",
      "Intestinal metaplasia with goblet cells",
      "Eosinophilic infiltration",
      "Candida pseudohyphae",
      "Adenocarcinoma in situ",
    ],
    answer: 1,
    explanation: "Barrett esophagus is the replacement of normal stratified squamous epithelium with columnar epithelium containing goblet cells (intestinal metaplasia). It raises the risk of esophageal adenocarcinoma.",
  },
];
