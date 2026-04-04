let Monaco = null;
try {
  Monaco = require('@monaco-editor/react').default;
} catch (e) {
  Monaco = null;
}

export default function MonacoEditor({
  value,
  onChange,
  language = 'javascript',
  height = '300px',
}) {
  if (!Monaco) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        style={{ width: '100%', padding: 12, boxSizing: 'border-box' }}
      />
    );
  }

  return (
    <Monaco
      height={height}
      language={language}
      value={value}
      onChange={(v) => onChange(v)}
      theme="vs-dark"
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        lineNumbers: 'on',
        folding: true,
        wordWrap: 'on',
        contextmenu: true,
        scrollBeyondLastLine: false,
      }}
    />
  );
}
