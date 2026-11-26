(() => {
  const inherited = new Set(["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color"]);
  const round = n => Number(n.toFixed(3));
  function format(value, unit, { root = 16, element = 16, parent = element } = {}, property = "") {
    if (unit === "auto" || unit === "px") return value;
    const base = unit === "rem" ? root : property === "font-size" ? parent : element;
    if (!(base > 0)) return value;
    // Do not change quoted font names, URLs, or numeric channels inside colors.
    return value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\([^)]*\)|(-?(?:\d*\.)?\d+)px\b/gi,
      (match, px) => px === undefined ? match : `${round(Number(px) / base)}${unit}`);
  }
  function split(value, delimiter = ",") {
    const parts = []; let start = 0, depth = 0, quote = "";
    for (let i = 0; i < value.length; i++) {
      const c = value[i];
      if (c === "\\") { i++; continue; }
      if (quote) { if (c === quote) quote = ""; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (depth === 0 && c === delimiter) { parts.push(value.slice(start, i)); start = i + 1; }
    }
    parts.push(value.slice(start)); return parts;
  }
  const compare = (a, b) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const d = (a[i] ?? Infinity) - (b[i] ?? Infinity);
      if (d) return d;
    }
    return 0;
  };
  function specificity(selector) {
    let score = [0, 0, 0];
    const add = s => { score = score.map((n, i) => n + s[i]); };
    let rest = "";
    for (let i = 0; i < selector.length;) {
      const fn = selector.slice(i).match(/^:(where|is|not|has)\(/i);
      if (!fn) { rest += selector[i++]; continue; }
      let end = i + fn[0].length, depth = 1;
      for (; end < selector.length && depth; end++) {
        if (selector[end] === "\\") { end++; continue; }
        if (selector[end] === "(") depth++;
        if (selector[end] === ")") depth--;
      }
      if (fn[1].toLowerCase() !== "where") add(split(selector.slice(i+fn[0].length, end-1)).map(specificity).sort(compare).at(-1));
      i = end;
    }
    // shortcut: nth-child(of selector), CSS nesting and @scope need a full cascade resolver.
    if (/:nth-[\w-]+\([^)]*\bof\b|&/.test(rest)) return [Infinity, Infinity, Infinity];
    rest = rest.replace(/\[(?:\\.|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\]"'])*\]/g, () => {score[1]++; return " ";});
    rest = rest.replace(/::[\w-]+(?:\([^)]*\))?/g, () => {score[2]++; return " ";});
    rest = rest.replace(/#[\w\\-]+/g, () => {score[0]++; return " ";});
    rest = rest.replace(/\.[\w\\-]+|:[\w-]+(?:\([^)]*\))?/g, () => {score[1]++; return " ";});
    score[2] += (rest.match(/(?:^|[\s>+~|])(?:[a-z_][\w-]*)/gi) || []).length;
    return score;
  }
  function sourceReader(doc) {
    const rules = [], layers = new Map(); let order = 0, incomplete = false;
    function layerPath(name, parent) {
      let path = parent;
      for (const part of name.split(".")) {
        const id = `${path.join(".")}/${part}`;
        if (!layers.has(id)) layers.set(id, [...layers.keys()].filter(k => k.startsWith(`${path.join(".")}/`)).length);
        path = [...path, layers.get(id)];
      }
      return path;
    }
    function sheet(sheet, path = []) {
      if (!sheet || sheet.disabled || (sheet.media?.mediaText && !matchMedia(sheet.media.mediaText).matches)) return;
      try { walk(sheet.cssRules, path); } catch { incomplete = true; }
    }
    function walk(list, path) {
      for (const rule of list) {
        const type = rule.constructor.name;
        if (type === "CSSLayerStatementRule") { for (const name of split(rule.cssText.replace(/^@layer\s*|;$/g, ""))) layerPath(name.trim(), path); }
        else if (type === "CSSLayerBlockRule") walk(rule.cssRules, layerPath(rule.name || `anonymous-${order++}`, path));
        else if (type === "CSSMediaRule") { if (matchMedia(rule.conditionText).matches) walk(rule.cssRules, path); }
        else if (type === "CSSSupportsRule") { if (CSS.supports(rule.conditionText)) walk(rule.cssRules, path); }
        else if (type === "CSSImportRule") sheet(rule.styleSheet, rule.layerName === null || rule.layerName === undefined ? path : layerPath(rule.layerName || `anonymous-${order++}`, path));
        else if (rule.selectorText && rule.style) {
          rules.push({selector:rule.selectorText, style:rule.style, layer:path, order:order++});
          if (rule.cssRules?.length) incomplete = true;
        } else if (rule.cssRules && type !== "CSSKeyframesRule") incomplete = true;
      }
    }
    for (const s of [...doc.styleSheets, ...(doc.adoptedStyleSheets || [])]) sheet(s);
    const cache = new WeakMap(), shorthandCache = new WeakMap();
    function rawDeclaration(style, property, text=style.cssText || "") {
      if(!shorthandCache.has(style)) {
        const declarations=new Map();
        for(const part of split(text, ";")) {
          const match=part.match(/^\s*([\w-]+)\s*:\s*([\s\S]*)$/);
          if(!match)continue;
          const important=/\s*!important\s*$/i.test(match[2]);
          if(!declarations.get(match[1])?.important || important) declarations.set(match[1],{value:match[2].replace(/\s*!important\s*$/i,"").trim(),important});
        }
        shorthandCache.set(style,declarations);
      }
      return shorthandCache.get(style).get(property);
    }
    function declarations(el) {
      if (cache.has(el)) return cache.get(el);
      const candidates = [];
      for (const rule of rules) {
        const scores = split(rule.selector).filter(s => {try { return el.matches(s); } catch { return false; }}).map(specificity);
        if (scores.length) candidates.push({...rule, score:scores.sort(compare).at(-1), inline:0});
      }
      if (el.style) candidates.push({style:el.style, raw:el.getAttribute?.("style") || el.style.cssText, layer:[], score:[0,0,0], order:order, inline:1});
      cache.set(el, candidates); return candidates;
    }
    function read(el, property) {
      let winner;
      for (const c of declarations(el)) {
        let value = c.style.getPropertyValue(property), declaration = property;
        // CSSOM leaves var()-based shorthand longhands empty until substitution.
        if (!value) {
          const shorthands = property.startsWith("padding-") ? ["padding"] : property.startsWith("margin-") ? ["margin"] : /^border-.*-radius$/.test(property) ? ["border-radius"] : property.startsWith("border-") ? [property.split("-").slice(0,2).join("-"), "border"] : property === "background-color" ? ["background"] : ["font-family", "font-size", "font-weight", "line-height"].includes(property) ? ["font"] : [];
          for (const p of shorthands) {
            // A partial longhand override can make the shorthand getter empty.
            const v = c.style.getPropertyValue(p) || rawDeclaration(c.style,p,c.raw)?.value || "";
            if (/var\(/.test(v)) {value = v; declaration = p; break;}
          }
        }
        if (!value) continue;
        const important = Number(c.style.getPropertyPriority(declaration) === "important" || rawDeclaration(c.style,declaration,c.raw)?.important === true);
        const next = {...c, value, declaration, important};
        const cmp = !winner ? 1 : important-winner.important || c.inline-winner.inline || compare(c.layer, winner.layer)*(important ? -1 : 1) || compare(c.score, winner.score) || c.order-winner.order;
        if (cmp >= 0) winner = next;
      }
      if (!winner || /^(inherit|unset)$/.test(winner.value)) {
        if (el.parentElement && (inherited.has(property) || winner?.value === "inherit")) return read(el.parentElement, property);
      }
      if (winner?.score.includes(Infinity) || /^(revert|revert-layer|initial|unset|inherit)$/.test(winner?.value)) return null;
      return winner || null;
    }
    return {read, get incomplete() {return incomplete;}};
  }
  function tokenLabel(expression) {
    let result="", cursor=0;
    const pattern=/var\(\s*--([\w-]+)/g;
    let match;
    while ((match=pattern.exec(expression))) {
      let end=pattern.lastIndex, depth=1, quote="";
      for (;end<expression.length && depth;end++) {
        const c=expression[end];
        if(c==='\\') {end++;continue;}
        if(quote) {if(c===quote)quote="";continue;}
        if(c==='"' || c==="'") {quote=c;continue;}
        if(c==='(')depth++;
        if(c===')')depth--;
      }
      if(depth)break;
      const args=split(expression.slice(match.index+4,end-1));
      result+=expression.slice(cursor,match.index)+match[1];
      if(args.length>1)result+=` (fallback: ${tokenLabel(args.slice(1).join(',').trim())})`;
      cursor=end; pattern.lastIndex=end;
    }
    return result+expression.slice(cursor);
  }
  function displayValue(value, isColor=false) {
    const text=value?.trim() || "";
    if(!text)return "—";
    if(isColor && (/^transparent$/i.test(text) || /\/\s*0(?:\.0*)?%?\s*\)$/.test(text) || /^rgba\([^)]*,\s*0(?:\.0*)?\s*\)$/i.test(text) || /^hsla\([^)]*,\s*0(?:\.0*)?\s*\)$/i.test(text)))return "—";
    return value;
  }
  function groupTypography(entries) {
    const groups=new Map();
    for(const entry of entries) {
      const value=entry[1];
      if(!value.fontSource || !value.token)continue;
      const key=JSON.stringify([value.fontSource,value.token]);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(entry);
    }
    const emitted=new Set(), result=[];
    const base=[...groups.values()].find(group=>group.length>=2)?.[0][1];
    for(const entry of entries) {
      const value=entry[1], key=JSON.stringify([value.fontSource,value.token]), group=groups.get(key);
      if(!group || group.length<2) {
        const overrides=base && value.longhandSource && !value.fontSource && ["font-family","font-size","font-weight","line-height"].includes(entry[0]);
        result.push(overrides ? [entry[0],{...value,overrideOf:base.token}] : entry);
        continue;
      }
      if(emitted.has(key))continue;
      emitted.add(key);
      result.push(["font",{token:value.token,descriptions:group.map(([property,v])=>({property,actual:v.actual}))}]);
    }
    return result;
  }
  function variableCopyText(expression) {
    const primary=expression.trim().match(/^var\(\s*(--[\w-]+)/);
    if(primary)return primary[1];
    const names=[...new Set([...expression.matchAll(/var\(\s*(--[\w-]+)/g)].map(match=>match[1]))];
    return names.length===1 ? names[0] : expression;
  }
  globalThis.designInspectCSS = {format, sourceReader, specificity, tokenLabel, displayValue, groupTypography, variableCopyText};
})();
