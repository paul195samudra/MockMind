import React, { useEffect, useRef, useState } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeEditorProps {
  value: string;
  onChange?: (val: string) => void;
  language?: string;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  onSubmitShortcut?: () => void;
  className?: string;
}

function getLanguageExtension(language?: string) {
  switch ((language || 'TypeScript').toLowerCase()) {
    case 'python':
      return python();
    case 'sql':
      return sql();
    case 'java':
      return java();
    case 'javascript':
      return javascript({ jsx: true, typescript: false });
    case 'typescript':
    default:
      return javascript({ jsx: true, typescript: true });
  }
}

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '12.5px',
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace'
  },
  '.cm-content': {
    padding: '12px 0',
    caretColor: '#2563eb'
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    borderRight: '1px solid #e2e8f0'
  },
  '.cm-activeLine': {
    backgroundColor: '#f8fafc'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f1f5f9',
    color: '#475569'
  },
  '&.cm-focused': {
    outline: 'none'
  }
}, { dark: false });

const darkRoseOverrides = EditorView.theme({
  '&': {
    backgroundColor: '#160910',
    fontSize: '12.5px',
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace'
  },
  '.cm-content': {
    padding: '12px 0'
  },
  '.cm-gutters': {
    backgroundColor: '#1b0d14',
    borderRight: '1px solid #3b1d2c'
  },
  '&.cm-focused': {
    outline: 'none'
  }
}, { dark: true });

export function CodeEditor({
  value,
  onChange,
  language = 'TypeScript',
  readOnly = false,
  placeholder = '',
  minHeight = '320px',
  maxHeight = '440px',
  onSubmitShortcut,
  className = ''
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langCompartment = useRef(new Compartment());
  const themeCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmitShortcut);

  onChangeRef.current = onChange;
  onSubmitRef.current = onSubmitShortcut;

  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  // Sync with root .dark class toggles
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Initialize CodeMirror once
  useEffect(() => {
    if (!containerRef.current) return;

    const submitKeymap = keymap.of([
      indentWithTab,
      {
        key: 'Mod-Enter',
        run: () => {
          if (onSubmitRef.current) {
            onSubmitRef.current();
            return true;
          }
          return false;
        }
      }
    ]);

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        submitKeymap,
        EditorView.lineWrapping,
        langCompartment.current.of(getLanguageExtension(language)),
        themeCompartment.current.of(isDark ? [oneDark, darkRoseOverrides] : lightTheme),
        readOnlyCompartment.current.of([
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly)
        ]),
        cmPlaceholder(placeholder),
        EditorView.theme({
          '&': { minHeight, maxHeight },
          '.cm-scroller': { overflow: 'auto', minHeight, maxHeight }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChangeRef.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        })
      ]
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. question switch or Reset button)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (value !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value }
      });
    }
  }, [value]);

  // Update language extension dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: langCompartment.current.reconfigure(getLanguageExtension(language))
    });
  }, [language]);

  // Update theme dynamically when light/dark switches
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.current.reconfigure(isDark ? [oneDark, darkRoseOverrides] : lightTheme)
    });
  }, [isDark]);

  // Update readOnly dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly)
      ])
    });
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden border border-slate-200 dark:border-[#3b1d2c] ${className}`}
    />
  );
}
