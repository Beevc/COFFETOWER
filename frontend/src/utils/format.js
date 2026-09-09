// Formatea un entero de pesos chilenos: 3500 -> "$3.500"
export const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CL");
