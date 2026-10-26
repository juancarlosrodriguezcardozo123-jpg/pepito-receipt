export const CATEGORY_LABEL = { QUOTE: "Cita", REFERENCE: "Referencia bibliográfica", UNCLASSIFIED: "Sin clasificar" } as const;
export const KIND_LABEL = { EXACT: "Exacta", APPROXIMATE: "Aproximada" } as const;
export const SOURCE_TYPE_LABEL = { USER_DOCUMENT: "Documento propio", COLLECTION: "Colección autorizada", EXTERNAL: "Fuente externa" } as const;
export const ANALYSIS_TYPE_LABEL = { SIMILARITY: "Similitud", AI_DETECTION: "Detector de IA" } as const;
export const ANALYSIS_STATUS_LABEL = { COMPLETED: "Completado", FAILED: "Con errores", UNAVAILABLE: "Avanzado no disponible" } as const;
export const MIME_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
};

export const LIMITATIONS = {
  SIMILARITY: [
    "La comparación se limita a las fuentes indicadas en el método. No se ha comparado con Internet completo ni con bases de datos privadas de terceros.",
    "Las coincidencias exactas requieren secuencias de al menos 8 palabras idénticas tras normalizar mayúsculas, tildes y puntuación.",
    "La similitud aproximada es léxica (vocabulario compartido por oración); no detecta paráfrasis profundas, traducciones ni ideas reformuladas.",
    "La clasificación de citas y referencias es automática (comillas y encabezados de bibliografía) y puede contener errores.",
    "Una similitud alta puede deberse a citas correctas, terminología común, plantillas o textos del mismo autor. No es prueba de plagio.",
  ],
  AI_DETECTION: [
    "Ningún detector de IA es infalible: existen falsos positivos (p. ej. escritura formal, no nativa o muy editada) y falsos negativos.",
    "El análisis lingüístico experimental mide rasgos estilométricos (ritmo, vocabulario, repetición). No es un modelo entrenado ni calibrado y no produce una probabilidad.",
    "Ningún indicador equivale a la proporción exacta de texto escrito por IA.",
    "Los textos cortos (menos de unas 300 palabras) producen resultados poco fiables.",
  ],
} as const;
