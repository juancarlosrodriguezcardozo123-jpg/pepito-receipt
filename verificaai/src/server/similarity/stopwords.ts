// Palabras vacías frecuentes (español e inglés), ya normalizadas sin tildes.
export const STOPWORDS = new Set(
  (
    "a al algo algun alguna algunas alguno algunos ante antes aquel aquella aquellas aquellos aqui asi aun bajo bien cada casi como con contra cual cuales cuando de del desde donde dos e el ella ellas ello ellos en entre era eran es esa esas ese eso esos esta estaba estado estan estar estas este esto estos fue fueron ha habia han hasta hay la las le les lo los mas me mi mientras muy nada ni no nos nosotros o otra otras otro otros para pero poco por porque que quien quienes se sea segun ser si sido siempre sin sobre su sus tambien tan tanto te tiene tienen todo todos tras tu un una unas uno unos y ya yo " +
    "the of and to in is it that for on with as was are be by this an at from or which but not have has had were been their they its can will would there these those than then also into such more most other some any all may our we you he she his her them about over only"
  ).split(" "),
);
