// Calculator — safe math evaluation + unit conversion
function calculate(expr) {
  // Clean up the expression
  let e = expr
    .replace(/[×xX\*]/g, '*')
    .replace(/[÷\/]/g, '/')
    .replace(/\^/g, '**')
    .replace(/plus/g, '+').replace(/minus/g, '-')
    .replace(/times|multiplied by/g, '*').replace(/divided by/g, '/')
    .replace(/mod|modulo/g, '%')
    .replace(/sqrt of|square root of/g, 'Math.sqrt')
    .replace(/sqrt/g, 'Math.sqrt')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b(?![\w])/g, 'Math.E')
    .replace(/\bsin\b/g, 'Math.sin').replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan').replace(/\blog\b/g, 'Math.log10')
    .replace(/\bln\b/g, 'Math.log')
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\bfloor\b/g, 'Math.floor').replace(/\bceil\b/g, 'Math.ceil')
    .replace(/\bround\b/g, 'Math.round')
    .replace(/\bpow\b/g, 'Math.pow');

  // Unit conversions
  const conv = e.match(/([\d.]+)\s*(celsius|fahrenheit|kelvin|km\/?s?|mph|miles?|km|feet|foot|inches?|cm|mm|pounds?|lbs?|kg|gallons?|liters?|ounces?|oz)/i);
  if (conv) {
    const val = parseFloat(conv[1]);
    const unit = conv[2].toLowerCase();
    if (unit.startsWith('celsius') || unit.startsWith('fahrenheit') || unit.startsWith('kelvin')) {
      return convertTemp(val, unit);
    }
    return convertUnit(val, unit);
  }

  // Safety check: only allow math characters
  if (!/^[\d\s+\-*/().,%MathsqrtflceiobpnAaSsTtLlRrGgEePpIiBbWwVvHhQqDdKkMmUuJjFfYy*]+$/i.test(e.replace(/Math\.\w+/g, ''))) {
    return 'Invalid expression.';
  }

  try {
    const result = Function('"use strict"; return (' + e + ')')();
    if (typeof result !== 'number' || isNaN(result)) return 'Could not calculate that.';
    return `${expr} equals ${Number.isInteger(result) ? result : result.toFixed(6).replace(/\.?0+$/, '')}`;
  } catch {
    return `I couldn't work that out. Try something like "2 plus 2", "square root of 144", or "sin 30".`;
  }
}

function convertTemp(val, from) {
  let celsius;
  if (from.startsWith('c')) celsius = val;
  else if (from.startsWith('f')) celsius = (val - 32) * 5 / 9;
  else celsius = val - 273.15;
  const f = celsius * 9 / 5 + 32;
  const k = celsius + 273.15;
  return `${val}° ${from.charAt(0).toUpperCase()} is ${celsius.toFixed(1)}°C, ${f.toFixed(1)}°F, or ${k.toFixed(1)}K.`;
}

function convertUnit(val, from) {
  const conversions = {
    'km': { to: val * 0.621371, unit: 'miles' },
    'miles': { to: val * 1.60934, unit: 'km' },
    'mph': { to: val * 1.60934, unit: 'km/h' },
    'feet': { to: val * 0.3048, unit: 'meters' },
    'foot': { to: val * 0.3048, unit: 'meters' },
    'inches': { to: val * 2.54, unit: 'cm' },
    'inch': { to: val * 2.54, unit: 'cm' },
    'cm': { to: val * 0.393701, unit: 'inches' },
    'mm': { to: val * 0.0393701, unit: 'inches' },
    'pounds': { to: val * 0.453592, unit: 'kg' },
    'lbs': { to: val * 0.453592, unit: 'kg' },
    'kg': { to: val * 2.20462, unit: 'lbs' },
    'gallons': { to: val * 3.78541, unit: 'liters' },
    'gallon': { to: val * 3.78541, unit: 'liters' },
    'liters': { to: val * 0.264172, unit: 'gallons' },
    'liter': { to: val * 0.264172, unit: 'gallons' },
    'ounces': { to: val * 28.3495, unit: 'grams' },
    'oz': { to: val * 28.3495, unit: 'grams' },
  };
  const c = conversions[from];
  if (c) return `${val} ${from} is ${c.to.toFixed(2)} ${c.unit}.`;
  return `Unknown unit: ${from}`;
}

module.exports = { calculate };
