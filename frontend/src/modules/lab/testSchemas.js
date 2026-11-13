/**
 * Structured Test Parameter Schemas & Clinical Validation Rules.
 * Ported directly from reference/html-frontend/lab/lab.js.
 */

export const TEST_PARAM_SCHEMAS = {
  lipid: {
    key: "lipid",
    title: "Lipid Profile Panel",
    params: [
      { id: "totalChol", name: "Total Cholesterol", unit: "mg/dL", ref: "< 200 mg/dL", normalVal: 175, highVal: 245, min: 40, max: 1000 },
      { id: "triglycerides", name: "Triglycerides", unit: "mg/dL", ref: "< 150 mg/dL", normalVal: 125, highVal: 220, min: 20, max: 2000 },
      { id: "hdl", name: "HDL Cholesterol", unit: "mg/dL", ref: "> 40 mg/dL", normalVal: 48, highVal: 32, min: 10, max: 200 },
      { id: "ldl", name: "LDL Cholesterol", unit: "mg/dL", ref: "< 100 mg/dL", normalVal: 102, highVal: 168, min: 20, max: 800 },
    ],
  },
  cbc: {
    key: "cbc",
    title: "Complete Blood Count (CBC)",
    params: [
      { id: "hb", name: "Hemoglobin (Hb)", unit: "g/dL", ref: "12.0 - 16.0 g/dL", normalVal: 14.2, highVal: 8.5, min: 2.5, max: 25.0 },
      { id: "wbc", name: "Total WBC Count", unit: "x10³/µL", ref: "4.5 - 11.0 x10³/µL", normalVal: 7.2, highVal: 15.8, min: 0.5, max: 100.0 },
      { id: "platelets", name: "Platelet Count", unit: "x10³/µL", ref: "150 - 450 x10³/µL", normalVal: 260, highVal: 95, min: 10, max: 2000 },
      { id: "rbc", name: "RBC Count", unit: "x10⁶/µL", ref: "4.5 - 5.5 x10⁶/µL", normalVal: 4.8, highVal: 3.2, min: 1.0, max: 10.0 },
    ],
  },
  glucose: {
    key: "glucose",
    title: "Fasting Blood Sugar / Glucose",
    params: [
      { id: "fbs", name: "Blood Glucose (Fasting)", unit: "mg/dL", ref: "70 - 99 mg/dL", normalVal: 88, highVal: 172, min: 30, max: 1000 },
    ],
  },
  ppbs: {
    key: "ppbs",
    title: "Post Prandial Blood Sugar",
    params: [
      { id: "ppbs", name: "Blood Glucose (PP)", unit: "mg/dL", ref: "< 140 mg/dL", normalVal: 115, highVal: 220, min: 30, max: 1000 },
    ],
  },
  hba1c: {
    key: "hba1c",
    title: "Glycated Hemoglobin (HbA1c)",
    params: [
      { id: "hba1c", name: "HbA1c", unit: "%", ref: "< 5.7%", normalVal: 5.2, highVal: 8.4, min: 3.0, max: 20.0 },
    ],
  },
  urine: {
    key: "urine",
    title: "Urine Routine Examination",
    params: [
      { id: "urineColor", name: "Color & Appearance", unit: "Visual", ref: "Pale Yellow, Clear", normalVal: "Pale Yellow / Clear", highVal: "Turbid Amber", isText: true },
      { id: "urinePH", name: "pH", unit: "pH", ref: "5.0 - 7.0", normalVal: 6.0, highVal: 8.5, min: 4.0, max: 9.0 },
      { id: "urineProtein", name: "Protein / Albumin", unit: "Semi-quant", ref: "Nil", normalVal: "Nil", highVal: "2+ (Positive)", isText: true },
      { id: "urineSugar", name: "Sugar / Glucose", unit: "Semi-quant", ref: "Nil", normalVal: "Nil", highVal: "1+ (Positive)", isText: true },
      { id: "urinePus", name: "Pus Cells / WBC", unit: "/HPF", ref: "0 - 2 /HPF", normalVal: "1-2 /HPF", highVal: "15-20 /HPF", isText: true },
    ],
  },
  thyroid: {
    key: "thyroid",
    title: "Thyroid Profile (TFT)",
    params: [
      { id: "tsh", name: "TSH", unit: "µIU/mL", ref: "0.4 - 4.2 µIU/mL", normalVal: 2.1, highVal: 8.6, min: 0.01, max: 150.0 },
      { id: "ft4", name: "Free T4", unit: "ng/dL", ref: "0.8 - 1.8 ng/dL", normalVal: 1.2, highVal: 0.5, min: 0.1, max: 20.0 },
    ],
  },
  lft: {
    key: "lft",
    title: "Liver Function Test (LFT)",
    params: [
      { id: "bilirubin", name: "Total Bilirubin", unit: "mg/dL", ref: "0.2 - 1.2 mg/dL", normalVal: 0.7, highVal: 3.2, min: 0.1, max: 50.0 },
      { id: "sgot", name: "SGOT / AST", unit: "U/L", ref: "8 - 40 U/L", normalVal: 24, highVal: 110, min: 1, max: 2000 },
      { id: "sgpt", name: "SGPT / ALT", unit: "U/L", ref: "7 - 56 U/L", normalVal: 28, highVal: 145, min: 1, max: 2000 },
    ],
  },
  kft: {
    key: "kft",
    title: "Kidney Function Test (KFT)",
    params: [
      { id: "creatinine", name: "Serum Creatinine", unit: "mg/dL", ref: "0.6 - 1.2 mg/dL", normalVal: 0.9, highVal: 2.8, min: 0.2, max: 30.0 },
      { id: "urea", name: "Blood Urea", unit: "mg/dL", ref: "15 - 40 mg/dL", normalVal: 26, highVal: 85, min: 2, max: 400 },
    ],
  },
  hemoglobin: {
    key: "hemoglobin",
    title: "Hemoglobin (Hb)",
    params: [
      { id: "hb_single", name: "Hemoglobin", unit: "g/dL", ref: "12.0 - 16.0 g/dL", normalVal: 14.0, highVal: 8.2, min: 2.5, max: 25.0 },
    ],
  },
  xray: {
    key: "xray",
    title: "Chest X-Ray PA View",
    params: [
      { id: "lungFields", name: "Lung Fields & Pleura", unit: "Visual", ref: "Clear, normal vascularity", normalVal: "Clear, no infiltrates or effusion", highVal: "Infiltrates noted in lower zone", isText: true },
      { id: "cardioRatio", name: "Cardiothoracic Ratio (CTR)", unit: "Ratio", ref: "< 0.50", normalVal: 0.44, highVal: 0.58, min: 0.20, max: 0.90 },
      { id: "impression", name: "Radiological Impression", unit: "Impression", ref: "Normal PA View", normalVal: "Normal Chest Radiograph", highVal: "Cardiomegaly / Active Lesion", isText: true },
    ],
  },
};

