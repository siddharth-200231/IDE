export const pythonConfig = {
  tokenizer: {
    root: [
      [/[a-z_$][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],
      [/".*?"|'.*?'/, 'string'],
      [/\d+/, 'number'],
      [/#.*$/, 'comment'],
    ],
  },
  keywords: [
    'def', 'class', 'if', 'else', 'elif', 'while', 'for', 
    'try', 'except', 'finally', 'import', 'from', 'as'
  ]
};

export const javaConfig = {
  tokenizer: {
    root: [
      [/[a-z_$][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],
      [/".*?"|'.*?'/, 'string'],
      [/\d+/, 'number'],
      [/\/\/.*$/, 'comment'],
    ],
  },
  keywords: [
    'class', 'public', 'private', 'protected', 'static',
    'void', 'int', 'String', 'if', 'else', 'while', 'for'
  ]
};