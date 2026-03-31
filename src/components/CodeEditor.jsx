import React from 'react';

let ReactCodeMirror = null;
let jsLang = null;
let pyLang = null;
let jsonLang = null;

try {
  // dynamic require so app can still run if packages aren't installed yet
  ReactCodeMirror = require('@uiw/react-codemirror').default;
  jsLang = require('@codemirror/lang-javascript').javascript;
  pyLang = require('@codemirror/lang-python').python;
  jsonLang = require('@codemirror/lang-json').json;
} catch (e) {
  // ignore; fallback to textarea
}

export default function CodeEditor({ value, onChange, language = 'javascript', height = '240px' }) {
  if (!ReactCodeMirror) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        style={{ width: '100%', padding: 12, boxSizing: 'border-box' }}
      />
    );
  }

  const exts = [];
  if (language === 'javascript' && jsLang) exts.push(jsLang());
  else if (language === 'python' && pyLang) exts.push(pyLang());
  else if (language === 'json' && jsonLang) exts.push(jsonLang());
  else if (jsLang) exts.push(jsLang());

  return (
    <ReactCodeMirror
      value={value}
      height={height}
      extensions={exts}
      onChange={(val) => onChange(val)}
    />
  );
}