/**
 * Returns the matching test schema for a test name string.
 */
export function getTestSchema(testName) {
  const name = String(testName || "").toLowerCase();
  if (name.includes("x-ray") || name.includes("chest") || name.includes("radiology")) return TEST_PARAM_SCHEMAS.xray;
  if (name.includes("lipid") || name.includes("cholesterol")) return TEST_PARAM_SCHEMAS.lipid;
  if (name.includes("cbc") || name.includes("complete blood count") || name.includes("blood count")) return TEST_PARAM_SCHEMAS.cbc;
  if (name.includes("ppbs") || name.includes("post prandial")) return TEST_PARAM_SCHEMAS.ppbs;
  if (name.includes("fbs") || name.includes("fasting") || name.includes("glucose") || name.includes("sugar")) return TEST_PARAM_SCHEMAS.glucose;
  if (name.includes("hba1c") || name.includes("glycated")) return TEST_PARAM_SCHEMAS.hba1c;
  if (name.includes("urine")) return TEST_PARAM_SCHEMAS.urine;
  if (name.includes("thyroid") || name.includes("tsh") || name.includes("t3") || name.includes("t4")) return TEST_PARAM_SCHEMAS.thyroid;
  if (name.includes("lft") || name.includes("liver")) return TEST_PARAM_SCHEMAS.lft;
  if (name.includes("kft") || name.includes("kidney") || name.includes("renal") || name.includes("creatinine")) return TEST_PARAM_SCHEMAS.kft;
  if (name.includes("hemoglobin") || name.includes("hb")) return TEST_PARAM_SCHEMAS.hemoglobin;
  return null;
}

/**
 * Standard test metadata (sample type, normal value, charge) for known lab tests.
 */
export function getStandardTestMeta(testName) {
  const name = String(testName || "").toLowerCase();
  if (name.includes("lipid") || name.includes("cholesterol")) {
    return { sampleType: "Serum", normalValue: "Total Chol: < 200 mg/dL, Triglycerides: < 150 mg/dL", charge: 400 };
  }
  if (name.includes("cbc") || name.includes("blood count")) {
    return { sampleType: "Whole Blood (EDTA)", normalValue: "Hb: 12-16 g/dL, WBC: 4.5-11.0 x10³/µL, Plt: 150-450 x10³/µL", charge: 350 };
  }
  if (name.includes("glucose") || name.includes("sugar")) {
    return { sampleType: "Fluoride Plasma", normalValue: "Fasting: 70 - 99 mg/dL", charge: 150 };
  }
  if (name.includes("hba1c")) {
    return { sampleType: "Whole Blood (EDTA)", normalValue: "< 5.7% (Normal), 5.7-6.4% (Prediabetic)", charge: 450 };
  }
  if (name.includes("urine")) {
    return { sampleType: "Clean Catch Midstream Urine", normalValue: "Color: Pale Yellow, pH: 5.0-7.0, Protein: Nil, Sugar: Nil", charge: 200 };
  }
  if (name.includes("thyroid") || name.includes("tsh")) {
    return { sampleType: "Serum", normalValue: "TSH: 0.4 - 4.2 µIU/mL, Free T4: 0.8 - 1.8 ng/dL", charge: 500 };
  }
  if (name.includes("lft") || name.includes("liver")) {
    return { sampleType: "Serum", normalValue: "Total Bilirubin: 0.2-1.2 mg/dL, SGOT: 8-40 U/L, SGPT: 7-56 U/L", charge: 450 };
  }
  if (name.includes("kft") || name.includes("kidney") || name.includes("creatinine")) {
    return { sampleType: "Serum", normalValue: "Serum Creatinine: 0.6-1.2 mg/dL, Blood Urea: 15-40 mg/dL", charge: 400 };
  }
  if (name.includes("x-ray") || name.includes("chest")) {
    return { sampleType: "Radiology / Imaging", normalValue: "Clear lung fields, normal CTR (<0.50), no active lesion", charge: 350 };
  }
  return { sampleType: "Blood / Specimen", normalValue: "Standard Biological Reference Range", charge: 250 };
}

/**
 * Validates parameter values according to clinical rules.
 */
export function validateTestReadings(schema, readings = {}) {
  if (!schema || !Array.isArray(schema.params)) {
    return { valid: true };
  }

  for (const p of schema.params) {
    const raw = readings[p.id];
    const val = raw !== undefined && raw !== null ? String(raw).trim() : "";

    if (!val) {
      return {
        valid: false,
        paramId: p.id,
        error: `Please enter a measured value for "${p.name}".`,
      };
    }

    if (!p.isText) {
      const num = parseFloat(val);
      if (isNaN(num)) {
        return {
          valid: false,
          paramId: p.id,
          error: `"${p.name}" must be a valid numeric measurement.`,
        };
      }
      // Strict clinical check: cannot be 0 or negative
      if (num <= 0) {
        return {
          valid: false,
          paramId: p.id,
          error: `Validation Error: "${p.name}" cannot be 0 or negative. An analyzer reading must be greater than 0 ${p.unit}.`,
        };
      }
      if (p.min !== undefined && num < p.min) {
        return {
          valid: false,
          paramId: p.id,
          error: `Value for "${p.name}" (${num}) is implausibly low. Minimum clinical threshold is ${p.min} ${p.unit}.`,
        };
      }
      if (p.max !== undefined && num > p.max) {
        return {
          valid: false,
          paramId: p.id,
          error: `Value for "${p.name}" (${num}) exceeds maximum plausible analyzer range (${p.max} ${p.unit}).`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Generates normal or high preset values for a schema.
 */
export function getPresetReadings(schema, type = "normal") {
  if (!schema || !Array.isArray(schema.params)) {
    return { readings: {}, remarks: "" };
  }

  const readings = {};
  schema.params.forEach((p) => {
    readings[p.id] = type === "high" ? p.highVal : p.normalVal;
  });

  const remarks =
    type === "normal"
      ? "All measured parameters are within healthy biological reference intervals."
      : "Elevated/abnormal parameters noted. Clinical correlation and follow-up recommended.";

  return { readings, remarks };
}

/**
 * Compiles readings dictionary into an ActualReading summary string.
 */
export function compileActualReading(schema, readings = {}) {
  if (!schema || !Array.isArray(schema.params)) {
    return "";
  }

  const parts = [];
  schema.params.forEach((p) => {
    const val = readings[p.id];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      const formatted = p.isText ? String(val).trim() : `${val} ${p.unit}`;
      parts.push(`${p.name}: ${formatted}`);
    }
  });

  return parts.join(", ");
}

export default {
  TEST_PARAM_SCHEMAS,
  getTestSchema,
  getStandardTestMeta,
  validateTestReadings,
  getPresetReadings,
  compileActualReading,
};
